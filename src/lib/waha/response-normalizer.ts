// src/lib/waha/response-normalizer.ts

export type NormalizedResponse = 'CONFIRMED' | 'DENIED' | 'UNKNOWN';

/**
 * Normaliza y detecta la intención de la respuesta de un paciente.
 * Diseñado específicamente para variaciones lingüísticas en América Latina (y Venezuela).
 */
export function normalizePatientResponse(text: string): NormalizedResponse {
  if (!text || text.trim().length === 0) return 'UNKNOWN';

  // 1. Normalización de texto
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
    .trim()
    .replace(/\s+/g, ' ');

  // 2. Si es muy corto y no es un emoji de confirmación, marcar como desconocido
  const isEmojiConfirmation = /^(👍|✅|☑️|👌|🆗)$/.test(normalized);
  if (normalized.length < 2 && !isEmojiConfirmation) {
    return 'UNKNOWN';
  }

  // 3. Patrones de NEGACIÓN (Revisar antes que confirmación para evitar falsos positivos)
  const DENIED_PATTERNS = [
    'no asistire',
    'no podre',
    'no podre ir',
    'no voy a poder',
    'no puedo',
    'no voy',
    'no ire',
    'cancela',
    'cancelar',
    'cancelame',
    'cancela mi cita',
    'quiero cancelar',
    'no me es posible',
    'imposible',
    'no puedo asistir',
    'no puedo ir',
    'no voy a ir',
    'reagendar',
    'reagendame',
    'cambiar la cita',
    'no llego',
    'no puedo llegar',
    'se me complica',
    'complicado',
    'no me queda',
    'no me queda bien',
    '❌',
    '🚫',
  ];

  // 4. Patrones de CONFIRMACIÓN
  const CONFIRMED_PATTERNS = [
    'asistire',
    'ahi estare',
    'confirmo',
    'confirmado',
    'confirmada',
    'alli estare',
    'voy a ir',
    'voy ir',
    'ire',
    'cuenta con ello',
    'cuenta conmigo',
    'de acuerdo',
    'ok',
    'okay',
    'okey',
    'perfecto',
    'listo',
    'claro',
    'si',
    'sí',
    'por supuesto',
    'claro que si',
    'nos vemos',
    'alli voy',
    'alla voy',
    'a la orden',
    'con gusto',
    '👍',
    '✅',
    '☑️',
    'estare alla',
    'estare alli'
  ];

  // Paso 3: Evaluar NEGACIÓN
  for (const pattern of DENIED_PATTERNS) {
    if (normalized.includes(pattern)) {
      return 'DENIED';
    }
  }

  // Paso 4: Evaluar CONFIRMACIÓN
  for (const pattern of CONFIRMED_PATTERNS) {
    // Si es "si" o "sí", debe ser palabra exacta o estar al inicio para evitar 
    // matchear palabras que contienen "si" (ej: "sillon")
    if (pattern === 'si' || pattern === 'sí') {
      const words = normalized.split(' ');
      if (words.includes('si') || words.includes('sí') || normalized === 'si' || normalized === 'sí') {
        return 'CONFIRMED';
      }
      continue;
    }

    if (normalized.includes(pattern)) {
      return 'CONFIRMED';
    }
  }

  // Paso 5: Casos especiales (Preguntas o Ambiguos)
  if (normalized.includes('?') || normalized.length > 100) {
    return 'UNKNOWN';
  }

  return 'UNKNOWN';
}
