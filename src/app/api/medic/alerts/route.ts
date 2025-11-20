// app/api/medic/alerts/route.ts
// API para obtener alertas críticas y próximas a vencer para el médico

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { apiRequireRole } from '@/lib/auth-guards';

export type AlertLevel = 'CRITICAL' | 'WARNING' | 'INFO';
export type AlertType = 
	| 'APPOINTMENT_SOON' 
	| 'APPOINTMENT_IMMINENT' 
	| 'PRESCRIPTION_EXPIRING' 
	| 'PRESCRIPTION_EXPIRED'
	| 'LAB_RESULT_CRITICAL'
	| 'TASK_DUE_SOON'
	| 'TASK_OVERDUE'
	| 'CONSULTATION_UNFINISHED'
	| 'INVOICE_PENDING'
	| 'MESSAGE_UNREAD'
	| 'NOTIFICATION_UNREAD';

export interface Alert {
	id: string;
	type: AlertType;
	level: AlertLevel;
	title: string;
	message: string;
	dueAt?: string; // Para contadores
	actionUrl?: string; // URL para resolver la alerta
	metadata?: Record<string, unknown>; // Datos adicionales (paciente, etc.)
}

export async function GET(req: Request) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const doctorId = user.userId;
		const now = new Date();
		const nowISO = now.toISOString();
		
		// Ventanas de tiempo para alertas
		const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
		const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
		const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
		const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

		const alerts: Alert[] = [];

		// ────────────────────────────────────────────────────────────────
		// 1. CITAS PRÓXIMAS (appointment)
		// ────────────────────────────────────────────────────────────────
		const { data: appointmentsSoon, error: aptError } = await supabase
			.from('appointment')
			.select(`
				id,
				patient_id,
				scheduled_at,
				duration_minutes,
				status,
				reason,
				Patient:patient_id (
					firstName,
					lastName
				)
			`)
			.eq('doctor_id', doctorId)
			.eq('status', 'SCHEDULED')
			.gte('scheduled_at', nowISO)
			.lte('scheduled_at', twentyFourHoursFromNow)
			.order('scheduled_at', { ascending: true });

		if (!aptError && appointmentsSoon) {
			for (const apt of appointmentsSoon) {
				const scheduledTime = new Date(apt.scheduled_at);
				const hoursUntil = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);
				const patient = Array.isArray(apt.Patient) ? apt.Patient[0] : apt.Patient;

				if (hoursUntil <= 2) {
					// CRÍTICO: Cita en menos de 2 horas
					alerts.push({
						id: `apt-${apt.id}`,
						type: 'APPOINTMENT_IMMINENT',
						level: 'CRITICAL',
						title: 'Cita Inminente',
						message: `Cita con ${patient?.firstName} ${patient?.lastName} en ${Math.round(hoursUntil * 60)} minutos`,
						dueAt: apt.scheduled_at,
						actionUrl: `/dashboard/medic/citas/${apt.id}`,
						metadata: {
							appointmentId: apt.id,
							patientId: apt.patient_id,
							scheduledAt: apt.scheduled_at,
							reason: apt.reason,
						},
					});
				} else {
					// ADVERTENCIA: Cita en las próximas 24 horas
					alerts.push({
						id: `apt-${apt.id}`,
						type: 'APPOINTMENT_SOON',
						level: 'WARNING',
						title: 'Cita Próxima',
						message: `Cita con ${patient?.firstName} ${patient?.lastName} en ${Math.round(hoursUntil)} horas`,
						dueAt: apt.scheduled_at,
						actionUrl: `/dashboard/medic/citas/${apt.id}`,
						metadata: {
							appointmentId: apt.id,
							patientId: apt.patient_id,
							scheduledAt: apt.scheduled_at,
							reason: apt.reason,
						},
					});
				}
			}
		}

		// ────────────────────────────────────────────────────────────────
		// 2. RECETAS PRÓXIMAS A VENCER (prescription)
		// ────────────────────────────────────────────────────────────────
		const { data: prescriptionsExpiring, error: prescError } = await supabase
			.from('prescription')
			.select(`
				id,
				patient_id,
				valid_until,
				status,
				Patient:patient_id (
					firstName,
					lastName
				)
			`)
			.eq('doctor_id', doctorId)
			.not('valid_until', 'is', null)
			.gte('valid_until', nowISO)
			.lte('valid_until', sevenDaysFromNow)
			.order('valid_until', { ascending: true });

		if (!prescError && prescriptionsExpiring) {
			for (const presc of prescriptionsExpiring) {
				if (!presc.valid_until) continue;
				const validUntil = new Date(presc.valid_until);
				const daysUntil = (validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
				const patient = Array.isArray(presc.Patient) ? presc.Patient[0] : presc.Patient;

				if (daysUntil <= 0) {
					// CRÍTICO: Receta vencida
					alerts.push({
						id: `presc-expired-${presc.id}`,
						type: 'PRESCRIPTION_EXPIRED',
						level: 'CRITICAL',
						title: 'Receta Vencida',
						message: `Receta para ${patient?.firstName} ${patient?.lastName} venció`,
						dueAt: presc.valid_until,
						actionUrl: `/dashboard/medic/recetas/${presc.id}`,
						metadata: {
							prescriptionId: presc.id,
							patientId: presc.patient_id,
							validUntil: presc.valid_until,
						},
					});
				} else if (daysUntil <= 3) {
					// ADVERTENCIA: Receta próxima a vencer
					alerts.push({
						id: `presc-expiring-${presc.id}`,
						type: 'PRESCRIPTION_EXPIRING',
						level: 'WARNING',
						title: 'Receta Próxima a Vencer',
						message: `Receta para ${patient?.firstName} ${patient?.lastName} vence en ${Math.round(daysUntil)} días`,
						dueAt: presc.valid_until,
						actionUrl: `/dashboard/medic/recetas/${presc.id}`,
						metadata: {
							prescriptionId: presc.id,
							patientId: presc.patient_id,
							validUntil: presc.valid_until,
						},
					});
				}
			}
		}

		// ────────────────────────────────────────────────────────────────
		// 3. RESULTADOS CRÍTICOS SIN REVISAR (lab_result)
		// ────────────────────────────────────────────────────────────────
		const { data: criticalResults, error: labError } = await supabase
			.from('lab_result')
			.select(`
				id,
				patient_id,
				result_type,
				is_critical,
				reported_at,
				Patient:patient_id (
					firstName,
					lastName
				)
			`)
			.eq('ordering_provider_id', doctorId)
			.eq('is_critical', true)
			.order('reported_at', { ascending: false })
			.limit(10);

		if (!labError && criticalResults) {
			for (const result of criticalResults) {
				const patient = Array.isArray(result.Patient) ? result.Patient[0] : result.Patient;
				alerts.push({
					id: `lab-critical-${result.id}`,
					type: 'LAB_RESULT_CRITICAL',
					level: 'CRITICAL',
					title: 'Resultado Crítico',
					message: `Resultado crítico de ${result.result_type} para ${patient?.firstName} ${patient?.lastName}`,
					actionUrl: `/dashboard/medic/resultados/${result.id}`,
					metadata: {
						labResultId: result.id,
						patientId: result.patient_id,
						resultType: result.result_type,
						reportedAt: result.reported_at,
					},
				});
			}
		}

		// ────────────────────────────────────────────────────────────────
		// 4. TAREAS PENDIENTES (task)
		// ────────────────────────────────────────────────────────────────
		const { data: tasksDue, error: taskError } = await supabase
			.from('task')
			.select(`
				id,
				title,
				description,
				due_at,
				completed,
				patient_id,
				Patient:patient_id (
					firstName,
					lastName
				)
			`)
			.eq('assigned_to', doctorId)
			.eq('completed', false)
			.not('due_at', 'is', null)
			.order('due_at', { ascending: true });

		if (!taskError && tasksDue) {
			for (const task of tasksDue) {
				if (!task.due_at) continue;
				const dueAt = new Date(task.due_at);
				const hoursUntil = (dueAt.getTime() - now.getTime()) / (1000 * 60 * 60);
				const patient = Array.isArray(task.Patient) ? task.Patient[0] : task.Patient;
				const patientName = patient ? `${patient.firstName} ${patient.lastName}` : '';

				if (hoursUntil < 0) {
					// CRÍTICO: Tarea vencida
					alerts.push({
						id: `task-overdue-${task.id}`,
						type: 'TASK_OVERDUE',
						level: 'CRITICAL',
						title: 'Tarea Vencida',
						message: `${task.title}${patientName ? ` - ${patientName}` : ''}`,
						dueAt: task.due_at,
						actionUrl: `/dashboard/medic/tareas/${task.id}`,
						metadata: {
							taskId: task.id,
							patientId: task.patient_id,
							dueAt: task.due_at,
						},
					});
				} else if (hoursUntil <= 24) {
					// ADVERTENCIA: Tarea próxima a vencer
					alerts.push({
						id: `task-due-${task.id}`,
						type: 'TASK_DUE_SOON',
						level: 'WARNING',
						title: 'Tarea Próxima a Vencer',
						message: `${task.title}${patientName ? ` - ${patientName}` : ''} vence en ${Math.round(hoursUntil)} horas`,
						dueAt: task.due_at,
						actionUrl: `/dashboard/medic/tareas/${task.id}`,
						metadata: {
							taskId: task.id,
							patientId: task.patient_id,
							dueAt: task.due_at,
						},
					});
				}
			}
		}

		// ────────────────────────────────────────────────────────────────
		// 5. CONSULTAS SIN FINALIZAR (consultation)
		// ────────────────────────────────────────────────────────────────
		const { data: unfinishedConsultations, error: consError } = await supabase
			.from('consultation')
			.select(`
				id,
				patient_id,
				started_at,
				chief_complaint,
				Patient:patient_id (
					firstName,
					lastName
				)
			`)
			.eq('doctor_id', doctorId)
			.not('started_at', 'is', null)
			.is('ended_at', null)
			.lte('started_at', threeDaysAgo); // Consultas iniciadas hace más de 3 días

		if (!consError && unfinishedConsultations) {
			for (const cons of unfinishedConsultations) {
				const patient = Array.isArray(cons.Patient) ? cons.Patient[0] : cons.Patient;
				alerts.push({
					id: `cons-unfinished-${cons.id}`,
					type: 'CONSULTATION_UNFINISHED',
					level: 'WARNING',
					title: 'Consulta Sin Finalizar',
					message: `Consulta con ${patient?.firstName} ${patient?.lastName} iniciada pero no finalizada`,
					actionUrl: `/dashboard/medic/consultas/${cons.id}`,
					metadata: {
						consultationId: cons.id,
						patientId: cons.patient_id,
						startedAt: cons.started_at,
						chiefComplaint: cons.chief_complaint,
					},
				});
			}
		}

		// ────────────────────────────────────────────────────────────────
		// 6. FACTURAS PENDIENTES (facturacion)
		// ────────────────────────────────────────────────────────────────
		const { data: pendingInvoices, error: invError } = await supabase
			.from('facturacion')
			.select(`
				id,
				patient_id,
				total,
				estado_pago,
				fecha_emision,
				Patient:patient_id (
					firstName,
					lastName
				)
			`)
			.eq('doctor_id', doctorId)
			.eq('estado_pago', 'pendiente')
			.order('fecha_emision', { ascending: true })
			.limit(10);

		if (!invError && pendingInvoices) {
			for (const invoice of pendingInvoices) {
				const patient = Array.isArray(invoice.Patient) ? invoice.Patient[0] : invoice.Patient;
				alerts.push({
					id: `inv-pending-${invoice.id}`,
					type: 'INVOICE_PENDING',
					level: 'INFO',
					title: 'Factura Pendiente',
					message: `Factura de $${invoice.total} para ${patient?.firstName} ${patient?.lastName} pendiente de pago`,
					actionUrl: `/dashboard/medic/pagos/${invoice.id}`,
					metadata: {
						invoiceId: invoice.id,
						patientId: invoice.patient_id,
						total: invoice.total,
						emissionDate: invoice.fecha_emision,
					},
				});
			}
		}

		// ────────────────────────────────────────────────────────────────
		// 7. MENSAJES NO LEÍDOS (message)
		// ────────────────────────────────────────────────────────────────
		const { data: unreadMessages, error: msgError } = await supabase
			.from('message')
			.select('id, conversation_id, created_at')
			.eq('recipient_user_id', doctorId)
			.eq('read', false)
			.order('created_at', { ascending: false })
			.limit(5);

		if (!msgError && unreadMessages && unreadMessages.length > 0) {
			alerts.push({
				id: 'messages-unread',
				type: 'MESSAGE_UNREAD',
				level: 'INFO',
				title: 'Mensajes No Leídos',
				message: `Tienes ${unreadMessages.length} mensaje${unreadMessages.length > 1 ? 's' : ''} sin leer`,
				actionUrl: '/dashboard/medic/mensajes',
				metadata: {
					count: unreadMessages.length,
				},
			});
		}

		// ────────────────────────────────────────────────────────────────
		// 8. NOTIFICACIONES NO LEÍDAS (Notification)
		// ────────────────────────────────────────────────────────────────
		const { data: unreadNotifications, error: notifError } = await supabase
			.from('Notification')
			.select('id, type, title, created_at')
			.eq('userId', doctorId)
			.eq('read', false)
			.order('created_at', { ascending: false })
			.limit(5);

		if (!notifError && unreadNotifications && unreadNotifications.length > 0) {
			alerts.push({
				id: 'notifications-unread',
				type: 'NOTIFICATION_UNREAD',
				level: 'INFO',
				title: 'Notificaciones No Leídas',
				message: `Tienes ${unreadNotifications.length} notificación${unreadNotifications.length > 1 ? 'es' : ''} sin leer`,
				actionUrl: '/dashboard/medic',
				metadata: {
					count: unreadNotifications.length,
				},
			});
		}

		// Ordenar alertas: CRITICAL primero, luego WARNING, luego INFO
		// Dentro de cada nivel, ordenar por dueAt (si existe)
		const levelOrder: Record<AlertLevel, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };
		alerts.sort((a, b) => {
			const levelDiff = levelOrder[a.level] - levelOrder[b.level];
			if (levelDiff !== 0) return levelDiff;
			if (a.dueAt && b.dueAt) {
				return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
			}
			return 0;
		});

		// Contar por nivel
		const counts = {
			critical: alerts.filter(a => a.level === 'CRITICAL').length,
			warning: alerts.filter(a => a.level === 'WARNING').length,
			info: alerts.filter(a => a.level === 'INFO').length,
			total: alerts.length,
		};

		return NextResponse.json({
			alerts,
			counts,
		}, { status: 200 });
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Alerts API] Error inesperado:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

