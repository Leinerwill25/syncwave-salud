// app/api/patient/profile/route.ts
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

		return NextResponse.json({
			id: patient.patient.id,
			firstName: patient.patient.firstName,
			lastName: patient.patient.lastName,
			identifier: patient.patient.identifier,
			dob: patient.patient.dob,
			gender: patient.patient.gender,
			phone: patient.patient.phone,
			address: patient.patient.address,
		});
	} catch (err: any) {
		console.error('[Patient Profile API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

export async function PATCH(request: Request) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const body = await request.json();

		const updateData: any = {};
		if (body.firstName !== undefined) updateData.firstName = body.firstName;
		if (body.lastName !== undefined) updateData.lastName = body.lastName;
		if (body.identifier !== undefined) updateData.identifier = body.identifier;
		if (body.dob !== undefined) updateData.dob = body.dob ? new Date(body.dob).toISOString() : null;
		if (body.gender !== undefined) updateData.gender = body.gender;
		if (body.phone !== undefined) updateData.phone = body.phone;
		if (body.address !== undefined) updateData.address = body.address;

		const { error } = await supabase
			.from('Patient')
			.update(updateData)
			.eq('id', patient.patientId);

		if (error) {
			console.error('[Patient Profile API PATCH] Error:', error);
			return NextResponse.json({ error: 'Error al actualizar perfil', detail: error.message }, { status: 500 });
		}

		return NextResponse.json({ success: true, message: 'Perfil actualizado correctamente' });
	} catch (err: any) {
		console.error('[Patient Profile API PATCH] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}
