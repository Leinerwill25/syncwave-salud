// src/app/api/waha/send/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-guards';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { 
  wahaSmartSend, 
  getSessionName, 
  phoneToWahaChatId 
} from '@/lib/waha/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { createServerNotification } from '@/lib/server-notifications';

/**
 * POST: Enviar un mensaje de WhatsApp a un paciente
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !user.organizationId) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    const { appointmentId, messageType, customMessage } = await request.json();

    if (!appointmentId || !messageType) {
      return NextResponse.json({ error: 'Missing parameters', success: false }, { status: 400 });
    }

    // 1. Obtener datos de la cita con Joins necesarios
    const { data: appointment, error: appError } = await supabaseAdmin
      .from('appointment')
      .select(`
        *,
        patient:patient_id (id, first_name, last_name, phone),
        unregistered_patient:unregistered_patient_id (id, full_name, phone),
        doctor:doctor_id (id, first_name, last_name, medic_profile (whatsapp_message_template)),
        organization:organization_id (id, legal_name, tradename)
      `)
      .eq('id', appointmentId)
      .single();

    if (appError || !appointment) {
      return NextResponse.json({ error: 'Appointment not found', success: false }, { status: 404 });
    }

    // 2. Determinar destinatario y número
    const patientName = appointment.patient 
      ? `${appointment.patient.first_name} ${appointment.patient.last_name}`
      : appointment.unregistered_patient?.full_name || 'Paciente';
    
    const rawPhone = appointment.patient?.phone || appointment.unregistered_patient?.phone;

    if (!rawPhone) {
      return NextResponse.json({ error: 'Patient phone not found', success: false }, { status: 400 });
    }

    // 3. Verificar estado de la sesión WAHA
    const { data: session } = await supabaseAdmin
      .from('waha_sessions')
      .select('status, session_name')
      .eq('organization_id', user.organizationId)
      .maybeSingle();

    if (!session || session.status !== 'WORKING') {
      return NextResponse.json({ error: 'WhatsApp session not ready (not WORKING)', success: false }, { status: 400 });
    }

    // 4. Construir el mensaje según el tipo
    let finalMessage = '';

    if (messageType === 'REMINDER') {
      const template = customMessage || 
                       appointment.doctor?.medic_profile?.whatsapp_message_template || 
                       "Hola {NOMBRE_PACIENTE}, le recordamos su cita el {FECHA} a las {HORA} con el Dr/a {NOMBRE_DOCTORA} en {CLINICA}. Por favor confirmar con un 'Asistiré' o 'No Asistiré'";

      // Preparar variables de fecha/hora (Venezuela Format)
      const scheduledDate = new Date(appointment.scheduled_at);
      const fechaStr = format(scheduledDate, "eeee dd 'de' MMMM", { locale: es });
      const horaStr = format(scheduledDate, 'hh:mm a');

      finalMessage = template
        .replace(/{NOMBRE_PACIENTE}/g, patientName)
        .replace(/{FECHA}/g, fechaStr)
        .replace(/{HORA}/g, horaStr)
        .replace(/{NOMBRE_DOCTORA}/g, `${appointment.doctor.first_name} ${appointment.doctor.last_name}`)
        .replace(/{CLINICA}/g, appointment.organization?.tradename || appointment.organization?.legal_name || 'Syncwave Salud')
        .replace(/{SERVICIOS}/g, appointment.reason || 'Consulta Médica');
    } else if (messageType === 'ONE_CLICK_CONFIRM') {
      finalMessage = `Hola ${patientName}, ¿podría confirmarnos si asistirá a su cita de hoy? Responda "Asistiré" o "No Asistiré".`;
    } else if (messageType === 'RESULT_NOTIFICATION') {
      finalMessage = `Hola ${patientName}, sus resultados médicos ya están disponibles en su portal. Atentamente, ${appointment.organization?.tradename || 'el equipo médico'}.`;
    }

    // 5. Enviar vía WAHA (Smart Send)
    const chatId = phoneToWahaChatId(rawPhone);
    const sessionName = getSessionName(user.organizationId);

    // Buscar o crear conversación
    let { data: conversation } = await supabaseAdmin
      .from('whatsapp_conversations')
      .select('id')
      .eq('appointment_id', appointmentId)
      .maybeSingle();

    if (!conversation) {
      const { data: newConv, error: convErr } = await supabaseAdmin
        .from('whatsapp_conversations')
        .insert({
          organization_id: user.organizationId,
          appointment_id: appointmentId,
          patient_id: appointment.patient_id,
          unregistered_patient_id: appointment.unregistered_patient_id,
          patient_phone: rawPhone,
          waha_chat_id: chatId,
          status: 'ACTIVE',
          context: messageType
        })
        .select()
        .single();
      
      if (convErr || !newConv) throw convErr || new Error('Error al crear la conversación de WhatsApp');
      conversation = newConv;
    }

    if (!conversation) throw new Error('No se pudo establecer la conversación de WhatsApp');

    // Registrar mensaje saliente ANTES de enviar
    const { data: messageLog, error: msgLogErr } = await supabaseAdmin
      .from('whatsapp_messages')
      .insert({
        organization_id: user.organizationId,
        conversation_id: conversation.id,
        appointment_id: appointmentId,
        direction: 'OUTBOUND',
        from_number: session.session_name,
        to_number: rawPhone,
        body: finalMessage,
        message_type: messageType,
        delivery_status: 'QUEUED'
      })
      .select()
      .single();

    if (msgLogErr) throw msgLogErr;

    // Llamada real a WAHA
    const wahaResult = await wahaSmartSend(sessionName, chatId, finalMessage);

    // Actualizar log y Cita
    await supabaseAdmin
      .from('whatsapp_messages')
      .update({ 
        delivery_status: 'SENT',
        waha_message_id: wahaResult.id
      })
      .eq('id', messageLog.id);

    if (messageType === 'REMINDER') {
      await supabaseAdmin
        .from('appointment')
        .update({ 
          wa_reminder_sent_at: new Date().toISOString(),
          wa_conversation_id: conversation.id
        })
        .eq('id', appointmentId);
      
      // Notificación interna
      await createServerNotification({
        userId: appointment.doctor_id,
        organizationId: appointment.organization_id,
        type: 'WHATSAPP_REMINDER_SENT',
        title: '📱 Recordatorio enviado',
        message: `Recordatorio enviado a ${patientName} para su cita del ${format(new Date(appointment.scheduled_at), 'dd/MM')}`,
        payload: { appointmentId: appointment.id }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message_id: wahaResult.id, 
      conversation_id: conversation.id 
    });

  } catch (error: any) {
    console.error('[WAHA POST Send] Error:', error);
    return NextResponse.json({ error: error.message, success: false }, { status: 500 });
  }
}
