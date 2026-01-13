import { NextRequest, NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

// GET: Obtener una consulta sucesiva específica
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
	try {
		const authResult = await apiRequireRole(['MEDICO', 'ADMIN']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user || !user.userId) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const { id } = await context.params;
		const supabase = await createSupabaseServerClient();

		const { data, error } = await supabase
			.from('successive_consultation')
			.select(
				`id, original_consultation_id, patient_id, doctor_id, organization_id, consultation_date, 
				lab_results, results_description, doctor_observations, diagnosis, icd11_code, icd11_title, 
				notes, attachments, additional_fields, created_at, updated_at,
				patient:patient_id(id, firstName, lastName, identifier),
				doctor:doctor_id(id, name),
				original_consultation:original_consultation_id(id, chief_complaint, diagnosis, started_at)`
			)
			.eq('id', id)
			.eq('doctor_id', user.userId)
			.single();

		if (error || !data) {
			return NextResponse.json({ error: 'Consulta sucesiva no encontrada' }, { status: 404 });
		}

		return NextResponse.json({ successive_consultation: data }, { status: 200 });
	} catch (error: any) {
		console.error('Error en GET /api/dashboard/medic/consulta-sucesiva/[id]:', error);
		return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
	}
}

// PATCH: Actualizar una consulta sucesiva
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
	try {
		const authResult = await apiRequireRole(['MEDICO', 'ADMIN']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user || !user.userId) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const { id } = await context.params;
		const body = await req.json();
		const supabase = await createSupabaseServerClient();

		// Verificar que la consulta sucesiva existe y pertenece al doctor
		const { data: existing, error: checkError } = await supabase
			.from('successive_consultation')
			.select('id, doctor_id')
			.eq('id', id)
			.eq('doctor_id', user.userId)
			.single();

		if (checkError || !existing) {
			return NextResponse.json({ error: 'Consulta sucesiva no encontrada o sin permisos' }, { status: 404 });
		}

		// Preparar campos para actualizar
		const updateData: any = {
			updated_at: new Date().toISOString(),
		};

		if (body.consultation_date !== undefined) updateData.consultation_date = body.consultation_date;
		if (body.lab_results !== undefined) updateData.lab_results = body.lab_results;
		if (body.results_description !== undefined) updateData.results_description = body.results_description;
		if (body.doctor_observations !== undefined) updateData.doctor_observations = body.doctor_observations;
		if (body.diagnosis !== undefined) updateData.diagnosis = body.diagnosis;
		if (body.icd11_code !== undefined) updateData.icd11_code = body.icd11_code;
		if (body.icd11_title !== undefined) updateData.icd11_title = body.icd11_title;
		if (body.notes !== undefined) updateData.notes = body.notes;
		if (body.attachments !== undefined) updateData.attachments = body.attachments;
		if (body.additional_fields !== undefined) updateData.additional_fields = body.additional_fields;

		const { data, error } = await supabase.from('successive_consultation').update(updateData).eq('id', id).select().single();

		if (error) {
			console.error('Error actualizando consulta sucesiva:', error);
			return NextResponse.json({ error: 'Error al actualizar la consulta sucesiva', detail: error.message }, { status: 500 });
		}

		return NextResponse.json({ successive_consultation: data }, { status: 200 });
	} catch (error: any) {
		console.error('Error en PATCH /api/dashboard/medic/consulta-sucesiva/[id]:', error);
		return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
	}
}

// DELETE: Eliminar una consulta sucesiva
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
	try {
		const authResult = await apiRequireRole(['MEDICO', 'ADMIN']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user || !user.userId) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const { id } = await context.params;
		const supabase = await createSupabaseServerClient();

		// Verificar que la consulta sucesiva existe y pertenece al doctor
		const { data: existing, error: checkError } = await supabase
			.from('successive_consultation')
			.select('id, doctor_id')
			.eq('id', id)
			.eq('doctor_id', user.userId)
			.single();

		if (checkError || !existing) {
			return NextResponse.json({ error: 'Consulta sucesiva no encontrada o sin permisos' }, { status: 404 });
		}

		const { error: deleteError } = await supabase.from('successive_consultation').delete().eq('id', id);

		if (deleteError) {
			console.error('Error eliminando consulta sucesiva:', deleteError);
			return NextResponse.json({ error: 'Error al eliminar la consulta sucesiva', detail: deleteError.message }, { status: 500 });
		}

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (error: any) {
		console.error('Error en DELETE /api/dashboard/medic/consulta-sucesiva/[id]:', error);
		return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
	}
}

