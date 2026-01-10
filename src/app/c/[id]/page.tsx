import { Metadata } from 'next';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import ConsultorioPublicPage from '@/components/consultorio/ConsultorioPublicPage';
import { parseSpecialties, parseOpeningHours } from '@/lib/safe-json-parse';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
	const { id } = await params;
	const cookieStore = await cookies();
	const supabase = await createSupabaseServerClient();

	try {
		// Obtener datos del consultorio
		const { data: organization } = await supabase
			.from('organization')
			.select(`
				id,
				name,
				type,
				clinic_profile:clinic_profile!clinic_profile_org_fk (
					trade_name,
					legal_name,
					profile_photo,
					specialties,
					social_instagram,
					social_facebook
				)
			`)
			.eq('id', id)
			.eq('type', 'CONSULTORIO')
			.maybeSingle();

		if (!organization) {
			return {
				title: 'Consultorio no encontrado',
			};
		}

		const clinicProfile = Array.isArray(organization.clinic_profile)
			? organization.clinic_profile[0]
			: organization.clinic_profile;

		const displayName = clinicProfile?.trade_name || clinicProfile?.legal_name || organization.name;
		const specialties = parseSpecialties(clinicProfile?.specialties);
		const specialtyText = specialties.length > 0 ? specialties[0] : 'Consultorio Médico';

		return {
			title: `${displayName} - ${specialtyText}`,
			description: `Consultorio privado especializado en ${specialtyText}. Agenda tu cita y conoce nuestros servicios médicos.`,
			openGraph: {
				title: `${displayName} - ${specialtyText}`,
				description: `Consultorio privado especializado en ${specialtyText}. Agenda tu cita y conoce nuestros servicios médicos.`,
				type: 'website',
				images: clinicProfile?.profile_photo ? [clinicProfile.profile_photo] : [],
			},
			twitter: {
				card: 'summary_large_image',
				title: `${displayName} - ${specialtyText}`,
				description: `Consultorio privado especializado en ${specialtyText}. Agenda tu cita y conoce nuestros servicios médicos.`,
				images: clinicProfile?.profile_photo ? [clinicProfile.profile_photo] : [],
			},
		};
	} catch (error) {
		return {
			title: 'Consultorio Médico',
		};
	}
}

