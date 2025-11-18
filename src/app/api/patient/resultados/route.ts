// app/api/patient/resultados/route.ts
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

		const { data: labResults, error } = await supabase
			.from('lab_result')
			.select(`
				id,
				patient_id,
				consultation_id,
				ordering_provider_id,
				result_type,
				result,
				attachments,
				is_critical,
				reported_at,
				created_at,
				consultation:consultation!fk_labresult_consultation (
					id,
					diagnosis,
					doctor:User!fk_consultation_doctor (
						id,
						name
					)
				)
			`)
			.eq('patient_id', patient.patientId)
			.order('reported_at', { ascending: false });

		if (error) {
			console.error('[Patient Resultados API] Error:', error);
			return NextResponse.json({ error: 'Error al obtener resultados' }, { status: 500 });
		}

		// Parsear campos JSON de forma segura
		const safeParseJson = (field: any) => {
			if (!field) return null;
			if (typeof field === 'object') return field;
			if (typeof field === 'string') {
				try {
					return JSON.parse(field);
				} catch {
					return field;
				}
			}
			return field;
		};

		const parsedResults = (labResults || []).map((r: any) => ({
			...r,
			result: safeParseJson(r.result),
		}));

		return NextResponse.json({
			data: parsedResults,
		});
	} catch (err: any) {
		console.error('[Patient Resultados API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

