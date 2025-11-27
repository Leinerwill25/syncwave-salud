/**
 * Cron job que verifica citas y consultas con pagos pendientes
 * 
 * NOTA: Este endpoint está deshabilitado para el plan gratuito de Vercel (Hobby)
 * que solo permite 2 cron jobs por cuenta. En su lugar, se usa polling desde el cliente
 * en el componente PendingPaymentAlerts que se ejecuta cada 5 minutos cuando el usuario
 * está activo en el dashboard.
 * 
 * Para habilitar este cron job en el futuro (plan Pro):
 * 1. Agregar a vercel.json: { "path": "/api/cron/check-pending-payments", "schedule": "0 * * * *" }
 * 2. El endpoint ya está listo para funcionar
 * 
 * Se ejecuta cada hora para notificar a los médicos sobre citas/consultas que requieren validación
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createNotification } from '@/lib/notifications';

const supabaseAdmin = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!,
	{ auth: { persistSession: false } }
);

export async function GET(req: NextRequest) {
	try {
		// Verificar que la llamada viene de un cron job autorizado
		const authHeader = req.headers.get('authorization');
		const cronSecret = process.env.CRON_SECRET;

		// Si hay un CRON_SECRET configurado, validarlo
		if (cronSecret) {
			if (authHeader !== `Bearer ${cronSecret}`) {
				return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
			}
		}

		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		// Buscar citas programadas para hoy o en el pasado que tengan facturaciones pendientes
		const { data: appointments, error: appointmentsError } = await supabaseAdmin
			.from('appointment')
			.select(`
				id,
				scheduled_at,
				status,
				doctor_id,
				organization_id,
				patient_id,
				unregistered_patient_id,
				patient:patient_id(firstName, lastName, identifier),
				unregisteredPatient:unregistered_patient_id(first_name, last_name, identification)
			`)
			.lte('scheduled_at', tomorrow.toISOString())
			.in('status', ['SCHEDULED', 'CONFIRMADA', 'CONFIRMED', 'IN_PROGRESS'])
			.not('doctor_id', 'is', null);

		if (appointmentsError) {
			console.error('[Cron Check Pending Payments] Error obteniendo citas:', appointmentsError);
			return NextResponse.json({ error: 'Error obteniendo citas' }, { status: 500 });
		}

		// Buscar facturaciones pendientes asociadas a estas citas
		const appointmentIds = (appointments || []).map((apt: any) => apt.id);
		let facturacionesPendientes: any[] = [];

		if (appointmentIds.length > 0) {
			const { data: facturaciones, error: facturacionesError } = await supabaseAdmin
				.from('facturacion')
				.select('id, appointment_id, patient_id, unregistered_patient_id, doctor_id, estado_pago, total, currency')
				.in('appointment_id', appointmentIds)
				.in('estado_pago', ['pendiente', 'pendiente_verificacion']);

			if (facturacionesError) {
				console.error('[Cron Check Pending Payments] Error obteniendo facturaciones:', facturacionesError);
			} else {
				facturacionesPendientes = facturaciones || [];
			}
		}

		// Buscar consultas del día que tengan facturaciones pendientes
		const { data: consultations, error: consultationsError } = await supabaseAdmin
			.from('consultation')
			.select(`
				id,
				appointment_id,
				started_at,
				created_at,
				doctor_id,
				organization_id,
				patient_id,
				unregistered_patient_id,
				patient:patient_id(firstName, lastName, identifier),
				unregisteredPatient:unregistered_patient_id(first_name, last_name, identification)
			`)
			.gte('started_at', today.toISOString())
			.lte('started_at', tomorrow.toISOString())
			.not('doctor_id', 'is', null);

		if (consultationsError) {
			console.error('[Cron Check Pending Payments] Error obteniendo consultas:', consultationsError);
		}

		// Agrupar por doctor y crear notificaciones
		const doctorsToNotify = new Map<string, {
			doctorId: string;
			organizationId: string | null;
			appointments: any[];
			consultations: any[];
		}>();

		// Procesar citas con facturaciones pendientes
		(appointments || []).forEach((apt: any) => {
			const facturacion = facturacionesPendientes.find((f: any) => f.appointment_id === apt.id);
			if (facturacion && apt.doctor_id) {
				if (!doctorsToNotify.has(apt.doctor_id)) {
					doctorsToNotify.set(apt.doctor_id, {
						doctorId: apt.doctor_id,
						organizationId: apt.organization_id,
						appointments: [],
						consultations: [],
					});
				}
				const doctorData = doctorsToNotify.get(apt.doctor_id)!;
				doctorData.appointments.push({
					...apt,
					facturacion,
				});
			}
		});

		// Procesar consultas con facturaciones pendientes (usar for...of para await)
		for (const cons of consultations || []) {
			if (cons.doctor_id) {
				// Buscar facturación asociada a esta consulta
				const facturacion = facturacionesPendientes.find(
					(f: any) => f.appointment_id === cons.appointment_id || 
					(f.patient_id === cons.patient_id && cons.patient_id) ||
					(f.unregistered_patient_id === cons.unregistered_patient_id && cons.unregistered_patient_id)
				);

				if (facturacion || !cons.appointment_id) {
					// Si no tiene appointment_id, buscar facturación por paciente
					let facturacionToUse = facturacion;
					if (!facturacionToUse) {
						const query = supabaseAdmin
							.from('facturacion')
							.select('id, estado_pago, total, currency')
							.eq('doctor_id', cons.doctor_id)
							.in('estado_pago', ['pendiente', 'pendiente_verificacion'])
							.order('fecha_emision', { ascending: false })
							.limit(1);

						if (cons.patient_id) {
							query.eq('patient_id', cons.patient_id);
						} else if (cons.unregistered_patient_id) {
							query.eq('unregistered_patient_id', cons.unregistered_patient_id);
						}

						const { data: facturacionData } = await query.maybeSingle();
						if (facturacionData) {
							facturacionToUse = facturacionData;
						}
					}

					if (facturacionToUse) {
						if (!doctorsToNotify.has(cons.doctor_id)) {
							doctorsToNotify.set(cons.doctor_id, {
								doctorId: cons.doctor_id,
								organizationId: cons.organization_id,
								appointments: [],
								consultations: [],
							});
						}
						const doctorData = doctorsToNotify.get(cons.doctor_id)!;
						doctorData.consultations.push({
							...cons,
							facturacion: facturacionToUse,
						});
					}
				}
			}
		}

		// Crear notificaciones para cada doctor
		const notificationsCreated = [];
		for (const [doctorId, doctorData] of doctorsToNotify.entries()) {
			const totalPending = doctorData.appointments.length + doctorData.consultations.length;
			
			if (totalPending > 0) {
				const patientNames = [
					...doctorData.appointments.map((apt: any) => {
						if (apt.patient) {
							return `${apt.patient.firstName} ${apt.patient.lastName}`;
						} else if (apt.unregisteredPatient) {
							return `${apt.unregisteredPatient.first_name} ${apt.unregisteredPatient.last_name}`;
						}
						return 'Paciente';
					}),
					...doctorData.consultations.map((cons: any) => {
						if (cons.patient) {
							return `${cons.patient.firstName} ${cons.patient.lastName}`;
						} else if (cons.unregisteredPatient) {
							return `${cons.unregisteredPatient.first_name} ${cons.unregisteredPatient.last_name}`;
						}
						return 'Paciente';
					}),
				].slice(0, 3); // Mostrar máximo 3 nombres

				const message = totalPending === 1
					? `Tienes 1 cita/consulta con pago pendiente que requiere validación: ${patientNames[0]}`
					: `Tienes ${totalPending} citas/consultas con pagos pendientes que requieren validación: ${patientNames.join(', ')}${totalPending > 3 ? ' y más' : ''}`;

				try {
					await createNotification({
						userId: doctorId,
						organizationId: doctorData.organizationId,
						type: 'PAYMENT_VALIDATION_REQUIRED',
						title: 'Validación de Pagos Pendiente',
						message,
						payload: {
							totalPending,
							appointmentsCount: doctorData.appointments.length,
							consultationsCount: doctorData.consultations.length,
							appointments: doctorData.appointments.map((apt: any) => ({
								id: apt.id,
								scheduled_at: apt.scheduled_at,
							})),
							consultations: doctorData.consultations.map((cons: any) => ({
								id: cons.id,
								started_at: cons.started_at,
							})),
							alertsUrl: '/dashboard/medic/alerts',
						},
						sendEmail: true,
					});
					notificationsCreated.push(doctorId);
				} catch (notifError) {
					console.error(`[Cron Check Pending Payments] Error creando notificación para doctor ${doctorId}:`, notifError);
				}
			}
		}

		return NextResponse.json({
			success: true,
			message: `Procesadas ${doctorsToNotify.size} notificaciones`,
			doctorsNotified: notificationsCreated.length,
			totalDoctors: doctorsToNotify.size,
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error('[Cron Check Pending Payments] Error:', error);
		return NextResponse.json(
			{
				success: false,
				error: error.message || 'Error en el cron job de verificación de pagos pendientes',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

