// app/api/patient/messages/available-doctors/route.ts
// API para obtener doctores con los que el paciente puede comunicarse (tienen citas programadas)

import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		// Obtener doctores con los que el paciente tiene citas programadas o completadas
		const { data: appointments, error: aptError } = await supabase
			.from('appointment')
			.select(`
				doctor_id,
				doctor:doctor_id (
					id,
					name,
					email
				)
			`)
			.eq('patient_id', patient.patientId)
			.in('status', ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'])
			.not('doctor_id', 'is', null);

		if (aptError) {
			console.error('[Available Doctors API] Error:', aptError);
			return NextResponse.json({ error: 'Error al obtener doctores' }, { status: 500 });
		}

		// Deduplicar doctores y obtener información de medic_profile por separado
		const doctorMap = new Map<string, any>();
		const doctorIds = new Set<string>();
		
		(appointments || []).forEach((apt: any) => {
			if (apt.doctor_id && apt.doctor && !doctorMap.has(apt.doctor_id)) {
				const doctor = Array.isArray(apt.doctor) ? apt.doctor[0] : apt.doctor;
				doctorMap.set(apt.doctor_id, {
					id: doctor.id,
					name: doctor.name,
					email: doctor.email,
				});
				doctorIds.add(apt.doctor_id);
			}
		});

		// Obtener información de medic_profile por separado
		if (doctorIds.size > 0) {
			const { data: medicProfiles } = await supabase
				.from('medic_profile')
				.select('doctor_id, specialty, private_specialty, photo_url')
				.in('doctor_id', Array.from(doctorIds));

			const profilesMap = new Map<string, any>();
			(medicProfiles || []).forEach((profile: any) => {
				profilesMap.set(profile.doctor_id, profile);
			});

			// Agregar información de medic_profile a los doctores
			doctorMap.forEach((doctor, doctorId) => {
				const profile = profilesMap.get(doctorId);
				if (profile) {
					doctor.specialty = profile.specialty || profile.private_specialty;
					doctor.photo = profile.photo_url;
				}
			});
		}

		const doctors = Array.from(doctorMap.values());

		return NextResponse.json({
			doctors,
		});
	} catch (err: any) {
		console.error('[Available Doctors API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

