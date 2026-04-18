import { supabaseAdmin } from '../supabase/admin';
import { callAI } from './client';

const MEMORY_SYSTEM_PROMPT = `Eres el sistema de memoria clínica de ASHIRA.
Genera resúmenes del historial médico para médicos venezolanos antes de una consulta.
Responde SOLO en JSON válido con esta estructura:

{
  "resumen_narrativo": string,
  "diagnosticos_activos": string[],
  "medicamentos_vigentes": {"nombre": string, "dosis": string}[],
  "ultima_consulta_motivo": string,
  "evolucion_general": "MEJORIA"|"ESTABLE"|"DETERIORO"|"PRIMERA_VEZ",
  "alertas_clinicas": string[],
  "punto_de_partida": string
}

Reglas estrictas:
- resumen_narrativo: máximo 120 palabras, narración cronológica compacta
- punto_de_partida: 1 frase de orientación para la consulta de hoy (máximo 25 palabras)
- alertas_clinicas: solo hallazgos críticos (alergias, contraindicaciones, valores críticos)
- Si es primera consulta: evolucion_general = "PRIMERA_VEZ", arrays vacíos
- NO interpretes ni diagnostiques, solo sintetiza lo registrado
- NO incluyas texto fuera del JSON
- Idioma: español clínico venezolano`;

export interface PatientSummary {
  resumen_narrativo: string;
  diagnosticos_activos: string[];
  medicamentos_vigentes: { nombre: string; dosis: string }[];
  ultima_consulta_motivo: string;
  evolucion_general: 'MEJORIA' | 'ESTABLE' | 'DETERIORO' | 'PRIMERA_VEZ';
  alertas_clinicas: string[];
  punto_de_partida: string;
}

/**
 * Obtiene el resumen inteligente del historial del paciente.
 */
export async function getPatientSummary(patientId: string): Promise<{ summary: PatientSummary; source: 'cache' | 'api' }> {
  
  // 1. Obtener hash del estado actual del historial vía RPC de Postgres
  const { data: historyState, error: hashErr } = await supabaseAdmin.rpc('get_patient_history_hash', {
    p_patient_id: patientId
  });

  if (hashErr) {
    console.error('Error calculando hash de historial:', hashErr);
    throw hashErr;
  }

  const currentHash = historyState.hash;

  // 2. Verificar si existe resumen válido en caché
  const { data: cached } = await supabaseAdmin
    .from('ai_memory_cache')
    .select('summary')
    .eq('patient_id', patientId)
    .eq('history_hash', currentHash)
    .maybeSingle();

  if (cached) {
    return { summary: cached.summary, source: 'cache' };
  }

  // 3. Construir payload compacto
  const historyPayload = await buildCompactPayload(patientId);

  // 4. Llamar a Gemini/Groq
  const response = await callAI(MEMORY_SYSTEM_PROMPT, JSON.stringify(historyPayload), {
    feature: 'memory',
    patientId,
    maxTokens: 500,
    forceJSON: true
  });

  const parsed = JSON.parse(response.text) as PatientSummary;

  // 5. Guardar en caché con el hash actual (upsert)
  await supabaseAdmin.from('ai_memory_cache').upsert({
    patient_id: patientId,
    history_hash: currentHash,
    summary: parsed,
    tokens_used: response.tokensIn + response.tokensOut,
    generated_at: new Date().toISOString()
  }, { onConflict: 'patient_id' });

  return { summary: parsed, source: 'api' };
}

/**
 * Construye el objeto de datos esenciales para el historial.
 */
async function buildCompactPayload(patientId: string) {
  const [consultationsRes, patientRes] = await Promise.all([
    supabaseAdmin.from('consultation')
      .select('created_at, chief_complaint, diagnosis, notes')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(5),
    
    supabaseAdmin.from('patient')
      .select('allergies, medical_history, current_medications')
      .eq('id', patientId)
      .single()
  ]);

  return {
    consultas_recientes: consultationsRes.data?.map(c => ({
      fecha: c.created_at,
      motivo: c.chief_complaint,
      diagnostico: c.diagnosis,
      notas: c.notes
    })) || [],
    alergias_conocidas: patientRes.data?.allergies || [],
    antecedentes_relevantes: patientRes.data?.medical_history || '',
    medicamentos_actuales: patientRes.data?.current_medications || ''
  };
}
