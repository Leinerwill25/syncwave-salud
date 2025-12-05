// app/api/medic/patients-with-consultations/route.ts
// API para obtener pacientes (registrados y no registrados) que han tenido consultas con el doctor en sesión

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

export async function GET(req: NextRequest) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const doctorId = user.userId;

		console.log('[Patients with Consultations API] Buscando consultas para doctor:', doctorId);

		// Obtener todas las consultas del doctor
		const { data: consultations, error: consultationsError } = await supabase
			.from('consultation')
			.select('patient_id, unregistered_patient_id')
			.eq('doctor_id', doctorId);

		if (consultationsError) {
			console.error('[Patients with Consultations API] Error obteniendo consultas:', consultationsError);
			return NextResponse.json({ error: consultationsError.message }, { status: 500 });
		}

		console.log('[Patients with Consultations API] Consultas encontradas:', consultations?.length || 0);

		// Extraer IDs únicos de pacientes registrados y no registrados
		const registeredPatientIds = new Set<string>();
		const unregisteredPatientIds = new Set<string>();

		(consultations || []).forEach((c: any) => {
			if (c.patient_id) registeredPatientIds.add(c.patient_id);
			if (c.unregistered_patient_id) unregisteredPatientIds.add(c.unregistered_patient_id);
		});

		console.log('[Patients with Consultations API] Pacientes registrados:', registeredPatientIds.size);
		console.log('[Patients with Consultations API] Pacientes no registrados:', unregisteredPatientIds.size);

		// Obtener pacientes registrados
		const registeredPatients: any[] = [];
		if (registeredPatientIds.size > 0) {
			const { data: registeredData, error: registeredError } = await supabase
				.from('Patient')
				.select('id, firstName, lastName, identifier')
				.in('id', Array.from(registeredPatientIds));

			if (registeredError) {
				console.error('[Patients with Consultations API] Error obteniendo pacientes registrados:', registeredError);
			} else {
				registeredPatients.push(...(registeredData || []));
			}
		}

		// Obtener pacientes no registrados
		const unregisteredPatients: any[] = [];
		if (unregisteredPatientIds.size > 0) {
			const { data: unregisteredData, error: unregisteredError } = await supabase
				.from('unregisteredpatients')
				.select('id, first_name, last_name, identification')
				.in('id', Array.from(unregisteredPatientIds));

			if (unregisteredError) {
				console.error('[Patients with Consultations API] Error obteniendo pacientes no registrados:', unregisteredError);
			} else {
				// Normalizar datos de pacientes no registrados para que coincidan con el formato de registrados
				unregisteredPatients.push(
					...(unregisteredData || []).map((up: any) => ({
						id: up.id,
						firstName: up.first_name,
						lastName: up.last_name,
						identifier: up.identification,
						is_unregistered: true,
					}))
				);
			}
		}

		// Combinar y ordenar por nombre
		const allPatients = [...registeredPatients, ...unregisteredPatients].sort((a, b) => {
			const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
			const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
			return nameA.localeCompare(nameB);
		});

		console.log('[Patients with Consultations API] Total de pacientes encontrados:', allPatients.length);

		return NextResponse.json({ patients: allPatients }, { status: 200 });
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Patients with Consultations API] Error inesperado:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

