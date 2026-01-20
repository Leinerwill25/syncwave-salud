import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getRoleUserSessionFromServer, roleNameEquals } from '@/lib/role-user-auth';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
	try {
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		// Usar service role para evitar problemas de RLS al acceder a datos de pacientes
		const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
		const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

		if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
			console.error('[Role User Appointments API] Variables de entorno de Supabase no configuradas');
			return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
		}

		// Crear cliente con service role para evitar RLS
		const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: { persistSession: false },
		});
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
		// Tanto "Asistente De Citas" como "Recepción" ven todas las citas del consultorio
		// Nota: unregisteredpatients usa snake_case (first_name, last_name, identification, email)
		// Nota: Patient usa camelCase (firstName, lastName, identifier, phone) y NO tiene email
		let selectFields = `id,
			scheduled_at,
			status,
			reason,
			location,
			referral_source,
			selected_service,
			patient:patient_id(firstName, lastName, identifier, phone, dob),
			unregistered_patient:unregistered_patient_id(first_name, last_name, identification, phone, email),
			doctor:doctor_id(id, name),
			created_by_role_user_id`;

		let query = supabase.from('appointment').select(selectFields).eq('organization_id', session.organizationId).gte('scheduled_at', startIso).lte('scheduled_at', endIso).order('scheduled_at', { ascending: true });

		// Tanto "Asistente De Citas" como "Recepción" deben ver TODAS las citas del consultorio
		// El filtro por organization_id ya está aplicado, lo cual es suficiente para mostrar
		// todas las citas relacionadas al consultorio al cual pertenece el role-user

		let { data: appointments, error } = await query;

		// Si hay error en la query, intentar con campos más básicos
		if (error && (error.message?.includes('column') || error.code === 'PGRST116')) {
			console.warn('[Role User Appointments API] Error en query, reintentando con campos básicos');

			selectFields = `id,
				scheduled_at,
				status,
				reason,
				location,
				referral_source,
				selected_service,
				patient:patient_id(firstName, lastName, identifier, phone, dob),
				unregistered_patient:unregistered_patient_id(first_name, last_name, identification, phone, email),
				doctor:doctor_id(id, name)`;

			query = supabase.from('appointment').select(selectFields).eq('organization_id', session.organizationId).gte('scheduled_at', startIso).lte('scheduled_at', endIso).order('scheduled_at', { ascending: true });

			const retryResult = await query;
			appointments = retryResult.data;
			error = retryResult.error;
		}
		
		// Si aún hay error después del reintento, loguear y retornar error
		if (error) {
			console.error('[Role User Appointments API] Error después de reintento:', error);
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
			.from('user')
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

		// Función auxiliar para calcular la edad desde la fecha de nacimiento
		const calculateAge = (dob: string | Date | null | undefined): number | null => {
			if (!dob) return null;
			try {
				const birthDate = new Date(dob);
				if (isNaN(birthDate.getTime())) return null;
				const today = new Date();
				let age = today.getFullYear() - birthDate.getFullYear();
				const monthDiff = today.getMonth() - birthDate.getMonth();
				if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
					age--;
				}
				return age >= 0 ? age : null;
			} catch {
				return null;
			}
		};

		// Normalizar las citas para el formato esperado por el frontend
		const normalizedAppointments = (Array.isArray(appointments) ? appointments : []).map((apt: any) => {
			const patient = apt.patient || apt.unregistered_patient;
			// Manejar tanto camelCase (patient) como snake_case (unregistered_patient)
			// Nota: Patient NO tiene campo email, solo unregistered_patient tiene email
			const firstName = patient?.firstName || patient?.first_name || '';
			const lastName = patient?.lastName || patient?.last_name || '';
			const identifier = patient?.identifier || patient?.identification || null;
			const phone = patient?.phone || null;
			const email = patient?.email || null; // Solo unregistered_patient tiene email
			const dob = patient?.dob || null; // Fecha de nacimiento (solo Patient tiene dob, unregistered_patient no)
			const patientAge = calculateAge(dob);
			const patientName = patient && (firstName || lastName) ? `${firstName} ${lastName}`.trim() : 'N/A';
			const isUnregistered = !!apt.unregistered_patient;

			// Parsear selected_service si es un string JSON
			// selected_service puede ser: objeto, array, string JSON, o null
			let selectedService = null;
			if (apt.selected_service) {
				try {
					if (typeof apt.selected_service === 'string') {
						// Intentar parsear como JSON
						selectedService = JSON.parse(apt.selected_service);
					} else if (Array.isArray(apt.selected_service)) {
						// Ya es un array
						selectedService = apt.selected_service;
					} else if (typeof apt.selected_service === 'object') {
						// Ya es un objeto
						selectedService = apt.selected_service;
					}
					
					// Si selectedService es un array con múltiples servicios, tomar el primero o combinarlos
					if (Array.isArray(selectedService) && selectedService.length > 0) {
						// Si hay múltiples servicios, usar el primero o crear un objeto combinado
						if (selectedService.length === 1) {
							selectedService = selectedService[0];
						} else {
							// Múltiples servicios: crear objeto con nombre combinado
							const names = selectedService.map((s: any) => s?.name || s).filter(Boolean);
							selectedService = {
								name: names.join(', '),
								description: 'Múltiples servicios',
								services_included: selectedService
							};
						}
					}
				} catch (e) {
					console.warn('[Appointments API] Error parseando selected_service:', e, 'Raw value:', apt.selected_service);
					// Si falla el parseo, intentar crear un objeto básico
					if (typeof apt.selected_service === 'string') {
						selectedService = { name: apt.selected_service };
					} else {
						selectedService = apt.selected_service;
					}
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
				patientAge: patientAge,
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
