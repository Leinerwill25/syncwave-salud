// src/app/api/waha/webhook/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizePatientResponse } from '@/lib/waha/response-normalizer';
import { wahaSmartSend } from '@/lib/waha/client';
import { createServerNotification } from '@/lib/server-notifications';
import * as fs from 'fs';

/**
 * El Webhook recibe eventos de WAHA.
 */
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { event, session, payload: data } = payload;
    const logPrefix = `[${new Date().toISOString()}] [WAHA]`;
    
    console.log(`${logPrefix} Evento: ${event} | Sesión física: ${session}`);

    // 1. Identificar la Organización
    let organizationId: string | null = null;
    let logicalSessionName: string | null = null;

    if (session === 'default') {
      // BUSQUEDA ROBUSTA: Primero intentamos con sesiones activas
      const { data: activeSessions } = await supabaseAdmin
        .from('waha_sessions')
        .select('organization_id, session_name, status')
        .neq('status', 'STOPPED')
        .order('updated_at', { ascending: false });

      if (activeSessions && activeSessions.length > 0) {
        organizationId = activeSessions[0].organization_id;
        logicalSessionName = activeSessions[0].session_name;
      } else {
        // RESPALDO: Si no hay "activa" según la DB, pero estamos recibiendo un evento,
        // intentamos obtener la organización más reciente que tenga una sesión configurada.
        const { data: fallback } = await supabaseAdmin
          .from('waha_sessions')
          .select('organization_id, session_name')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (fallback) {
          organizationId = fallback.organization_id;
          logicalSessionName = fallback.session_name;
          fs.appendFileSync('waha_webhook_debug.log', `${logPrefix} Usando RESPALDO para org ${organizationId}\n`);
        }
      }
    } else {
      // Sesión con nombre personalizado
      const { data: dbSession } = await supabaseAdmin
        .from('waha_sessions')
        .select('organization_id, session_name')
        .eq('session_name', session)
        .maybeSingle();
      
      if (dbSession) {
        organizationId = dbSession.organization_id;
        logicalSessionName = dbSession.session_name;
      }
    }

    if (!organizationId) {
      fs.appendFileSync('waha_webhook_debug.log', `${logPrefix} ERROR: No se identificó organización para sesión ${session}\n`);
      return NextResponse.json({ ok: true });
    }

    // 2. Manejo por tipo de evento
    if (event === 'session.status') {
      fs.appendFileSync('waha_webhook_debug.log', `${logPrefix} ESTATUS: ${data.status} para org ${organizationId}\n`);
      await handleSessionStatus(organizationId, data.status, data);
    } else if (event === 'message' && data.fromMe === false) {
      const from = data.from.split('@')[0];
      fs.appendFileSync('waha_webhook_debug.log', `${logPrefix} MENSAJE ENTRANTE de ${from}: ${data.body}\n`);
      await handleIncomingMessage(organizationId, logicalSessionName || session, data);
    }

    return NextResponse.json({ ok: true });

    return NextResponse.json({ ok: true });

  } catch (error: any) {
    const errorMsg = `[${new Date().toISOString()}] [WAHA] CRASH CRÍTICO POST: ${error.message}\n${error.stack}\n`;
    fs.appendFileSync('waha_webhook_debug.log', errorMsg);
    console.error('[WAHA Webhook] Error Crítico:', error);
    return NextResponse.json({ ok: true, error: error.message });
  }
}

/**
 * Maneja cambios de estado de la sesión WAHA
 */
async function handleSessionStatus(orgId: string, status: string, data: any) {
  const updateData: any = {
    status: status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'WORKING' && data.me?.id) {
    updateData.connected_phone = data.me.id.split('@')[0];
    updateData.connected_at = new Date().toISOString();
  } else if (status === 'STOPPED') {
    updateData.connected_phone = null;
    updateData.disconnected_at = new Date().toISOString();
  }

  await supabaseAdmin
    .from('waha_sessions')
    .update(updateData)
    .eq('organization_id', orgId);
}

/**
 * Maneja mensajes entrantes de pacientes
 */
