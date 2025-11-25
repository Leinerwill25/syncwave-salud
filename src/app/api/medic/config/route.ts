// app/api/medic/config/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { PRIVATE_SPECIALTIES, isValidPrivateSpecialty } from '@/lib/constants/specialties';

interface CookieStore {
	get?: (name: string) => { value?: string } | undefined;
}

async function tryRestoreSessionFromCookies(supabase: ReturnType<typeof createSupabaseServerClient>['supabase'], cookieStore: CookieStore): Promise<boolean> {
	if (!cookieStore) return false;

	const cookieCandidates = ['sb-session', 'sb:token', 'supabase-auth-token', 'sb-access-token', 'sb-refresh-token'];

	for (const name of cookieCandidates) {
		try {
			const c = typeof cookieStore.get === 'function' ? cookieStore.get(name) : undefined;
			const raw = c?.value ?? null;
			if (!raw) continue;

			let parsed: Record<string, unknown> | null = null;
			try {
				parsed = JSON.parse(raw) as Record<string, unknown>;
			} catch {
				parsed = null;
			}

			let access_token: string | null = null;
			let refresh_token: string | null = null;

			if (parsed) {
				const getNestedValue = (obj: Record<string, unknown>, ...paths: string[]): unknown => {
					for (const path of paths) {
						const keys = path.split('.');
						let current: unknown = obj;
						for (const key of keys) {
							if (current && typeof current === 'object' && key in current) {
								current = (current as Record<string, unknown>)[key];
							} else {
								return null;
							}
						}
						if (current) return current;
					}
					return null;
				};

				if (name === 'sb-session') {
					access_token = (getNestedValue(parsed, 'access_token', 'session.access_token', 'currentSession.access_token') as string | null) ?? null;
					refresh_token = (getNestedValue(parsed, 'refresh_token', 'session.refresh_token', 'currentSession.refresh_token') as string | null) ?? null;
					if (!access_token && parsed.user) {
						access_token = (parsed.access_token as string | null) ?? null;
						refresh_token = (parsed.refresh_token as string | null) ?? null;
					}
				} else {
					access_token = (getNestedValue(parsed, 'access_token', 'currentSession.access_token', 'current_session.access_token') as string | null) ?? null;
					refresh_token = (getNestedValue(parsed, 'refresh_token', 'currentSession.refresh_token', 'current_session.refresh_token') as string | null) ?? null;
					if (!access_token && parsed.currentSession && typeof parsed.currentSession === 'object') {
						const currentSession = parsed.currentSession as Record<string, unknown>;
						access_token = (currentSession.access_token as string | null) ?? null;
						refresh_token = (currentSession.refresh_token as string | null) ?? null;
					}
				}
			} else {
				if (name === 'sb-access-token') {
					access_token = raw;
				} else if (name === 'sb-refresh-token') {
					refresh_token = raw;
				}
			}

			if (!access_token && !refresh_token) continue;

			// Solo intentar setSession si tenemos al menos access_token
			if (access_token) {
				const payload: { access_token: string; refresh_token: string } = {
					access_token,
					refresh_token: refresh_token || '',
				};

				const { data, error } = await supabase.auth.setSession(payload);
				if (error) {
					// Si falla y tenemos refresh_token, intentar refresh
					if (refresh_token) {
						try {
							const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({ refresh_token });
							if (!refreshError && refreshData?.session) {
								return true;
							}
						} catch {
							// ignore
						}
					}
					continue;
				}

				if (data?.session) return true;

				const { data: sessionAfter } = await supabase.auth.getSession();
				if (sessionAfter?.session) return true;
			} else if (refresh_token) {
				// Si solo tenemos refresh_token, intentar refresh
				try {
					const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({ refresh_token });
					if (!refreshError && refreshData?.session) {
						return true;
					}
				} catch {
					// ignore
				}
			}
		} catch {
			continue;
		}
	}

	return false;
}

