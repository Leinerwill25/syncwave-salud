// app/api/consultations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

/* -------------------------------------------------------------
   GET /api/consultations/[id]
------------------------------------------------------------- */
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
	try {
		// 1️⃣ Autenticación - requerir que el usuario esté autenticado
		const authResult = await apiRequireRole(['MEDICO', 'CLINICA', 'ADMIN']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const { id } = await context.params;
		if (!id) return NextResponse.json({ error: 'No se proporcionó un ID' }, { status: 400 });

		const supabase = await createSupabaseServerClient();

		// 2️⃣ Obtener la consulta con organization_id incluido
		const { data: consultation, error } = await supabase
			.from('consultation')
			.select(
				`
        id,
        appointment_id,
        patient_id,
        doctor_id,
        organization_id,
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

		// 3️⃣ VALIDACIÓN CRÍTICA: Verificar que el usuario tenga acceso a esta consulta
		if (user.role === 'MEDICO') {
			// Médicos solo pueden ver sus propias consultas Y deben validar organización
			if (!user.organizationId || consultation.organization_id !== user.organizationId) {
				console.warn(`[Consultations API] Intento de acceso no autorizado: médico ${user.userId} intentó acceder a consulta ${id}`);
				return NextResponse.json({ error: 'No autorizado para ver esta consulta' }, { status: 403 });
			}
			if (consultation.doctor_id !== user.userId) {
				console.warn(`[Consultations API] Intento de acceso no autorizado: médico ${user.userId} intentó acceder a consulta de otro médico`);
				return NextResponse.json({ error: 'No autorizado para ver esta consulta' }, { status: 403 });
			}
		} else if (user.role === 'CLINICA' || user.role === 'ADMIN') {
			// Clínicas y admins solo pueden ver consultas de su organización
			if (!user.organizationId || consultation.organization_id !== user.organizationId) {
				console.warn(`[Consultations API] Intento de acceso no autorizado: usuario ${user.userId} de org ${user.organizationId} intentó acceder a consulta de otra org`);
				return NextResponse.json({ error: 'No autorizado para ver esta consulta' }, { status: 403 });
			}
		} else {
			return NextResponse.json({ error: 'Rol no autorizado' }, { status: 403 });
		}

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
		// 1️⃣ Autenticación - requerir que el usuario esté autenticado
		const authResult = await apiRequireRole(['MEDICO', 'CLINICA', 'ADMIN']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const { id } = await context.params;
		if (!id) return NextResponse.json({ error: 'Falta ID de consulta' }, { status: 400 });

		const body = await req.json();
		const supabase = await createSupabaseServerClient();

		// 2️⃣ VALIDACIÓN CRÍTICA: Verificar que el usuario tenga acceso a esta consulta antes de editarla
		const { data: existingConsultation, error: fetchError } = await supabase
			.from('consultation')
			.select('doctor_id, organization_id')
			.eq('id', id)
			.single();

		if (fetchError || !existingConsultation) {
			return NextResponse.json({ error: 'Consulta no encontrada' }, { status: 404 });
		}

		// Validar acceso según rol
		if (user.role === 'MEDICO') {
			if (!user.organizationId || existingConsultation.organization_id !== user.organizationId) {
				console.warn(`[Consultations API] Intento de edición no autorizado: médico ${user.userId} intentó editar consulta ${id}`);
				return NextResponse.json({ error: 'No autorizado para editar esta consulta' }, { status: 403 });
			}
			if (existingConsultation.doctor_id !== user.userId) {
				console.warn(`[Consultations API] Intento de edición no autorizado: médico ${user.userId} intentó editar consulta de otro médico`);
				return NextResponse.json({ error: 'No autorizado para editar esta consulta' }, { status: 403 });
			}
		} else if (user.role === 'CLINICA' || user.role === 'ADMIN') {
			if (!user.organizationId || existingConsultation.organization_id !== user.organizationId) {
				console.warn(`[Consultations API] Intento de edición no autorizado: usuario ${user.userId} intentó editar consulta de otra org`);
				return NextResponse.json({ error: 'No autorizado para editar esta consulta' }, { status: 403 });
			}
		} else {
			return NextResponse.json({ error: 'Rol no autorizado' }, { status: 403 });
		}

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
		// 1️⃣ Autenticación - requerir que el usuario esté autenticado
		const authResult = await apiRequireRole(['MEDICO', 'CLINICA', 'ADMIN']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const { id } = await context.params;
		if (!id) return NextResponse.json({ error: 'Falta ID de consulta' }, { status: 400 });

		const supabase = await createSupabaseServerClient();

		// 2️⃣ VALIDACIÓN CRÍTICA: Verificar que el usuario tenga acceso a esta consulta antes de eliminarla
		const { data: existingConsultation, error: fetchError } = await supabase
			.from('consultation')
			.select('doctor_id, organization_id')
			.eq('id', id)
			.single();

		if (fetchError || !existingConsultation) {
			return NextResponse.json({ error: 'Consulta no encontrada' }, { status: 404 });
		}

		// Validar acceso según rol
		if (user.role === 'MEDICO') {
			if (!user.organizationId || existingConsultation.organization_id !== user.organizationId) {
				console.warn(`[Consultations API] Intento de eliminación no autorizado: médico ${user.userId} intentó eliminar consulta ${id}`);
				return NextResponse.json({ error: 'No autorizado para eliminar esta consulta' }, { status: 403 });
			}
			if (existingConsultation.doctor_id !== user.userId) {
				console.warn(`[Consultations API] Intento de eliminación no autorizado: médico ${user.userId} intentó eliminar consulta de otro médico`);
				return NextResponse.json({ error: 'No autorizado para eliminar esta consulta' }, { status: 403 });
			}
		} else if (user.role === 'CLINICA' || user.role === 'ADMIN') {
			if (!user.organizationId || existingConsultation.organization_id !== user.organizationId) {
				console.warn(`[Consultations API] Intento de eliminación no autorizado: usuario ${user.userId} intentó eliminar consulta de otra org`);
				return NextResponse.json({ error: 'No autorizado para eliminar esta consulta' }, { status: 403 });
			}
		} else {
			return NextResponse.json({ error: 'Rol no autorizado' }, { status: 403 });
		}

		const { error } = await supabase.from('consultation').delete().eq('id', id);

		if (error) throw error;

		return NextResponse.json({ message: 'Consulta eliminada correctamente' }, { status: 200 });
	} catch (err: any) {
		console.error('❌ Error DELETE /consultations/[id]:', err);
		return NextResponse.json({ error: err.message ?? 'Error al eliminar la consulta' }, { status: 500 });
	}
}
