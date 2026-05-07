// app/api/patient/profile/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkAndAwardStage1 } from '@/lib/actions/referrals';

export async function GET() {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		// Check for Verified Badge
		const { data: badgeData } = await supabaseAdmin
			.from('patient_reward_redemptions')
			.select('id, reward:points_rewards_catalog!inner(reward_type)')
			.eq('patient_id', patient.authId)
			.eq('status', 'active')
			.eq('points_rewards_catalog.reward_type', 'verified_badge')
			.maybeSingle();

		return NextResponse.json({
			id: patient.patient.id,
			name: `${patient.patient.firstName || ''} ${patient.patient.lastName || ''}`.trim() || 'Paciente',
			firstName: patient.patient.firstName,
			lastName: patient.patient.lastName,
			identifier: patient.patient.identifier,
			dob: patient.patient.dob,
			gender: patient.patient.gender,
			phone: patient.patient.phone,
			address: patient.patient.address,
			allergies: patient.patient.allergies,
			elderly_conditions: patient.patient.elderly_conditions,
			hasVerifiedBadge: !!badgeData,
		});
	} catch (err: any) {
		console.error('[Patient Profile API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

export async function PATCH(request: Request) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const body = await request.json();

		const updateData: any = {};
		if (body.firstName !== undefined) updateData.firstName = body.firstName;
		if (body.lastName !== undefined) updateData.lastName = body.lastName;
		if (body.identifier !== undefined) updateData.identifier = body.identifier;
		if (body.dob !== undefined) updateData.dob = body.dob ? new Date(body.dob).toISOString() : null;
		if (body.gender !== undefined) updateData.gender = body.gender;
		if (body.phone !== undefined) updateData.phone = body.phone;
		if (body.address !== undefined) updateData.address = body.address;
		if (body.allergies !== undefined) updateData.allergies = body.allergies;
		if (body.blood_type !== undefined) updateData.blood_type = body.blood_type;
		if (body.emergency_contact_name !== undefined) updateData.emergency_contact_name = body.emergency_contact_name;
		if (body.emergency_contact_phone !== undefined) updateData.emergency_contact_phone = body.emergency_contact_phone;
		if (body.elderly_conditions !== undefined) updateData.elderly_conditions = body.elderly_conditions;

		const { error } = await supabase
			.from('patient')
			.update(updateData)
			.eq('id', patient.patientId);

		if (error) {
			console.error('[Patient Profile API PATCH] Error:', error);
			return NextResponse.json({ error: 'Error al actualizar perfil', detail: error.message }, { status: 500 });
		}

		// ─── NUEVO: Verificar Completitud para Referidos (Etapa 1) ───
		// Obtenemos el perfil actualizado para verificar todos los campos requeridos
		const { data: fullProfile } = await supabaseAdmin
			.from('patient')
			.select('firstName, lastName, blood_type, allergies, emergency_contact_name, emergency_contact_phone')
			.eq('id', patient.patientId)
			.single();

		if (fullProfile) {
			const isComplete = 
				fullProfile.firstName && 
				fullProfile.lastName && 
				fullProfile.blood_type && 
				fullProfile.allergies && 
				fullProfile.emergency_contact_name && 
				fullProfile.emergency_contact_phone;

			if (isComplete) {
				// Esta función es idempotente dentro de patient_referrals (stage1_awarded)
				await checkAndAwardStage1(patient.authId);
			}
		}

		return NextResponse.json({ success: true, message: 'Perfil actualizado correctamente' });
	} catch (err: any) {
		console.error('[Patient Profile API PATCH] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}