export async function GET(request: Request) {
	try {
		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		let accessTokenFromCookie: string | null = null;
		try {
			const sbAccessToken = cookieStore.get('sb-access-token');
			if (sbAccessToken?.value) {
				accessTokenFromCookie = sbAccessToken.value;
			}
		} catch (err) {
			console.debug('[Medic Config API] Error leyendo sb-access-token:', err);
		}

		let {
			data: { user },
			error: authError,
		} = accessTokenFromCookie 
			? await supabase.auth.getUser(accessTokenFromCookie)
			: await supabase.auth.getUser();

		if (authError) {
			console.error('[Medic Config API] Auth error:', authError);
		}

		if (!user) {
			const restored = await tryRestoreSessionFromCookies(supabase, cookieStore);
			if (restored) {
				const after = await supabase.auth.getUser();
				user = after.data?.user ?? null;
			}
		}

		if (!user) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		// Obtener usuario de la app
		const { data: appUser, error: userError } = await supabase
			.from('User')
			.select('id, name, email, organizationId, role')
			.eq('authId', user.id)
			.maybeSingle();

		if (userError || !appUser) {
			console.error('[Medic Config API] Error obteniendo usuario:', userError);
			return NextResponse.json({ error: 'Error al obtener datos del usuario' }, { status: 500 });
		}

		if (appUser.role !== 'MEDICO') {
			return NextResponse.json({ error: 'Acceso denegado: solo médicos' }, { status: 403 });
		}

		// Obtener perfil de clínica y tipo de organización si está afiliado
		let clinicProfile: { legal_name: string | null; trade_name: string | null; specialties: unknown } | null = null;
		let clinicSpecialties: string[] = [];
		let organizationType: string | null = null;
		
		if (appUser.organizationId) {
			// Obtener tipo de organización
			const { data: organization, error: orgError } = await supabase
				.from('Organization')
				.select('type')
				.eq('id', appUser.organizationId)
				.maybeSingle();

			if (!orgError && organization) {
				organizationType = organization.type;
			}

			const { data: clinic, error: clinicError } = await supabase
				.from('clinic_profile')
				.select('specialties, legal_name, trade_name')
				.eq('organization_id', appUser.organizationId)
				.maybeSingle();

			if (!clinicError && clinic) {
				clinicProfile = clinic;
				try {
					const parsed = Array.isArray(clinic.specialties) 
						? clinic.specialties 
						: typeof clinic.specialties === 'string' 
							? JSON.parse(clinic.specialties) 
							: [];
					clinicSpecialties = Array.isArray(parsed) 
						? parsed.map((s) => typeof s === 'string' ? s : String(s))
						: [];
				} catch {
					clinicSpecialties = [];
				}
			}
		}

		// Obtener perfil del médico desde medic_profile
		const { data: medicProfile, error: profileError } = await supabase
			.from('medic_profile')
			.select('*')
			.eq('doctor_id', appUser.id)
			.maybeSingle();

		// Si no existe perfil, crear uno vacío
		let profile = medicProfile;
		if (!medicProfile && !profileError) {
			const { data: newProfile, error: createError } = await supabase
				.from('medic_profile')
				.insert({
					doctor_id: appUser.id,
					services: [],
					credentials: {},
					credit_history: {},
					availability: {},
					notifications: { email: true, whatsapp: false, push: false },
					payment_methods: [],
				})
				.select()
				.single();

			if (!createError && newProfile) {
				profile = newProfile;
			}
		}

		// Parsear campos JSON con tipos seguros
		const parseJsonField = <T>(field: unknown, defaultValue: T): T => {
			if (!field) return defaultValue;
			if (typeof field === 'string') {
				try {
					return JSON.parse(field) as T;
				} catch {
					return defaultValue;
				}
			}
			return field as T;
		};

		const services = parseJsonField<Array<Record<string, unknown>>>(profile?.services, []);
		const credentials = parseJsonField<Record<string, unknown>>(profile?.credentials, {});
		const creditHistory = parseJsonField<Record<string, unknown>>(profile?.credit_history, {});
		const availability = parseJsonField<Record<string, unknown>>(profile?.availability, {});
		const notifications = parseJsonField<{ email: boolean; whatsapp: boolean; push: boolean }>(
			profile?.notifications,
			{ email: true, whatsapp: false, push: false }
		);
		const paymentMethods = parseJsonField<Array<Record<string, unknown>>>(profile?.payment_methods, []);

		// Un médico está "afiliado" si tiene una organización de tipo CLINICA o HOSPITAL
		// Los consultorios privados (CONSULTORIO) no se consideran afiliados
		const isAffiliated = organizationType === 'CLINICA' || organizationType === 'HOSPITAL';

		// Verificar si el perfil está completo
		// Un perfil se considera completo si tiene:
		// 1. Nombre completo
		// 2. Especialidad (specialty para afiliados o privateSpecialty para consultorios privados)
		// 3. Licencia médica completa (license, licenseNumber, issuedBy, expirationDate válida)
		// 4. Al menos un documento de credenciales subido
		// 5. Historial crediticio básico (universidad, título, año de graduación)
		const hasName = !!appUser.name && appUser.name.trim().length > 0;
		const hasSpecialty = isAffiliated 
			? !!(profile?.specialty && profile.specialty.trim().length > 0)
			: !!(profile?.private_specialty && profile.private_specialty.trim().length > 0);
		
		// Validar credenciales de licencia médica (usando credentials ya parseado)
		const hasLicense = !!(credentials.license && String(credentials.license).trim().length > 0);
		const hasLicenseNumber = !!(credentials.licenseNumber && String(credentials.licenseNumber).trim().length > 0);
		const hasIssuedBy = !!(credentials.issuedBy && String(credentials.issuedBy).trim().length > 0);
		const hasExpirationDate = !!(credentials.expirationDate && String(credentials.expirationDate).trim().length > 0);
		
		// Verificar que la fecha de expiración no esté vencida
		let isExpirationDateValid = false;
		if (hasExpirationDate) {
			try {
				const expirationDate = new Date(String(credentials.expirationDate));
				const today = new Date();
				today.setHours(0, 0, 0, 0);
				isExpirationDateValid = expirationDate >= today;
			} catch {
				isExpirationDateValid = false;
			}
		}
		
		// Verificar que tenga al menos un documento de credenciales
		const credentialFiles = Array.isArray(credentials.credentialFiles) ? credentials.credentialFiles : [];
		const hasCredentialFiles = credentialFiles.length > 0;
		
		// Validar historial crediticio básico (usando creditHistory ya parseado)
		const hasUniversity = !!(creditHistory.university && String(creditHistory.university).trim().length > 0);
		const hasDegree = !!(creditHistory.degree && String(creditHistory.degree).trim().length > 0);
		const hasGraduationYear = !!(creditHistory.graduationYear && String(creditHistory.graduationYear).trim().length > 0);
		
		const hasCompleteCredentials = hasLicense && hasLicenseNumber && hasIssuedBy && hasExpirationDate && isExpirationDateValid && hasCredentialFiles;
		const hasCompleteCreditHistory = hasUniversity && hasDegree && hasGraduationYear;
		
		const isProfileComplete = hasName && hasSpecialty && hasCompleteCredentials && hasCompleteCreditHistory;

		return NextResponse.json({
			user: {
				id: appUser.id,
				name: appUser.name,
				email: appUser.email,
				organizationId: appUser.organizationId,
			},
			isAffiliated: isAffiliated,
			organizationType: organizationType,
			isProfileComplete: isProfileComplete,
			clinicProfile: clinicProfile ? {
				name: clinicProfile.trade_name || clinicProfile.legal_name,
				specialties: clinicSpecialties,
			} : null,
			config: {
				specialty: profile?.specialty || null,
				privateSpecialty: profile?.private_specialty || null,
				signature: profile?.signature_url || null,
				photo: profile?.photo_url || null,
				credentials: credentials,
				creditHistory: creditHistory,
				availability: availability,
				notifications: notifications,
				services: services,
				privateSpecialties: Array.isArray(profile?.private_specialty) 
					? profile.private_specialty 
					: profile?.private_specialty 
						? [profile.private_specialty] 
						: [],
				paymentMethods: paymentMethods,
			},
		});
	} catch (err) {
		console.error('[Medic Config API] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error interno', detail: errorMessage }, { status: 500 });
	}
}

