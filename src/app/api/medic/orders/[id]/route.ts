// app/api/medic/orders/[id]/route.ts
// API para gestionar una orden médica específica

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { apiRequireRole } from '@/lib/auth-guards';

// GET - Obtener detalles de una orden médica
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

		const { data: order, error } = await supabase
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
					ended_at
				)
			`)
			.eq('id', id)
			.eq('ordering_provider_id', user.userId)
			.single();

		if (error) {
			console.error('[Medic Orders API] Error:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		if (!order) {
			return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
		}

		// Determinar estado
		let status = 'pending';
		if (order.result) {
			status = 'completed';
		} else if (order.reported_at) {
			status = 'processing';
		}

		return NextResponse.json(
			{
				order: {
					...order,
					status,
				},
			},
			{ status: 200 }
		);
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Orders API] Error inesperado:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

// PATCH - Actualizar una orden médica (agregar attachments, etc.)
export async function PATCH(
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

		const body = await req.json();
		const { attachments, result_type, is_critical } = body;

		// Verificar que la orden pertenece al médico
		const { data: existingOrder, error: checkError } = await supabase
			.from('lab_result')
			.select('id, ordering_provider_id')
			.eq('id', id)
			.eq('ordering_provider_id', user.userId)
			.single();

		if (checkError || !existingOrder) {
			return NextResponse.json(
				{ error: 'Orden no encontrada o no autorizada' },
				{ status: 404 }
			);
		}

		// Actualizar solo campos permitidos
		const updateData: Record<string, unknown> = {};
		if (attachments !== undefined) updateData.attachments = attachments;
		if (result_type !== undefined) updateData.result_type = result_type;
		if (is_critical !== undefined) updateData.is_critical = is_critical;

		const { data: updatedOrder, error } = await supabase
			.from('lab_result')
			.update(updateData)
			.eq('id', id)
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
				created_at
			`)
			.single();

		if (error) {
			console.error('[Medic Orders API] Error actualizando:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		// Determinar estado
		let status = 'pending';
		if (updatedOrder.result) {
			status = 'completed';
		} else if (updatedOrder.reported_at) {
			status = 'processing';
		}

		return NextResponse.json(
			{
				order: {
					...updatedOrder,
					status,
				},
			},
			{ status: 200 }
		);
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Orders API] Error inesperado:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

