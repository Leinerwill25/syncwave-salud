// app/api/patient/family/remove-member/route.ts
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
		const { memberId } = body;

		if (!memberId) {
			return NextResponse.json({ error: 'memberId es requerido' }, { status: 400 });
		}

		// Verificar que el paciente es owner del grupo
		const { data: familyGroup } = await supabase
			.from('familygroup')
			.select('id')
			.eq('ownerId', patient.patientId)
			.maybeSingle();

		if (!familyGroup) {
			return NextResponse.json({ error: 'No eres el dueño del grupo familiar' }, { status: 403 });
		}

		// Verificar que el miembro pertenece al grupo
		const { data: member } = await supabase
			.from('FamilyGroupMember')
			.select('id, patientId')
			.eq('id', memberId)
			.eq('familyGroupId', familyGroup.id)
			.maybeSingle();

		if (!member) {
			return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 });
		}

		// No permitir eliminar al owner
		if (member.patientId === patient.patientId) {
			return NextResponse.json({ error: 'No puedes eliminar al dueño del grupo' }, { status: 400 });
		}

		// Eliminar miembro
		const { error: deleteError } = await supabase
			.from('FamilyGroupMember')
			.delete()
			.eq('id', memberId);

		if (deleteError) {
			console.error('[Remove Family Member API] Error:', deleteError);
			return NextResponse.json({ error: 'Error al eliminar miembro', detail: deleteError.message }, { status: 500 });
		}

		return NextResponse.json({ success: true, message: 'Miembro eliminado correctamente' });
	} catch (err: any) {
		console.error('[Remove Family Member API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

