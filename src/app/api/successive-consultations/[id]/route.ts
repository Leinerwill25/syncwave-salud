// app/api/successive-consultations/[id]/route.ts
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
		if (!id) {
			return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 });
		}

		const supabase = await createSupabaseServerClient();

		let query = supabase
			.from('successive_consultations')
			.select(`
				id,
				original_consultation_id,
				patient_id,
				unregistered_patient_id,
				doctor_id,
				organization_id,
				appointment_id,
				consultation_date,
				lab_results,
				results_description,
				observations,
				additional_fields,
				images,
				xrays,
				documents,
				diagnosis,
				icd11_code,
				icd11_title,
				notes,
				created_at,
				updated_at,
				patient:patient_id(id, firstName, lastName, identifier, dob, phone),
				doctor:doctor_id(id, name, email),
				original_consultation:original_consultation_id(id, chief_complaint, diagnosis, notes, created_at),
				appointment:appointment_id(id, scheduled_at, reason, status)
			`)
			.eq('id', id);

		// Si es médico, solo puede ver sus propias consultas
		if (user.role === 'MEDICO') {
			query = query.eq('doctor_id', user.userId);
		}

		const { data, error } = await query.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return NextResponse.json({ error: 'Consulta sucesiva no encontrada' }, { status: 404 });
			}
			console.error('Error obteniendo consulta sucesiva:', error);
			return NextResponse.json({ error: 'Error al obtener consulta sucesiva' }, { status: 500 });
		}

		// Si tiene unregistered_patient_id, obtener los datos del paciente no registrado
		if (data?.unregistered_patient_id) {
			const { data: unregisteredPatient, error: unregisteredError } = await supabase
				.from('unregisteredpatients')
				.select('id, first_name, last_name, identification, birth_date, phone')
				.eq('id', data.unregistered_patient_id)
				.single();

			if (!unregisteredError && unregisteredPatient) {
				// data.patient puede ser un array o un objeto, así que lo reemplazamos completamente
				(data as any).patient = {
					id: unregisteredPatient.id,
					firstName: unregisteredPatient.first_name || '',
					lastName: unregisteredPatient.last_name || '',
					identifier: unregisteredPatient.identification || undefined,
					dob: unregisteredPatient.birth_date || undefined,
					phone: unregisteredPatient.phone || undefined,
				};
			}
		}

		return NextResponse.json(data, { status: 200 });
	} catch (error: any) {
		console.error('Error en GET /api/successive-consultations/[id]:', error);
		return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
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
		if (!id) {
			return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 });
		}

		const body = await req.json();
		const supabase = await createSupabaseServerClient();

		// Verificar que la consulta existe y pertenece al médico
		const { data: existing, error: fetchError } = await supabase
			.from('successive_consultations')
			.select('id, doctor_id')
			.eq('id', id)
			.single();

		if (fetchError || !existing) {
			return NextResponse.json({ error: 'Consulta sucesiva no encontrada' }, { status: 404 });
		}

		if (user.role === 'MEDICO' && existing.doctor_id !== user.userId) {
			return NextResponse.json({ error: 'No autorizado para actualizar esta consulta' }, { status: 403 });
		}

		// Preparar datos para actualizar
		const updateData: any = {
			updated_at: new Date().toISOString(),
		};

		// Solo actualizar campos que se proporcionen
		if (body.consultation_date !== undefined) updateData.consultation_date = body.consultation_date;
		if (body.lab_results !== undefined) updateData.lab_results = body.lab_results;
		if (body.results_description !== undefined) updateData.results_description = body.results_description;
		if (body.observations !== undefined) updateData.observations = body.observations;
		if (body.additional_fields !== undefined) updateData.additional_fields = body.additional_fields;
		if (body.images !== undefined) updateData.images = body.images;
		if (body.xrays !== undefined) updateData.xrays = body.xrays;
		if (body.documents !== undefined) updateData.documents = body.documents;
		if (body.diagnosis !== undefined) updateData.diagnosis = body.diagnosis;
		if (body.icd11_code !== undefined) updateData.icd11_code = body.icd11_code;
		if (body.icd11_title !== undefined) updateData.icd11_title = body.icd11_title;
		if (body.notes !== undefined) updateData.notes = body.notes;

		const { data: updated, error: updateError } = await supabase
			.from('successive_consultations')
			.update(updateData)
			.eq('id', id)
			.select()
			.single();

		if (updateError) {
			console.error('Error actualizando consulta sucesiva:', updateError);
			return NextResponse.json({ error: 'Error al actualizar consulta sucesiva', detail: updateError.message }, { status: 500 });
		}

		return NextResponse.json({ success: true, data: updated }, { status: 200 });
	} catch (error: any) {
		console.error('Error en PATCH /api/successive-consultations/[id]:', error);
		return NextResponse.json({ error: 'Error interno del servidor', detail: error.message }, { status: 500 });
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
		if (!id) {
			return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 });
		}

		const supabase = await createSupabaseServerClient();

		// Verificar que la consulta existe y pertenece al médico
		const { data: existing, error: fetchError } = await supabase
			.from('successive_consultations')
			.select('id, doctor_id')
			.eq('id', id)
			.single();

		if (fetchError || !existing) {
			return NextResponse.json({ error: 'Consulta sucesiva no encontrada' }, { status: 404 });
		}

		if (user.role === 'MEDICO' && existing.doctor_id !== user.userId) {
			return NextResponse.json({ error: 'No autorizado para eliminar esta consulta' }, { status: 403 });
		}

		const { error: deleteError } = await supabase.from('successive_consultations').delete().eq('id', id);

		if (deleteError) {
			console.error('Error eliminando consulta sucesiva:', deleteError);
			return NextResponse.json({ error: 'Error al eliminar consulta sucesiva' }, { status: 500 });
		}

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (error: any) {
		console.error('Error en DELETE /api/successive-consultations/[id]:', error);
		return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
	}
}

