// app/api/patient/family/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';

export async function GET() {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		// Obtener grupo familiar del paciente (como owner)
		const { data: familyGroup, error: groupError } = await supabase
			.from('familygroup')
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
				.from('familygroup')
				.select('*')
				.eq('id', membership.familyGroupId)
				.maybeSingle();

			// Obtener miembros del grupo con conteo de consultas
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

			// Obtener conteo de consultas para cada miembro
			const membersWithConsultationCount = await Promise.all(
				(members || []).map(async (member) => {
					const { count } = await supabase
						.from('consultation')
						.select('*', { count: 'exact', head: true })
						.eq('patient_id', member.patientId);
					return {
						...member,
						consultationCount: count || 0,
					};
				})
			);

			// Obtener conteo de consultas del owner
			const { count: ownerConsultationCount } = await supabase
				.from('consultation')
				.select('*', { count: 'exact', head: true })
				.eq('patient_id', memberGroup?.ownerId || '');

			return NextResponse.json({
				hasFamilyPlan: true,
				hasGroup: true,
				isOwner: false,
				group: memberGroup,
				members: membersWithConsultationCount || [],
				ownerConsultationCount: ownerConsultationCount || 0,
				ownerId: memberGroup?.ownerId || null,
			});
		}

		// Obtener miembros del grupo con conteo de consultas
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

		// Obtener conteo de consultas para cada miembro
		const membersWithConsultationCount = await Promise.all(
			(members || []).map(async (member) => {
				const { count } = await supabase
					.from('consultation')
					.select('*', { count: 'exact', head: true })
					.eq('patient_id', member.patientId);
				return {
					...member,
					consultationCount: count || 0,
				};
			})
		);

		if (membersError) {
			console.error('[Patient Family API] Error obteniendo miembros:', membersError);
		}

		// Obtener conteo de consultas del owner
		const { count: ownerConsultationCount } = await supabase
			.from('consultation')
			.select('*', { count: 'exact', head: true })
			.eq('patient_id', patient.patientId);

		return NextResponse.json({
			hasFamilyPlan: true,
			hasGroup: true,
			isOwner: true,
			group: familyGroup,
			members: membersWithConsultationCount || [],
			ownerConsultationCount: ownerConsultationCount || 0,
			ownerId: patient.patientId,
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

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const body = await request.json();
		const { name } = body;

		// Verificar si ya tiene un grupo
		const { data: existingGroup } = await supabase
			.from('familygroup')
			.select('id')
			.eq('ownerId', patient.patientId)
			.maybeSingle();

		if (existingGroup) {
			return NextResponse.json({ error: 'Ya tienes un grupo familiar' }, { status: 400 });
		}

		// Crear nuevo grupo
		const { data: newGroup, error } = await supabase
			.from('familygroup')
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
