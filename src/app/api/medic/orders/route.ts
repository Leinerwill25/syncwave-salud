// app/api/medic/orders/route.ts
// API para gestionar órdenes médicas (solicitudes de exámenes de laboratorio)

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { apiRequireRole } from '@/lib/auth-guards';

// GET - Lista todas las órdenes médicas del médico
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
		const status = url.searchParams.get('status'); // pending, processing, completed

		// Las órdenes médicas son lab_result donde ordering_provider_id es el médico actual
		// Estado: pending (sin result), processing (result parcial), completed (result completo)
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
					diagnosis
				)
			`)
			.eq('ordering_provider_id', user.userId)
			.order('created_at', { ascending: false });

		if (patientId) {
			query = query.eq('patient_id', patientId);
		}

		if (consultationId) {
			query = query.eq('consultation_id', consultationId);
		}

		const { data: orders, error } = await query;

		if (error) {
			console.error('[Medic Orders API] Error:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		// Determinar estado basado en si tiene result
		const ordersWithStatus = (orders || []).map((order: any) => {
			let orderStatus = 'pending';
			if (order.result) {
				orderStatus = 'completed';
			} else if (order.reported_at) {
				orderStatus = 'processing';
			}

			return {
				...order,
				status: orderStatus,
			};
		});

		// Filtrar por status si se especifica
		const filtered = status
			? ordersWithStatus.filter((o: any) => o.status === status)
			: ordersWithStatus;

		return NextResponse.json({ orders: filtered }, { status: 200 });
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Orders API] Error inesperado:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

// POST - Crear una nueva orden médica
export async function POST(req: Request) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const body = await req.json();
		const { patient_id, consultation_id, result_type, attachments, notes } = body;

		if (!patient_id || !result_type) {
			return NextResponse.json(
				{ error: 'patient_id y result_type son requeridos' },
				{ status: 400 }
			);
		}

		// Crear orden médica (lab_result sin result aún)
		const { data: order, error } = await supabase
			.from('lab_result')
			.insert({
				patient_id,
				consultation_id: consultation_id || null,
				ordering_provider_id: user.userId,
				result_type,
				result: null, // Sin resultado aún (pending)
				attachments: attachments || [],
				is_critical: false,
			})
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
					lastName
				)
			`)
			.single();

		if (error) {
			console.error('[Medic Orders API] Error creando orden:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(
			{
				order: {
					...order,
					status: 'pending',
				},
			},
			{ status: 201 }
		);
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Orders API] Error inesperado:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

