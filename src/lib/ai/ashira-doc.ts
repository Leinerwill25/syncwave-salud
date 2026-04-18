import { createHash } from 'crypto';
import { supabaseAdmin } from '../supabase/admin';
import { callAI } from './client';

// System prompt for ASHIRA-Doc
const SYSTEM_PROMPT = `Eres el analizador clínico de ASHIRA, sistema de gestión médica venezolano.
Analiza el informe médico recibido y responde SOLO en JSON válido con esta estructura exacta:

{
  "tipo": string,
  "fecha_informe": string|null,
  "diagnostico_principal": string,
  "hallazgos_clave": string[],
  "medicamentos_mencionados": string[],
  "estudios_indicados": string[],
  "valores_criticos": string[],
  "resumen_clinico": string,
  "nivel_urgencia": "NORMAL"|"ATENCION"|"URGENTE"
}

Reglas estrictas:
- resumen_clinico: máximo 80 palabras, lenguaje clínico directo
- hallazgos_clave: máximo 5 items, frases cortas
- Si un campo no aplica: array vacío [] o null
- valores_criticos: solo valores fuera de rango clínico
- nivel_urgencia: URGENTE si hay valores críticos o diagnóstico grave
- NO incluyas texto fuera del JSON
- NO incluyas disclaimers ni recomendaciones legales
- Idioma: español médico venezolano`;

export interface DocAnalysisResult {
  tipo: string;
  fecha_informe: string | null;
  diagnostico_principal: string;
  hallazgos_clave: string[];
  medicamentos_mencionados: string[];
  estudios_indicados: string[];
  valores_criticos: string[];
  resumen_clinico: string;
  nivel_urgencia: 'NORMAL' | 'ATENCION' | 'URGENTE';
}

/**
 * Analiza un informe médico (PDF o Imagen).
 */
export async function analyzeReport(
  patientId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ result: DocAnalysisResult; source: 'cache' | 'api' }> {
  
  // 1. Verificar caché en DB por hash del archivo
  const fileHash = createHash('md5').update(new Uint8Array(fileBuffer)).digest('hex');
  
  const { data: cached } = await supabaseAdmin
    .from('ai_report_cache')
    .select('analysis_result')
    .eq('file_hash', fileHash)
    .maybeSingle();
  
  if (cached) {
    return { result: cached.analysis_result, source: 'cache' };
  }

  // 2. Intentar extracción de texto primero (modo económico)
  let content: string | any[];
  let extractedText = '';

  if (mimeType === 'application/pdf') {
    extractedText = await extractTextFromPDF(fileBuffer);
  }

  if (extractedText && extractedText.trim().length > 50) {
    // Modo texto: ~700 tokens
    const truncated = extractedText.substring(0, 10000); // ~2500 palabras
    content = `INFORME MÉDICO\nPaciente ID: ${patientId}\nTipo: ${inferDocType(fileName)}\n\nCONTENIDO DEL INFORME:\n${truncated}`;
  } else {
    // Modo visión: si es imagen o PDF sin texto
    const base64 = fileBuffer.toString('base64');
    content = [
      {
        inlineData: {
          mimeType: mimeType.startsWith('image/') ? mimeType : 'image/jpeg', // Fallback a jpeg si es PDF escaneado (requeriría conversión a imagen)
          data: base64
        }
      },
      {
        text: `Paciente: ${patientId}. Analiza este informe médico.`
      }
    ];

    // NOTA: Si es un PDF sin texto, para modo visión real necesitaríamos convertir 
    // las páginas a imágenes. Como MVP, asumimos que si no hay texto, es una imagen
    // o el modelo intentará procesar el buffer base64 si el SDK lo permite.
  }

  // 3. Llamar a la IA
  const response = await callAI(SYSTEM_PROMPT, content, {
    feature: 'doc',
    patientId,
    maxTokens: 500,
    forceJSON: true
  });

  const parsed = JSON.parse(response.text) as DocAnalysisResult;

  // 4. Guardar en caché y log (el log se hace dentro de callAI)
  await supabaseAdmin.from('ai_report_cache').insert({
    file_hash: fileHash,
    patient_id: patientId,
    analysis_result: parsed,
    tokens_used: response.tokensIn + response.tokensOut,
    model_used: response.model
  });

  return { result: parsed, source: 'api' };
}

/**
 * Extrae texto de un buffer PDF usando pdfjs-dist.
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Importación dinámica para evitar problemas en build time si el binario no está listo
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs' as any);
    
    const data = new Uint8Array(buffer);
    const loadingTask = pdfjs.getDocument({ data });
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) { // Máximo 5 páginas por economía
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  } catch (error) {
    console.error('Error extrayendo texto del PDF:', error);
    return '';
  }
}

/**
 * Infiere el tipo de documento por el nombre del archivo
 */
function inferDocType(fileName: string): string {
  const name = fileName.toLowerCase();
  if (name.includes('lab')) return 'laboratorio';
  if (name.includes('radio') || name.includes('rx')) return 'radiología';
  if (name.includes('eco')) return 'ecografía';
  if (name.includes('resumen') || name.includes('epicrisis')) return 'resumen clínico';
  return 'consulta';
}
