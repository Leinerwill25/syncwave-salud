// app/api/patient/family/add-member/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const body = await request.json();
		const { patientId, roleInGroup } = body;

		if (!patientId) {
			return NextResponse.json({ error: 'patientId es requerido' }, { status: 400 });
		}

		// Verificar que el paciente es owner del grupo
		const { data: familyGroup, error: groupError } = await supabase
			.from('familygroup')
			.select('id, maxMembers')
			.eq('ownerId', patient.patientId)
			.maybeSingle();

		if (groupError || !familyGroup) {
			return NextResponse.json({ error: 'No eres el dueño del grupo familiar' }, { status: 403 });
		}

		// Verificar límite de miembros
		const { data: currentMembers } = await supabase
			.from('FamilyGroupMember')
			.select('id')
			.eq('familyGroupId', familyGroup.id);

		if (currentMembers && currentMembers.length >= familyGroup.maxMembers) {
			return NextResponse.json({ error: 'Se ha alcanzado el límite de miembros' }, { status: 400 });
		}

		// Verificar que el paciente no esté ya en el grupo
		const { data: existingMember } = await supabase
			.from('FamilyGroupMember')
			.select('id')
			.eq('familyGroupId', familyGroup.id)
			.eq('patientId', patientId)
			.maybeSingle();

		if (existingMember) {
			return NextResponse.json({ error: 'El paciente ya está en el grupo' }, { status: 400 });
		}

		// Agregar miembro
		const { data: newMember, error: addError } = await supabase
			.from('FamilyGroupMember')
			.insert({
				familyGroupId: familyGroup.id,
				patientId,
				roleInGroup: roleInGroup || 'MIEMBRO',
			})
			.select()
			.single();

		if (addError) {
			console.error('[Add Family Member API] Error:', addError);
			return NextResponse.json({ error: 'Error al agregar miembro', detail: addError.message }, { status: 500 });
		}

		return NextResponse.json({ success: true, member: newMember });
	} catch (err: any) {
		console.error('[Add Family Member API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

