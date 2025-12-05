// app/api/medic/orders/patient-consultations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

/**
 * GET - Obtiene las consultas de un paciente específico (registrado o no registrado)
 * Query params: patientId (puede ser de Patient o unregisteredpatients)
 */
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

		const url = new URL(req.url);
		const patientId = url.searchParams.get('patientId');

		if (!patientId) {
			return NextResponse.json({ error: 'patientId es requerido' }, { status: 400 });
		}

		// Verificar si es paciente registrado o no registrado
		const { data: registeredPatient } = await supabase
			.from('Patient')
			.select('id')
			.eq('id', patientId)
			.maybeSingle();

		const isRegistered = !!registeredPatient;

		let consultations: any[] = [];

		if (isRegistered) {
			// Buscar consultas por patient_id
			const { data, error } = await supabase
				.from('consultation')
				.select(`
					id,
					patient_id,
					unregistered_patient_id,
					chief_complaint,
					diagnosis,
					started_at,
					created_at,
					doctor_id
				`)
				.eq('patient_id', patientId)
				.eq('doctor_id', user.userId)
				.order('created_at', { ascending: false })
				.limit(50);

			if (error) {
				console.error('[Patient Consultations API] Error:', error);
				return NextResponse.json({ error: error.message }, { status: 500 });
			}

			consultations = data || [];
		} else {
			// Buscar consultas por unregistered_patient_id
			const { data, error } = await supabase
				.from('consultation')
				.select(`
					id,
					patient_id,
					unregistered_patient_id,
					chief_complaint,
					diagnosis,
					started_at,
					created_at,
					doctor_id
				`)
				.eq('unregistered_patient_id', patientId)
				.eq('doctor_id', user.userId)
				.order('created_at', { ascending: false })
				.limit(50);

			if (error) {
				console.error('[Patient Consultations API] Error:', error);
				return NextResponse.json({ error: error.message }, { status: 500 });
			}

			consultations = data || [];
		}

		return NextResponse.json({ consultations }, { status: 200 });
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Patient Consultations API] Error inesperado:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

