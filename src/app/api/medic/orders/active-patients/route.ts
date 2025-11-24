// app/api/medic/orders/active-patients/route.ts
// API para obtener pacientes con citas o consultas en progreso para el médico actual

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { apiRequireRole } from '@/lib/auth-guards';

export async function GET(req: Request) {
	try {
		// Obtener cookieStore primero
		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		// Intentar obtener sesión directamente
		let { data: sessionData, error: sessionError } = await supabase.auth.getSession();

		// Si no hay sesión, intentar restaurar desde cookies
		if (!sessionData?.session) {
			const { tryRestoreSessionFromCookies } = await import('@/lib/auth-guards');
			const restored = await tryRestoreSessionFromCookies(supabase as any, cookieStore);
			if (restored) {
				const after = await supabase.auth.getSession();
				sessionData = after.data ?? after;
				sessionError = after.error ?? sessionError;
			}
		}

		// Obtener usuario autenticado
		let doctorId: string | null = null;

		if (sessionData?.session?.user) {
			// Si tenemos sesión, obtener el usuario de la app
			const authId = sessionData.session.user.id;
			const { data: appUser, error: userError } = await supabase
				.from('User')
				.select('id, role')
				.eq('authId', authId)
				.maybeSingle();

			if (userError || !appUser) {
				console.error('[Active Patients API] Error obteniendo usuario de la app:', userError);
				return NextResponse.json({ error: 'Error al obtener datos del usuario' }, { status: 500 });
			}

			if (appUser.role !== 'MEDICO') {
				return NextResponse.json({ error: 'No autorizado - rol incorrecto' }, { status: 403 });
			}

			doctorId = appUser.id;
		} else {
			// Si no hay sesión, usar apiRequireRole como fallback
			const authResult = await apiRequireRole(['MEDICO']);
			if (authResult.response) return authResult.response;

			const user = authResult.user;
			if (!user) {
				return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
			}

			doctorId = user.userId;
		}

		if (!doctorId) {
			return NextResponse.json({ error: 'No se pudo determinar el ID del médico' }, { status: 500 });
		}

		const now = new Date();
		const nowISO = now.toISOString();

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
		// Incluir tanto pacientes registrados como no registrados
		const { data: activeConsultations, error: consultationsError } = await supabase
			.from('consultation')
			.select(`
				id,
				patient_id,
				unregistered_patient_id,
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
			patient_id: string | null;
			unregistered_patient_id: string | null;
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
			}[] | null;
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

		// Obtener datos de pacientes no registrados si hay consultas con unregistered_patient_id
		const unregisteredPatientIds = [
			...new Set(
				(activeConsultations || [])
					.filter((c: ConsultationData) => c.unregistered_patient_id && !c.patient_id)
					.map((c: ConsultationData) => c.unregistered_patient_id)
					.filter(Boolean) as string[]
			),
		];

		let unregisteredPatientsMap = new Map<string, any>();
		if (unregisteredPatientIds.length > 0) {
			const { data: unregisteredPatientsData, error: unregisteredError } = await supabase
				.from('unregisteredpatients')
				.select('id, first_name, last_name, identification')
				.in('id', unregisteredPatientIds);

			if (unregisteredError) {
				console.error('[Active Patients API] Error obteniendo pacientes no registrados:', unregisteredError);
			} else if (unregisteredPatientsData) {
				unregisteredPatientsData.forEach((up: any) => {
					unregisteredPatientsMap.set(up.id, {
						id: up.id,
						firstName: up.first_name,
						lastName: up.last_name,
						identifier: up.identification || null,
					});
				});
			}
		}

		// Agregar pacientes de consultas válidas (priorizar si ya existe)
		validConsultations.forEach((cons: ConsultationData) => {
			let patient: PatientData | null = null;
			let patientKey: string | null = null;

			// Si es paciente registrado
			if (cons.patient_id && cons.Patient) {
				patient = Array.isArray(cons.Patient) ? cons.Patient[0] : cons.Patient;
				patientKey = cons.patient_id;
			}
			// Si es paciente no registrado
			else if (cons.unregistered_patient_id) {
				const unregisteredPatient = unregisteredPatientsMap.get(cons.unregistered_patient_id);
				if (unregisteredPatient) {
					patient = unregisteredPatient;
					patientKey = cons.unregistered_patient_id;
				}
			}

			if (patient && patientKey) {
				const existing = patientMap.get(patientKey);
				if (existing) {
					existing.consultation = {
						id: cons.id,
						started_at: cons.started_at,
						chief_complaint: cons.chief_complaint,
						diagnosis: cons.diagnosis,
					};
				} else {
					patientMap.set(patientKey, {
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

		// Convertir a array y marcar si es paciente no registrado
		const activePatients = Array.from(patientMap.values()).map((item) => {
			// Verificar si el patient_id está en la tabla de pacientes no registrados
			const isUnregistered = unregisteredPatientsMap.has(item.patient.id);
			return {
				patient: {
					...item.patient,
					is_unregistered: isUnregistered,
				},
				appointment: item.appointment || null,
				consultation: item.consultation || null,
			};
		});

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