export default async function ConsultorioPublicRoute({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const cookieStore = await cookies();
	const supabase = await createSupabaseServerClient();

	try {
		// Obtener datos del consultorio - primero sin filtrar por tipo para evitar problemas de RLS o formato
		console.log('[Consultorio Page] Buscando organización con ID:', id);
		let { data: organizationBasic, error: orgBasicError } = await supabase
			.from('organization')
			.select('id, name, type, address, phone, contactEmail')
			.eq('id', id)
			.maybeSingle();

		console.log('[Consultorio Page] Resultado consulta organización:', { 
			data: organizationBasic ? { id: organizationBasic.id, name: organizationBasic.name, type: organizationBasic.type } : 'not found', 
			error: orgBasicError ? { message: orgBasicError.message, code: orgBasicError.code } : null 
		});

		if (orgBasicError) {
			console.error('[Consultorio Page] Error obteniendo organización básica:', orgBasicError);
			return (
				<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-teal-50">
					<div className="text-center">
						<h1 className="text-3xl font-bold text-slate-900 mb-2">Error al cargar consultorio</h1>
						<p className="text-slate-600">Ocurrió un error al obtener la información del consultorio.</p>
						<p className="text-sm text-slate-500 mt-2">ID: {id}</p>
						<p className="text-xs text-red-500 mt-2">Error: {orgBasicError.message} (Code: {orgBasicError.code})</p>
					</div>
				</div>
			);
		}

		if (!organizationBasic) {
			console.warn('[Consultorio Page] Organización no encontrada para ID:', id);
			return (
				<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-teal-50">
					<div className="text-center">
						<h1 className="text-3xl font-bold text-slate-900 mb-2">Consultorio no encontrado</h1>
						<p className="text-slate-600">El consultorio que buscas no existe o no está disponible.</p>
						<p className="text-sm text-slate-500 mt-2">ID: {id}</p>
					</div>
				</div>
			);
		}

		// Verificar que el tipo sea CONSULTORIO después de obtenerlo (puede ser case-sensitive o formato diferente)
		const orgType = String(organizationBasic.type || '').trim().toUpperCase();
		if (orgType !== 'CONSULTORIO') {
			console.warn('[Consultorio Page] Organización encontrada pero no es CONSULTORIO. Tipo encontrado:', organizationBasic.type, 'Normalizado:', orgType);
			return (
				<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-teal-50">
					<div className="text-center">
						<h1 className="text-3xl font-bold text-slate-900 mb-2">Consultorio no encontrado</h1>
						<p className="text-slate-600">El consultorio que buscas no existe o no está disponible.</p>
						<p className="text-sm text-slate-500 mt-2">ID: {id}</p>
						<p className="text-xs text-amber-600 mt-2">
							Nota: Se encontró una organización con ese ID pero tipo: "{organizationBasic.type}" (se requiere "CONSULTORIO")
						</p>
					</div>
				</div>
			);
		}

		// Ahora obtener el clinic_profile por separado si existe
		let clinicProfileData: any = null;
		try {
			const { data: fetchedClinicProfile, error: clinicProfileError } = await supabase
				.from('clinic_profile')
				.select('*')
				.eq('organization_id', id)
				.maybeSingle();

			if (!clinicProfileError && fetchedClinicProfile) {
				clinicProfileData = fetchedClinicProfile;
				console.log('[Consultorio Page] Clinic profile encontrado');
			} else if (clinicProfileError) {
				console.warn('[Consultorio Page] Error obteniendo clinic_profile (continuando sin él):', clinicProfileError.message);
				console.warn('[Consultorio Page] Error code:', clinicProfileError.code);
			} else {
				console.log('[Consultorio Page] No hay clinic_profile para esta organización');
			}
		} catch (err: any) {
			console.warn('[Consultorio Page] Error al obtener clinic_profile (continuando sin él):', err?.message || err);
		}

		// Combinar datos
		const organization = {
			...organizationBasic,
			clinic_profile: clinicProfileData ? [clinicProfileData] : null,
		};

		// Obtener médicos del consultorio
		// Intentar primero con service_combos, si falla intentar sin él
		let doctors: any[] | null = null;
		let doctorsError: any = null;

		try {
			const doctorsQuery = supabase
				.from('user')
				.select(`
					id,
					name,
					email,
					medic_profile:medic_profile!fk_medic_profile_doctor (
						id,
						specialty,
						private_specialty,
						photo_url,
						credentials,
						services,
						service_combos,
						availability,
						has_cashea
					)
				`)
				.eq('organizationId', organization.id)
				.eq('role', 'MEDICO');

			const result = await doctorsQuery;
			doctors = result.data;
			doctorsError = result.error;

			// Si la consulta falla por service_combos, intentar sin él
			if (doctorsError && (doctorsError.message?.includes('service_combos') || doctorsError.code === 'PGRST116')) {
				console.warn('[Consultorio Page] Campo service_combos no encontrado, intentando sin él:', doctorsError.message);
				const fallbackQuery = supabase
					.from('user')
					.select(`
						id,
						name,
						email,
						medic_profile:medic_profile!fk_medic_profile_doctor (
							id,
							specialty,
							private_specialty,
							photo_url,
							credentials,
							services,
							availability,
							has_cashea
						)
					`)
					.eq('organizationId', organization.id)
					.eq('role', 'MEDICO');
				
				const fallbackResult = await fallbackQuery;
				doctors = fallbackResult.data;
				doctorsError = fallbackResult.error;
			}
		} catch (err) {
			console.error('[Consultorio Page] Error en consulta de médicos:', err);
			doctorsError = err;
		}

		// Si aún hay error, loguear pero continuar con array vacío
		if (doctorsError) {
			console.error('[Consultorio Page] Error obteniendo médicos:', doctorsError);
			// Continuar con array vacío en lugar de fallar completamente
			doctors = [];
		}

		// Normalizar clinic_profile
		const clinicProfile = Array.isArray(organization.clinic_profile)
			? organization.clinic_profile[0]
			: organization.clinic_profile || {};

		// Parsear campos JSON - asegurar que specialties siempre sea un array de strings limpio (nunca JSON string)
		let specialties: string[] = [];
		
		const parseSpecialtiesToStringArray = (data: any): string[] => {
			if (!data) return [];
			
			// Si es un string, puede ser JSON o string simple
			if (typeof data === 'string') {
				const trimmed = data.trim();
				if (!trimmed) return [];
				
				// Si parece JSON array, parsearlo
				if (trimmed.startsWith('[')) {
					try {
						const parsed = JSON.parse(trimmed);
						if (Array.isArray(parsed)) {
							return parsed
								.map((s: any) => {
									if (typeof s === 'string') return s.trim();
									if (typeof s === 'object' && s !== null) return String(s.name || s.label || s).trim();
									return String(s).trim();
								})
								.filter((s: string) => s && s.length > 0 && !s.startsWith('[') && !s.startsWith('{') && s !== 'null' && s !== 'undefined');
						}
					} catch {
						// Si falla, intentar extraer manualmente del string
						const cleaned = trimmed.replace(/^\[|\]$/g, '').replace(/"/g, '').trim();
						if (cleaned) {
							return cleaned.split(',').map(s => s.trim()).filter(s => s.length > 0);
						}
					}
				}
				// String simple sin JSON
				return [trimmed];
			}
			
			// Si es un array
			if (Array.isArray(data)) {
				return data
					.map((s: any) => {
						if (typeof s === 'string') {
							const cleaned = s.trim();
							// Si es un string JSON, intentar parsearlo
							if (cleaned.startsWith('[') || cleaned.startsWith('{')) {
								try {
									const parsed = JSON.parse(cleaned);
									if (Array.isArray(parsed)) {
										return parsed.map((p: any) => String(p).trim()).join(', ');
									}
									return String(parsed).trim();
								} catch {
									return cleaned.replace(/^\[|\]$/g, '').replace(/"/g, '').trim();
								}
							}
							return cleaned;
						}
						if (typeof s === 'object' && s !== null) {
							return String(s.name || s.label || s).trim();
						}
						return String(s).trim();
					})
					.flatMap((s: string) => s.includes(',') ? s.split(',').map(sp => sp.trim()) : [s])
					.filter((s: string) => s && s.length > 0 && !s.startsWith('[') && !s.startsWith('{') && s !== 'null' && s !== 'undefined');
			}
			
			// Si es un objeto
			if (typeof data === 'object' && data !== null) {
				if ((data as any).name) return [String((data as any).name).trim()];
				if (Array.isArray((data as any).items)) {
					return (data as any).items.map((s: any) => String(s).trim());
				}
			}
			
			return [];
		};
		
		// Parsear specialties usando la función helper
		specialties = parseSpecialtiesToStringArray(clinicProfile.specialties);
		
		// Si aún está vacío, intentar con parseSpecialties como último recurso
		if (specialties.length === 0) {
			const fallback = parseSpecialties(clinicProfile.specialties);
			specialties = parseSpecialtiesToStringArray(fallback);
		}
		
		// Filtrar y limpiar el array final (asegurar que no haya strings JSON)
		specialties = specialties
			.flatMap((s: string) => {
				const cleaned = s.trim();
				// Si contiene comas, dividir
				if (cleaned.includes(',')) {
					return cleaned.split(',').map(sp => sp.trim());
				}
				return [cleaned];
			})
			.filter((s: string) => {
				if (!s || s.length === 0) return false;
				const cleaned = s.trim();
				// Filtrar cualquier cosa que parezca JSON
				return !cleaned.startsWith('[') && !cleaned.startsWith('{') && cleaned !== 'null' && cleaned !== 'undefined';
			});
		
		const openingHours = parseOpeningHours(clinicProfile.opening_hours);

		// Parsear location
		let location = null;
		if (clinicProfile.location) {
			try {
				location = typeof clinicProfile.location === 'string'
					? JSON.parse(clinicProfile.location)
					: clinicProfile.location;
			} catch {
				location = null;
			}
		}

		// Parsear photos
		let photos: string[] = [];
		if (clinicProfile.photos) {
			try {
				const parsed = Array.isArray(clinicProfile.photos)
					? clinicProfile.photos
					: typeof clinicProfile.photos === 'string'
						? JSON.parse(clinicProfile.photos)
						: [];
				photos = Array.isArray(parsed)
					? parsed.filter((url: any) => url && typeof url === 'string')
					: [];
			} catch {
				photos = [];
			}
		}

		// Parsear información de médicos
		const doctorsWithParsedData = (doctors || []).map((doctor: any) => {
			const profile = doctor.medic_profile;
			if (!profile) {
				// Si no hay perfil, retornar doctor con estructura mínima
				return {
					...doctor,
					medic_profile: {
						id: null,
						specialty: null,
						private_specialty: null,
						photo_url: null,
						services: [],
						serviceCombos: [],
						credentials: {},
						availability: {},
						has_cashea: null,
					},
				};
			}

			let services: any[] = [];
			let serviceCombos: any[] = [];
			let credentials: any = {};
			let availability: any = {};

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
				// Intentar obtener service_combos si existe (puede no estar en el fallback)
				if (profile.service_combos !== undefined && profile.service_combos !== null) {
					serviceCombos = Array.isArray(profile.service_combos)
						? profile.service_combos
						: typeof profile.service_combos === 'string'
							? JSON.parse(profile.service_combos)
							: [];
				} else {
					// Si no existe, usar array vacío
					serviceCombos = [];
				}
			} catch {
				serviceCombos = [];
			}

			try {
				credentials = profile.credentials
					? (typeof profile.credentials === 'string' ? JSON.parse(profile.credentials) : profile.credentials)
					: {};
			} catch {
				credentials = {};
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
					services,
					serviceCombos, // Siempre incluimos serviceCombos, incluso si está vacío
					credentials,
					availability,
				},
			};
		});

		// Parsear payment_methods si existe
		let paymentMethods: any[] = [];
		if (clinicProfile.payment_methods) {
			try {
				if (Array.isArray(clinicProfile.payment_methods)) {
					paymentMethods = clinicProfile.payment_methods;
				} else if (typeof clinicProfile.payment_methods === 'string') {
					paymentMethods = JSON.parse(clinicProfile.payment_methods);
				}
			} catch {
				paymentMethods = [];
			}
		}

		const consultorioData = {
			id: organization.id,
			name: organization.name,
			legal_name: clinicProfile.legal_name || organization.name,
			trade_name: clinicProfile.trade_name || clinicProfile.legal_name || organization.name,
			address_operational: clinicProfile.address_operational || organization.address || null,
			address_fiscal: clinicProfile.address_fiscal || null,
			phone_mobile: clinicProfile.phone_mobile || organization.phone || null,
			phone_fixed: clinicProfile.phone_fixed || null,
			contact_email: clinicProfile.contact_email || organization.contactEmail || null,
			website: clinicProfile.website || null,
			social_facebook: clinicProfile.social_facebook || null,
			social_instagram: clinicProfile.social_instagram || null,
			social_linkedin: clinicProfile.social_linkedin || null,
			specialties,
			opening_hours: openingHours,
			location,
			photos,
			profile_photo: clinicProfile.profile_photo || null,
			sanitary_license: clinicProfile.sanitary_license || null,
			liability_insurance_number: clinicProfile.liability_insurance_number || null,
			has_cashea: clinicProfile.has_cashea !== null && clinicProfile.has_cashea !== undefined ? clinicProfile.has_cashea : null,
			// Additional clinic_profile fields
			legal_rif: clinicProfile.legal_rif || null,
			entity_type: clinicProfile.entity_type || null,
			state_province: clinicProfile.state_province || null,
			city_municipality: clinicProfile.city_municipality || null,
			postal_code: clinicProfile.postal_code || null,
			offices_count: clinicProfile.offices_count !== null && clinicProfile.offices_count !== undefined ? clinicProfile.offices_count : null,
			capacity_per_day: clinicProfile.capacity_per_day || null,
			employees_count: clinicProfile.employees_count || null,
			director_name: clinicProfile.director_name || null,
			admin_name: clinicProfile.admin_name || null,
			director_id_number: clinicProfile.director_id_number || null,
			bank_name: clinicProfile.bank_name || null,
			bank_account_type: clinicProfile.bank_account_type || null,
			bank_account_number: clinicProfile.bank_account_number || null,
			bank_account_owner: clinicProfile.bank_account_owner || null,
			currency: clinicProfile.currency || null,
			payment_methods: paymentMethods.length > 0 ? paymentMethods : null,
			billing_series: clinicProfile.billing_series || null,
			tax_regime: clinicProfile.tax_regime || null,
			billing_address: clinicProfile.billing_address || null,
			doctors: doctorsWithParsedData,
		};

		return <ConsultorioPublicPage consultorio={consultorioData} />;
	} catch (error) {
		console.error('Error loading consultorio:', error);
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-teal-50">
				<div className="text-center">
					<h1 className="text-3xl font-bold text-slate-900 mb-2">Error al cargar consultorio</h1>
					<p className="text-slate-600">Ocurrió un error al cargar la información del consultorio.</p>
				</div>
			</div>
		);
	}
}

