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
			.from('FamilyGroup')
			.select('id')
			.eq('ownerId', patient.patientId)
			.maybeSingle();

		let groupId: string | null = null;
		if (ownerGroup) {
			groupId = ownerGroup.id;
		} else {
			const { data: membership } = await supabase
				.from('FamilyGroupMember')
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

		// Obtener todos los miembros del grupo
		const { data: members, error } = await supabase
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
					gender,
					phone
				)
			`)
			.eq('familyGroupId', groupId);

		if (error) {
			console.error('[Patient Family Members API] Error:', error);
			return NextResponse.json({ error: 'Error al obtener miembros' }, { status: 500 });
		}

		return NextResponse.json({ data: members || [] });
	} catch (err: any) {
		console.error('[Patient Family Members API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}
