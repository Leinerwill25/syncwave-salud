// app/api/patient/card-data/route.ts
// API para obtener datos del paciente para la tarjeta de emergencia

import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';

export async function GET() {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const supabase = await createSupabaseServerClient();

		const { data: patientData, error: fetchError } = await supabase
			.from('Patient')
			.select(`
				id,
				firstName,
				lastName,
				identifier,
				dob,
				gender,
				phone,
				blood_type,
				allergies,
				emergency_contact_name,
				emergency_contact_phone,
				emergency_contact_relationship
			`)
			.eq('id', patient.patientId)
			.single();

		if (fetchError) {
			console.error('[Card Data API] Error obteniendo paciente:', fetchError);
			return NextResponse.json({ error: 'Error al obtener datos del paciente' }, { status: 500 });
		}

		// Calcular edad
		const age = patientData.dob 
			? Math.floor((Date.now() - new Date(patientData.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
			: null;

		return NextResponse.json({
			firstName: patientData.firstName,
			lastName: patientData.lastName,
			fullName: `${patientData.firstName} ${patientData.lastName}`,
			identifier: patientData.identifier,
			dob: patientData.dob,
			age,
			gender: patientData.gender,
			phone: patientData.phone,
			bloodType: patientData.blood_type,
			allergies: patientData.allergies,
			emergencyContact: {
				name: patientData.emergency_contact_name,
				phone: patientData.emergency_contact_phone,
				relationship: patientData.emergency_contact_relationship,
			},
		});
	} catch (err: any) {
		console.error('[Card Data API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}
