import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import mammoth from 'mammoth';
import JSZip from 'jszip';

/* =====================================================
   TIPOS
===================================================== */

type CategorizedVariables = {
  patient: string[];
  clinical: string[];
  gynecology: string[];
  colposcopy: string[];
  other: string[];
};

type DocumentSection = {
  name: string;
  startIndex: number;
};

type ExtractedBucket = {
  bucket: string;
  path: string;
};

/* =====================================================
   SUPABASE ADMIN CLIENT (SERVER ONLY)
===================================================== */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } }
);

/* =====================================================
   MAPEO REPORT TYPE → ESPECIALIDAD
===================================================== */

/**
 * Mapea reportTypes en inglés a nombres de especialidades en español
 * que se usan en report_templates_by_specialty y en las carpetas de Supabase Storage
 */
const REPORT_TYPE_TO_SPECIALTY: Record<string, string[]> = {
  'gynecology': ['Ginecologia', 'Ginecología', 'gynecology'],
  'obstetrics': ['Obstetricia', 'obstetrics'],
  'obstetricia': ['Obstetricia', 'obstetrics'],
  'general': ['General', 'general'],
};

/**
 * Obtiene todas las posibles claves para buscar una especialidad
 */
function getSpecialtyKeys(reportType: string): string[] {
  const normalized = reportType.toLowerCase().trim();
  const mapped = REPORT_TYPE_TO_SPECIALTY[normalized] || [];
  // Incluir el reportType original y su versión capitalizada
  return [
    ...new Set([
      reportType, // Original
      reportType.charAt(0).toUpperCase() + reportType.slice(1), // Capitalized
      ...mapped, // Mapeadas
    ])
  ];
}

/* =====================================================
   ROUTE
===================================================== */

export async function POST(request: NextRequest) {
  let doctorId: string | undefined;
  let reportType: string | undefined;
  
  try {
    /* =========================
       Parse & validate request
    ========================= */
    const body = await request.json().catch(() => null);

    doctorId = body?.doctorId;
    reportType = body?.reportType;
    const apiKey: string | undefined = body?.apiKey;

    if (!apiKey || apiKey !== process.env.N8N_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'API Key inválida' },
        { status: 401 }
      );
    }

    if (!doctorId || !reportType) {
      return NextResponse.json(
        { success: false, error: 'doctorId y reportType son requeridos' },
        { status: 400 }
      );
    }

    /* =========================
       Obtener perfil médico
    ========================= */
    const { data: medicProfile, error: profileError } =
      await supabaseAdmin
        .from('medic_profile')
        .select(
          'report_template_url, report_template_name, report_templates_by_specialty'
        )
        .eq('doctor_id', doctorId)
        .single();

    if (profileError || !medicProfile) {
      return NextResponse.json(
        { success: false, error: 'Perfil médico no encontrado' },
        { status: 404 }
      );
    }

    /* =========================
       Resolver plantilla
    ========================= */
    let templateUrl: string | null = medicProfile.report_template_url;
    let templateName: string =
      medicProfile.report_template_name || 'Plantilla médica';

    // Parsear report_templates_by_specialty (puede venir como string desde Supabase)
    let specialtyTemplates: Record<string, { url?: string; template_url?: string; name?: string; template_name?: string }> | null = null;
    
    if (medicProfile.report_templates_by_specialty) {
      if (typeof medicProfile.report_templates_by_specialty === 'string') {
        try {
          specialtyTemplates = JSON.parse(medicProfile.report_templates_by_specialty);
        } catch (e) {
          console.warn('[Analyze Template] Error parseando report_templates_by_specialty como string:', e);
        }
      } else if (typeof medicProfile.report_templates_by_specialty === 'object') {
        specialtyTemplates = medicProfile.report_templates_by_specialty as Record<string, any>;
      }
    }

    // Intentar buscar la plantilla con diferentes variantes del reportType
    if (specialtyTemplates) {
      const specialtyKeys = getSpecialtyKeys(reportType);
      console.log('[Analyze Template] Buscando plantilla con claves:', specialtyKeys);
      console.log('[Analyze Template] Claves disponibles en report_templates_by_specialty:', Object.keys(specialtyTemplates));

      for (const key of specialtyKeys) {
        const template = specialtyTemplates[key];
        if (template) {
          // Soportar tanto 'url' como 'template_url'
          templateUrl = template.url || template.template_url || null;
          // Soportar tanto 'name' como 'template_name'
          templateName = template.name || template.template_name || templateName;
          
          if (templateUrl) {
            console.log(`[Analyze Template] ✅ Plantilla encontrada con clave: "${key}"`);
            break;
          }
        }
      }

      if (!templateUrl) {
        console.warn('[Analyze Template] ⚠️ No se encontró plantilla para reportType:', reportType);
        console.warn('[Analyze Template] Claves disponibles:', Object.keys(specialtyTemplates));
      }
    }

    if (!templateUrl) {
      console.warn('[Analyze Template] No hay plantilla configurada para reportType:', reportType);
      return NextResponse.json({
        success: false,
        error: `No hay plantilla configurada para el tipo de informe "${reportType}"`,
        templateText: '',
        variables: [],
        sections: [],
        debug: {
          reportType,
          availableKeys: specialtyTemplates ? Object.keys(specialtyTemplates) : [],
          triedKeys: getSpecialtyKeys(reportType)
        }
      });
    }

    console.log('[Analyze Template] URL de plantilla encontrada:', templateUrl?.substring(0, 100) + '...');

   /* =========================
   Descargar DOCX (robusto)
========================= */

