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
				scheduled_at,
				status,
				selected_service,
				patient:patient_id(firstName, lastName, identifier, phone),
				unregistered_patient:unregistered_patient_id(first_name, last_name, identification, phone)`
			)
			.eq('organization_id', session.organizationId)
			.gte('scheduled_at', `${defaultStartDate}T00:00:00`)
			.lte('scheduled_at', `${defaultEndDate}T23:59:59`);

		if (error) {
			console.error('[Role User Appointments Statistics API] Error:', error);
			return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 });
		}

		if (!appointments) {
			return NextResponse.json({
				publicPage: 0,
				manualAssistant: 0,
				patientDashboard: 0,
				total: 0,
			});
		}

		// Categorizar las citas
		// Prioridad de categorización:
		// 1. Asistente manual: tiene created_by_role_user_id (prioridad más alta)
		// 2. Dashboard paciente: tiene booked_by_patient_id y patient_id
		// 3. Página pública: tiene unregistered_patient_id y NO tiene created_by_role_user_id ni booked_by_patient_id
		// 4. Otras: si tiene patient_id pero no booked_by_patient_id ni created_by_role_user_id, podría ser página pública convertida
		let publicPage = 0;
		let manualAssistant = 0;
		let patientDashboard = 0;

		appointments.forEach((apt: any) => {
			const hasCreatedByRoleUser = !!apt.created_by_role_user_id;
			const hasBookedByPatient = !!apt.booked_by_patient_id;
			const hasUnregisteredPatient = !!apt.unregistered_patient_id;
			const hasPatient = !!apt.patient_id;

			if (hasCreatedByRoleUser) {
				// Prioridad 1: Cita creada manualmente por asistente
				manualAssistant++;
			} else if (hasBookedByPatient && hasPatient) {
				// Prioridad 2: Cita creada desde dashboard del paciente (paciente registrado)
				patientDashboard++;
			} else if (hasUnregisteredPatient && !hasCreatedByRoleUser && !hasBookedByPatient) {
				// Prioridad 3: Cita desde página pública (tiene unregistered_patient_id y no fue creada por asistente ni paciente)
				publicPage++;
			} else if (!hasCreatedByRoleUser && !hasBookedByPatient && !hasUnregisteredPatient && hasPatient) {
				// Caso especial: cita con patient_id pero sin indicadores de origen
				// Podría ser de página pública que luego se registró, pero sin unregistered_patient_id
				// Por ahora, no la contamos en ninguna categoría específica
				// (se cuenta en total pero no en ninguna categoría)
			}
		});

		const total = appointments.length;

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
