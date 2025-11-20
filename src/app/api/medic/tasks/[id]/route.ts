// app/api/medic/tasks/[id]/route.ts
// API para gestionar una tarea específica

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { apiRequireRole } from '@/lib/auth-guards';

// GET - Obtener detalles de una tarea
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

		const { data: task, error } = await supabase
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
					identifier,
					dob,
					gender,
					phone
				),
				consultation:related_consultation_id (
					id,
					chief_complaint,
					diagnosis,
					notes,
					started_at,
					ended_at
				)
			`)
			.eq('id', id)
			.single();

		if (error) {
			console.error('[Medic Tasks API] Error:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		if (!task) {
			return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
		}

		// Verificar que el médico tiene acceso
		if (task.assigned_to !== user.userId && task.created_by !== user.userId) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
		}

		return NextResponse.json({ task }, { status: 200 });
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Tasks API] Error inesperado:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

// PATCH - Actualizar tarea
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

		// Verificar acceso
		const { data: existingTask, error: checkError } = await supabase
			.from('task')
			.select('assigned_to, created_by')
			.eq('id', id)
			.single();

		if (checkError || !existingTask) {
			return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
		}

		if (existingTask.assigned_to !== user.userId && existingTask.created_by !== user.userId) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
		}

		const body = await req.json();
		const { title, description, assigned_to, due_at, completed } = body;

		const updateData: Record<string, unknown> = {};
		if (title !== undefined) updateData.title = title;
		if (description !== undefined) updateData.description = description;
		if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
		if (due_at !== undefined) updateData.due_at = due_at ? new Date(due_at).toISOString() : null;
		if (completed !== undefined) updateData.completed = completed;

		const { data: updatedTask, error } = await supabase
			.from('task')
			.update(updateData)
			.eq('id', id)
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
			console.error('[Medic Tasks API] Error actualizando:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ task: updatedTask }, { status: 200 });
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Tasks API] Error inesperado:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

// DELETE - Eliminar tarea
export async function DELETE(
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

		// Verificar que es el creador
		const { data: existingTask, error: checkError } = await supabase
			.from('task')
			.select('created_by')
			.eq('id', id)
			.single();

		if (checkError || !existingTask) {
			return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
		}

		if (existingTask.created_by !== user.userId) {
			return NextResponse.json({ error: 'Solo el creador puede eliminar la tarea' }, { status: 403 });
		}

		const { error } = await supabase.from('task').delete().eq('id', id);

		if (error) {
			console.error('[Medic Tasks API] Error eliminando:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Tasks API] Error inesperado:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

