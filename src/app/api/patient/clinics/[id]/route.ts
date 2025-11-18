// app/api/patient/clinics/[id]/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { parseSpecialties, parseOpeningHours } from '@/lib/safe-json-parse';

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const { id } = await params;
		const clinicId = id;

		// Obtener perfil de la clínica (el id puede ser organization_id o clinic_profile id)
		// Primero intentamos buscar por organization_id
		let { data: clinic, error: clinicError } = await supabase
			.from('clinic_profile')
			.select(`
				*,
				organization:Organization!clinic_profile_org_fk (
					id,
					name,
					type
				)
			`)
			.eq('organization_id', clinicId)
			.maybeSingle();

		// Si no se encuentra, buscar por id del clinic_profile
		if (!clinic && !clinicError) {
			const result = await supabase
				.from('clinic_profile')
				.select(`
					*,
					organization:Organization!clinic_profile_org_fk (
						id,
						name,
						type
					)
				`)
				.eq('id', clinicId)
				.maybeSingle();
			clinic = result.data;
			clinicError = result.error;
		}

		if (clinicError || !clinic) {
			return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 404 });
		}

		// Obtener médicos de la clínica
		const { data: doctors, error: doctorsError } = await supabase
			.from('User')
			.select(`
				id,
				name,
				email,
				medic_profile:medic_profile!fk_medic_profile_doctor (
					specialty,
					private_specialty,
					photo_url
				)
			`)
			.eq('organizationId', clinic.organization_id)
			.eq('role', 'MEDICO');

		// Parsear campos JSON de forma segura
		const specialties = parseSpecialties(clinic.specialties);
		const openingHours = parseOpeningHours(clinic.opening_hours);

		return NextResponse.json({
			...clinic,
			specialties,
			opening_hours: openingHours,
			doctors: doctors || [],
		});
	} catch (err: any) {
		console.error('[Patient Clinic Detail API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

