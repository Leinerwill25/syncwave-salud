// app/api/patient/family/settings/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';

export async function PATCH(request: Request) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const body = await request.json();
		const { name } = body;

		// Verificar que es owner
		const { data: familyGroup } = await supabase
			.from('FamilyGroup')
			.select('id')
			.eq('ownerId', patient.patientId)
			.maybeSingle();

		if (!familyGroup) {
			return NextResponse.json({ error: 'No eres el dueño del grupo' }, { status: 403 });
		}

		// Actualizar nombre
		const { error } = await supabase
			.from('FamilyGroup')
			.update({ name: name || 'Mi Grupo Familiar' })
			.eq('id', familyGroup.id);

		if (error) {
			console.error('[Family Settings API] Error:', error);
			return NextResponse.json({ error: 'Error al actualizar grupo', detail: error.message }, { status: 500 });
		}

		return NextResponse.json({ success: true, message: 'Grupo actualizado correctamente' });
	} catch (err: any) {
		console.error('[Family Settings API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