let arrayBuffer: ArrayBuffer;

try {
  // 1️⃣ Si viene signed URL → extraer bucket/path y regenerar
  if (templateUrl.includes('/object/sign/')) {
    console.log('[Analyze Template] Descargando desde signed URL...');
    const signedUrl = new URL(templateUrl);
    const match = signedUrl.pathname.match(
      /\/storage\/v1\/object\/sign\/([^/]+)\/(.+)/
    );

    if (!match) {
      console.error('[Analyze Template] Signed URL inválida:', signedUrl.pathname);
      throw new Error('Signed URL inválida');
    }

    const bucket = match[1];
    const path = decodeURIComponent(match[2]);
    console.log('[Analyze Template] Bucket:', bucket, 'Path:', path);

    // 🔑 Generar NUEVA signed URL con service role
    const { data, error } =
      await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(path, 120); // 2 minutos

    if (error || !data?.signedUrl) {
      console.error('[Analyze Template] Error generando signed URL:', error);
      throw new Error(`No se pudo regenerar signed URL: ${error?.message || 'unknown error'}`);
    }

    console.log('[Analyze Template] Nueva signed URL generada, descargando...');
    const response = await fetch(data.signedUrl, { cache: 'no-store' });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('[Analyze Template] Error descargando desde signed URL:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText.substring(0, 200)
      });
      throw new Error(`No se pudo descargar la plantilla (signed URL): ${response.status} ${response.statusText}`);
    }

    arrayBuffer = await response.arrayBuffer();
    console.log('[Analyze Template] ✅ Archivo descargado desde signed URL, tamaño:', arrayBuffer.byteLength, 'bytes');
  }
  // 2️⃣ URL pública → descarga directa
  else {
    console.log('[Analyze Template] Descargando desde URL pública...');
    const { bucket, path } = extractBucket(templateUrl);
    console.log('[Analyze Template] Bucket:', bucket, 'Path:', path);

    const { data, error } =
      await supabaseAdmin.storage.from(bucket).download(path);

    if (error) {
      console.error('[Analyze Template] Error descargando desde storage:', {
        error: error.message,
        statusCode: (error as any).statusCode,
        bucket,
        path
      });
      throw new Error(`No se pudo descargar la plantilla (public URL): ${error.message}`);
    }

    if (!data) {
      console.error('[Analyze Template] No se recibió data del storage');
      throw new Error('No se pudo descargar la plantilla: respuesta vacía');
    }

    arrayBuffer = await data.arrayBuffer();
    console.log('[Analyze Template] ✅ Archivo descargado desde storage, tamaño:', arrayBuffer.byteLength, 'bytes');
  }
} catch (downloadError: any) {
  console.error('[Analyze Template] Error completo al descargar plantilla:', {
    message: downloadError.message,
    stack: downloadError.stack,
    templateUrl: templateUrl?.substring(0, 200)
  });
  throw downloadError;
}


    /* =========================
       Texto plano (Mammoth)
    ========================= */
    let extractedText = '';
    try {
      const mammothResult = await mammoth.extractRawText({
        arrayBuffer
      });
      extractedText = mammothResult.value || '';
    } catch {
      extractedText = '';
    }

    /* =========================
       Variables (texto + XML)
    ========================= */
    const xmlVariables = await extractVariablesFromDocx(arrayBuffer);
    const textVariables = extractVariablesFromText(extractedText);

    const variables: string[] = Array.from(
      new Set([...xmlVariables, ...textVariables])
    ).sort();

    /* =========================
       Secciones + categorías
    ========================= */
    const sections: DocumentSection[] =
      detectDocumentSections(extractedText);

    const categorizedVariables: CategorizedVariables =
      categorizeVariables(variables);

    /* =========================
       Response
    ========================= */
    return NextResponse.json({
      success: true,
      templateName,
      templateText: extractedText,
      variables,
      variableCount: variables.length,
      sections,
      categorizedVariables,
      metadata: {
        reportType,
        hasMultipleSections: sections.length > 1,
        detectedFromXML: xmlVariables.length,
        detectedFromText: textVariables.length
      }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[Analyze Template] Error completo:', {
      message: errorMessage,
      stack: errorStack,
      doctorId,
      reportType
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Error al analizar plantilla: ${errorMessage}`,
        debug: process.env.NODE_ENV === 'development' ? {
          message: errorMessage,
          reportType,
          doctorId
        } : undefined
      },
      { status: 500 }
    );
  }
}

/* =====================================================
   HELPERS
===================================================== */

/**
 * Soporta:
 * - /storage/v1/object/public/{bucket}/{path}
 * - /storage/v1/object/sign/{bucket}/{path}?token=...
 */
function extractBucket(url: string): ExtractedBucket {
  const parsedUrl = new URL(url);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  const match = pathname.match(
    /\/storage\/v1\/object\/(public|sign)\/([^/]+)\/(.+)/
  );

  if (!match) {
    throw new Error(`URL de plantilla inválida: ${pathname}`);
  }

  return {
    bucket: match[2],
    path: match[3]
  };
}

function extractVariablesFromText(text: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const vars = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    vars.add(match[1].trim());
  }

  return Array.from(vars);
}

async function extractVariablesFromDocx(
  buffer: ArrayBuffer
): Promise<string[]> {
  const zip = await JSZip.loadAsync(buffer);
  const vars = new Set<string>();
  const regex = /\{\{([^}]+)\}\}/g;

  const xmlFiles = Object.keys(zip.files).filter(
    f => f.startsWith('word/') && f.endsWith('.xml')
  );

  for (const file of xmlFiles) {
    const content = await zip.files[file].async('text');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      vars.add(match[1].trim());
    }
  }

  return Array.from(vars);
}

/* =====================================================
   SECCIONES CLÍNICAS
===================================================== */

function detectDocumentSections(
  text: string
): DocumentSection[] {
  const patterns: { name: string; pattern: RegExp }[] = [
    { name: 'DATOS_PACIENTE', pattern: /DATOS DE LA PACIENTE/i },
    { name: 'MOTIVO_CONSULTA', pattern: /MOTIVO DE LA CONSULTA/i },
    { name: 'DIAGNOSTICO', pattern: /DIAGNÓSTICO/i },
    { name: 'PLAN_TRATAMIENTO', pattern: /PLAN DE TRATAMIENTO/i },
    { name: 'COLPOSCOPIA', pattern: /COLPOSCOPIA/i },
    { name: 'FIRMA', pattern: /FIRMA/i }
  ];

  return patterns
    .map(p => {
      const match = text.match(p.pattern);
      return match && match.index !== undefined
        ? { name: p.name, startIndex: match.index }
        : null;
    })
    .filter((v): v is DocumentSection => v !== null)
    .sort((a, b) => a.startIndex - b.startIndex);
}

/* =====================================================
   CATEGORIZACIÓN MÉDICA
===================================================== */

function categorizeVariables(
  variables: string[]
): CategorizedVariables {
  const categorized: CategorizedVariables = {
    patient: [],
    clinical: [],
    gynecology: [],
    colposcopy: [],
    other: []
  };

  for (const v of variables) {
    const l = v.toLowerCase();

    if (/(paciente|cedula|edad|nombre|apellido)/.test(l)) {
      categorized.patient.push(v);
    } else if (
      /(diagnostico|motivo|fecha|contenido)/.test(l)
    ) {
      categorized.clinical.push(v);
    } else if (
      /(fur|ultima_regla|anticonceptivo)/.test(l)
    ) {
      categorized.gynecology.push(v);
    } else if (l.startsWith('colpo')) {
      categorized.colposcopy.push(v);
    } else {
      categorized.other.push(v);
    }
  }

  return categorized;
}
