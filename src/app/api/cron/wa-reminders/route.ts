// src/app/api/cron/wa-reminders/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { 
  wahaSmartSend, 
  getSessionName, 
  phoneToWahaChatId 
} from '@/lib/waha/client';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { createServerNotification } from '@/lib/server-notifications';

/**
 * CRON JOB: Envía recordatorios automáticos de WhatsApp para las citas del día siguiente.
 * Basado en el Mapa Maestro de DB (v1.0).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('appointmentId');

    const tomorrow = addDays(new Date(), 1);
    const startOfTomorrow = new Date(tomorrow.setHours(0, 0, 0, 0)).toISOString();
    const endOfTomorrow = new Date(tomorrow.setHours(23, 59, 59, 999)).toISOString();

    if (appointmentId) {
      console.log(`[CRON WA] Procesando cita específica: ${appointmentId}`);
      const { data: app, error: appError } = await supabaseAdmin
        .from('appointment')
        .select(`
          *,
          patient:patient_id (id, firstName, lastName, phone),
          unregistered_patient:unregistered_patient_id (*),
          doctor:doctor_id (id, name, medic_profile:medic_profile (whatsapp_message_template)),
          organization:organization_id (id, name)
        `)
        .eq('id', appointmentId)
        .maybeSingle();

      if (appError || !app) {
        return NextResponse.json({ error: 'Cita no encontrada', details: appError, success: false }, { status: 404 });
      }

      const { data: session } = await supabaseAdmin
        .from('waha_sessions')
        .select('status, session_name')
        .eq('organization_id', app.organization_id)
        .maybeSingle();

      if (!session || session.status !== 'WORKING') {
        return NextResponse.json({ error: 'Sesión WAHA no lista', success: false }, { status: 400 });
      }

      await sendOneReminder(app, session.session_name);
      return NextResponse.json({ success: true, sent: 1 });
    }

    const { data: activeSessions } = await supabaseAdmin
      .from('waha_sessions')
      .select('organization_id, session_name')
      .eq('status', 'WORKING');

    if (!activeSessions || activeSessions.length === 0) {
      return NextResponse.json({ message: 'No active WhatsApp sessions found.', success: true });
    }

    let totalSent = 0;
    for (const session of activeSessions) {
      const { data: appointments } = await supabaseAdmin
        .from('appointment')
        .select(`
          *,
          patient:patient_id (id, firstName, lastName, phone),
          unregistered_patient:unregistered_patient_id (*),
          doctor:doctor_id (id, name, medic_profile:medic_profile (whatsapp_message_template)),
          organization:organization_id (id, name)
        `)
        .eq('organization_id', session.organization_id)
        .gte('scheduled_at', startOfTomorrow)
        .lte('scheduled_at', endOfTomorrow)
        .is('wa_reminder_sent_at', null)
        .in('status', ['SCHEDULED', 'EN ESPERA', 'CONFIRMADA']);

      if (!appointments) continue;

      for (const app of appointments) {
        await sendOneReminder(app, session.session_name);
        totalSent++;
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    return NextResponse.json({ success: true, sent: totalSent });

  } catch (error: any) {
    console.error('[CRON WA] Error crítico:', error);
    return NextResponse.json({ error: error.message, success: false }, { status: 500 });
  }
}

async function sendOneReminder(app: any, sessionName: string) {
  let patientName = 'Paciente';
  let rawPhone = '';

  if (app.patient) {
    patientName = `${app.patient.firstName || ''} ${app.patient.lastName || ''}`.trim();
    rawPhone = app.patient.phone;
  } else if (app.unregistered_patient) {
    patientName = `${app.unregistered_patient.first_name || ''} ${app.unregistered_patient.last_name || ''}`.trim();
    rawPhone = app.unregistered_patient.phone;
  }
  
  if (!rawPhone) return;

  // Lógica de Plantilla Dinámica (Cero improvisación)
  const doctorName = app.doctor?.name || 'especialista';
  const clinicName = app.organization?.name || 'la Clínica';
  
  const defaultTemplate = "Hola {NOMBRE_PACIENTE}, le recordamos su cita el {FECHA} a las {HORA} con {NOMBRE_DOCTORA} en {CLÍNICA}. Responda 'Asistiré' para confirmar.";
  const template = app.doctor?.medic_profile?.[0]?.whatsapp_message_template || app.doctor?.medic_profile?.whatsapp_message_template || defaultTemplate;

  const scheduledDate = new Date(app.scheduled_at);
  const fechaStr = format(scheduledDate, "eeee dd 'de' MMMM", { locale: es });
  const horaStr = format(scheduledDate, 'hh:mm a');

  // Reemplazo de tags
  const finalMessage = template
    .replace(/{NOMBRE_PACIENTE}/g, patientName)
    .replace(/{FECHA}/g, fechaStr)
    .replace(/{HORA}/g, horaStr)
    .replace(/{NOMBRE_DOCTORA}/g, doctorName)
    .replace(/{CLÍNICA}/g, clinicName)
    .replace(/{SERVICIOS}/g, app.selected_service?.name || app.selected_service?.label || app.reason || 'Consulta Médica');

  const chatId = phoneToWahaChatId(rawPhone);
  
  // 1. Enviar vía WAHA
  const wahaResult = await wahaSmartSend(sessionName, chatId, finalMessage);

  // 2. Buscar o Crear Conversación
  let { data: conversation } = await supabaseAdmin
    .from('whatsapp_conversations')
    .select('id')
    .eq('appointment_id', app.id)
    .maybeSingle();

  if (!conversation) {
    const { data: newConv, error: convErr } = await supabaseAdmin
      .from('whatsapp_conversations')
      .insert({
        organization_id: app.organization_id,
        appointment_id: app.id,
        patient_id: app.patient_id,
        unregistered_patient_id: app.unregistered_patient_id,
        waha_chat_id: chatId,
        patient_phone: rawPhone,
        status: 'ACTIVE',
        context: 'REMINDER',
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (convErr || !newConv) throw convErr || new Error('Error al crear la conversación de WhatsApp');
    conversation = newConv;
  } else {
    await supabaseAdmin
      .from('whatsapp_conversations')
      .update({ status: 'ACTIVE', updated_at: new Date().toISOString() })
      .eq('id', conversation.id);
  }

  if (!conversation) throw new Error('No se pudo obtener la conversación');

  // 3. Registrar mensaje saliente con su conversation_id (Crucial para RLS y trazabilidad)
  await supabaseAdmin
    .from('whatsapp_messages')
    .insert({
      organization_id: app.organization_id,
      conversation_id: conversation.id,
      appointment_id: app.id,
      direction: 'OUTBOUND',
      from_number: sessionName,
      to_number: rawPhone,
      body: finalMessage,
      message_type: 'REMINDER',
      delivery_status: 'SENT',
      waha_message_id: wahaResult?.id
    });

  // 4. Actualizar Cita
  await supabaseAdmin
    .from('appointment')
    .update({ 
      wa_reminder_sent_at: new Date().toISOString(),
      wa_confirmation_status: 'PENDING',
      wa_conversation_id: conversation.id
    })
    .eq('id', app.id);
}
