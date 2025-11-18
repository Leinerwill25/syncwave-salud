// app/api/patient/appointments/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const url = new URL(request.url);
		const status = url.searchParams.get('status'); // upcoming, past, all

		let query = supabase
			.from('appointment')
			.select(`
				id,
				patient_id,
				doctor_id,
				organization_id,
				scheduled_at,
				duration_minutes,
				status,
				reason,
				location,
				created_at,
				updated_at,
				doctor:User!fk_appointment_doctor (
					id,
					name,
					email,
					medic_profile:medic_profile!fk_medic_profile_doctor (
						specialty,
						private_specialty,
						photo_url
					)
				),
				organization:Organization!fk_appointment_org (
					id,
					name,
					type
				)
			`)
			.eq('patient_id', patient.patientId)
			.order('scheduled_at', { ascending: false });

		if (status === 'upcoming') {
			query = query.gte('scheduled_at', new Date().toISOString());
		} else if (status === 'past') {
			query = query.lt('scheduled_at', new Date().toISOString());
		}

		const { data: appointments, error } = await query;

		if (error) {
			console.error('[Patient Appointments API] Error:', error);
			return NextResponse.json({ error: 'Error al obtener citas' }, { status: 500 });
		}

		return NextResponse.json({
			data: appointments || [],
		});
	} catch (err: any) {
		console.error('[Patient Appointments API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

