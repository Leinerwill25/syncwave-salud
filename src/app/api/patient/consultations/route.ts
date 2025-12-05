// app/api/patient/consultations/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';

export async function GET() {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const { data: consultations, error } = await supabase
			.from('consultation')
			.select(`
				id,
				created_at,
				diagnosis,
				doctor:doctor_id(
					name
				)
			`)
			.eq('patient_id', patient.patientId)
			.order('created_at', { ascending: false })
			.limit(50);

		if (error) {
			console.error('[Patient Consultations API] Error:', error);
			return NextResponse.json({ error: 'Error al obtener consultas' }, { status: 500 });
		}

		return NextResponse.json({
			consultations: consultations || [],
		});
	} catch (err: any) {
		console.error('[Patient Consultations API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

