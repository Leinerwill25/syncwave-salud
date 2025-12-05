import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getRoleUserSessionFromServer } from '@/lib/role-user-auth';

// POST: Crear consulta (solo información administrativa, sin datos médicos sensibles)
export async function POST(request: NextRequest) {
	try {
		// Verificar sesión del usuario de rol
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado. Debe iniciar sesión como usuario de rol.' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const body = await request.json();
		const { organization_id, patient_id, unregistered_patient_id, chief_complaint, notes, consultation_date, scheduled_at, is_role_user } = body;

		if (!organization_id) {
			return NextResponse.json({ error: 'organization_id es requerido' }, { status: 400 });
		}

		if (!chief_complaint) {
			return NextResponse.json({ error: 'El motivo de consulta (chief_complaint) es requerido' }, { status: 400 });
		}

		if (!patient_id && !unregistered_patient_id) {
			return NextResponse.json({ error: 'Debe proporcionar patient_id o unregistered_patient_id' }, { status: 400 });
		}

		// Verificar que la organización del usuario de rol coincida
		if (organization_id !== session.organizationId) {
			return NextResponse.json({ error: 'No tiene permisos para crear consultas en esta organización' }, { status: 403 });
		}

		// Obtener el doctor principal de la organización (el primer médico)
		const { data: orgDoctor, error: doctorError } = await supabase
			.from('User')
			.select('id')
			.eq('organizationId', organization_id)
			.eq('role', 'MEDICO')
			.limit(1)
			.maybeSingle();

		if (doctorError || !orgDoctor) {
			return NextResponse.json({ error: 'No se encontró un médico asociado a esta organización' }, { status: 400 });
		}

		const doctorId = orgDoctor.id;

		// Determinar started_at
		let startedAt: Date | null = null;
		const now = new Date();
		
		if (consultation_date) {
			const consultationDate = new Date(consultation_date);
			if (consultationDate <= now) {
				startedAt = consultationDate;
			}
		} else if (scheduled_at) {
			const scheduledDate = new Date(scheduled_at);
			if (scheduledDate <= now) {
				startedAt = scheduledDate;
			}
		}
		
		if (!startedAt) {
			startedAt = now;
		}

		// Construir payload de inserción
		const insertPayload: any = {
			doctor_id: doctorId,
			organization_id: organization_id,
			chief_complaint: chief_complaint,
			diagnosis: null, // No se permite diagnóstico para usuarios de rol
			notes: notes || null,
			started_at: startedAt.toISOString(),
			status: 'IN_PROGRESS', // Consulta iniciada
		};

		if (patient_id) {
			insertPayload.patient_id = patient_id;
			insertPayload.unregistered_patient_id = null;
		} else {
			insertPayload.unregistered_patient_id = unregistered_patient_id;
			insertPayload.patient_id = null;
		}

		// Guardar fecha de consulta en vitals si está disponible
		if (consultation_date || scheduled_at) {
			insertPayload.vitals = {
				consultation_date: consultation_date || scheduled_at,
				created_by_role_user: true,
				role_user_id: session.roleUserId,
			};
		}

		// Insertar consulta
		const { data: consultation, error: insertError } = await supabase
			.from('consultation')
			.insert([insertPayload])
			.select()
			.single();

		if (insertError) {
			console.error('[Role Users Consultations] Error insertando consulta:', insertError);
			return NextResponse.json({ error: 'Error al crear la consulta', detail: insertError.message }, { status: 500 });
		}

		return NextResponse.json({ success: true, data: consultation });
	} catch (err) {
		console.error('[Role Users Consultations] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error interno', detail: errorMessage }, { status: 500 });
	}
}

