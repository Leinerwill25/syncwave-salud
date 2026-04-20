// src/app/api/waha/session/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-guards';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { 
  wahaGetSession, 
  wahaStartSession, 
  wahaStopSession, 
  wahaGetQR,
  getSessionName 
} from '@/lib/waha/client';
import crypto from 'crypto';

/**
 * GET: Obtener estado de la sesión WAHA para la organización
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !user.organizationId) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    const sessionName = getSessionName(user.organizationId);
    let sessionInfo;

    try {
      sessionInfo = await wahaGetSession(sessionName);
    } catch (err) {
      console.warn(`[WAHA GET Session] No se pudo obtener de WAHA, usando DB para ${sessionName}`);
      const { data: dbSession } = await supabaseAdmin
        .from('waha_sessions')
        .select('*')
        .eq('organization_id', user.organizationId)
        .maybeSingle();
      
      return NextResponse.json({ ...(dbSession || { status: 'STOPPED' }), success: true });
    }

    // Sincronizar con DB (Upsert)
    const normalizedStatus = (sessionInfo.status || 'STOPPED').toUpperCase();
    
    const upsertData: any = {
      organization_id: user.organizationId,
      session_name: sessionName,
      status: normalizedStatus,
      connected_phone: sessionInfo.me?.id.split('@')[0] || null,
      updated_at: new Date().toISOString(),
    };

    // Si la sesión está esperando QR, intentamos obtenerlo para el frontend
    const isWaitingQr = normalizedStatus.includes('QR') || normalizedStatus === 'STARTING';
    
    if (isWaitingQr) {
      const qrCode = await wahaGetQR(sessionName);
      if (qrCode) {
        upsertData.qr_code_base64 = qrCode;
        upsertData.qr_expires_at = new Date(Date.now() + 40000).toISOString();
      }
    }

    const { data: updatedSession, error: dbError } = await supabaseAdmin
      .from('waha_sessions')
      .upsert(upsertData, { onConflict: 'organization_id' })
      .select()
      .single();

    if (dbError) {
      console.error('[WAHA GET Session] Error DB:', dbError);
    }

    const responseData = { 
      ...(updatedSession || upsertData), 
      qr: (updatedSession || upsertData).qr_code_base64,
      qrCode: (updatedSession || upsertData).qr_code_base64,
      success: true 
    };

    console.log('[WAHA API Response]', {
      status: responseData.status,
      hasQr: !!responseData.qrCode,
      orgId: user.organizationId
    });

    return NextResponse.json(responseData);
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.message;
    const isConnError = error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT';
    
    console.error('[WAHA GET Session] Error:', {
      message: errorMsg,
      code: error.code,
      url: process.env.WAHA_BASE_URL || process.env.WAHA_API_URL
    });

    return NextResponse.json({ 
      error: isConnError ? 'No se pudo conectar con el servidor de WhatsApp. Verifique la URL de WAHA.' : errorMsg,
      code: error.code,
      success: false 
    }, { status: 500 });
  }
}

/**
 * POST: Iniciar sesión (comenzar proceso de QR)
 */
export async function POST() {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !user.organizationId) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    const sessionName = getSessionName(user.organizationId);
    
    // Iniciar en WAHA (esto es asíncrono en WAHA)
    await wahaStartSession(sessionName);

    // Generar secreto para el webhook si no existe (según .env.local preferiblemente)
    const webhookSecret = process.env.WAHA_WEBHOOK_SECRET || crypto.randomBytes(32).toString('hex');

    // Registrar en DB
    const { error: dbError } = await supabaseAdmin
      .from('waha_sessions')
      .upsert({
        organization_id: user.organizationId,
        session_name: sessionName,
        status: 'STARTING',
        waha_webhook_secret: webhookSecret,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id' });

    if (dbError) {
      throw dbError;
    }

    return NextResponse.json({ success: true, session_name: sessionName });
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.message;
    const isConnError = error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT';

    console.error('[WAHA POST Session] Error Crítico:', {
      message: errorMsg,
      code: error.code,
      stack: error.stack
    });

    return NextResponse.json({ 
      error: isConnError ? 'Error de conexión con el servidor WAHA en producción.' : errorMsg,
      details: error.code,
      success: false 
    }, { status: 500 });
  }
}

/**
 * DELETE: Desconectar y cerrar sesión
 */
export async function DELETE() {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !user.organizationId) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    const sessionName = getSessionName(user.organizationId);

    // Detener en WAHA (usamos logout: true para limpiar caché)
    try {
      await wahaStopSession(sessionName);
    } catch (err: any) {
      console.warn('[WAHA DELETE Session] Error deteniendo en WAHA:', err.message);
    }

    // Actualizar DB para permitir un nuevo comienzo limpio
    await supabaseAdmin
      .from('waha_sessions')
      .update({
        status: 'STOPPED',
        qr_code_base64: null,
        qr_expires_at: null,
        connected_phone: null,
        disconnected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', user.organizationId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[WAHA DELETE Session] Error:', error);
    return NextResponse.json({ error: error.message, success: false }, { status: 500 });
  }
}