export async function PATCH(request: Request) {
	try {
		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		let accessTokenFromCookie: string | null = null;
		try {
			const sbAccessToken = cookieStore.get('sb-access-token');
			if (sbAccessToken?.value) {
				accessTokenFromCookie = sbAccessToken.value;
			}
		} catch (err) {
			console.debug('[Medic Config API PATCH] Error leyendo sb-access-token:', err);
		}

		let {
			data: { user },
			error: authError,
		} = accessTokenFromCookie 
			? await supabase.auth.getUser(accessTokenFromCookie)
			: await supabase.auth.getUser();

		if (authError) {
			console.error('[Medic Config API PATCH] Auth error:', authError);
		}

		if (!user) {
			const restored = await tryRestoreSessionFromCookies(supabase, cookieStore);
			if (restored) {
				const after = await supabase.auth.getUser();
				user = after.data?.user ?? null;
			}
		}

		if (!user) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		// Obtener usuario de la app
		const { data: appUser, error: userError } = await supabase
			.from('User')
			.select('id, organizationId, role')
			.eq('authId', user.id)
			.maybeSingle();

		if (userError || !appUser) {
			return NextResponse.json({ error: 'Error al obtener datos del usuario' }, { status: 500 });
		}

		if (appUser.role !== 'MEDICO') {
			return NextResponse.json({ error: 'Acceso denegado: solo médicos' }, { status: 403 });
		}

		const body = await request.json();

		// Validar que si está afiliado, la especialidad sea de la clínica
		if (appUser.organizationId && body.specialty) {
			const { data: clinic } = await supabase
				.from('clinic_profile')
				.select('specialties')
				.eq('organization_id', appUser.organizationId)
				.maybeSingle();

			if (clinic) {
				let clinicSpecialties: string[] = [];
				try {
					const parsed = Array.isArray(clinic.specialties) 
						? clinic.specialties 
						: typeof clinic.specialties === 'string' 
							? JSON.parse(clinic.specialties) 
							: [];
					clinicSpecialties = Array.isArray(parsed) 
						? parsed.map((s) => typeof s === 'string' ? s : String(s))
						: [];
				} catch {
					clinicSpecialties = [];
				}

				const specialtyNames = clinicSpecialties;

				if (!specialtyNames.includes(body.specialty)) {
					return NextResponse.json({ 
						error: 'La especialidad seleccionada no está disponible en esta clínica' 
					}, { status: 400 });
				}
			}
		}

		// Actualizar nombre si se proporciona
		if (body.name !== undefined) {
			const { error: updateError } = await supabase
				.from('User')
				.update({ name: body.name })
				.eq('id', appUser.id);

			if (updateError) {
				console.error('[Medic Config API PATCH] Error actualizando nombre:', updateError);
			}
		}

		// Preparar datos para medic_profile
		const profileData: Record<string, unknown> = {};

		if (body.specialty !== undefined) {
			profileData.specialty = body.specialty;
		}

		if (body.privateSpecialty !== undefined) {
			// Validar que la especialidad sea una de las permitidas
			if (body.privateSpecialty && !isValidPrivateSpecialty(body.privateSpecialty)) {
				return NextResponse.json({ 
					error: `Especialidad inválida. Debe ser una de: ${PRIVATE_SPECIALTIES.join(', ')}` 
				}, { status: 400 });
			}
			profileData.private_specialty = body.privateSpecialty || null;
		}

		if (body.photo !== undefined) {
			profileData.photo_url = body.photo;
		}

		if (body.signature !== undefined) {
			profileData.signature_url = body.signature;
		}

		if (body.services !== undefined) {
			profileData.services = body.services;
		}

		if (body.credentials !== undefined) {
			profileData.credentials = body.credentials;
		}

		if (body.creditHistory !== undefined) {
			profileData.credit_history = body.creditHistory;
		}

		if (body.availability !== undefined) {
			profileData.availability = body.availability;
		}

		if (body.notifications !== undefined) {
			profileData.notifications = body.notifications;
		}

		if (body.paymentMethods !== undefined) {
			profileData.payment_methods = body.paymentMethods;
		}

		// Verificar si existe perfil
		const { data: existingProfile } = await supabase
			.from('medic_profile')
			.select('id')
			.eq('doctor_id', appUser.id)
			.maybeSingle();

		if (existingProfile) {
			// Actualizar perfil existente
			const { error: updateError } = await supabase
				.from('medic_profile')
				.update(profileData)
				.eq('doctor_id', appUser.id);

			if (updateError) {
				console.error('[Medic Config API PATCH] Error actualizando perfil:', updateError);
				return NextResponse.json({ 
					error: 'Error al actualizar perfil',
					detail: updateError.message 
				}, { status: 500 });
			}
		} else {
			// Crear nuevo perfil
			const { error: insertError } = await supabase
				.from('medic_profile')
				.insert({
					doctor_id: appUser.id,
					...profileData,
				});

			if (insertError) {
				console.error('[Medic Config API PATCH] Error creando perfil:', insertError);
				return NextResponse.json({ 
					error: 'Error al crear perfil',
					detail: insertError.message 
				}, { status: 500 });
			}
		}

		return NextResponse.json({ 
			success: true,
			message: 'Configuración actualizada correctamente'
		});
	} catch (err) {
		console.error('[Medic Config API PATCH] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error interno', detail: errorMessage }, { status: 500 });
	}
}

