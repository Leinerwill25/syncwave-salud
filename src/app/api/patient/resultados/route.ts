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
		const supabase = await createSupabaseServerClient();

		const url = new URL(request.url);
		const limit = Math.min(parseInt(url.searchParams.get('limit') || '30', 10), 100); // Límite por defecto 30, máximo 100

		const { data: labResults, error } = await supabase
			.from('lab_result')
			.select(`
				id,
				patient_id,
				consultation_id,
				result_type,
				result,
				attachments,
				is_critical,
				reported_at,
				consultation:consultation_id (
					id,
					diagnosis,
					doctor:doctor_id (
						id,
						name
					)
				)
			`)
			.eq('patient_id', patient.patientId)
			.order('reported_at', { ascending: false })
			.limit(limit);

		if (error) {
			console.error('[Patient Resultados API] Error:', error);
			console.error('[Patient Resultados API] Patient ID:', patient.patientId);
			console.error('[Patient Resultados API] Error details:', JSON.stringify(error, null, 2));
			return NextResponse.json({ 
				error: 'Error al obtener resultados', 
				detail: error.message,
				code: error.code,
				hint: error.hint 
			}, { status: 500 });
		}

		// Parsear campos JSON de forma segura (solo si es necesario)
		const parsedResults = (labResults || []).map((r: any) => ({
			...r,
			result: typeof r.result === 'string' ? (() => {
				try { return JSON.parse(r.result); } 
				catch { return r.result; }
			})() : r.result,
		}));

		return NextResponse.json({
			data: parsedResults,
		}, {
			headers: {
				'Cache-Control': 'private, max-age=120', // Cache por 2 minutos (resultados cambian menos frecuentemente)
			},
		});
	} catch (err: any) {
		console.error('[Patient Resultados API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

