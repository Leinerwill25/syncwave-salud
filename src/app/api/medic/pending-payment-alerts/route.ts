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
				.select('id, appointment_id, estado_pago, total, currency, fecha_emision')
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
		const alerts: any[] = [];

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
		(appointments || []).forEach((apt: any) => {
			const facturacion = facturacionesPendientes.find((f: any) => f.appointment_id === apt.id);
			if (facturacion) {
				const patient = normalizePatient(apt.patient);
				const unregisteredPatient = normalizeUnregisteredPatient(apt.unregisteredPatient);
				
				const patientName = patient
					? `${patient.firstName} ${patient.lastName}`
					: unregisteredPatient
					? `${unregisteredPatient.first_name} ${unregisteredPatient.last_name}`
					: 'Paciente';

				alerts.push({
					type: 'appointment',
					id: apt.id,
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
					url: `/dashboard/medic/consultas/${apt.id}`,
				});
			}
		});

		// Procesar consultas (usar for...of para await)
		for (const cons of consultations || []) {
			// Buscar facturación asociada
			let facturacion = facturacionesPendientes.find((f: any) => f.appointment_id === cons.appointment_id);

			// Si no hay facturación por appointment, buscar por paciente
			if (!facturacion) {
				let query = supabase
					.from('facturacion')
					.select('id, estado_pago, total, currency, fecha_emision')
					.eq('doctor_id', user.userId)
					.in('estado_pago', ['pendiente', 'pendiente_verificacion'])
					.order('fecha_emision', { ascending: false })
					.limit(1);

				if (cons.patient_id) {
					query = query.eq('patient_id', cons.patient_id);
				} else if (cons.unregistered_patient_id) {
					query = query.eq('unregistered_patient_id', cons.unregistered_patient_id);
				}

				const { data: facturacionData } = await query.maybeSingle();
				if (facturacionData) {
					facturacion = facturacionData;
				}
			}

			if (facturacion) {
				const patient = normalizePatient(cons.patient);
				const unregisteredPatient = normalizeUnregisteredPatient(cons.unregisteredPatient);
				
				const patientName = patient
					? `${patient.firstName} ${patient.lastName}`
					: unregisteredPatient
					? `${unregisteredPatient.first_name} ${unregisteredPatient.last_name}`
					: 'Paciente';

				alerts.push({
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

