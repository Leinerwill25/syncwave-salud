// app/api/medic/orders/active-patients/route.ts
// API para obtener pacientes con citas o consultas en progreso para el médico actual

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { apiRequireRole } from '@/lib/auth-guards';

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

		const now = new Date();
		const nowISO = now.toISOString();
		const doctorId = user.userId; // ID de la tabla User

		// Obtener citas en progreso o programadas que ya comenzaron del médico
		// Incluimos tanto IN_PROGRESS como SCHEDULED que ya comenzaron
		const { data: activeAppointments, error: appointmentsError } = await supabase
			.from('appointment')
			.select(`
				id,
				patient_id,
				scheduled_at,
				duration_minutes,
				status,
				Patient:patient_id (
					id,
					firstName,
					lastName,
					identifier
				)
			`)
			.eq('doctor_id', doctorId)
			.in('status', ['IN_PROGRESS', 'SCHEDULED'])
			.lte('scheduled_at', nowISO); // La cita debe haber comenzado

		if (appointmentsError) {
			console.error('[Active Patients API] Error obteniendo citas:', appointmentsError);
		}

		// Obtener consultas en progreso del médico (started_at no null, ended_at null)
		const { data: activeConsultations, error: consultationsError } = await supabase
			.from('consultation')
			.select(`
				id,
				patient_id,
				started_at,
				chief_complaint,
				diagnosis,
				Patient:patient_id (
					id,
					firstName,
					lastName,
					identifier
				)
			`)
			.eq('doctor_id', doctorId)
			.not('started_at', 'is', null)
			.is('ended_at', null);

		if (consultationsError) {
			console.error('[Active Patients API] Error obteniendo consultas:', consultationsError);
		}

		// Tipos para los datos
		type AppointmentData = {
			id: string;
			patient_id: string;
			scheduled_at: string;
			duration_minutes: number | null;
			status: string;
			Patient: {
				id: string;
				firstName: string;
				lastName: string;
				identifier: string | null;
			} | {
				id: string;
				firstName: string;
				lastName: string;
				identifier: string | null;
			}[];
		};

		type ConsultationData = {
			id: string;
			patient_id: string;
			started_at: string;
			chief_complaint: string | null;
			diagnosis: string | null;
			Patient: {
				id: string;
				firstName: string;
				lastName: string;
				identifier: string | null;
			} | {
				id: string;
				firstName: string;
				lastName: string;
				identifier: string | null;
			}[];
		};

		type PatientData = {
			id: string;
			firstName: string;
			lastName: string;
			identifier: string | null;
		};

		type ActivePatientItem = {
			patient: PatientData;
			appointment?: {
				id: string;
				scheduled_at: string;
				duration_minutes: number | null;
			};
			consultation?: {
				id: string;
				started_at: string;
				chief_complaint: string | null;
				diagnosis: string | null;
			};
		};

		// Validar que las citas estén dentro del rango de tiempo
		const validAppointments = (activeAppointments || []).filter((apt: AppointmentData) => {
			if (!apt.scheduled_at) return false;
			
			const scheduledTime = new Date(apt.scheduled_at);
			const durationMinutes = apt.duration_minutes || 30;
			const endTime = new Date(scheduledTime.getTime() + durationMinutes * 60 * 1000);
			
			// La cita está en progreso si: now >= scheduled_at && now <= scheduled_at + duration
			// Permitimos un margen de 15 minutos antes del inicio (por si el médico llega temprano)
			const startMargin = new Date(scheduledTime.getTime() - 15 * 60 * 1000);
			return now >= startMargin && now <= endTime;
		});

		// Validar que las consultas estén activas (started_at reciente, no más de 4 horas)
		const validConsultations = (activeConsultations || []).filter((cons: ConsultationData) => {
			if (!cons.started_at) return false;
			
			const startedTime = new Date(cons.started_at);
			const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
			
			// La consulta está activa si comenzó en las últimas 4 horas
			return startedTime >= fourHoursAgo;
		});

		// Combinar y deduplicar pacientes
		const patientMap = new Map<string, ActivePatientItem>();

		// Agregar pacientes de citas válidas
		validAppointments.forEach((apt: AppointmentData) => {
			if (apt.Patient && apt.patient_id) {
				const patient = Array.isArray(apt.Patient) ? apt.Patient[0] : apt.Patient;
				if (!patientMap.has(apt.patient_id)) {
					patientMap.set(apt.patient_id, {
						patient,
						appointment: {
							id: apt.id,
							scheduled_at: apt.scheduled_at,
							duration_minutes: apt.duration_minutes,
						},
					});
				}
			}
		});

		// Agregar pacientes de consultas válidas (priorizar si ya existe)
		validConsultations.forEach((cons: ConsultationData) => {
			if (cons.Patient && cons.patient_id) {
				const patient = Array.isArray(cons.Patient) ? cons.Patient[0] : cons.Patient;
				const existing = patientMap.get(cons.patient_id);
				if (existing) {
					existing.consultation = {
						id: cons.id,
						started_at: cons.started_at,
						chief_complaint: cons.chief_complaint,
						diagnosis: cons.diagnosis,
					};
				} else {
					patientMap.set(cons.patient_id, {
						patient,
						consultation: {
							id: cons.id,
							started_at: cons.started_at,
							chief_complaint: cons.chief_complaint,
							diagnosis: cons.diagnosis,
						},
					});
				}
			}
		});

		// Convertir a array
		const activePatients = Array.from(patientMap.values()).map((item) => ({
			patient: item.patient,
			appointment: item.appointment || null,
			consultation: item.consultation || null,
		}));

		return NextResponse.json({
			patients: activePatients,
			count: activePatients.length,
		}, { status: 200 });
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Active Patients API] Error inesperado:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

