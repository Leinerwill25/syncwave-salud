// app/api/consultations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';

/* -------------------------------------------------------------
   GET /api/consultations/[id]
------------------------------------------------------------- */
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await context.params;
		if (!id) return NextResponse.json({ error: 'No se proporcionó un ID' }, { status: 400 });

		const supabase = await createSupabaseServerClient();

		const { data: consultation, error } = await supabase
			.from('consultation')
			.select(
				`
        id,
        appointment_id,
        patient_id,
        doctor_id,
        chief_complaint,
        diagnosis,
        notes,
        vitals,
        started_at,
        ended_at,
        created_at,
        updated_at,
        medical_record_id,
        patient:patient_id(id, firstName, lastName, dob),
        doctor:doctor_id(id, name, email)
      `
			)
			.eq('id', id)
			.single();

		if (error) throw error;
		if (!consultation) return NextResponse.json({ error: 'Consulta no encontrada' }, { status: 404 });

		return NextResponse.json({ data: consultation }, { status: 200 });
	} catch (err: any) {
		console.error('❌ Error GET /consultations/[id]:', err);
		return NextResponse.json({ error: err.message ?? 'Error interno del servidor' }, { status: 500 });
	}
}

/* -------------------------------------------------------------
   PATCH /api/consultations/[id]
------------------------------------------------------------- */
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await context.params;
		if (!id) return NextResponse.json({ error: 'Falta ID de consulta' }, { status: 400 });

		const body = await req.json();
		const supabase = await createSupabaseServerClient();

		const updatePayload: any = {
			chief_complaint: body.chief_complaint ?? undefined,
			diagnosis: body.diagnosis ?? undefined,
			notes: body.notes ?? undefined,
			vitals: body.vitals ?? undefined,
			started_at: body.started_at ? new Date(body.started_at).toISOString() : undefined,
			ended_at: body.ended_at ? new Date(body.ended_at).toISOString() : undefined,
			updated_at: new Date().toISOString(),
		};

		// Permitir actualizar patient_id o unregistered_patient_id
		if (body.patient_id !== undefined) {
			updatePayload.patient_id = body.patient_id;
		}
		if (body.unregistered_patient_id !== undefined) {
			updatePayload.unregistered_patient_id = body.unregistered_patient_id;
		}

		// Si se está cambiando a un paciente no registrado, limpiar patient_id
		if (body.unregistered_patient_id && body.patient_id === null) {
			updatePayload.patient_id = null;
		}
		// Si se está cambiando a un paciente registrado, limpiar unregistered_patient_id
		if (body.patient_id && body.unregistered_patient_id === null) {
			updatePayload.unregistered_patient_id = null;
		}

		// Remover campos undefined para evitar actualizaciones no deseadas
		Object.keys(updatePayload).forEach(key => {
			if (updatePayload[key] === undefined) {
				delete updatePayload[key];
			}
		});

		const { data, error } = await supabase
			.from('consultation')
			.update(updatePayload)
			.eq('id', id)
			.select()
			.single();

		if (error) throw error;

		return NextResponse.json({ message: 'Consulta actualizada correctamente', data }, { status: 200 });
	} catch (err: any) {
		console.error('❌ Error PATCH /consultations/[id]:', err);
		return NextResponse.json({ error: err.message ?? 'Error al actualizar la consulta' }, { status: 500 });
	}
}

/* -------------------------------------------------------------
   DELETE /api/consultations/[id]
------------------------------------------------------------- */
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await context.params;
		if (!id) return NextResponse.json({ error: 'Falta ID de consulta' }, { status: 400 });

		const supabase = await createSupabaseServerClient();
		const { error } = await supabase.from('consultation').delete().eq('id', id);

		if (error) throw error;

		return NextResponse.json({ message: 'Consulta eliminada correctamente' }, { status: 200 });
	} catch (err: any) {
		console.error('❌ Error DELETE /consultations/[id]:', err);
		return NextResponse.json({ error: err.message ?? 'Error al eliminar la consulta' }, { status: 500 });
	}
}
