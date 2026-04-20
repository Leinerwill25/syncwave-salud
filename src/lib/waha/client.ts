// src/lib/waha/client.ts
import axios from 'axios';

const WAHA_BASE_URL = process.env.WAHA_API_URL || process.env.WAHA_BASE_URL || 'http://localhost:3001';
const WAHA_API_KEY = process.env.WHATSAPP_API_KEY || process.env.WAHA_API_KEY || '';
const WAHA_VERSION = process.env.WAHA_VERSION || 'CORE';

/**
 * Tipos básicos para WAHA
 */
export interface WAHASession {
  name: string;
  status: 'STOPPED' | 'STARTING' | 'SCAN_QR' | 'WORKING' | 'FAILED';
  config?: any;
  me?: {
    id: string;
    pushname: string;
  };
}

export interface WAHAMessage {
  id: string;
  timestamp: number;
  from: string;
  to: string;
  body: string;
}

/**
 * Cliente centralizado para WAHA
 */
const wahaApi = axios.create({
  baseURL: WAHA_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': WAHA_API_KEY,
  },
});

/**
 * Obtiene el nombre efectivo de la sesión según la versión de WAHA.
 * Si es modo CORE, siempre retorna 'default'.
 */
export function getEffectiveSessionName(logicalName: string): string {
  if (WAHA_VERSION === 'CORE') {
    return 'default';
  }
  return logicalName;
}

/**
 * Obtiene el session_name estándar desde el organization_id
 */
export function getSessionName(organizationId: string): string {
  return `org_${organizationId.replace(/-/g, '')}`;
}

/**
 * Limpia y normaliza el número para WAHA (ChatId)
 * Regla: quitar todo excepto dígitos, si no empieza con 58 agregarlo, añadir @c.us
 */
export function phoneToWahaChatId(phone: string): string {
  if (!phone) return '';
  
  // Limpiar caracteres no numéricos
  let clean = phone.replace(/\D/g, '');
  
  // Si empieza con 0, usualmente es el 0 del código de área local
  if (clean.startsWith('0')) {
    clean = clean.substring(1);
  }

  // Si no empieza con 58 y tiene el largo esperado de un celular venezolano sin el 58 (10 dígitos)
  if (!clean.startsWith('58') && clean.length === 10) {
    clean = '58' + clean;
  }
  
  // Asegurar que termina en @c.us si no lo tiene
  if (!clean.endsWith('@c.us')) {
    clean = `${clean}@c.us`;
  }
  
  return clean;
}

/**
 * API: Obtener sesión
 */
export async function wahaGetSession(sessionName: string): Promise<WAHASession> {
  const effectiveName = getEffectiveSessionName(sessionName);
  try {
    const { data } = await wahaApi.get(`/api/sessions/${effectiveName}`);
    return data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return { name: sessionName, status: 'STOPPED' };
    }
    throw error;
  }
}

/**
 * API: Iniciar sesión con configuración de Webhook
 */
export async function wahaStartSession(sessionName: string): Promise<void> {
  const effectiveName = getEffectiveSessionName(sessionName);
  const webhookUrl = process.env.WAHA_WEBHOOK_URL || process.env.NEXT_PUBLIC_APP_URL + '/api/waha/webhook';
  
  const config = {
    name: effectiveName,
    config: {
      webhook: {
        url: webhookUrl,
        events: ['message', 'session.status', 'message.revoked'],
        hmac: WAHA_API_KEY || 'ashira_secret_key_2026'
      }
    }
  };

  try {
    console.log(`[WAHA] Iniciando sesión '${effectiveName}' con webhook: ${webhookUrl}`);
    await wahaApi.post('/api/sessions/start', config);
  } catch (error: any) {
    if (error.response?.status === 422) {
      console.warn(`[WAHA] Sesión '${effectiveName}' ya activa. Intentando actualizar configuración...`);
      // Opcional: Podríamos llamar a un endpoint de update si estuviera disponible, 
      // pero usualmente un stop/start es más limpio.
      return;
    }
    throw error;
  }
}

/**
 * API: Detener sesión
 */
export async function wahaStopSession(sessionName: string): Promise<void> {
  const effectiveName = getEffectiveSessionName(sessionName);
  try {
    await wahaApi.post('/api/sessions/stop', { name: effectiveName, logout: true });
  } catch (error: any) {
    // Si ya está detenida o no existe, ignoramos el error
    if (error.response?.status === 404 || error.response?.status === 400) {
      return;
    }
    throw error;
  }
}

/**
 * API: Obtener QR (Base64)
 */
export async function wahaGetQR(sessionName: string): Promise<string | null> {
  const effectiveName = getEffectiveSessionName(sessionName);
  const path = `/api/${effectiveName}/auth/qr`;
  try {
    const { data } = await wahaApi.get(path, {
      headers: {
        'Accept': 'application/json'
      }
    });
    // Si WAHA devuelve { mimetype, data }
    if (data && data.data) {
      return `data:${data.mimetype || 'image/png'};base64,${data.data}`;
    }
    return null;
  } catch (err: any) {
    console.error(`[WAHA Client] Error obteniendo QR desde ${path}:`, err.response?.data || err.message);
    return null;
  }
}

/**
 * API: Marcar como visto (Seen)
 */
export async function wahaSendSeen(sessionName: string, chatId: string): Promise<void> {
  const effectiveName = getEffectiveSessionName(sessionName);
  await wahaApi.post('/api/sendSeen', { session: effectiveName, chatId });
}

/**
 * API: Iniciar estado "Escribiendo"
 */
export async function wahaStartTyping(sessionName: string, chatId: string): Promise<void> {
  const effectiveName = getEffectiveSessionName(sessionName);
  await wahaApi.post('/api/startTyping', { session: effectiveName, chatId });
}

/**
 * API: Detener estado "Escribiendo"
 */
export async function wahaStopTyping(sessionName: string, chatId: string): Promise<void> {
  const effectiveName = getEffectiveSessionName(sessionName);
  await wahaApi.post('/api/stopTyping', { session: effectiveName, chatId });
}

/**
 * API: Enviar texto simple
 */
export async function wahaSendText(sessionName: string, chatId: string, text: string): Promise<WAHAMessage> {
  const effectiveName = getEffectiveSessionName(sessionName);
  const { data } = await wahaApi.post('/api/sendText', {
    session: effectiveName,
    chatId,
    text,
  });
  return data;
}

/**
 * SMART SENDER con Lógica Anti-Bloqueo
 */
export async function wahaSmartSend(sessionName: string, chatId: string, text: string): Promise<WAHAMessage> {
  console.log(`[WAHA] Enviando mensaje a ${chatId}...`);
  
  try {
    // En versión Core gratuita algunas funciones como startTyping pueden fallar
    // Las ejecutamos opcionalmente
    await wahaSendSeen(sessionName, chatId).catch(() => {});
    
    // Delay humano simple antes de enviar (2 segundos mínimo)
    await new Promise(r => setTimeout(r, 2000));
    
    const result = await wahaSendText(sessionName, chatId, text);
    
    console.log(`[WAHA] Mensaje enviado existosamente`);
    return result;
  } catch (error: any) {
    console.error(`[WAHA] Error en SmartSend:`, error.response?.data || error.message);
    throw error;
  }
}
