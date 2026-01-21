import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getRoleUserSessionFromServer } from '@/lib/role-user-auth';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
	try {
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		// Usar service role para evitar problemas de RLS
		const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
		const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

		if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
			console.error('[Role User Appointments Statistics API] Variables de entorno de Supabase no configuradas');
			return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
		}

		const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: { persistSession: false },
		});

		const { searchParams } = new URL(req.url);
		const startDate = searchParams.get('startDate'); // Formato: YYYY-MM-DD
		const endDate = searchParams.get('endDate'); // Formato: YYYY-MM-DD

		// Si no se proporcionan fechas, usar el mes actual
		const now = new Date();
		const defaultStartDate = startDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
		const defaultEndDate = endDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;

		// Construir query base - todas las citas de la organización con información completa
		const { data: appointments, error } = await supabase
			.from('appointment')
			.select(
				`id, 
				created_by_role_user_id, 
				booked_by_patient_id, 
				patient_id, 
				unregistered_patient_id,
				created_by_doctor_id,
				doctor_id,
				scheduled_at,
				status,
				selected_service,
				patient:patient_id(firstName, lastName, identifier, phone),
				unregistered_patient:unregistered_patient_id(first_name, last_name, identification, phone)`
			)
			.eq('organization_id', session.organizationId)
			.gte('scheduled_at', `${defaultStartDate}T00:00:00`)
			.lte('scheduled_at', `${defaultEndDate}T23:59:59`);

		// Log de depuración para verificar los datos
		console.log(`[Role User Appointments Statistics] Total citas encontradas: ${appointments?.length || 0}`);
		console.log(`[Role User Appointments Statistics] Rango de fechas: ${defaultStartDate} a ${defaultEndDate}`);
		console.log(`[Role User Appointments Statistics] Organization ID: ${session.organizationId}`);

		if (error) {
			console.error('[Role User Appointments Statistics API] Error:', error);
			return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 });
		}

		if (!appointments) {
			return NextResponse.json({
				publicPage: 0,
				manualAssistant: 0,
				patientDashboard: 0,
				doctorDashboard: 0,
				total: 0,
			});
		}

		// Categorizar las citas
		// NOTA IMPORTANTE: 
		// - El doctor puede crear citas para pacientes REGISTRADOS o NO REGISTRADOS → siempre tiene created_by_doctor_id
		// - El asistente puede crear citas para pacientes REGISTRADOS o NO REGISTRADOS → siempre tiene created_by_role_user_id
		// - El tipo de paciente (registrado vs no registrado) NO determina el origen, sino quién creó la cita
		//
		// Prioridad de categorización (ESTRICTA):
		// 1. Asistente manual: tiene created_by_role_user_id (prioridad más alta)
		//    - Puede ser para patient_id (registrado) O unregistered_patient_id (no registrado)
		// 2. Dashboard doctor: tiene created_by_doctor_id
		//    - Puede ser para patient_id (registrado) O unregistered_patient_id (no registrado)
		// 3. Dashboard paciente: tiene booked_by_patient_id y patient_id (solo pacientes registrados pueden usar dashboard)
		// 4. Página pública: tiene unregistered_patient_id Y NO tiene created_by_role_user_id, created_by_doctor_id, ni booked_by_patient_id
		//    - CRÍTICO: Solo se cuenta como "Página Pública" si:
		//      a) Tiene unregistered_patient_id (paciente NO registrado)
		//      b) NO tiene created_by_role_user_id (no fue creada por asistente)
		//      c) NO tiene created_by_doctor_id (no fue creada por doctor)
		//      d) NO tiene booked_by_patient_id (no fue reservada por paciente registrado)
		// 5. Otras: si tiene patient_id pero no tiene ningún indicador de origen, podría ser página pública convertida o creada por doctor sin campo
		let publicPage = 0;
		let manualAssistant = 0;
		let patientDashboard = 0;
		let doctorDashboard = 0;

		appointments.forEach((apt: any) => {
			const hasCreatedByRoleUser = !!apt.created_by_role_user_id;
			const hasCreatedByDoctor = !!apt.created_by_doctor_id;
			// Verificar booked_by_patient_id: debe existir, no ser null, y no ser string vacío
			const hasBookedByPatient = apt.booked_by_patient_id != null && apt.booked_by_patient_id !== '';
			const hasUnregisteredPatient = !!apt.unregistered_patient_id;
			const hasPatient = !!apt.patient_id;

			// Log de depuración para las primeras citas
			if (appointments.indexOf(apt) < 3) {
				console.log(`[Role User Appointments Statistics] Cita ${apt.id}:`, {
					created_by_role_user_id: apt.created_by_role_user_id,
					created_by_doctor_id: apt.created_by_doctor_id,
					booked_by_patient_id: apt.booked_by_patient_id,
					patient_id: apt.patient_id,
					unregistered_patient_id: apt.unregistered_patient_id,
					hasCreatedByRoleUser,
					hasCreatedByDoctor,
					hasBookedByPatient,
					hasPatient,
					hasUnregisteredPatient,
				});
			}

			// PRIORIDAD 1: Asistente manual (tiene created_by_role_user_id)
			if (hasCreatedByRoleUser) {
				// Cita creada manualmente por asistente
				// Puede ser para paciente registrado (patient_id) o no registrado (unregistered_patient_id)
				manualAssistant++;
			}
			// PRIORIDAD 2: Dashboard doctor (tiene created_by_doctor_id)
			else if (hasCreatedByDoctor) {
				// Cita creada desde dashboard del doctor
				// Puede ser para paciente registrado (patient_id) o no registrado (unregistered_patient_id)
				doctorDashboard++;
			}
			// PRIORIDAD 3: Dashboard paciente (tiene booked_by_patient_id y patient_id)
			else if (hasBookedByPatient && hasPatient) {
				// Cita creada desde dashboard del paciente (paciente registrado)
				// Solo pacientes registrados pueden usar el dashboard de pacientes
				patientDashboard++;
			}
			// PRIORIDAD 4: Página pública (ESTRICTA: solo si cumple TODAS las condiciones)
			// CRÍTICO: Una cita es "Página Pública" SOLO si:
			// - Tiene unregistered_patient_id (paciente NO registrado)
			// - NO tiene patient_id (no es paciente registrado)
			// - NO tiene created_by_role_user_id (no fue creada por asistente)
			// - NO tiene created_by_doctor_id (no fue creada por doctor)
			// - NO tiene booked_by_patient_id (no fue reservada por paciente registrado)
			else if (
				hasUnregisteredPatient && // Tiene paciente NO registrado
				!hasPatient && // NO tiene patient_id (solo unregistered_patient_id)
				!hasCreatedByRoleUser && // NO fue creada por asistente
				!hasCreatedByDoctor && // NO fue creada por doctor
				!hasBookedByPatient // NO fue reservada por paciente registrado
			) {
				// Cita desde página pública (c/[id])
				// Solo se cuenta si es paciente no registrado Y no tiene ningún indicador de creación manual
				publicPage++;
				// Log para identificar citas que podrían necesitar revisión manual
				if (appointments.indexOf(apt) < 5) {
					console.log(`[Role User Appointments Statistics] Cita identificada como "Página Pública": ${apt.id}`, {
						unregistered_patient_id: apt.unregistered_patient_id,
						patient_id: apt.patient_id,
						doctor_id: apt.doctor_id,
						created_at: apt.created_at || 'N/A',
					});
				}
			}
			// CASO ESPECIAL: Citas antiguas sin indicadores de origen pero con patient_id
			else if (!hasCreatedByRoleUser && !hasCreatedByDoctor && !hasBookedByPatient && !hasUnregisteredPatient && hasPatient) {
				// Cita con patient_id pero sin indicadores de origen
				// Si tiene doctor_id, asumimos que fue creada por el doctor (para citas antiguas sin el campo)
				if (apt.doctor_id) {
					doctorDashboard++; // Asumir que fue creada por el doctor si tiene doctor_id pero no otros indicadores
				} else {
					// Si no tiene doctor_id ni otros indicadores, pero tiene patient_id y scheduled_at,
					// podría ser una cita antigua sin origen. Por ahora, no la categorizamos.
					console.warn(`[Role User Appointments Statistics] Cita sin origen claro: ${apt.id}, patient_id: ${apt.patient_id}, doctor_id: ${apt.doctor_id}`);
				}
			}
			// CASO ESPECIAL: Citas con unregistered_patient_id pero sin indicadores claros (posiblemente antiguas)
			// Si tiene unregistered_patient_id pero también tiene patient_id, o no tiene indicadores de origen,
			// no la contamos como "Página Pública" por seguridad (probablemente fue creada antes del sistema de rastreo)
			else if (hasUnregisteredPatient && !hasCreatedByRoleUser && !hasCreatedByDoctor && !hasBookedByPatient) {
				// Tiene unregistered_patient_id pero no tiene indicadores de origen
				// Si tiene doctor_id, asumimos que fue creada por el doctor (citas antiguas)
				if (apt.doctor_id) {
					doctorDashboard++;
				} else {
					// Sin indicadores claros, no la categorizamos como página pública por seguridad
					// Esto evita contar citas antiguas como "Página Pública"
					console.warn(`[Role User Appointments Statistics] Cita con unregistered_patient_id sin origen claro (posiblemente antigua): ${apt.id}, doctor_id: ${apt.doctor_id}`);
				}
			}
		});

		const total = appointments.length;

		// Log de resumen de categorización
		console.log(`[Role User Appointments Statistics] Resumen de categorización:`, {
			publicPage,
			manualAssistant,
			patientDashboard,
			doctorDashboard,
			total,
		});

		// Obtener citas que han asistido (tienen consulta asociada o estado COMPLETADA)
		const { data: consultations, error: consultationsError } = await supabase
			.from('consultation')
			.select('appointment_id, started_at')
			.eq('organization_id', session.organizationId)
			.gte('started_at', `${defaultStartDate}T00:00:00`)
			.lte('started_at', `${defaultEndDate}T23:59:59`);

		// Crear un Set de appointment_ids que tienen consulta
		const appointmentIdsWithConsultation = new Set(
			(consultations || []).map((c: any) => c.appointment_id).filter(Boolean)
		);

		// Filtrar citas que asistieron (tienen consulta o estado COMPLETADA)
		const attendedAppointments = (appointments || []).filter((apt: any) => {
			return appointmentIdsWithConsultation.has(apt.id) || apt.status === 'COMPLETADA';
		});

		// Función para parsear selected_service
		const parseService = (service: any): string => {
			if (!service) return 'Sin servicio';
			try {
				if (typeof service === 'string') {
					const parsed = JSON.parse(service);
					if (Array.isArray(parsed) && parsed.length > 0) {
						return parsed.map((s: any) => s?.name || s).join(', ');
					}
					return parsed?.name || service;
				}
				if (Array.isArray(service) && service.length > 0) {
					return service.map((s: any) => s?.name || s).join(', ');
				}
				return service?.name || 'Sin servicio';
			} catch {
				return typeof service === 'string' ? service : service?.name || 'Sin servicio';
			}
		};

		// Desglose por fecha
		const breakdownByDate: Record<string, number> = {};
		attendedAppointments.forEach((apt: any) => {
			if (apt.scheduled_at) {
				const date = new Date(apt.scheduled_at).toISOString().split('T')[0];
				breakdownByDate[date] = (breakdownByDate[date] || 0) + 1;
			}
		});

		// Desglose por servicio
		const breakdownByService: Record<string, number> = {};
		attendedAppointments.forEach((apt: any) => {
			const serviceName = parseService(apt.selected_service);
			breakdownByService[serviceName] = (breakdownByService[serviceName] || 0) + 1;
		});

		// Desglose por hora
		const breakdownByHour: Record<string, number> = {};
		attendedAppointments.forEach((apt: any) => {
			if (apt.scheduled_at) {
				const date = new Date(apt.scheduled_at);
				const hour = String(date.getHours()).padStart(2, '0') + ':00';
				breakdownByHour[hour] = (breakdownByHour[hour] || 0) + 1;
			}
		});

		// Lista de pacientes que asistieron con información completa
		const patientsAttended = attendedAppointments.map((apt: any) => {
			const patient = apt.patient || apt.unregistered_patient;
			const firstName = patient?.firstName || patient?.first_name || '';
			const lastName = patient?.lastName || patient?.last_name || '';
			const identifier = patient?.identifier || patient?.identification || null;
			const phone = patient?.phone || null;
			const patientName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || 'N/A';
			const isUnregistered = !!apt.unregistered_patient;

			return {
				id: apt.id,
				patientName,
				patientIdentifier: identifier,
				patientPhone: phone,
				isUnregistered,
				scheduledAt: apt.scheduled_at,
				service: parseService(apt.selected_service),
				date: apt.scheduled_at ? new Date(apt.scheduled_at).toISOString().split('T')[0] : null,
				hour: apt.scheduled_at ? String(new Date(apt.scheduled_at).getHours()).padStart(2, '0') + ':00' : null,
			};
		});

		// Ordenar por fecha descendente
		patientsAttended.sort((a, b) => {
			if (!a.scheduledAt || !b.scheduledAt) return 0;
			return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();
		});

		return NextResponse.json({
			publicPage,
			manualAssistant,
			patientDashboard,
			doctorDashboard,
			total,
			startDate: defaultStartDate,
			endDate: defaultEndDate,
			attendedCount: attendedAppointments.length,
			patientsAttended,
			breakdownByDate,
			breakdownByService,
			breakdownByHour,
		});
	} catch (err: any) {
		console.error('[Role User Appointments Statistics API] Error:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}
