// app/api/medic/config/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';

async function tryRestoreSessionFromCookies(supabase: any, cookieStore: any): Promise<boolean> {
	if (!cookieStore) return false;

	const cookieCandidates = ['sb-session', 'sb:token', 'supabase-auth-token', 'sb-access-token', 'sb-refresh-token'];

	for (const name of cookieCandidates) {
		try {
			const c = typeof cookieStore.get === 'function' ? cookieStore.get(name) : undefined;
			const raw = c?.value ?? null;
			if (!raw) continue;

			let parsed: any = null;
			try {
				parsed = JSON.parse(raw);
			} catch {
				parsed = null;
			}

			let access_token: string | null = null;
			let refresh_token: string | null = null;

			if (parsed) {
				if (name === 'sb-session') {
					access_token = parsed?.access_token ?? parsed?.session?.access_token ?? parsed?.currentSession?.access_token ?? null;
					refresh_token = parsed?.refresh_token ?? parsed?.session?.refresh_token ?? parsed?.currentSession?.refresh_token ?? null;
					if (!access_token && parsed?.user) {
						access_token = parsed.access_token ?? null;
						refresh_token = parsed.refresh_token ?? null;
					}
				} else {
					access_token = parsed?.access_token ?? parsed?.currentSession?.access_token ?? parsed?.current_session?.access_token ?? null;
					refresh_token = parsed?.refresh_token ?? parsed?.currentSession?.refresh_token ?? parsed?.current_session?.refresh_token ?? null;
					if (!access_token && parsed?.currentSession && typeof parsed.currentSession === 'object') {
						access_token = parsed.currentSession.access_token ?? null;
						refresh_token = parsed.currentSession.refresh_token ?? null;
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

			const payload: any = {};
			if (access_token) payload.access_token = access_token;
			if (refresh_token) payload.refresh_token = refresh_token;

			const { data, error } = await supabase.auth.setSession(payload);
			if (error) {
				if (refresh_token && !access_token && error.message.includes('session')) {
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

		// Obtener perfil de clínica si está afiliado
		let clinicProfile = null;
		let clinicSpecialties: any[] = [];
		
		if (appUser.organizationId) {
			const { data: clinic, error: clinicError } = await supabase
				.from('clinic_profile')
				.select('specialties, legal_name, trade_name')
				.eq('organization_id', appUser.organizationId)
				.maybeSingle();

			if (!clinicError && clinic) {
				clinicProfile = clinic;
				try {
					clinicSpecialties = Array.isArray(clinic.specialties) 
						? clinic.specialties 
						: typeof clinic.specialties === 'string' 
							? JSON.parse(clinic.specialties) 
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
				})
				.select()
				.single();

			if (!createError && newProfile) {
				profile = newProfile;
			}
		}

		// Parsear campos JSON
		const services = Array.isArray(profile?.services) 
			? profile.services 
			: typeof profile?.services === 'string' 
				? JSON.parse(profile.services) 
				: [];

		const credentials = profile?.credentials 
			? (typeof profile.credentials === 'string' ? JSON.parse(profile.credentials) : profile.credentials)
			: {};

		const creditHistory = profile?.credit_history
			? (typeof profile.credit_history === 'string' ? JSON.parse(profile.credit_history) : profile.credit_history)
			: {};

		const availability = profile?.availability
			? (typeof profile.availability === 'string' ? JSON.parse(profile.availability) : profile.availability)
			: {};

		const notifications = profile?.notifications
			? (typeof profile.notifications === 'string' ? JSON.parse(profile.notifications) : profile.notifications)
			: { email: true, whatsapp: false, push: false };

		return NextResponse.json({
			user: {
				id: appUser.id,
				name: appUser.name,
				email: appUser.email,
				organizationId: appUser.organizationId,
			},
			isAffiliated: !!appUser.organizationId,
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
			},
		});
	} catch (err: any) {
		console.error('[Medic Config API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
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
				let clinicSpecialties: any[] = [];
				try {
					clinicSpecialties = Array.isArray(clinic.specialties) 
						? clinic.specialties 
						: typeof clinic.specialties === 'string' 
							? JSON.parse(clinic.specialties) 
							: [];
				} catch {
					clinicSpecialties = [];
				}

				const specialtyNames = clinicSpecialties.map((s: any) => 
					typeof s === 'string' ? s : s?.name || s?.specialty || ''
				);

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
		const profileData: any = {};

		if (body.specialty !== undefined) {
			profileData.specialty = body.specialty;
		}

		if (body.privateSpecialty !== undefined) {
			profileData.private_specialty = body.privateSpecialty;
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
	} catch (err: any) {
		console.error('[Medic Config API PATCH] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

