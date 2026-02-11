import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  sendEmail,
  getLabResultNotificationEmailForDoctor,
  getLabResultNotificationEmailForPatient
} from '@/lib/email-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/notifications/send-lab-result-notifications
 * Procesar y enviar notificaciones pendientes de resultados de laboratorio
 */
export async function POST(req: NextRequest) {
  try {
    // Obtener notificaciones pendientes
    const { data: pendingNotifications, error: notifError } = await supabase
      .from('lab_upload_notification')
      .select(`
        *,
        lab_result:lab_result_id (
          id,
          title,
          is_critical,
          status,
          specialist_lab_name,
          patient_first_name,
          patient_last_name,
          doctor:doctor_id (
            id,
            name,
            email
          ),
          patient:patient_id (
            id,
            firstName,
            lastName
          )
        )
      `)
      .eq('status', 'pending')
      .limit(50);

    if (notifError) {
      console.error('Error fetching notifications:', notifError);
      return NextResponse.json({ error: 'Error al obtener notificaciones' }, { status: 500 });
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as any[]
    };

    for (const notification of pendingNotifications || []) {
      try {
        const labResult = notification.lab_result as any;

        if (!labResult) {
          console.error('Lab result not found for notification:', notification.id);
          continue;
        }

        // Solo enviar emails
        if (notification.notification_type === 'email') {
          let emailHtml = '';
          let subject = '';
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

          if (notification.recipient_type === 'doctor') {
            subject = labResult.is_critical
              ? `🚨 CRÍTICO: Nuevo resultado de laboratorio - ${labResult.title}`
              : `Nuevo resultado de laboratorio - ${labResult.title}`;

            emailHtml = getLabResultNotificationEmailForDoctor({
              doctorName: labResult.doctor?.name || 'Doctor',
              patientName: `${labResult.patient_first_name} ${labResult.patient_last_name}`,
              resultTitle: labResult.title,
              labName: labResult.specialist_lab_name,
              isCritical: labResult.is_critical,
              dashboardUrl: `${baseUrl}/dashboard/medic/lab-results`
            });
          } else if (notification.recipient_type === 'patient') {
            const isApproved = labResult.status === 'approved';
            
            subject = isApproved
              ? `Tu resultado de laboratorio está disponible - ${labResult.title}`
              : `Resultado de laboratorio recibido - ${labResult.title}`;

            const patientName = labResult.patient
              ? `${labResult.patient.firstName} ${labResult.patient.lastName}`
              : `${labResult.patient_first_name} ${labResult.patient_last_name}`;

            emailHtml = getLabResultNotificationEmailForPatient({
              patientName,
              resultTitle: labResult.title,
              labName: labResult.specialist_lab_name,
              doctorName: labResult.doctor?.name || 'tu médico',
              dashboardUrl: `${baseUrl}/dashboard/patient/resultados`,
              isApproved
            });
          }

          // Enviar email
          const emailResult = await sendEmail({
            to: notification.recipient_email,
            subject,
            html: emailHtml
          });

          if (emailResult.success) {
            // Actualizar notificación como enviada
            await supabase
              .from('lab_upload_notification')
              .update({
                status: 'sent',
                sent_at: new Date().toISOString(),
                resend_id: emailResult.id
              })
              .eq('id', notification.id);

            results.sent++;
          } else {
            // Marcar como fallida
            await supabase
              .from('lab_upload_notification')
              .update({
                status: 'failed',
                error_message: JSON.stringify(emailResult.error)
              })
              .eq('id', notification.id);

            results.failed++;
            results.errors.push({
              notificationId: notification.id,
              error: emailResult.error
            });
          }
        } else if (notification.notification_type === 'in_app') {
          // Crear notificación in-app en la tabla notification
          if (notification.recipient_id) {
            await supabase
              .from('notification')
              .insert({
                user_id: notification.recipient_id,
                type: 'LAB_RESULT',
                title: notification.recipient_type === 'doctor'
                  ? 'Nuevo resultado de laboratorio'
                  : 'Resultado de laboratorio disponible',
                message: notification.recipient_type === 'doctor'
                  ? `Se ha cargado un nuevo resultado: ${labResult.title}`
                  : `Tu resultado "${labResult.title}" ya está disponible`,
                link: notification.recipient_type === 'doctor'
                  ? '/dashboard/medic/lab-results'
                  : '/dashboard/patient/resultados',
                is_read: false
              });

            // Marcar como enviada
            await supabase
              .from('lab_upload_notification')
              .update({
                status: 'sent',
                sent_at: new Date().toISOString()
              })
              .eq('id', notification.id);

            results.sent++;
          }
        }
      } catch (err) {
        console.error('Error processing notification:', notification.id, err);
        results.failed++;
        results.errors.push({
          notificationId: notification.id,
          error: err
        });
      }
    }

    return NextResponse.json({
      success: true,
      results
    }, { status: 200 });

  } catch (error) {
    console.error('Error in send-lab-result-notifications:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
