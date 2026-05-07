import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendNotification } from '@/lib/notifications-engine';

/**
 * Endpoint de CRON para seguimiento post-atención (24h después)
 * Se recomienda llamar a este endpoint periódicamente (ej. cada hora)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    // Validación de seguridad simple
    if (key !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar solicitudes atendidas hace más de 24h que no tengan el seguimiento enviado
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: pendingFollowups, error: fetchError } = await supabaseAdmin
      .from('safecare_requests')
      .select(`
        id,
        patient_id,
        plan_type
      `)
      .eq('status', 'attended')
      .eq('followup_sent', false)
      .lte('attended_at', twentyFourHoursAgo);

    if (fetchError) throw fetchError;

    if (!pendingFollowups || pendingFollowups.length === 0) {
      return NextResponse.json({ message: 'No hay seguimientos pendientes por hoy.' });
    }

    let processedCount = 0;

    for (const req of pendingFollowups) {
      // Obtener datos del usuario (email, nombre)
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, email, name')
        .eq('patientProfileId', req.patient_id)
        .single();
      
      if (user && user.email) {
        await sendNotification(user.id, {
          title: '💜 ¿Cómo te sientes hoy?',
          body: 'Esperamos que te sientas mejor. Por favor ayúdanos respondiendo una breve encuesta sobre tu atención.',
          url: '/dashboard/patient/encuestas',
          email: {
            to: user.email,
            subject: 'Seguimiento SafeCare: ¿Cómo va todo hoy?',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
                <div style="background: #4f46e5; padding: 30px; text-align: center; color: white;">
                  <h1 style="margin: 0; font-size: 24px;">SafeCare 24/7</h1>
                </div>
                <div style="padding: 30px; color: #1e293b; line-height: 1.6;">
                  <h2 style="color: #4f46e5;">¡Hola ${user.name || 'estimado paciente'}!</h2>
                  <p>Han pasado 24 horas desde que recibiste atención médica a través de nuestro servicio.</p>
                  <p><b>Queremos saber cómo ha evolucionado tu salud</b> y conocer tu opinión sobre el servicio recibido.</p>
                  <p>Tu feedback es vital para nosotros y solo te tomará 1 minuto.</p>
                  
                  <div style="text-align: center; margin: 40px 0;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/patient/encuestas" 
                       style="display: inline-block; padding: 16px 32px; background: #4f46e5; color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">
                       Responder Encuesta de Satisfacción
                    </a>
                  </div>

                  <p style="color: #64748b; font-size: 14px; margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                    <b>Recordatorio:</b> Tus informes, imágenes y recetas están siempre disponibles en tu panel de ASHIRA para tu conveniencia.
                  </p>
                </div>
              </div>
            `
          }
        });

        // Marcar como enviado para evitar duplicados
        await supabaseAdmin
          .from('safecare_requests')
          .update({ followup_sent: true })
          .eq('id', req.id);
        
        processedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: processedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[SafeCare Followup Cron] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', detail: error.message }, { status: 500 });
  }
}
