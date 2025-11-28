// app/api/medic/pending-payment-alerts/route.ts
// API para obtener alertas de pagos pendientes que requieren validación

import { NextResponse } from 'next/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';

export async function GET() {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		// Buscar citas del día o pasadas con facturaciones pendientes
		const { data: appointments, error: appointmentsError } = await supabase
			.from('appointment')
			.select(`
				id,
				scheduled_at,
				status,
				reason,
				location,
				patient_id,
				unregistered_patient_id,
				patient:patient_id(firstName, lastName, identifier),
				unregisteredPatient:unregistered_patient_id(first_name, last_name, identification)
			`)
			.eq('doctor_id', user.userId)
			.lte('scheduled_at', tomorrow.toISOString())
			.in('status', ['SCHEDULED', 'CONFIRMADA', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED']);

		if (appointmentsError) {
			console.error('[Pending Payment Alerts API] Error obteniendo citas:', appointmentsError);
			return NextResponse.json({ error: 'Error obteniendo citas' }, { status: 500 });
		}

		// Buscar facturaciones pendientes
		const appointmentIds = (appointments || []).map((apt: any) => apt.id);
		let facturacionesPendientes: any[] = [];

		if (appointmentIds.length > 0) {
			const { data: facturaciones, error: facturacionesError } = await supabase
				.from('facturacion')
				.select('id, appointment_id, consultation_id, estado_pago, total, currency, fecha_emision')
				.in('appointment_id', appointmentIds)
				.in('estado_pago', ['pendiente', 'pendiente_verificacion']);

			if (facturacionesError) {
				console.error('[Pending Payment Alerts API] Error obteniendo facturaciones:', facturacionesError);
			} else {
				facturacionesPendientes = facturaciones || [];
			}
		}

		// Buscar consultas del día con facturaciones pendientes
		const { data: consultations, error: consultationsError } = await supabase
			.from('consultation')
			.select(`
				id,
				appointment_id,
				started_at,
				created_at,
				chief_complaint,
				patient_id,
				unregistered_patient_id,
				patient:patient_id(firstName, lastName, identifier),
				unregisteredPatient:unregistered_patient_id(first_name, last_name, identification)
			`)
			.eq('doctor_id', user.userId)
			.gte('started_at', today.toISOString())
			.lte('started_at', tomorrow.toISOString());

		if (consultationsError) {
			console.error('[Pending Payment Alerts API] Error obteniendo consultas:', consultationsError);
		}

		// Combinar citas y consultas con sus facturaciones
		// Usar un Map para deduplicar por facturacion.id (cada facturación debe aparecer solo una vez)
		const alertsMap = new Map<string, any>();

		// Helper para normalizar datos de Supabase (pueden venir como array o objeto)
		const normalizePatient = (patient: any) => {
			if (!patient) return null;
			return Array.isArray(patient) ? patient[0] : patient;
		};

		const normalizeUnregisteredPatient = (unregisteredPatient: any) => {
			if (!unregisteredPatient) return null;
			return Array.isArray(unregisteredPatient) ? unregisteredPatient[0] : unregisteredPatient;
		};

		// Procesar citas
		// Usar for...of para poder hacer await al buscar consultas asociadas
		for (const apt of appointments || []) {
			const facturacion = facturacionesPendientes.find((f: any) => f.appointment_id === apt.id);
			if (facturacion) {
				// Verificar que la facturación realmente esté pendiente (doble verificación)
				if (facturacion.estado_pago !== 'pendiente' && facturacion.estado_pago !== 'pendiente_verificacion') {
					console.log(`[Pending Payment Alerts API] Facturación ${facturacion.id} no está pendiente (estado: ${facturacion.estado_pago}), omitiendo para cita ${apt.id}`);
					continue;
				}

				// Si esta facturación ya fue procesada, omitir (duplicado)
				if (alertsMap.has(facturacion.id)) {
					console.log(`[Pending Payment Alerts API] Facturación duplicada detectada y omitida: ${facturacion.id} para cita ${apt.id}`);
					continue;
				}

				// Buscar si existe una consulta asociada a esta cita
				let consultationId: string | null = null;
				const { data: consultationData } = await supabase
					.from('consultation')
					.select('id')
					.eq('appointment_id', apt.id)
					.eq('doctor_id', user.userId)
					.order('created_at', { ascending: false })
					.limit(1)
					.maybeSingle();

				if (consultationData) {
					consultationId = consultationData.id;
				}

				const patient = normalizePatient(apt.patient);
				const unregisteredPatient = normalizeUnregisteredPatient(apt.unregisteredPatient);
				
				const patientName = patient
					? `${patient.firstName} ${patient.lastName}`
					: unregisteredPatient
					? `${unregisteredPatient.first_name} ${unregisteredPatient.last_name}`
					: 'Paciente';

				// Si hay una consulta asociada, usar su ID; si no, usar el ID de la cita pero redirigir a citas
				const url = consultationId 
					? `/dashboard/medic/consultas/${consultationId}`
					: `/dashboard/medic/citas?appointment_id=${apt.id}`;

				alertsMap.set(facturacion.id, {
					type: 'appointment',
					id: consultationId || apt.id, // Usar ID de consulta si existe, sino el de la cita
					patientName,
					scheduledAt: apt.scheduled_at,
					status: apt.status,
					reason: apt.reason,
					location: apt.location,
					facturacion: {
						id: facturacion.id,
						total: facturacion.total,
						currency: facturacion.currency,
						estado_pago: facturacion.estado_pago,
					},
					url,
				});
			}
		}

		// Procesar consultas (usar for...of para await)
		// Las consultas tienen prioridad sobre las citas, así que si una facturación ya fue procesada
		// por una cita, la reemplazamos con la consulta (que es más específica)
		for (const cons of consultations || []) {
			// Buscar facturación asociada
			let facturacion = facturacionesPendientes.find((f: any) => f.appointment_id === cons.appointment_id);

			// Si no hay facturación por appointment, buscar por consultation_id primero (más específico)
			if (!facturacion) {
				let query = supabase
					.from('facturacion')
					.select('id, estado_pago, total, currency, fecha_emision, appointment_id, consultation_id')
					.eq('doctor_id', user.userId)
					.in('estado_pago', ['pendiente', 'pendiente_verificacion'])
					.order('fecha_emision', { ascending: false });

				// Prioridad 1: Buscar por consultation_id (más específico)
				query = query.eq('consultation_id', cons.id);

				const { data: facturacionByConsultation } = await query.maybeSingle();
				if (facturacionByConsultation) {
					facturacion = facturacionByConsultation;
				} else {
					// Prioridad 2: Si no hay facturación por consultation_id, buscar por appointment_id
					// (solo si la consulta tiene appointment_id)
					if (cons.appointment_id) {
						const { data: facturacionByAppointment } = await supabase
							.from('facturacion')
							.select('id, estado_pago, total, currency, fecha_emision, appointment_id, consultation_id')
							.eq('doctor_id', user.userId)
							.eq('appointment_id', cons.appointment_id)
							.in('estado_pago', ['pendiente', 'pendiente_verificacion'])
							.order('fecha_emision', { ascending: false })
							.limit(1)
							.maybeSingle();
						
						if (facturacionByAppointment) {
							facturacion = facturacionByAppointment;
						}
					}
				}
			}

			if (facturacion) {
				// Verificar que la facturación realmente esté pendiente (doble verificación)
				if (facturacion.estado_pago !== 'pendiente' && facturacion.estado_pago !== 'pendiente_verificacion') {
					console.log(`[Pending Payment Alerts API] Facturación ${facturacion.id} no está pendiente (estado: ${facturacion.estado_pago}), omitiendo para consulta ${cons.id}`);
					continue;
				}

				// Si esta facturación ya fue procesada por una cita, reemplazarla con la consulta
				// (las consultas tienen prioridad porque son más específicas)
				if (alertsMap.has(facturacion.id)) {
					const existingAlert = alertsMap.get(facturacion.id);
					if (existingAlert?.type === 'appointment') {
						console.log(`[Pending Payment Alerts API] Reemplazando alerta de cita con consulta para facturación ${facturacion.id}`);
					} else {
						console.log(`[Pending Payment Alerts API] Facturación duplicada detectada y omitida: ${facturacion.id} para consulta ${cons.id}`);
						continue;
					}
				}

				const patient = normalizePatient(cons.patient);
				const unregisteredPatient = normalizeUnregisteredPatient(cons.unregisteredPatient);
				
				const patientName = patient
					? `${patient.firstName} ${patient.lastName}`
					: unregisteredPatient
					? `${unregisteredPatient.first_name} ${unregisteredPatient.last_name}`
					: 'Paciente';

				alertsMap.set(facturacion.id, {
					type: 'consultation',
					id: cons.id,
					patientName,
					startedAt: cons.started_at || cons.created_at,
					chiefComplaint: cons.chief_complaint,
					facturacion: {
						id: facturacion.id,
						total: facturacion.total,
						currency: facturacion.currency,
						estado_pago: facturacion.estado_pago,
					},
					url: `/dashboard/medic/consultas/${cons.id}`,
				});
			}
		}

		// Convertir el Map a array
		const alerts = Array.from(alertsMap.values());

		// Ordenar por fecha (más recientes primero)
		alerts.sort((a, b) => {
			const dateA = new Date(a.scheduledAt || a.startedAt).getTime();
			const dateB = new Date(b.scheduledAt || b.startedAt).getTime();
			return dateB - dateA;
		});

		return NextResponse.json({
			success: true,
			alerts,
			total: alerts.length,
		});
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Pending Payment Alerts API] Error:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

