// API endpoint to check if a patient has been seen by a specific specialist
import { NextRequest, NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';

export async function GET(req: NextRequest) {
	try {
		const supabase = await createSupabaseServerClient();
		const url = new URL(req.url);
		const patientId = url.searchParams.get('patient_id');
		const doctorId = url.searchParams.get('doctor_id');

		if (!patientId || !doctorId) {
			return NextResponse.json({ error: 'patient_id and doctor_id are required' }, { status: 400 });
		}

		// Check if there's any consultation for this patient with this doctor
		const { data, error } = await supabase
			.from('consultation')
			.select('id')
			.eq('patient_id', patientId)
			.eq('doctor_id', doctorId)
			.limit(1)
			.maybeSingle();

		if (error) {
			console.error('Error checking patient consultation:', error);
			return NextResponse.json({ error: 'Error checking patient consultation' }, { status: 500 });
		}

		return NextResponse.json({ exists: !!data }, { status: 200 });
	} catch (error: any) {
		console.error('❌ Error GET /consultations/check-patient:', error?.message ?? error);
		return NextResponse.json({ error: error?.message ?? 'Error interno' }, { status: 500 });
	}
}
