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
		const supabase = await createSupabaseServerClient();

		const { id } = await params;
		const clinicId = id;

		// Obtener perfil de la clínica (el id puede ser organization_id o clinic_profile id)
		// Primero intentamos buscar por organization_id
		let { data: clinic, error: clinicError } = await supabase
			.from('clinic_profile')
			.select(`
				*,
				organization:organization_id (
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
					organization:organization_id (
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

		// Si aún no se encuentra, puede ser un consultorio privado sin clinic_profile
		// Intentar obtener la organización directamente
		if (!clinic && !clinicError) {
			const { data: organization, error: orgError } = await supabase
				.from('organization')
				.select(`
					id,
					name,
					type,
					contactEmail,
					phone,
					address,
					clinic_profile:organization_id (
						id,
						organization_id,
						legal_name,
						trade_name,
						address_operational,
						phone_mobile,
						specialties,
						opening_hours,
						location,
						photos,
						profile_photo
					)
				`)
				.eq('id', clinicId)
				.eq('type', 'CONSULTORIO')
				.maybeSingle();

			if (organization && !orgError) {
				// Si encontramos la organización, usar su clinic_profile si existe
				const clinicProfile = organization.clinic_profile;
				if (clinicProfile) {
					// clinic_profile puede ser un array o un objeto único
					if (Array.isArray(clinicProfile) && clinicProfile.length > 0) {
						clinic = clinicProfile[0];
					} else if (typeof clinicProfile === 'object') {
						clinic = clinicProfile;
					}
					
					if (clinic) {
						clinic.organization = {
							id: organization.id,
							name: organization.name,
							type: organization.type,
						};
					} else {
						// Crear un clinic_profile básico desde la organización
						clinic = {
							id: null,
							organization_id: organization.id,
							legal_name: organization.name,
							trade_name: organization.name,
							address_operational: organization.address,
							phone_mobile: organization.phone,
							contact_email: organization.contactEmail,
							specialties: null,
							opening_hours: null,
							location: null,
							photos: null,
							profile_photo: null,
							organization: {
								id: organization.id,
								name: organization.name,
								type: organization.type,
							},
						};
					}
				} else {
					// Crear un clinic_profile básico desde la organización
					clinic = {
						id: null,
						organization_id: organization.id,
						legal_name: organization.name,
						trade_name: organization.name,
						address_operational: organization.address,
						phone_mobile: organization.phone,
						contact_email: organization.contactEmail,
						specialties: null,
						opening_hours: null,
						location: null,
						photos: null,
						profile_photo: null,
						organization: {
							id: organization.id,
							name: organization.name,
							type: organization.type,
						},
					};
				}
			}
		}

		if (clinicError || !clinic) {
			return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 404 });
		}

		// Obtener médicos de la clínica
		const { data: doctors, error: doctorsError } = await supabase
			.from('user')
			.select(`
				id,
				name,
				email,
				medic_profile (
					specialty,
					private_specialty,
					photo_url,
					services
				)
			`)
			.eq('organizationId', clinic.organization_id)
			.eq('role', 'MEDICO');

		// Parsear campos JSON de forma segura
		const specialties = parseSpecialties(clinic.specialties);
		const openingHours = parseOpeningHours(clinic.opening_hours);

		// Parsear location si existe
		let location = null;
		if (clinic.location) {
			try {
				location = typeof clinic.location === 'string' 
					? JSON.parse(clinic.location) 
					: clinic.location;
			} catch {
				location = null;
			}
		}

		// Parsear photos si existe
		let photos: string[] = [];
		if (clinic.photos) {
			try {
				photos = Array.isArray(clinic.photos)
					? clinic.photos
					: typeof clinic.photos === 'string'
					? JSON.parse(clinic.photos)
					: [];
			} catch {
				photos = [];
			}
		}

		return NextResponse.json({
			...clinic,
			specialties,
			opening_hours: openingHours,
			location,
			photos,
			doctors: doctors || [],
		});
	} catch (err: any) {
		console.error('[Patient Clinic Detail API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

