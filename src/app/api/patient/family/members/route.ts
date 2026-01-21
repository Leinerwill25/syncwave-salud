// app/api/patient/family/members/route.ts
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

		// Obtener grupo del paciente (owner o member)
		const { data: ownerGroup } = await supabase
			.from('familygroup')
			.select('id')
			.eq('ownerId', patient.patientId)
			.maybeSingle();

		let groupId: string | null = null;
		if (ownerGroup) {
			groupId = ownerGroup.id;
		} else {
			const { data: membership } = await supabase
				.from('familygroupmember')
				.select('familyGroupId')
				.eq('patientId', patient.patientId)
				.maybeSingle();
			if (membership) {
				groupId = membership.familyGroupId;
			}
		}

		if (!groupId) {
			return NextResponse.json({ error: 'No perteneces a un grupo familiar' }, { status: 404 });
		}

		// Obtener información del grupo para incluir al dueño
		const { data: familyGroup, error: groupError } = await supabase
			.from('familygroup')
			.select('id, ownerId, name')
			.eq('id', groupId)
			.single();

		if (groupError) {
			console.error('[Patient Family Members API] Error obteniendo grupo:', groupError);
			return NextResponse.json({ error: 'Error al obtener información del grupo' }, { status: 500 });
		}

		// Obtener todos los miembros del grupo (excluye al dueño)
		const { data: members, error } = await supabase
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
					gender,
					phone
				)
			`)
			.eq('familyGroupId', groupId);

		if (error) {
			console.error('[Patient Family Members API] Error:', error);
			return NextResponse.json({ error: 'Error al obtener miembros' }, { status: 500 });
		}

		// Obtener información del dueño del grupo
		const { data: ownerData, error: ownerError } = await supabase
			.from('patient')
			.select('id, firstName, lastName, identifier, dob, gender, phone')
			.eq('id', familyGroup.ownerId)
			.single();

		// Construir lista completa incluyendo al dueño
		const allMembers: any[] = [];
		
		// Agregar al dueño primero si existe
		if (ownerData && !ownerError) {
			allMembers.push({
				id: `owner-${ownerData.id}`, // ID único para identificar al dueño
				patientId: ownerData.id,
				roleInGroup: 'Dueño',
				addedAt: null,
				patient: ownerData,
				isOwner: true,
			});
		}

		// Agregar los miembros del grupo
		if (members && Array.isArray(members)) {
			members.forEach((member) => {
				allMembers.push({
					...member,
					isOwner: false,
				});
			});
		}

		return NextResponse.json({ data: allMembers });
	} catch (err: any) {
		console.error('[Patient Family Members API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}
