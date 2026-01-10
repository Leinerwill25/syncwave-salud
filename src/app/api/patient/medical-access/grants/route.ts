// app/api/patient/medical-access/grants/route.ts
// API para obtener todos los grants de acceso médico activos del paciente

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

		// Obtener todos los grants activos
		const { data: grants, error: grantsError } = await supabase
			.from('medicalaccessgrant')
			.select(`
				id,
				doctor_id,
				granted_at,
				expires_at,
				revoked_at,
				is_active,
				doctor:doctor_id (
					id,
					name,
					email
				)
			`)
			.eq('patient_id', patient.patientId)
			.eq('is_active', true)
			.order('granted_at', { ascending: false });

		if (grantsError) {
			console.error('[Patient Medical Access Grants API] Error:', grantsError);
			return NextResponse.json({ error: 'Error al obtener accesos' }, { status: 500 });
		}

		// Filtrar grants expirados
		const now = Date.now();
		const activeGrants = (grants || []).filter((grant: any) => {
			if (!grant.expires_at) return true;
			return new Date(grant.expires_at).getTime() > now;
		});

		// Obtener información de medic_profile por separado
		const doctorIds = [...new Set(activeGrants.map((g: any) => g.doctor_id).filter(Boolean))];
		const profilesMap = new Map<string, any>();
		
		if (doctorIds.length > 0) {
			const { data: medicProfiles } = await supabase
				.from('medic_profile')
				.select('doctor_id, specialty, private_specialty, photo_url')
				.in('doctor_id', doctorIds);

			(medicProfiles || []).forEach((profile: any) => {
				profilesMap.set(profile.doctor_id, profile);
			});

			// Agregar información de medic_profile a los grants
			activeGrants.forEach((grant: any) => {
				const profile = profilesMap.get(grant.doctor_id);
				if (profile && grant.doctor) {
					grant.doctor.medic_profile = {
						specialty: profile.specialty,
						private_specialty: profile.private_specialty,
						photo_url: profile.photo_url,
					};
				}
			});
		}

		return NextResponse.json({
			grants: activeGrants,
		});
	} catch (err: any) {
		console.error('[Patient Medical Access Grants API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

