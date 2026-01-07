// app/api/medic/labs/[id]/route.ts
// API para obtener detalles de un resultado de laboratorio específico

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { apiRequireRole } from '@/lib/auth-guards';

// GET - Obtener detalles de un resultado
export async function GET(
	req: Request,
	context: { params: Promise<{ id: string }> }
) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const { id } = await context.params;
		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const { data: result, error } = await supabase
			.from('lab_result')
			.select(`
				id,
				patient_id,
				unregistered_patient_id,
				consultation_id,
				ordering_provider_id,
				result_type,
				result,
				attachments,
				is_critical,
				reported_at,
				created_at,
				consultation:consultation_id (
					id,
					chief_complaint,
					diagnosis,
					notes,
					started_at,
					ended_at,
					doctor_id
				)
			`)
			.eq('id', id)
			.single();

		if (error) {
			console.error('[Medic Labs API] Error:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		if (!result) {
			return NextResponse.json({ error: 'Resultado no encontrado' }, { status: 404 });
		}

		// Verificar que el médico tiene acceso (es ordering_provider o la consulta es suya)
		const hasAccess =
			result.ordering_provider_id === user.userId ||
			(result.consultation && (result.consultation as any).doctor_id === user.userId);

		if (!hasAccess) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
		}

		// Obtener información del paciente (registrado o no registrado)
		let patientInfo: any = null;
		let isUnregistered = false;

		if (result.patient_id) {
			// Intentar obtener de pacientes registrados
			const { data: registeredPatient } = await supabase
				.from('patient')
				.select('id, firstName, lastName, identifier, dob, gender, phone')
				.eq('id', result.patient_id)
				.maybeSingle();

			if (registeredPatient) {
				patientInfo = registeredPatient;
			} else {
				// Si no está en registrados, puede ser un paciente no registrado (usando su ID como patient_id)
				const { data: unregisteredPatient } = await supabase
					.from('unregisteredpatients')
					.select('id, first_name, last_name, identification, birth_date, sex, phone')
					.eq('id', result.patient_id)
					.maybeSingle();

				if (unregisteredPatient) {
					patientInfo = {
						id: unregisteredPatient.id,
						firstName: unregisteredPatient.first_name,
						lastName: unregisteredPatient.last_name,
						identifier: unregisteredPatient.identification,
						dob: unregisteredPatient.birth_date,
						gender: unregisteredPatient.sex,
						phone: unregisteredPatient.phone,
						is_unregistered: true,
					};
					isUnregistered = true;
				}
			}
		}

		// Si hay unregistered_patient_id, usar ese
		if (!patientInfo && result.unregistered_patient_id) {
			const { data: unregisteredPatient } = await supabase
				.from('unregisteredpatients')
				.select('id, first_name, last_name, identification, birth_date, sex, phone')
				.eq('id', result.unregistered_patient_id)
				.maybeSingle();

			if (unregisteredPatient) {
				patientInfo = {
					id: unregisteredPatient.id,
					firstName: unregisteredPatient.first_name,
					lastName: unregisteredPatient.last_name,
					identifier: unregisteredPatient.identification,
					dob: unregisteredPatient.birth_date,
					gender: unregisteredPatient.sex,
					phone: unregisteredPatient.phone,
					is_unregistered: true,
				};
				isUnregistered = true;
			}
		}

		return NextResponse.json(
			{
				result: {
					...result,
					Patient: patientInfo,
					is_unregistered: isUnregistered,
				},
			},
			{ status: 200 }
		);
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Labs API] Error inesperado:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

