// app/api/medic/tasks/route.ts
// API para gestionar tareas del médico

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { apiRequireRole } from '@/lib/auth-guards';

// GET - Lista tareas del médico
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
		const completed = url.searchParams.get('completed'); // true/false

		let query = supabase
			.from('task')
			.select(`
				id,
				title,
				description,
				assigned_to,
				patient_id,
				related_consultation_id,
				due_at,
				completed,
				created_by,
				created_at,
				updated_at,
				Patient:patient_id (
					id,
					firstName,
					lastName,
					identifier
				),
				consultation:related_consultation_id (
					id,
					chief_complaint,
					diagnosis
				)
			`)
			.or(`assigned_to.eq.${user.userId},created_by.eq.${user.userId}`)
			.order('created_at', { ascending: false });

		if (patientId) {
			query = query.eq('patient_id', patientId);
		}

		if (consultationId) {
			query = query.eq('related_consultation_id', consultationId);
		}

		if (completed === 'true') {
			query = query.eq('completed', true);
		} else if (completed === 'false') {
			query = query.eq('completed', false);
		}

		const { data: tasks, error } = await query;

		if (error) {
			console.error('[Medic Tasks API] Error:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ tasks: tasks || [] }, { status: 200 });
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Tasks API] Error inesperado:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

// POST - Crear nueva tarea
export async function POST(req: Request) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const body = await req.json();
		const { title, description, assigned_to, patient_id, related_consultation_id, due_at } = body;

		if (!title) {
			return NextResponse.json({ error: 'El título es requerido' }, { status: 400 });
		}

		const { data: task, error } = await supabase
			.from('task')
			.insert({
				title,
				description: description || null,
				assigned_to: assigned_to || user.userId,
				patient_id: patient_id || null,
				related_consultation_id: related_consultation_id || null,
				due_at: due_at ? new Date(due_at).toISOString() : null,
				completed: false,
				created_by: user.userId,
			})
			.select(`
				id,
				title,
				description,
				assigned_to,
				patient_id,
				related_consultation_id,
				due_at,
				completed,
				created_by,
				created_at,
				updated_at
			`)
			.single();

		if (error) {
			console.error('[Medic Tasks API] Error creando tarea:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ task }, { status: 201 });
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Tasks API] Error inesperado:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

