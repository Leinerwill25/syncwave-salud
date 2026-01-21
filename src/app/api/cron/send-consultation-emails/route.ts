// app/api/cron/send-consultation-emails/route.ts
// Endpoint de cron job para enviar emails de informes de consultas después de 10 minutos
// Este endpoint debe ser llamado periódicamente (cada minuto) por Vercel Cron Jobs o similar

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email/resend';
import { getAppUrl } from '@/lib/email/resend';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Verificar que la solicitud viene de un cron job válido (Vercel Cron)
// En producción, deberías validar el header 'Authorization' o similar
const CRON_SECRET = process.env.CRON_SECRET || 'your-secret-key';

export async function GET(req: NextRequest) {
	try {
		// Validar que la solicitud viene de un cron job válido
		const authHeader = req.headers.get('authorization');
		if (authHeader !== `Bearer ${CRON_SECRET}`) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
			console.error('[Cron Send Emails] Supabase no configurado');
			return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
		}

		const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: { persistSession: false },
		});

		// Obtener consultas pendientes de envío (scheduled_at <= ahora y status = 'pending')
		const now = new Date().toISOString();
		const { data: queueItems, error: queueError } = await supabase
			.from('consultation_email_queue')
			.select('*')
			.eq('status', 'pending')
			.lte('scheduled_at', now)
			.limit(50); // Procesar máximo 50 a la vez

		if (queueError) {
			console.error('[Cron Send Emails] Error obteniendo cola:', queueError);
			return NextResponse.json({ error: 'Error obteniendo cola' }, { status: 500 });
		}

		if (!queueItems || queueItems.length === 0) {
			return NextResponse.json({ 
				success: true, 
				message: 'No hay emails pendientes',
				processed: 0 
			});
		}

		let successCount = 0;
		let failCount = 0;

		// Procesar cada item de la cola
		for (const item of queueItems) {
			try {
				// Obtener datos completos de la consulta
				const { data: consultation, error: consultationError } = await supabase
					.from('consultation')
					.select(`
						id,
						report_url,
						created_at,
						patient_id,
						unregistered_patient_id,
						doctor_id,
						organization_id,
						patient:patient_id(firstName, lastName, email),
						unregistered_patient:unregistered_patient_id(first_name, last_name, email),
						doctor:doctor_id(name, email),
						organization:organization_id(name)
					`)
					.eq('id', item.consultation_id)
					.single();

				if (consultationError || !consultation) {
					console.error(`[Cron Send Emails] Error obteniendo consulta ${item.consultation_id}:`, consultationError);
					// Marcar como fallido
					await supabase
						.from('consultation_email_queue')
						.update({
							status: 'failed',
							error_message: 'Consulta no encontrada',
							attempts: item.attempts + 1,
							updated_at: new Date().toISOString(),
						})
						.eq('id', item.id);
					failCount++;
					continue;
				}

				// Verificar que existe report_url
				if (!consultation.report_url) {
					console.warn(`[Cron Send Emails] Consulta ${item.consultation_id} no tiene report_url`);
					// Marcar como fallido
					await supabase
						.from('consultation_email_queue')
						.update({
							status: 'failed',
							error_message: 'No hay informe disponible',
							attempts: item.attempts + 1,
							updated_at: new Date().toISOString(),
						})
						.eq('id', item.id);
					failCount++;
					continue;
				}

				// Obtener email del paciente
				const patientEmail = consultation.patient?.email || consultation.unregistered_patient?.email;
				if (!patientEmail) {
					console.warn(`[Cron Send Emails] Consulta ${item.consultation_id} no tiene email del paciente`);
					// Marcar como fallido
					await supabase
						.from('consultation_email_queue')
						.update({
							status: 'failed',
							error_message: 'Paciente no tiene email',
							attempts: item.attempts + 1,
							updated_at: new Date().toISOString(),
						})
						.eq('id', item.id);
					failCount++;
					continue;
				}

				// Obtener nombre del paciente
				const patientName = consultation.patient 
					? `${consultation.patient.firstName} ${consultation.patient.lastName}`
					: `${consultation.unregistered_patient?.first_name} ${consultation.unregistered_patient?.last_name}`;

				// Obtener nombre del doctor
				const doctorName = consultation.doctor?.name || 'Dr.';

				// Obtener nombre de la organización
				const organizationName = consultation.organization?.name || 'Consultorio';

				// Generar URL de calificación
				const ratingUrl = `${getAppUrl()}/rate-consultation?consultation_id=${consultation.id}`;

				// Formatear fecha y hora de generación
				const generatedAt = new Date(consultation.created_at);
				const formattedDate = generatedAt.toLocaleDateString('es-ES', {
					year: 'numeric',
					month: 'long',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit',
				});

				// Crear template de email
				const emailHtml = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Informe Médico - ${organizationName}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
	<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
		<h1 style="color: white; margin: 0; font-size: 24px;">📋 Informe Médico</h1>
	</div>
	
	<div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
		<p style="font-size: 16px; margin-bottom: 20px;">Hola <strong>${patientName}</strong>,</p>
		
		<p style="font-size: 16px; margin-bottom: 20px;">
			Le informamos que su informe médico ha sido generado y está disponible para su descarga.
		</p>
		
		<div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
			<p style="margin: 5px 0;"><strong>📅 Fecha de generación:</strong> ${formattedDate}</p>
			<p style="margin: 5px 0;"><strong>👨‍⚕️ Doctor:</strong> ${doctorName}</p>
			<p style="margin: 5px 0;"><strong>🏥 Consultorio:</strong> ${organizationName}</p>
		</div>
		
		<div style="text-align: center; margin: 30px 0;">
			<a href="${consultation.report_url}" 
			   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
				📥 Descargar Informe Médico
			</a>
		</div>
		
		<div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 20px; margin: 30px 0;">
			<h3 style="color: #856404; margin-top: 0;">⭐ Su opinión es importante para nosotros</h3>
			<p style="color: #856404; margin-bottom: 15px;">
				Nos gustaría conocer su experiencia con la atención recibida. Por favor, tómese un momento para calificar su consulta.
			</p>
			<div style="text-align: center;">
				<a href="${ratingUrl}" 
				   style="display: inline-block; background: #ffc107; color: #856404; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">
					⭐ Calificar Atención
				</a>
			</div>
		</div>
		
		<p style="font-size: 14px; color: #666; margin-top: 30px;">
			Si tiene alguna pregunta o necesita asistencia, no dude en contactarnos.
		</p>
		
		<p style="font-size: 14px; color: #666; margin-top: 20px;">
			Atentamente,<br>
			<strong>${organizationName}</strong>
		</p>
	</div>
	
	<div style="text-align: center; margin-top: 20px; padding: 20px; color: #999; font-size: 12px;">
		<p>Este es un email automático, por favor no responda a este mensaje.</p>
	</div>
</body>
</html>
				`;

				// Enviar email
				const emailResult = await sendEmail({
					to: patientEmail,
					subject: `Informe Médico - ${organizationName}`,
					html: emailHtml,
				});

				if (emailResult.success) {
					// Marcar como enviado
					await supabase
						.from('consultation_email_queue')
						.update({
							status: 'sent',
							sent_at: new Date().toISOString(),
							attempts: item.attempts + 1,
							updated_at: new Date().toISOString(),
						})
						.eq('id', item.id);
					successCount++;
					console.log(`[Cron Send Emails] Email enviado exitosamente para consulta ${item.consultation_id}`);
				} else {
					// Marcar como fallido si se superan los intentos
					const newAttempts = item.attempts + 1;
					if (newAttempts >= 3) {
						await supabase
							.from('consultation_email_queue')
							.update({
								status: 'failed',
								error_message: emailResult.error || 'Error desconocido',
								attempts: newAttempts,
								updated_at: new Date().toISOString(),
							})
							.eq('id', item.id);
						failCount++;
					} else {
						// Reintentar más tarde
						await supabase
							.from('consultation_email_queue')
							.update({
								attempts: newAttempts,
								error_message: emailResult.error || 'Error desconocido',
								updated_at: new Date().toISOString(),
							})
							.eq('id', item.id);
						failCount++;
					}
					console.error(`[Cron Send Emails] Error enviando email para consulta ${item.consultation_id}:`, emailResult.error);
				}
			} catch (err) {
				console.error(`[Cron Send Emails] Error procesando item ${item.id}:`, err);
				// Marcar como fallido después de 3 intentos
				const newAttempts = item.attempts + 1;
				if (newAttempts >= 3) {
					await supabase
						.from('consultation_email_queue')
						.update({
							status: 'failed',
							error_message: err instanceof Error ? err.message : 'Error desconocido',
							attempts: newAttempts,
							updated_at: new Date().toISOString(),
						})
						.eq('id', item.id);
					failCount++;
				} else {
					await supabase
						.from('consultation_email_queue')
						.update({
							attempts: newAttempts,
							error_message: err instanceof Error ? err.message : 'Error desconocido',
							updated_at: new Date().toISOString(),
						})
						.eq('id', item.id);
					failCount++;
				}
			}
		}

		return NextResponse.json({
			success: true,
			processed: queueItems.length,
			successCount,
			failCount,
		});
	} catch (err) {
		console.error('[Cron Send Emails] Error general:', err);
		return NextResponse.json(
			{
				error: 'Error procesando emails',
				detail: err instanceof Error ? err.message : String(err),
			},
			{ status: 500 }
		);
	}
}

