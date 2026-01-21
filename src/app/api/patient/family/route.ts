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
				.from('familygroupmember')
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

			// Obtener información del dueño del grupo
			const { data: ownerData, error: ownerError } = await supabase
				.from('patient')
				.select('id, firstName, lastName, identifier, dob, gender')
				.eq('id', memberGroup?.ownerId || '')
				.maybeSingle();

			// Obtener miembros del grupo con conteo de consultas (excluye al dueño)
			const { data: members } = await supabase
				.from('familygroupmember')
				.select(`
					id,
					patientId,
					roleInGroup,
					addedAt,
					patient:patientId (
						id,
						firstName,
						lastName,
						identifier,
						dob,
						gender
					)
				`)
				.eq('familyGroupId', membership.familyGroupId);

			// Construir lista completa incluyendo al dueño primero
			const allMembers: any[] = [];
			
			// Agregar al dueño primero si existe
			if (ownerData && !ownerError && memberGroup?.ownerId) {
				const { count: ownerConsultationCount } = await supabase
					.from('consultation')
					.select('*', { count: 'exact', head: true })
					.eq('patient_id', memberGroup.ownerId);
				
				allMembers.push({
					id: `owner-${ownerData.id}`,
					patientId: ownerData.id,
					roleInGroup: 'Dueño',
					addedAt: null,
					patient: ownerData,
					isOwner: true,
					consultationCount: ownerConsultationCount || 0,
				});
			}

			// Obtener conteo de consultas para cada miembro y agregarlos
			if (members && Array.isArray(members)) {
				const membersWithConsultationCount = await Promise.all(
					members.map(async (member) => {
						const { count } = await supabase
							.from('consultation')
							.select('*', { count: 'exact', head: true })
							.eq('patient_id', member.patientId);
						return {
							...member,
							isOwner: false,
							consultationCount: count || 0,
						};
					})
				);
				allMembers.push(...membersWithConsultationCount);
			}

			return NextResponse.json({
				hasFamilyPlan: true,
				hasGroup: true,
				isOwner: false,
				group: memberGroup,
				members: allMembers, // Incluye al dueño y todos los miembros
				ownerConsultationCount: allMembers.find((m) => m.isOwner)?.consultationCount || 0,
				ownerId: memberGroup?.ownerId || null,
			});
		}

		// Obtener información del dueño del grupo
		const { data: ownerData, error: ownerError } = await supabase
			.from('patient')
			.select('id, firstName, lastName, identifier, dob, gender')
			.eq('id', patient.patientId)
			.single();

		// Obtener miembros del grupo con conteo de consultas (excluye al dueño)
		const { data: members, error: membersError } = await supabase
			.from('familygroupmember')
			.select(`
				id,
				patientId,
				roleInGroup,
				addedAt,
				patient:patientId (
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

		// Construir lista completa incluyendo al dueño primero
		const allMembers: any[] = [];
		
		// Agregar al dueño primero si existe
		if (ownerData && !ownerError) {
			const { count: ownerConsultationCount } = await supabase
				.from('consultation')
				.select('*', { count: 'exact', head: true })
				.eq('patient_id', patient.patientId);
			
			allMembers.push({
				id: `owner-${ownerData.id}`,
				patientId: ownerData.id,
				roleInGroup: 'Dueño',
				addedAt: null,
				patient: ownerData,
				isOwner: true,
				consultationCount: ownerConsultationCount || 0,
			});
		}

		// Obtener conteo de consultas para cada miembro y agregarlos
		if (members && Array.isArray(members)) {
			const membersWithConsultationCount = await Promise.all(
				members.map(async (member) => {
					const { count } = await supabase
						.from('consultation')
						.select('*', { count: 'exact', head: true })
						.eq('patient_id', member.patientId);
					return {
						...member,
						isOwner: false,
						consultationCount: count || 0,
					};
				})
			);
			allMembers.push(...membersWithConsultationCount);
		}

		return NextResponse.json({
			hasFamilyPlan: true,
			hasGroup: true,
			isOwner: true,
			group: familyGroup,
			members: allMembers, // Incluye al dueño y todos los miembros
			ownerConsultationCount: allMembers.find((m) => m.isOwner)?.consultationCount || 0,
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
