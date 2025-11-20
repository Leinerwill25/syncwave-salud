// app/api/medic/labs/route.ts
// API para que el médico vea resultados de laboratorio

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { apiRequireRole } from '@/lib/auth-guards';

// GET - Lista resultados de laboratorio relacionados con el médico
export async function GET(req: Request) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const url = new URL(req.url);
		const patientId = url.searchParams.get('patientId');
		const consultationId = url.searchParams.get('consultationId');
		const isCritical = url.searchParams.get('isCritical');

		// Obtener resultados donde el médico es el ordering_provider o donde el paciente tiene consultas con el médico
		let query = supabase
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
				Patient:patient_id (
					id,
					firstName,
					lastName,
					identifier
				),
				consultation:consultation_id (
					id,
					chief_complaint,
					diagnosis,
					doctor_id
				)
			`)
			.order('reported_at', { ascending: false, nullsFirst: false })
			.order('created_at', { ascending: false });

		// Filtrar por médico: ordenados por él o consultas con él
		// Primero obtenemos resultados donde ordering_provider_id es el médico
		const { data: orderedResults, error: orderedError } = await supabase
			.from('lab_result')
			.select('id')
			.eq('ordering_provider_id', user.userId);

		if (orderedError) {
			console.error('[Medic Labs API] Error:', orderedError);
		}

		// También obtenemos consultas del médico para encontrar resultados relacionados
		const { data: consultations, error: consultationsError } = await supabase
			.from('consultation')
			.select('id')
			.eq('doctor_id', user.userId);

		if (consultationsError) {
			console.error('[Medic Labs API] Error consultas:', consultationsError);
		}

		const consultationIds = (consultations || []).map((c) => c.id);
		const orderedResultIds = (orderedResults || []).map((r) => r.id);

		// Filtrar resultados
		if (orderedResultIds.length > 0 || consultationIds.length > 0) {
			query = query.or(
				`ordering_provider_id.eq.${user.userId},consultation_id.in.(${consultationIds.join(',')})`
			);
		} else {
			// Si no hay resultados, retornar vacío
			return NextResponse.json({ results: [] }, { status: 200 });
		}

		if (patientId) {
			query = query.eq('patient_id', patientId);
		}

		if (consultationId) {
			query = query.eq('consultation_id', consultationId);
		}

		if (isCritical === 'true') {
			query = query.eq('is_critical', true);
		}

		const { data: results, error } = await query;

		if (error) {
			console.error('[Medic Labs API] Error:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		// Filtrar manualmente para asegurar que solo vemos resultados relevantes
		const filteredResults = (results || []).filter((r: any) => {
			return (
				r.ordering_provider_id === user.userId ||
				(consultationIds.length > 0 && consultationIds.includes(r.consultation_id))
			);
		});

		return NextResponse.json({ results: filteredResults }, { status: 200 });
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Labs API] Error inesperado:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

