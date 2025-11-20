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
		const { id } = await context.params;
		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const { data: result, error } = await supabase
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
					identifier,
					dob,
					gender,
					phone
				),
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

		return NextResponse.json({ result }, { status: 200 });
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Labs API] Error inesperado:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

