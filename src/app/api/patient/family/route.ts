// app/api/patient/family/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient, hasFamilyPlan } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';

export async function GET() {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		// Verificar plan familiar
		const hasPlan = await hasFamilyPlan(patient.patientId);
		if (!hasPlan) {
			return NextResponse.json({
				hasFamilyPlan: false,
				message: 'Debes actualizar tu plan para usar el Grupo Familiar',
			});
		}

		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		// Obtener grupo familiar del paciente (como owner)
		const { data: familyGroup, error: groupError } = await supabase
			.from('FamilyGroup')
			.select('*')
			.eq('ownerId', patient.patientId)
			.maybeSingle();

		if (groupError) {
			console.error('[Patient Family API] Error obteniendo grupo:', groupError);
		}

		// Si no es owner, verificar si es miembro
		if (!familyGroup) {
			const { data: membership, error: memberError } = await supabase
				.from('FamilyGroupMember')
				.select('familyGroupId, roleInGroup')
				.eq('patientId', patient.patientId)
				.maybeSingle();

			if (memberError || !membership) {
				return NextResponse.json({
					hasFamilyPlan: true,
					hasGroup: false,
					isOwner: false,
					group: null,
					members: [],
				});
			}

			// Obtener el grupo del que es miembro
			const { data: memberGroup } = await supabase
				.from('FamilyGroup')
				.select('*')
				.eq('id', membership.familyGroupId)
				.maybeSingle();

			// Obtener miembros del grupo
			const { data: members } = await supabase
				.from('FamilyGroupMember')
				.select(`
					id,
					patientId,
					roleInGroup,
					addedAt,
					patient:Patient!fk_fgm_patient (
						id,
						firstName,
						lastName,
						identifier,
						dob,
						gender
					)
				`)
				.eq('familyGroupId', membership.familyGroupId);

			return NextResponse.json({
				hasFamilyPlan: true,
				hasGroup: true,
				isOwner: false,
				group: memberGroup,
				members: members || [],
			});
		}

		// Obtener miembros del grupo
		const { data: members, error: membersError } = await supabase
			.from('FamilyGroupMember')
			.select(`
				id,
				patientId,
				roleInGroup,
				addedAt,
				patient:Patient!fk_fgm_patient (
					id,
					firstName,
					lastName,
					identifier,
					dob,
					gender
				)
			`)
			.eq('familyGroupId', familyGroup.id);

		if (membersError) {
			console.error('[Patient Family API] Error obteniendo miembros:', membersError);
		}

		return NextResponse.json({
			hasFamilyPlan: true,
			hasGroup: true,
			isOwner: true,
			group: familyGroup,
			members: members || [],
		});
	} catch (err: any) {
		console.error('[Patient Family API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const hasPlan = await hasFamilyPlan(patient.patientId);
		if (!hasPlan) {
			return NextResponse.json({ error: 'Plan familiar no activo' }, { status: 403 });
		}

		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const body = await request.json();
		const { name } = body;

		// Verificar si ya tiene un grupo
		const { data: existingGroup } = await supabase
			.from('FamilyGroup')
			.select('id')
			.eq('ownerId', patient.patientId)
			.maybeSingle();

		if (existingGroup) {
			return NextResponse.json({ error: 'Ya tienes un grupo familiar' }, { status: 400 });
		}

		// Crear nuevo grupo
		const { data: newGroup, error } = await supabase
			.from('FamilyGroup')
			.insert({
				ownerId: patient.patientId,
				name: name || 'Mi Grupo Familiar',
				maxMembers: 5,
			})
			.select()
			.single();

		if (error) {
			console.error('[Patient Family API POST] Error:', error);
			return NextResponse.json({ error: 'Error al crear grupo', detail: error.message }, { status: 500 });
		}

		return NextResponse.json({ success: true, group: newGroup });
	} catch (err: any) {
		console.error('[Patient Family API POST] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}
