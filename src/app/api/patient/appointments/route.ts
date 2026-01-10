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
		const supabase = await createSupabaseServerClient();

		const url = new URL(request.url);
		const status = url.searchParams.get('status'); // upcoming, past, all
		const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100); // Límite por defecto 50, máximo 100

		const now = new Date().toISOString();
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
				doctor:doctor_id (
					id,
					name
				),
				organization:organization_id (
					id,
					name
				)
			`)
			.eq('patient_id', patient.patientId)
			.order('scheduled_at', { ascending: false })
			.limit(limit);

		if (status === 'upcoming') {
			query = query.gte('scheduled_at', now);
		} else if (status === 'past') {
			query = query.lt('scheduled_at', now);
		}

		const { data: appointments, error } = await query;

		if (error) {
			console.error('[Patient Appointments API] Error:', error);
			console.error('[Patient Appointments API] Patient ID:', patient.patientId);
			console.error('[Patient Appointments API] Error details:', JSON.stringify(error, null, 2));
			return NextResponse.json({ 
				error: 'Error al obtener citas', 
				detail: error.message,
				code: error.code,
				hint: error.hint 
			}, { status: 500 });
		}

		return NextResponse.json({
			data: appointments || [],
		}, {
			headers: {
				'Cache-Control': 'private, max-age=30', // Cache por 30 segundos
			},
		});
	} catch (err: any) {
		console.error('[Patient Appointments API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

