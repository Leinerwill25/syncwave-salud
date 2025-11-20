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
		const { supabase } = createSupabaseServerClient(cookieStore);

		// Obtener todos los grants activos
		const { data: grants, error: grantsError } = await supabase
			.from('MedicalAccessGrant')
			.select(`
				id,
				doctor_id,
				granted_at,
				expires_at,
				revoked_at,
				is_active,
				doctor:User!fk_medical_access_grant_doctor (
					id,
					name,
					email,
					medic_profile:medic_profile!fk_medic_profile_doctor (
						specialty,
						private_specialty,
						photo_url
					)
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

		return NextResponse.json({
			grants: activeGrants,
		});
	} catch (err: any) {
		console.error('[Patient Medical Access Grants API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

