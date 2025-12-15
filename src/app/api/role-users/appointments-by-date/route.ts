import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getRoleUserSessionFromServer, roleNameEquals } from '@/lib/role-user-auth';

export async function GET(req: NextRequest) {
	try {
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const supabase = await createSupabaseServerClient();
		const { searchParams } = new URL(req.url);
		const date = searchParams.get('date');

		if (!date) {
			return NextResponse.json({ error: 'Debe especificarse una fecha (YYYY-MM-DD).' }, { status: 400 });
		}

		// Calcular rango de día local
		const localDate = new Date(`${date}T00:00:00`);
		const startOfDay = new Date(localDate);
		startOfDay.setHours(0, 0, 0, 0);

		const endOfDay = new Date(localDate);
		endOfDay.setHours(23, 59, 59, 999);

		// Convertir a formato compatible con Postgres timestamptz
		const startIso = startOfDay.toISOString().replace('Z', '+00:00');
		const endIso = endOfDay.toISOString().replace('Z', '+00:00');

		// Construir query base - filtrar por organización del role-user
		// Intentar primero con created_by_role_user_id, si falla, usar query sin ese campo
		// Nota: unregisteredpatients usa snake_case (first_name, last_name, identification)
		// Nota: Patient NO tiene campo email, solo phone
		let selectFields = `id,
			scheduled_at,
			status,
			reason,
			location,
			referral_source,
			selected_service,
			patient:patient_id(firstName, lastName, identifier, phone),
			unregistered_patient:unregistered_patient_id(first_name, last_name, identification, phone),
			doctor:doctor_id(id, name),
			created_by_role_user_id`;

		let query = supabase.from('appointment').select(selectFields).eq('organization_id', session.organizationId).gte('scheduled_at', startIso).lte('scheduled_at', endIso).order('scheduled_at', { ascending: true });

		// Si es "Asistente De Citas", solo mostrar las citas que él creó
		if (roleNameEquals(session.roleName, 'Asistente De Citas')) {
			query = query.eq('created_by_role_user_id', session.roleUserId);
		}
		// Si es "Recepción", mostrar todas las citas del consultorio (ya filtrado por organization_id)

		let { data: appointments, error } = await query;

		// Si hay error y parece ser por campo inexistente, reintentar sin created_by_role_user_id
		if (error && (error.message?.includes('created_by_role_user_id') || error.message?.includes('column') || error.code === 'PGRST116')) {
			console.warn('[Role User Appointments API] Campo created_by_role_user_id no existe o error en query, reintentando sin ese campo');

			selectFields = `id,
				scheduled_at,
				status,
				reason,
				location,
				referral_source,
				selected_service,
				patient:patient_id(firstName, lastName, identifier, phone),
				unregistered_patient:unregistered_patient_id(first_name, last_name, identification, phone),
				doctor:doctor_id(id, name)`;

			query = supabase.from('appointment').select(selectFields).eq('organization_id', session.organizationId).gte('scheduled_at', startIso).lte('scheduled_at', endIso).order('scheduled_at', { ascending: true });

			// Para Asistente De Citas, sin el campo created_by_role_user_id, mostramos todas las citas del consultorio
			// (no podemos filtrar por quien las creó sin ese campo)

			const retryResult = await query;
			appointments = retryResult.data;
			error = retryResult.error;
		}

		if (error) {
			console.error('[Role User Appointments API] Error en query:', error);
			return NextResponse.json({ error: `Error al obtener citas: ${error.message || 'Error desconocido'}` }, { status: 500 });
		}

		if (!appointments) {
			console.warn('[Role User Appointments API] appointments es null o undefined');
			return NextResponse.json([], { status: 200 });
		}

		// Obtener el médico principal de la organización (rol MEDICO) para usar su nombre en recordatorios
		let orgDoctorName: string | null = null;
		const { data: orgDoctor, error: orgDoctorError } = await supabase
			.from('User')
			.select('id, name')
			.eq('organizationId', session.organizationId)
			.eq('role', 'MEDICO')
			.limit(1)
			.maybeSingle();

		if (orgDoctorError) {
			console.warn('[Role User Appointments API] Error obteniendo médico de la organización:', orgDoctorError);
		} else if (orgDoctor && (orgDoctor as any).name) {
			orgDoctorName = String((orgDoctor as any).name);
		}

		// Normalizar las citas para el formato esperado por el frontend
		const normalizedAppointments = (Array.isArray(appointments) ? appointments : []).map((apt: any) => {
			const patient = apt.patient || apt.unregistered_patient;
			// Manejar tanto camelCase (patient) como snake_case (unregistered_patient)
			// Nota: Patient NO tiene campo email, solo unregistered_patient podría tenerlo
			const firstName = patient?.firstName || patient?.first_name || '';
			const lastName = patient?.lastName || patient?.last_name || '';
			const identifier = patient?.identifier || patient?.identification || null;
			const phone = patient?.phone || null;
			const email = null; // Patient no tiene email en la tabla
			const patientName = patient && (firstName || lastName) ? `${firstName} ${lastName}`.trim() : 'N/A';
			const isUnregistered = !!apt.unregistered_patient;

			// Parsear selected_service si es un string JSON
			let selectedService = null;
			if (apt.selected_service) {
				try {
					selectedService = typeof apt.selected_service === 'string' ? JSON.parse(apt.selected_service) : apt.selected_service;
				} catch (e) {
					console.warn('[Appointments API] Error parseando selected_service:', e);
					selectedService = null;
				}
			}

			return {
				id: apt.id,
				patient: patientName,
				patientFirstName: firstName || null,
				patientLastName: lastName || null,
				patientIdentifier: identifier || null,
				patientPhone: phone || null,
				patientEmail: email || null,
				reason: apt.reason || '',
				time: new Date(apt.scheduled_at).toLocaleTimeString('es-ES', {
					hour: '2-digit',
					minute: '2-digit',
				}),
				scheduled_at: apt.scheduled_at,
				status: apt.status,
				location: apt.location || '',
				isUnregistered,
				bookedBy: apt.doctor
					? {
							id: apt.doctor.id,
							name: apt.doctor.name,
					  }
					: null,
				selected_service: selectedService,
				referral_source: apt.referral_source || null,
				doctorName: orgDoctorName,
			};
		});

		return NextResponse.json(normalizedAppointments, { status: 200 });
	} catch (err: any) {
		console.error('[Role User Appointments API] Error:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}
