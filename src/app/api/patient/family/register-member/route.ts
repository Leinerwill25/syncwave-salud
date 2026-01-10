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
		const supabase = await createSupabaseServerClient();

		const body = await request.json();
		const {
			firstName,
			lastName,
			identifier,
			dob,
			gender,
			phone,
			address,
			bloodType,
			allergies,
			hasDisability,
			disability,
			hasElderlyConditions,
			elderlyConditions,
			roleInGroup,
			relationship,
		} = body;

		// Validar campos requeridos
		if (!firstName || !lastName) {
			return NextResponse.json({ error: 'firstName y lastName son requeridos' }, { status: 400 });
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
			.from('familygroupmember')
			.select('id')
			.eq('familyGroupId', familyGroup.id);

		if (currentMembers && currentMembers.length >= familyGroup.maxMembers) {
			return NextResponse.json({ error: 'Se ha alcanzado el límite de miembros' }, { status: 400 });
		}

		// Crear el nuevo paciente
		const { data: newPatient, error: patientError } = await supabase
			.from('patient')
			.insert({
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				identifier: identifier?.trim() || null,
				dob: dob ? new Date(dob).toISOString() : null,
				gender: gender || null,
				phone: phone?.trim() || null,
				address: address?.trim() || null,
				blood_type: bloodType?.trim() || null,
				allergies: allergies?.trim() || null,
				has_disability: hasDisability || false,
				disability: hasDisability && disability?.trim() ? disability.trim() : null,
				has_elderly_conditions: hasElderlyConditions || false,
				elderly_conditions: hasElderlyConditions && elderlyConditions?.trim() ? elderlyConditions.trim() : null,
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
		// Si hay relationship, usarlo como roleInGroup para menores de edad
		const finalRoleInGroup = relationship || roleInGroup || 'MIEMBRO';
		const { data: newMember, error: addError } = await supabase
			.from('familygroupmember')
			.insert({
				familyGroupId: familyGroup.id,
				patientId: newPatient.id,
				roleInGroup: finalRoleInGroup,
			})
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
					phone,
					address
				)
			`)
			.single();

		if (addError) {
			console.error('[Register Family Member API] Error agregando al grupo:', addError);
			// Intentar eliminar el paciente creado si falla la inserción en el grupo
			await supabase.from('patient').delete().eq('id', newPatient.id);
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

