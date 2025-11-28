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
		const { supabase } = createSupabaseServerClient(cookieStore);

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
			// Primero obtener las organizaciones con type CONSULTORIO
			let orgQuery = supabase
				.from('Organization')
				.select(
					`
					id,
					name,
					type,
					contactEmail,
					phone,
					address,
					clinic_profile:clinic_profile!clinic_profile_org_fk (
						id,
						trade_name,
						legal_name,
						address_operational,
						phone_mobile,
						specialties,
						location,
						photos,
						profile_photo,
						has_cashea
					)
				`
				)
				.eq('type', 'CONSULTORIO')
				.range(offset, offset + perPage - 1);

			if (query) {
				orgQuery = orgQuery.or(`name.ilike.%${query}%,address.ilike.%${query}%`);
			}

			const { data: consultorios, error: consultoriosError } = await orgQuery;

			if (consultoriosError) {
				console.error('[Patient Explore API] Error al buscar consultorios:', consultoriosError);
			} else {
				console.log(`[Patient Explore API] Consultorios encontrados: ${consultorios?.length || 0}`);
			}

			if (consultorios && consultorios.length > 0) {
				console.log(`[Patient Explore API] Procesando ${consultorios.length} consultorios`);

				// Obtener todos los IDs de organizaciones para buscar usuarios
				const orgIds = consultorios.map((c: any) => c.id);

				// Buscar usuarios asociados a estas organizaciones
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

				// Crear un mapa de organizationId -> usuarios
				const usersByOrg = new Map<string, any[]>();
				if (users) {
					users.forEach((user: any) => {
						if (user.organizationId) {
							const orgId = user.organizationId;
							if (!usersByOrg.has(orgId)) {
								usersByOrg.set(orgId, []);
							}
							usersByOrg.get(orgId)!.push(user);
						}
					});
				}

				// Usar un Map para deduplicar consultorios por organization_id
				const consultoriosMap = new Map<string, any>();

				consultorios.forEach((consultorio: any) => {
					console.log(`[Patient Explore API] Procesando consultorio: ${consultorio.name} (ID: ${consultorio.id})`);

					// Si este organization_id ya existe en el mapa, omitirlo (duplicado)
					if (consultoriosMap.has(consultorio.id)) {
						console.log(`[Patient Explore API] Consultorio duplicado detectado y omitido: ${consultorio.id} - ${consultorio.name}`);
						return;
					}

					// Obtener el médico asociado al consultorio desde el mapa
					const orgUsers = usersByOrg.get(consultorio.id) || [];
					const doctor = orgUsers.find((d: any) => d.medic_profile) || orgUsers[0];

					const doctorSpecialty = doctor?.medic_profile?.private_specialty || doctor?.medic_profile?.specialty;
					const specialties = parseSpecialties(consultorio.clinic_profile?.specialties);

					// Filtrar por especialidad si se proporciona
					if (specialty) {
						const searchSpecialtyLower = specialty.toLowerCase().trim();
						// Comparación exacta o parcial para private_specialty
						const hasSpecialty =
							(doctorSpecialty && doctorSpecialty.toLowerCase().trim() === searchSpecialtyLower) ||
							(doctorSpecialty && doctorSpecialty.toLowerCase().trim().includes(searchSpecialtyLower)) ||
							specialties.some((s: any) => {
								const specName = typeof s === 'string' ? s : s?.name || s?.specialty || '';
								return specName.toLowerCase().trim() === searchSpecialtyLower || specName.toLowerCase().trim().includes(searchSpecialtyLower);
							});
						if (!hasSpecialty) {
							console.log(`[Patient Explore API] Consultorio ${consultorio.name} no coincide con especialidad ${specialty}`);
							return;
						}
					}

					// Parsear location si existe
					let location = null;
					if (consultorio.clinic_profile?.location) {
						try {
							location = typeof consultorio.clinic_profile.location === 'string' ? JSON.parse(consultorio.clinic_profile.location) : consultorio.clinic_profile.location;
						} catch {
							location = null;
						}
					}

					// Parsear photos si existe
					let photos: string[] = [];
					if (consultorio.clinic_profile?.photos) {
						try {
							photos = Array.isArray(consultorio.clinic_profile.photos) ? consultorio.clinic_profile.photos : typeof consultorio.clinic_profile.photos === 'string' ? JSON.parse(consultorio.clinic_profile.photos) : [];
						} catch {
							photos = [];
						}
					}

					// Usar organization.id como identificador principal para consultorios privados
					// Esto asegura que la redirección funcione correctamente
					const resultItem = {
						type: 'CONSULTORIO_PRIVADO',
						id: consultorio.id, // organization.id - usado para redirección
						clinicProfileId: consultorio.clinic_profile?.id || null, // clinic_profile.id si existe
						name: consultorio.clinic_profile?.trade_name || consultorio.clinic_profile?.legal_name || consultorio.name,
						organization: {
							id: consultorio.id,
							name: consultorio.name,
							type: consultorio.type,
						},
						address: consultorio.clinic_profile?.address_operational || consultorio.address,
						phone: consultorio.clinic_profile?.phone_mobile || consultorio.phone,
						email: consultorio.contactEmail,
						// Solo incluir specialty, no specialties para evitar duplicación
						specialty: doctorSpecialty || (specialties.length > 0 ? (typeof specialties[0] === 'string' ? specialties[0] : specialties[0]?.name || specialties[0]?.specialty || null) : null),
						services: doctor?.medic_profile?.services || [],
						photo: consultorio.clinic_profile?.profile_photo || doctor?.medic_profile?.photo_url,
						location,
						photos,
						profile_photo: consultorio.clinic_profile?.profile_photo,
						has_cashea: consultorio.clinic_profile?.has_cashea ?? false,
						doctor: doctor
							? {
									id: doctor.id,
									name: doctor.name,
									email: doctor.email,
							  }
							: null,
					};

					console.log(`[Patient Explore API] Agregando consultorio a resultados: ${resultItem.name}`);
					consultoriosMap.set(consultorio.id, resultItem);
				});

				// Agregar todos los consultorios únicos a results
				consultoriosMap.forEach((consultorio) => {
					results.push(consultorio);
				});
			} else {
				console.log('[Patient Explore API] No se encontraron consultorios o el array está vacío');
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
