// app/api/cron/send-consultation-emails/route.ts
// Endpoint para enviar emails de informes de consultas después de 10 minutos
// 
// NOTA: Este endpoint ya NO usa Vercel Cron Jobs (para evitar costos)
// Puede ser llamado por:
// 1. Servicio externo gratuito como cron-job.org (configurar cada minuto)
// 2. GitHub Actions (gratis para repos públicos)
// 3. Otro servicio de cron gratuito
//
// Configuración recomendada en cron-job.org:
// - URL: https://tu-dominio.com/api/cron/send-consultation-emails
// - Método: GET
// - Headers: Authorization: Bearer {CRON_SECRET}
// - Frecuencia: Cada minuto (* * * * *)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, getAppUrl, getConsultationReportTemplate, getRegistrationInviteTemplate } from '@/lib/email';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Verificar que la solicitud viene de un cron job válido
// Configurar CRON_SECRET en las variables de entorno de Vercel
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

				// Manejar caso donde patient puede ser array o objeto
				const patient = Array.isArray(consultation.patient) 
					? consultation.patient[0] 
					: consultation.patient;
				
				// Manejar caso donde unregistered_patient puede ser array o objeto
				const unregisteredPatient = Array.isArray(consultation.unregistered_patient)
					? consultation.unregistered_patient[0]
					: consultation.unregistered_patient;

				// Obtener email del paciente
				const patientEmail = patient?.email || unregisteredPatient?.email;
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
				const patientName = patient 
					? `${patient.firstName} ${patient.lastName}`
					: unregisteredPatient
						? `${unregisteredPatient.first_name} ${unregisteredPatient.last_name}`
						: 'Paciente';

				// Manejar caso donde doctor puede ser array o objeto
				const doctor = Array.isArray(consultation.doctor)
					? consultation.doctor[0]
					: consultation.doctor;

				// Manejar caso donde organization puede ser array o objeto
				const organization = Array.isArray(consultation.organization)
					? consultation.organization[0]
					: consultation.organization;

				// Obtener nombre del doctor
				const doctorName = doctor?.name || 'Dr.';

				// Obtener nombre de la organización
				const organizationName = organization?.name || 'Consultorio';

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

				// Crear template de email de informe
				const emailHtml = getConsultationReportTemplate({
					patientName,
					doctorName,
					organizationName,
					reportUrl: consultation.report_url,
					formattedDate,
					ratingUrl,
				});

				// Enviar email de informe
				const emailResult = await sendEmail({
					to: patientEmail,
					subject: `Informe Médico - ${organizationName}`,
					html: emailHtml,
				});

				if (emailResult.success) {
					// Si el paciente no está registrado, enviar invitación
					const isUnregistered = !!consultation.unregistered_patient_id && !consultation.patient_id;
					
					if (isUnregistered) {
						try {
							const registerUrl = `${getAppUrl()}/auth/register?email=${encodeURIComponent(patientEmail)}&name=${encodeURIComponent(patientName)}`;
							const inviteHtml = getRegistrationInviteTemplate({
								patientName,
								registerUrl,
								doctorName: doctorName !== 'Dr.' ? doctorName : undefined,
							});

							await sendEmail({
								to: patientEmail,
								subject: `Centralice su información médica en ASHIRA`,
								html: inviteHtml,
							});
							console.log(`[Cron Send Emails] Invitación enviada a paciente no registrado: ${patientEmail}`);
						} catch (inviteErr) {
							console.error('[Cron Send Emails] Error enviando invitación:', inviteErr);
						}
					}
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

