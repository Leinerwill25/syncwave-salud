// app/api/patient/explore/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { parseSpecialties } from '@/lib/safe-json-parse';

export async function GET(request: Request) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const url = new URL(request.url);
		const query = url.searchParams.get('query') || '';
		const type = url.searchParams.get('type') || 'CONSULTORIO_PRIVADO'; // Por defecto solo consultorios privados
		const specialty = url.searchParams.get('specialty');
		const page = parseInt(url.searchParams.get('page') || '1', 10);
		const perPage = Math.min(parseInt(url.searchParams.get('per_page') || '20', 10), 100);
		const offset = (page - 1) * perPage;

		const results: any[] = [];

		// Solo buscar consultorios privados por ahora
		// Las clínicas, farmacias y laboratorios están "Próximamente"

		// Buscar clínicas
		if (!type || type === 'CLINICA') {
			let clinicQuery = supabase
				.from('clinic_profile')
				.select(
					`
					id,
					organization_id,
					legal_name,
					trade_name,
					address_operational,
					phone_mobile,
					specialties,
					organization:Organization!clinic_profile_org_fk (
						id,
						name,
						type
					)
				`
				)
				.range(offset, offset + perPage - 1);

			if (query) {
				clinicQuery = clinicQuery.or(`legal_name.ilike.%${query}%,trade_name.ilike.%${query}%`);
			}

			const { data: clinics } = await clinicQuery;

			if (clinics) {
				clinics.forEach((clinic: any) => {
					const specialties = parseSpecialties(clinic.specialties);

					// Filtrar por especialidad si se proporciona
					if (specialty) {
						const hasSpecialty = specialties.some((s: any) => {
							const specName = typeof s === 'string' ? s : s?.name || s?.specialty || '';
							return specName.toLowerCase().includes(specialty.toLowerCase());
						});
						if (!hasSpecialty) return;
					}

					results.push({
						type: 'CLINICA',
						id: clinic.id,
						name: clinic.trade_name || clinic.legal_name,
						organization: clinic.organization,
						specialties,
						address: clinic.address_operational,
						phone: clinic.phone_mobile,
					});
				});
			}
		}

		// Buscar farmacias - PRÓXIMAMENTE
		/*
		if (!type || type === 'FARMACIA') {
			let pharmacyQuery = supabase
				.from('Organization')
				.select(
					`
					id,
					name,
					type,
					clinic_profile:clinic_profile!clinic_profile_org_fk (
						id,
						trade_name,
						address_operational,
						phone_mobile
					)
				`
				)
				.eq('type', 'FARMACIA')
				.range(offset, offset + perPage - 1);

			if (query) {
				pharmacyQuery = pharmacyQuery.ilike('name', `%${query}%`);
			}

			const { data: pharmacies } = await pharmacyQuery;

			if (pharmacies && pharmacies.length > 0) {
				for (const pharmacy of pharmacies) {
					results.push({
						type: 'FARMACIA',
						id: pharmacy.id,
						name: pharmacy.name,
						address: pharmacy.clinic_profile?.address_operational,
						phone: pharmacy.clinic_profile?.phone_mobile,
					});
				}
			}
		}
		*/

		// Buscar laboratorios - PRÓXIMAMENTE
		/*
		if (!type || type === 'LABORATORIO') {
			let labQuery = supabase
				.from('Organization')
				.select(
					`
					id,
					name,
					type,
					clinic_profile:clinic_profile!clinic_profile_org_fk (
						id,
						trade_name,
						address_operational,
						phone_mobile,
						specialties
					)
				`
				)
				.eq('type', 'LABORATORIO')
				.range(offset, offset + perPage - 1);

			if (query) {
				labQuery = labQuery.ilike('name', `%${query}%`);
			}

			const { data: labs } = await labQuery;

			if (labs && labs.length > 0) {
				for (const lab of labs) {
					const specialties = parseSpecialties(lab.clinic_profile?.specialties);

					results.push({
						type: 'LABORATORIO',
						id: lab.id,
						name: lab.name,
						address: lab.clinic_profile?.address_operational,
						phone: lab.clinic_profile?.phone_mobile,
						specialties,
					});
				}
			}
		}
		*/

		// Buscar consultorios privados (Organizations con type CONSULTORIO)
		// Solo buscar consultorios privados por ahora
		if (type === 'CONSULTORIO' || type === 'CONSULTORIO_PRIVADO' || !type) {
			// PASO 1: Obtener las organizaciones únicas con type CONSULTORIO
			let orgQuery = supabase
				.from('Organization')
				.select('id, name, type, contactEmail, phone, address')
				.eq('type', 'CONSULTORIO')
				.range(offset, offset + perPage - 1);

			if (query) {
				orgQuery = orgQuery.or(`name.ilike.%${query}%,address.ilike.%${query}%`);
			}

			const { data: organizations, error: orgsError } = await orgQuery;

			if (orgsError) {
				console.error('[Patient Explore API] Error al buscar organizaciones:', orgsError);
			} else {
				console.log(`[Patient Explore API] Organizaciones encontradas: ${organizations?.length || 0}`);
			}

			if (!organizations || organizations.length === 0) {
				console.log('[Patient Explore API] No se encontraron organizaciones');
			} else {
				// PASO 2: Obtener todos los IDs de organizaciones
				const orgIds = organizations.map((org: any) => org.id);

				// PASO 3: Obtener los perfiles de clínica asociados (one-to-one relationship)
				const { data: clinicProfiles, error: profilesError } = await supabase
					.from('clinic_profile')
					.select('id, organization_id, trade_name, legal_name, address_operational, phone_mobile, specialties, location, photos, profile_photo, has_cashea')
					.in('organization_id', orgIds);

				if (profilesError) {
					console.error('[Patient Explore API] Error al buscar perfiles de clínica:', profilesError);
				}

				// Crear un mapa de organization_id -> clinic_profile
				const profileByOrgId = new Map<string, any>();
				if (clinicProfiles) {
					clinicProfiles.forEach((profile: any) => {
						if (profile.organization_id) {
							profileByOrgId.set(profile.organization_id, profile);
						}
					});
				}

				// PASO 4: Buscar todos los médicos asociados a estas organizaciones
				const { data: users, error: usersError } = await supabase
					.from('User')
					.select(
						`
						id,
						name,
						email,
						organizationId,
						medic_profile:medic_profile!fk_medic_profile_doctor (
							private_specialty,
							specialty,
							services,
							photo_url,
							has_cashea
						)
					`
					)
					.in('organizationId', orgIds)
					.eq('role', 'MEDICO');

				if (usersError) {
					console.error('[Patient Explore API] Error al buscar usuarios:', usersError);
				}

				// Crear un mapa de organizationId -> array de médicos
				const doctorsByOrg = new Map<string, any[]>();
				if (users) {
					users.forEach((user: any) => {
						if (user.organizationId) {
							const orgId = user.organizationId;
							if (!doctorsByOrg.has(orgId)) {
								doctorsByOrg.set(orgId, []);
							}
							doctorsByOrg.get(orgId)!.push(user);
						}
					});
				}

				// PASO 5: Consolidar datos por organización (una organización = un resultado)
				const consultoriosMap = new Map<string, any>();

				organizations.forEach((org: any) => {
					// Si ya procesamos esta organización, omitir (no debería pasar, pero por seguridad)
					if (consultoriosMap.has(org.id)) {
						console.warn(`[Patient Explore API] Organización duplicada detectada: ${org.id} - ${org.name}`);
						return;
					}

					// Obtener el perfil de clínica asociado
					const clinicProfile = profileByOrgId.get(org.id);

					// Obtener todos los médicos de esta organización
					const orgDoctors = doctorsByOrg.get(org.id) || [];
					// Seleccionar el primer médico con perfil médico como doctor principal
					const primaryDoctor = orgDoctors.find((d: any) => d.medic_profile) || orgDoctors[0];

					// Obtener especialidades
					const doctorSpecialty = primaryDoctor?.medic_profile?.private_specialty || primaryDoctor?.medic_profile?.specialty;
					const specialties = parseSpecialties(clinicProfile?.specialties);

					// Filtrar por especialidad si se proporciona
					if (specialty) {
						const searchSpecialtyLower = specialty.toLowerCase().trim();
						const hasSpecialty =
							(doctorSpecialty && doctorSpecialty.toLowerCase().trim() === searchSpecialtyLower) ||
							(doctorSpecialty && doctorSpecialty.toLowerCase().trim().includes(searchSpecialtyLower)) ||
							specialties.some((s: any) => {
								const specName = typeof s === 'string' ? s : s?.name || s?.specialty || '';
								return specName.toLowerCase().trim() === searchSpecialtyLower || specName.toLowerCase().trim().includes(searchSpecialtyLower);
							});
						if (!hasSpecialty) {
							console.log(`[Patient Explore API] Consultorio ${org.name} no coincide con especialidad ${specialty}`);
							return;
						}
					}

					// Parsear location si existe
					let location = null;
					if (clinicProfile?.location) {
						try {
							location = typeof clinicProfile.location === 'string' ? JSON.parse(clinicProfile.location) : clinicProfile.location;
						} catch {
							location = null;
						}
					}

					// Parsear photos si existe
					let photos: string[] = [];
					if (clinicProfile?.photos) {
						try {
							photos = Array.isArray(clinicProfile.photos) ? clinicProfile.photos : typeof clinicProfile.photos === 'string' ? JSON.parse(clinicProfile.photos) : [];
						} catch {
							photos = [];
						}
					}

					// Consolidar todos los servicios de todos los médicos de la organización
					const allServices: any[] = [];
					orgDoctors.forEach((doctor: any) => {
						if (doctor.medic_profile?.services) {
							const docServices = Array.isArray(doctor.medic_profile.services) 
								? doctor.medic_profile.services 
								: typeof doctor.medic_profile.services === 'string' 
									? (() => { try { return JSON.parse(doctor.medic_profile.services); } catch { return []; } })()
									: [];
							allServices.push(...docServices);
						}
					});

					// Crear el resultado consolidado por organización
					const resultItem = {
						type: 'CONSULTORIO_PRIVADO',
						id: org.id, // organization.id - identificador único principal
						clinicProfileId: clinicProfile?.id || null,
						name: clinicProfile?.trade_name || clinicProfile?.legal_name || org.name,
						organization: {
							id: org.id,
							name: org.name,
							type: org.type,
						},
						address: clinicProfile?.address_operational || org.address,
						phone: clinicProfile?.phone_mobile || org.phone,
						email: org.contactEmail,
						specialty: doctorSpecialty || (specialties.length > 0 ? (typeof specialties[0] === 'string' ? specialties[0] : specialties[0]?.name || specialties[0]?.specialty || null) : null),
						specialties: specialties, // Incluir todas las especialidades
						services: allServices, // Consolidar servicios de todos los médicos
						photo: clinicProfile?.profile_photo || primaryDoctor?.medic_profile?.photo_url,
						location,
						photos,
						profile_photo: clinicProfile?.profile_photo,
						has_cashea: clinicProfile?.has_cashea ?? false,
						doctor: primaryDoctor
							? {
									id: primaryDoctor.id,
									name: primaryDoctor.name,
									email: primaryDoctor.email,
							  }
							: null,
						doctors: orgDoctors.map((d: any) => ({
							id: d.id,
							name: d.name,
							email: d.email,
							specialty: d.medic_profile?.private_specialty || d.medic_profile?.specialty,
						})), // Incluir todos los médicos de la organización
					};

					console.log(`[Patient Explore API] Agregando consultorio consolidado: ${resultItem.name} (Org ID: ${org.id})`);
					consultoriosMap.set(org.id, resultItem);
				});

				// PASO 6: Agregar todos los consultorios únicos a results
				consultoriosMap.forEach((consultorio) => {
					results.push(consultorio);
				});

				console.log(`[Patient Explore API] Total de consultorios únicos agregados: ${consultoriosMap.size}`);
			}
		}

		return NextResponse.json({
			data: results,
			meta: {
				page,
				per_page: perPage,
				total: results.length,
			},
		});
	} catch (err: any) {
		console.error('[Patient Explore API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}
