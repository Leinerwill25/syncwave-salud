import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { sendEmail, getClinicalShareEmail } from '@/lib/email-service';

/**
 * POST /api/medic/send-clinical-email
 * Envía informe y receta por correo al paciente.
 * Límite de 25 correos por doctor al día.
 */
export async function POST(req: Request) {
    try {
        const { consultationId, patientId, recipientEmail } = await req.json();

        if (!consultationId || !patientId || !recipientEmail) {
            return NextResponse.json({ error: 'Faltan datos requeridos (consultationId, patientId, recipientEmail)' }, { status: 400 });
        }

        const supabase = await createSupabaseServerClient();
        
        // 1. Verificar sesión del médico
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // 2. Validar cuota diaria (25 correos por doctor por día)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { count, error: countError } = await supabase
            .from('email_log')
            .select('*', { count: 'exact', head: true })
            .eq('doctorId', user.id)
            .gte('sentAt', today.toISOString());

        if (countError && countError.code !== 'PGRST116') { // Ignorar error si la tabla no existe (el usuario la crea manual)
             console.warn('Error al verificar cuota de correos (posiblemente tabla no creada aún):', countError);
        } else if (count !== null && count >= 25) {
            return NextResponse.json({ error: 'Has alcanzado el límite diario de 25 correos.' }, { status: 429 });
        }

        // 3. Obtener/Crear enlace compartido (Consultation Share Link)
        // Buscamos si ya existe uno activo
        let { data: shareLink } = await supabase
            .from('consultation_share_link')
            .select('token')
            .eq('consultation_id', consultationId)
            .eq('is_active', true)
            .maybeSingle();

        if (!shareLink) {
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 90); // 90 días para estos enlaces

            const { data: newLink, error: linkError } = await supabase
                .from('consultation_share_link')
                .insert({
                    consultation_id: consultationId,
                    patient_id: patientId,
                    token,
                    created_by: user.id,
                    expires_at: expiresAt.toISOString(),
                    is_active: true
                })
                .select('token')
                .single();

            if (linkError) throw linkError;
            shareLink = newLink;
        }

        // 4. Obtener detalles básicos para el correo
        const { data: consultation } = await supabase
            .from('consultation')
            .select(`
                id,
                unregistered_patient_id,
                doctor:doctor_id(name),
                patient:patient_id(firstName, lastName)
            `)
            .eq('id', consultationId)
            .single();

        if (!consultation) {
            return NextResponse.json({ error: 'Consulta no encontrada' }, { status: 404 });
        }

        // Manejar que Supabase puede devolver objetos o arrays dependiendo de la configuración de tipos
        const doctorData = Array.isArray(consultation.doctor) ? consultation.doctor[0] : consultation.doctor;
        const patientData = Array.isArray(consultation.patient) ? consultation.patient[0] : consultation.patient;
        const doctorName = (doctorData as any)?.name || 'Tu Médico';
        let patientName = '';

        if (consultation.unregistered_patient_id) {
            const { data: unreg } = await supabase
                .from('unregisteredpatients')
                .select('first_name, last_name')
                .eq('id', consultation.unregistered_patient_id)
                .single();
            if (unreg) {
                patientName = `${unreg.first_name} ${unreg.last_name}`;
            }
        } else if (patientData) {
            patientName = `${(patientData as any).firstName} ${(patientData as any).lastName}`;
        }

        if (!patientName) patientName = 'Paciente';
        
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://syncwave-salud.vercel.app';
        const shareUrl = `${baseUrl}/share/consultation/${shareLink.token}`;
        const clinicName = 'Syncwave Salud';

        // 5. Enviar correo via Resend
        const emailHtml = getClinicalShareEmail({
            patientName,
            doctorName,
            consultationLink: shareUrl,
            prescriptionLink: shareUrl, // Es el mismo enlace que contiene todo
            clinicName
        });

        const emailResult = await sendEmail({
            to: recipientEmail,
            subject: `Informe Médico y Receta - ${patientName}`,
            html: emailHtml
        });

        if (!emailResult.success) {
            return NextResponse.json({ error: 'Error al enviar el correo con Resend' }, { status: 500 });
        }

        // 6. Registrar envío en EmailLog
        try {
            await supabase
                .from('email_log')
                .insert({
                    doctorId: user.id,
                    recipient: recipientEmail,
                    type: 'REPORT_AND_RECIPE',
                    consultationId: consultationId
                });
        } catch (logErr) {
            console.error('Error al registrar en EmailLog:', logErr);
            // No fallamos el request si el log falló (tal vez la tabla no existe)
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Correo enviado correctamente',
            sentCount: (count || 0) + 1
        });

    } catch (error: any) {
        console.error('Error en send-clinical-email API:', error);
        return NextResponse.json({ error: 'Error interno del servidor: ' + error.message }, { status: 500 });
    }
}
