// app/api/consultations/[id]/patient/route.ts
import { NextRequest, NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

/* -------------------------------------------------------------
   PATCH /api/consultations/[id]/patient
   Actualiza la información del paciente asociado a una consulta
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

		// 2️⃣ VALIDACIÓN CRÍTICA: Verificar que el usuario tenga acceso a esta consulta
		const { data: existingConsultation, error: fetchError } = await supabase
			.from('consultation')
			.select('doctor_id, organization_id, patient_id, unregistered_patient_id')
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

		// 3️⃣ Verificar que el patient_id coincida con la consulta
		const isUnregistered = body.is_unregistered === true;
		const patientId = body.patient_id;

		if (isUnregistered) {
			if (existingConsultation.unregistered_patient_id !== patientId) {
				return NextResponse.json({ error: 'El paciente no coincide con la consulta' }, { status: 400 });
			}
		} else {
			if (existingConsultation.patient_id !== patientId) {
				return NextResponse.json({ error: 'El paciente no coincide con la consulta' }, { status: 400 });
			}
		}

		// 4️⃣ Preparar payload de actualización
		const updatePayload: any = {
			updated_at: new Date().toISOString(),
		};

		// Campos comunes
		if (body.firstName !== undefined) updatePayload.firstName = body.firstName;
		if (body.lastName !== undefined) updatePayload.lastName = body.lastName;
		if (body.identifier !== undefined) updatePayload.identifier = body.identifier;
		if (body.phone !== undefined) updatePayload.phone = body.phone;
		if (body.address !== undefined) updatePayload.address = body.address;
		if (body.profession !== undefined) updatePayload.profession = body.profession;

		// Fecha de nacimiento
		if (body.dob !== undefined) {
			updatePayload.dob = body.dob ? new Date(body.dob).toISOString() : null;
		}
		if (body.birth_date !== undefined) {
			updatePayload.birth_date = body.birth_date || null;
		}

		// Campos específicos según tipo de paciente
		if (isUnregistered) {
			// Mapear campos para unregisteredpatients
			const unregisteredPayload: any = {
				updated_at: updatePayload.updated_at,
			};
			if (body.first_name !== undefined || body.firstName !== undefined) {
				unregisteredPayload.first_name = body.first_name || body.firstName;
			}
			if (body.last_name !== undefined || body.lastName !== undefined) {
				unregisteredPayload.last_name = body.last_name || body.lastName;
			}
			if (body.identification !== undefined || body.identifier !== undefined) {
				unregisteredPayload.identification = body.identification || body.identifier;
			}
			if (body.birth_date !== undefined || body.dob !== undefined) {
				unregisteredPayload.birth_date = body.birth_date || (body.dob ? new Date(body.dob).toISOString().split('T')[0] : null);
			}
			if (body.phone !== undefined) unregisteredPayload.phone = body.phone;
			if (body.address !== undefined) unregisteredPayload.address = body.address;
			if (body.profession !== undefined) unregisteredPayload.profession = body.profession;
			if (body.allergies !== undefined) unregisteredPayload.allergies = body.allergies;
			if (body.chronic_conditions !== undefined) unregisteredPayload.chronic_conditions = body.chronic_conditions;
			if (body.current_medication !== undefined) unregisteredPayload.current_medication = body.current_medication;
			if (body.family_history !== undefined) unregisteredPayload.family_history = body.family_history;

			// Remover campos undefined
			Object.keys(unregisteredPayload).forEach(key => {
				if (unregisteredPayload[key] === undefined) {
					delete unregisteredPayload[key];
				}
			});

			const { data, error } = await supabase
				.from('unregisteredpatients')
				.update(unregisteredPayload)
				.eq('id', patientId)
				.select()
				.single();

			if (error) throw error;
			return NextResponse.json({ message: 'Paciente actualizado correctamente', data }, { status: 200 });
		} else {
			// Campos para pacientes registrados
			if (body.blood_type !== undefined) updatePayload.blood_type = body.blood_type;
			if (body.allergies !== undefined) updatePayload.allergies = body.allergies;
			if (body.chronic_conditions !== undefined) updatePayload.chronic_conditions = body.chronic_conditions;
			if (body.current_medication !== undefined) updatePayload.current_medication = body.current_medication;

			// Remover campos undefined
			Object.keys(updatePayload).forEach(key => {
				if (updatePayload[key] === undefined) {
					delete updatePayload[key];
				}
			});

			const { data, error } = await supabase
				.from('Patient')
				.update(updatePayload)
				.eq('id', patientId)
				.select()
				.single();

			if (error) throw error;
			return NextResponse.json({ message: 'Paciente actualizado correctamente', data }, { status: 200 });
		}
	} catch (err: any) {
		console.error('❌ Error PATCH /consultations/[id]/patient:', err);
		return NextResponse.json({ error: err.message ?? 'Error al actualizar el paciente' }, { status: 500 });
	}
}

