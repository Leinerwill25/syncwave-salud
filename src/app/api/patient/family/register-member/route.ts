// app/api/patient/family/register-member/route.ts
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
		const { supabase } = createSupabaseServerClient(cookieStore);

		const body = await request.json();
		const {
			firstName,
			lastName,
			identifier,
			dob,
			gender,
			phone,
			address,
			roleInGroup,
		} = body;

		// Validar campos requeridos
		if (!firstName || !lastName) {
			return NextResponse.json({ error: 'firstName y lastName son requeridos' }, { status: 400 });
		}

		// Verificar que el paciente es owner del grupo
		const { data: familyGroup, error: groupError } = await supabase
			.from('FamilyGroup')
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

		// Crear el nuevo paciente
		const { data: newPatient, error: patientError } = await supabase
			.from('Patient')
			.insert({
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				identifier: identifier?.trim() || null,
				dob: dob ? new Date(dob).toISOString() : null,
				gender: gender || null,
				phone: phone?.trim() || null,
				address: address?.trim() || null,
			})
			.select()
			.single();

		if (patientError) {
			console.error('[Register Family Member API] Error creando paciente:', patientError);
			return NextResponse.json({ 
				error: 'Error al crear paciente', 
				detail: patientError.message 
			}, { status: 500 });
		}

		// Agregar automáticamente al grupo familiar
		const { data: newMember, error: addError } = await supabase
			.from('FamilyGroupMember')
			.insert({
				familyGroupId: familyGroup.id,
				patientId: newPatient.id,
				roleInGroup: roleInGroup || 'MIEMBRO',
			})
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
					phone,
					address
				)
			`)
			.single();

		if (addError) {
			console.error('[Register Family Member API] Error agregando al grupo:', addError);
			// Intentar eliminar el paciente creado si falla la inserción en el grupo
			await supabase.from('Patient').delete().eq('id', newPatient.id);
			return NextResponse.json({ 
				error: 'Error al agregar al grupo familiar', 
				detail: addError.message 
			}, { status: 500 });
		}

		return NextResponse.json({ 
			success: true, 
			patient: newPatient,
			member: newMember,
			message: 'Paciente registrado y agregado al grupo familiar correctamente'
		});
	} catch (err: any) {
		console.error('[Register Family Member API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

