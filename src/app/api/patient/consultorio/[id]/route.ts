// app/api/patient/consultorio/[id]/route.ts
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
		const consultorioId = id;

		// Obtener perfil del consultorio (el id puede ser organization_id o clinic_profile id)
		// Primero intentamos buscar por organization_id
		let { data: clinic, error: clinicError } = await supabase
			.from('clinic_profile')
			.select(`
				id,
				organization_id,
				legal_name,
				trade_name,
				address_operational,
				phone_mobile,
				phone_fixed,
				contact_email,
				website,
				social_facebook,
				social_instagram,
				specialties,
				opening_hours,
				location,
				photos,
				profile_photo,
				sanitary_license,
				liability_insurance_number,
				organization:Organization!clinic_profile_org_fk (
					id,
					name,
					type
				)
			`)
			.eq('organization_id', consultorioId)
			.maybeSingle();

		// Si no se encuentra, buscar por id del clinic_profile
		if (!clinic && !clinicError) {
			const result = await supabase
				.from('clinic_profile')
				.select(`
					id,
					organization_id,
					legal_name,
					trade_name,
					address_operational,
					phone_mobile,
					phone_fixed,
					contact_email,
					website,
					social_facebook,
					social_instagram,
					specialties,
					opening_hours,
					location,
					photos,
					profile_photo,
					sanitary_license,
					liability_insurance_number,
					organization:Organization!clinic_profile_org_fk (
						id,
						name,
						type
					)
				`)
				.eq('id', consultorioId)
				.maybeSingle();
			clinic = result.data;
			clinicError = result.error;
		}

		// Si aún no se encuentra, puede ser un consultorio privado sin clinic_profile
		// Intentar obtener la organización directamente
		if (!clinic && !clinicError) {
			const { data: organization, error: orgError } = await supabase
				.from('Organization')
				.select(`
					id,
					name,
					type,
					contactEmail,
					phone,
					address,
					clinic_profile:clinic_profile!clinic_profile_org_fk (
						id,
						organization_id,
						legal_name,
						trade_name,
						address_operational,
						phone_mobile,
						phone_fixed,
						contact_email,
						website,
						social_facebook,
						social_instagram,
						specialties,
						opening_hours,
						location,
						photos,
						profile_photo,
						sanitary_license,
						liability_insurance_number
					)
				`)
				.eq('id', consultorioId)
				.eq('type', 'CONSULTORIO')
				.maybeSingle();

			if (organization && !orgError) {
				// Si encontramos la organización, usar su clinic_profile si existe
				const clinicProfile = organization.clinic_profile;
				if (clinicProfile) {
					// clinic_profile puede ser un array o un objeto único
					if (Array.isArray(clinicProfile) && clinicProfile.length > 0) {
						const profileData = clinicProfile[0] as unknown as Record<string, unknown>;
						profileData.organization = [{
							id: organization.id,
							name: organization.name,
							type: organization.type,
						}];
						clinic = profileData as unknown as typeof clinic;
					} else if (typeof clinicProfile === 'object' && clinicProfile !== null) {
						const profileData = { ...(clinicProfile as unknown as Record<string, unknown>) };
						profileData.organization = [{
							id: organization.id,
							name: organization.name,
							type: organization.type,
						}];
						clinic = profileData as unknown as typeof clinic;
					} else {
						// Crear un clinic_profile básico desde la organización
						clinic = {
							id: null,
							organization_id: organization.id,
							legal_name: organization.name,
							trade_name: organization.name || null,
							address_operational: organization.address || null,
							phone_mobile: organization.phone || null,
							phone_fixed: null,
							contact_email: organization.contactEmail || null,
							website: null,
							social_facebook: null,
							social_instagram: null,
							specialties: null,
							opening_hours: null,
							location: null,
							photos: null,
							profile_photo: null,
							sanitary_license: null,
							liability_insurance_number: null,
							organization: [{
								id: organization.id,
								name: organization.name,
								type: organization.type,
							}],
						} as unknown as typeof clinic;
					}
				} else {
					// Crear un clinic_profile básico desde la organización
					clinic = {
						id: null,
						organization_id: organization.id,
						legal_name: organization.name,
						trade_name: organization.name || null,
						address_operational: organization.address || null,
						phone_mobile: organization.phone || null,
						phone_fixed: null,
						contact_email: organization.contactEmail || null,
						website: null,
						social_facebook: null,
						social_instagram: null,
						specialties: null,
						opening_hours: null,
						location: null,
						photos: null,
						profile_photo: null,
						sanitary_license: null,
						liability_insurance_number: null,
						organization: [{
							id: organization.id,
							name: organization.name,
							type: organization.type,
						}],
					} as unknown as typeof clinic;
				}
			}
		}

		if (clinicError || !clinic) {
			return NextResponse.json({ error: 'Consultorio no encontrado' }, { status: 404 });
		}

		// Verificar que sea un consultorio privado
		const org = Array.isArray(clinic.organization) ? clinic.organization[0] : clinic.organization;
		if (!org || (org as { type?: string }).type !== 'CONSULTORIO') {
			return NextResponse.json({ error: 'No es un consultorio privado' }, { status: 400 });
		}

		// Obtener médicos del consultorio con información completa del perfil
		const { data: doctors, error: doctorsError } = await supabase
			.from('User')
			.select(`
				id,
				name,
				email,
				medic_profile:medic_profile!fk_medic_profile_doctor (
					id,
					specialty,
					private_specialty,
					photo_url,
					signature_url,
					credentials,
					credit_history,
					services,
					availability
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

		// Parsear photos si existe - asegurar que se extraigan correctamente
		let photos: string[] = [];
		if (clinic.photos) {
			try {
				let parsed: any = null;
				if (Array.isArray(clinic.photos)) {
					parsed = clinic.photos;
				} else if (typeof clinic.photos === 'string') {
					// Intentar parsear como JSON
					try {
						parsed = JSON.parse(clinic.photos);
					} catch {
						// Si no es JSON válido, puede ser un string simple
						parsed = clinic.photos;
					}
				}
				
				// Normalizar a array
				if (Array.isArray(parsed)) {
					photos = parsed.filter((url: any) => 
						url && 
						typeof url === 'string' && 
						(url.startsWith('http') || url.startsWith('/') || url.startsWith('data:'))
					);
				} else if (typeof parsed === 'string' && parsed.trim() !== '') {
					// Si es un string único, agregarlo al array
					photos = [parsed];
				}
			} catch (error) {
				console.error('Error parseando photos:', error);
				photos = [];
			}
		}

		// Parsear profile_photo si existe y es válido
		let profilePhoto: string | null = null;
		if (clinic.profile_photo) {
			if (typeof clinic.profile_photo === 'string' && clinic.profile_photo.trim() !== '') {
				if (clinic.profile_photo.startsWith('http') || 
					clinic.profile_photo.startsWith('/') || 
					clinic.profile_photo.startsWith('data:')) {
					profilePhoto = clinic.profile_photo;
				}
			}
		}

		// Asegurar que sanitary_license y liability_insurance_number se devuelvan
		const sanitaryLicense = clinic.sanitary_license || null;
		const liabilityInsurance = clinic.liability_insurance_number || null;

		// Parsear información adicional de los médicos
		const doctorsWithParsedData = (doctors || []).map((doctor: any) => {
			const profile = doctor.medic_profile;
			if (!profile) return doctor;

			// Parsear campos JSON
			let credentials = {};
			let creditHistory = {};
			let services: any[] = [];
			let availability = {};

			try {
				credentials = profile.credentials 
					? (typeof profile.credentials === 'string' ? JSON.parse(profile.credentials) : profile.credentials)
					: {};
			} catch {
				credentials = {};
			}

			try {
				creditHistory = profile.credit_history 
					? (typeof profile.credit_history === 'string' ? JSON.parse(profile.credit_history) : profile.credit_history)
					: {};
			} catch {
				creditHistory = {};
			}

			try {
				services = profile.services 
					? (Array.isArray(profile.services) 
						? profile.services 
						: typeof profile.services === 'string' 
							? JSON.parse(profile.services) 
							: [])
					: [];
			} catch {
				services = [];
			}

			try {
				availability = profile.availability 
					? (typeof profile.availability === 'string' ? JSON.parse(profile.availability) : profile.availability)
					: {};
			} catch {
				availability = {};
			}

			return {
				...doctor,
				medic_profile: {
					...profile,
					credentials,
					credit_history: creditHistory,
					services,
					availability,
				},
			};
		});

		return NextResponse.json({
			...clinic,
			specialties,
			opening_hours: openingHours,
			location,
			photos,
			profile_photo: profilePhoto,
			sanitary_license: sanitaryLicense,
			liability_insurance_number: liabilityInsurance,
			doctors: doctorsWithParsedData,
		});
	} catch (err: unknown) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Patient Consultorio Detail API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: errorMessage }, { status: 500 });
	}
}