async function handleIncomingMessage(orgId: string, sessionName: string, message: any) {
  const logPrefix = `[${new Date().toISOString()}] [WAHA] [LOGIC]`;
  fs.appendFileSync('waha_webhook_debug.log', `${logPrefix} VERIFICANDO PAYLOAD: ${JSON.stringify(message)}\n`);

  // Solo procesar si es texto (chat) o si el tipo no está definido (Waha por defecto)
  const isValidType = !message.type || message.type === 'chat' || message.type === 'text';
  if (!isValidType) {
    fs.appendFileSync('waha_webhook_debug.log', `${logPrefix} TIPO IGNORADO: ${message.type}\n`);
    return;
  }

  const patientPhone = message.from?.split('@')[0] || 'unknown';
  const body = message.body || '';

  // 1. Buscar conversación activa
  let conversation = null;
  try {
    fs.appendFileSync('waha_webhook_debug.log', `${logPrefix} Buscando conversación para ${message.from}...\n`);
    
    const { data: conv, error: queryError } = await supabaseAdmin
      .from('whatsapp_conversations')
      .select(`
        *,
        appointment:appointment_id (
          *,
          doctor:doctor_id (name)
        )
      `)
      .eq('waha_chat_id', message.from)
      .in('status', ['ACTIVE', 'WAITING_PATIENT'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (queryError) {
      fs.appendFileSync('waha_webhook_debug.log', `${logPrefix} ERROR SUPABASE QUERY: ${JSON.stringify(queryError)}\n`);
    }
    conversation = conv;
  } catch (err: any) {
    fs.appendFileSync('waha_webhook_debug.log', `${logPrefix} CRASH EN BUSQUEDA: ${err.message}\n`);
  }

  if (!conversation) {
    try {
      fs.appendFileSync('waha_webhook_debug.log', `${logPrefix} Reintento búsqueda global por teléfono...\n`);
      const { data: fallbackConv } = await supabaseAdmin
        .from('whatsapp_conversations')
        .select('*, appointment:appointment_id (*)')
        .eq('patient_phone', patientPhone)
        .in('status', ['ACTIVE', 'WAITING_PATIENT'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      conversation = fallbackConv;
    } catch (err: any) {
      fs.appendFileSync('waha_webhook_debug.log', `${logPrefix} CRASH EN FALLBACK: ${err.message}\n`);
    }
  }


  if (!conversation || !conversation.id) {
    fs.appendFileSync('waha_webhook_debug.log', `${logPrefix} [LOGIC] Sin conversación activa para ${patientPhone}. Ignorando.\n`);
    return;
  }

  // REAJUSTE DE ORG ID: Usamos la de la conversación real
  const actualOrgId = conversation.organization_id;
  fs.appendFileSync('waha_webhook_debug.log', `${logPrefix} [LOGIC] Vinculado a org ${actualOrgId} | Cita: ${conversation.appointment_id}\n`);

  // 2. Registrar el mensaje entrante
  const { data: msgRow, error: insertError } = await supabaseAdmin
    .from('whatsapp_messages')
    .insert({
      organization_id: actualOrgId,
      conversation_id: conversation.id,
      appointment_id: conversation.appointment_id,
      direction: 'INBOUND',
      from_number: patientPhone,
      to_number: 'ME',
      body: body,
      message_type: 'PATIENT_REPLY',
      delivery_status: 'READ',
      patient_raw_reply: body,
    })
    .select()
    .single();

  if (insertError || !msgRow) {
    fs.appendFileSync('waha_webhook_debug.log', `${logPrefix} ERROR DB INSERT: ${JSON.stringify(insertError)}\n`);
    return;
  }


  // 3. Normalizar respuesta (Intención)
  const intent = normalizePatientResponse(body);

  // 4. Actualizar estado de procesamiento
  await supabaseAdmin
    .from('whatsapp_messages')
    .update({ 
      normalized_response: intent,
      processed_at: new Date().toISOString() 
    })
    .eq('id', msgRow.id);

  await supabaseAdmin
    .from('whatsapp_conversations')
    .update({ 
      last_inbound_at: new Date().toISOString(),
      status: intent === 'UNKNOWN' ? 'WAITING_PATIENT' : intent
    })
    .eq('id', conversation.id);

  // 5. Lógica de negocio según intención
  if (intent === 'CONFIRMED') {
    await handleConfirmation(orgId, sessionName, conversation);
  } else if (intent === 'DENIED') {
    await handleDenial(orgId, sessionName, conversation);
  } else {
    await handleUnknown(orgId, conversation, body);
  }
}

async function handleConfirmation(orgId: string, session: string, conv: any) {
  // Actualizar Cita
  await supabaseAdmin
    .from('appointment')
    .update({
      status: 'CONFIRMADA',
      wa_confirmation_status: 'CONFIRMED',
      wa_confirmed_at: new Date().toISOString()
    })
    .eq('id', conv.appointment_id);

  // Enviar agradecimiento automático con el nombre del doctor si está disponible
  const doctorName = conv.appointment?.doctor?.name ? `Dra. ${conv.appointment.doctor.name}` : '';
  const successMsg = `✅ ¡Perfecto! He confirmado su asistencia${doctorName ? ` con la ${doctorName}` : ''}. ¡Le esperamos! 😊`;
  
  await wahaSmartSend(session, conv.waha_chat_id, successMsg);

  // Notificación para el personal
  const doctorId = conv.appointment?.doctor_id;
  if (doctorId) {
    await createServerNotification({
      userId: doctorId,
      organizationId: orgId,
      type: 'WHATSAPP_CONFIRMED',
      title: '✅ Cita confirmada por WhatsApp',
      message: `El paciente ha confirmado su cita para el ${new Date(conv.appointment.scheduled_at).toLocaleDateString()}.`,
      payload: { appointmentId: conv.appointment_id }
    });
  }
}

async function handleDenial(orgId: string, session: string, conv: any) {
  // Solo marcamos estatus, no cancelamos por precaución médica
  await supabaseAdmin
    .from('appointment')
    .update({
      wa_confirmation_status: 'DENIED'
    })
    .eq('id', conv.appointment_id);

  // Responder cortésmente
  await wahaSmartSend(session, conv.waha_chat_id, 'Entendido. Le informaremos al consultorio para que se contacten con usted y coordinar el cambio.');

  // Notificación URGENTE
  const doctorId = conv.appointment?.doctor_id;
  await createServerNotification({
    userId: doctorId,
    organizationId: orgId,
    type: 'WHATSAPP_DENIED',
    title: '⚠️ Paciente NO asistirá',
    message: `Un paciente indicó que NO puede asistir. Por favor, revise el chat para reagendar.`,
    payload: { appointmentId: conv.appointment_id, conversationId: conv.id }
  });
}

async function handleUnknown(orgId: string, conv: any, rawBody: string) {
  // Actualizar estado en la cita
  await supabaseAdmin
    .from('appointment')
    .update({
      wa_confirmation_status: 'UNKNOWN'
    })
    .eq('id', conv.appointment_id);

  const doctorId = conv.appointment?.doctor_id;
  await createServerNotification({
    userId: doctorId,
    organizationId: orgId,
    type: 'WHATSAPP_UNKNOWN',
    title: '💬 Mensaje sin reconocer',
    message: `Respuesta recibida: "${rawBody.substring(0, 40)}...". Requiere revisión manual.`,
    payload: { appointmentId: conv.appointment_id, conversationId: conv.id }
  });
}
