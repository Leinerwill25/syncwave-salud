import { supabaseAdmin } from '../supabase/admin';
import { callAI } from './client';

const VOICE_SYSTEM_PROMPT = `Eres el asistente de ASHIRA que genera saludos matutinos para médicos venezolanos.
Genera un saludo profesional, cálido y conciso basado en los datos JSON recibidos.

Reglas estrictas:
- Longitud: exactamente entre 200 y 280 caracteres (contar espacios)
- Tono: profesional pero cercano, como asistente ejecutivo experimentado
- Siempre comenzar con: "Buenos días, doctor/doctora {apellido}."
- Mencionar: total de citas del día, primera cita y hora de inicio
- Si hay citas sin confirmar: mencionarlo brevemente al final
- NO incluir saludos adicionales, despedidas ni texto extra
- NO inventar información que no esté en el JSON
- Idioma: español venezolano formal
- Output: solo el texto del saludo, sin comillas ni etiquetas`;

interface AgendaData {
  doctor_nombre: string;
  doctor_apellido: string;
  doctor_genero: 'M' | 'F';
  fecha: string;
  citas_confirmadas: number;
  citas_pendientes: number;
  primera_cita_hora: string | null;
  ultima_cita_hora: string | null;
  tiene_cirugias: boolean;
  alertas: string[];
}

/**
 * Genera el saludo matutino diario para un doctor.
 */
export async function generateDailyGreeting(doctorId: string): Promise<{ audio_url: string | null; greeting_text: string }> {
  const today = new Date().toISOString().split('T')[0];

  // 1. Verificar si ya se generó el saludo de hoy
  const { data: cached } = await supabaseAdmin
    .from('ai_voice_cache')
    .select('greeting_text')
    .eq('doctor_id', doctorId)
    .eq('date', today)
    .maybeSingle();

  if (cached) return { audio_url: null, greeting_text: cached.greeting_text };

  // 2. Obtener agenda del día
  const agenda = await getDoctorDailyAgenda(doctorId, today);

  // 3. Generar texto del saludo con Gemini/Groq
  const response = await callAI(VOICE_SYSTEM_PROMPT, JSON.stringify(agenda), {
    feature: 'voice',
    doctorId,
    maxTokens: 150,
    forceJSON: false
  });

  const greetingText = response.text.replace(/\{apellido\}/g, agenda.doctor_apellido);

  // 4. Guardar en caché (audio_url será siempre null ahora)
  await supabaseAdmin.from('ai_voice_cache').insert({
    doctor_id: doctorId,
    date: today,
    greeting_text: greetingText,
    audio_url: null,
    chars_used: greetingText.length
  });

  return { audio_url: null, greeting_text: greetingText };
}

/**
 * Obtiene los datos de la agenda desde la DB (Lógica simplificada para el SDK)
 */
async function getDoctorDailyAgenda(doctorId: string, date: string): Promise<AgendaData> {
  // En una implementación real, esto consultaría las tablas admin_appointments
  // Aquí simulamos la respuesta basada en la estructura requerida
  const { data: doctor } = await supabaseAdmin
    .from('users')
    .select('name')
    .eq('id', doctorId)
    .single();

  const nameParts = doctor?.name?.split(' ') || ['Doctor', ''];
  const apellido = nameParts[nameParts.length - 1];

  // Consultar citas reales (simplificado)
  const { data: appointments } = await supabaseAdmin
    .from('appointment')
    .select('status, scheduled_at')
    .eq('doctor_id', doctorId)
    .gte('scheduled_at', `${date}T00:00:00Z`)
    .lte('scheduled_at', `${date}T23:59:59Z`);

  const confirmadas = appointments?.filter(a => a.status === 'SCHEDULED' || a.status === 'APROBADA').length || 0;
  const pendientes = appointments?.filter(a => a.status === 'PENDIENTE').length || 0;

  return {
    doctor_nombre: nameParts[0],
    doctor_apellido: apellido,
    doctor_genero: 'M', // En un caso real vendría del perfil
    fecha: date,
    citas_confirmadas: confirmadas,
    citas_pendientes: pendientes,
    primera_cita_hora: '08:00', // Mock
    ultima_cita_hora: '17:00',  // Mock
    tiene_cirugias: false,
    alertas: []
  };
}

