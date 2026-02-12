// app/api/clinic/profile/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { getAuthenticatedUser } from '@/lib/auth-guards';

type Supa = any;

/** Resultado de tryFromVariants */
type TryFromResult = { name: string | null; data: any | null; error: Error | null };

/**
 * Intenta consultar la misma tabla con varias variantes de nombre (por casing/quotes).
 * - variants: string o string[] con nombres a probar (en orden).
 * - select: cadena con columnas (p. ej. '*').
 *
 * Devuelve { name, data, error } donde data será el .data retornado por supabase
 * (puede ser array o single dependiendo de la consulta posterior).
 */
async function tryFromVariants(supabase: Supa, variants: string | string[], select = '*'): Promise<TryFromResult> {
	const names = Array.isArray(variants) ? variants : [variants];
	for (const name of names) {
		try {
			// Intentamos una pequeña select para validar existencia de la tabla
			const res = await supabase.from(name).select(select).limit(1);
			if (res && !res.error) {
				return { name, data: res.data, error: null };
			}
			// si hay error en res.error, probamos siguiente variante
		} catch (e: any) {
			// excepción -> probar siguiente variante
			continue;
		}
	}
	return { name: null, data: null, error: new Error('No se encontró la tabla en las variantes probadas') };
}

const PLAN_VARIANTS = ['plan', '"plan"', '"public"."plan"'];
const ORG_VARIANTS = ['organization', '"organization"', '"public"."organization"'];
const USER_VARIANTS = ['users', 'user', '"user"', '"public"."user"', '"users"'];
const SUBS_VARIANTS = ['subscription', '"subscription"', '"public"."subscription"'];
const INVITE_VARIANTS = ['invite', '"invite"', '"public"."invite"'];
const CLINIC_PROFILE_VARIANTS = ['clinic_profile', '"clinic_profile"', '"public"."clinic_profile"', 'clinicProfile'];

interface CookieStore {
	get?: (name: string) => { value?: string } | undefined;
}

async function tryRestoreSessionFromCookies(supabase: Supa, cookieStore: CookieStore): Promise<boolean> {
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
			}
		} catch {
			continue;
		}
	}

	return false;
}

export async function GET(req: Request) {
	try {
		// 151: Usar getAuthenticatedUser de auth-guards que maneja correctamente la restauración de sesión
		const authenticatedUser = await getAuthenticatedUser();
		
		if (!authenticatedUser) {
			console.error('[GET /api/clinic/profile] Usuario no autenticado');
			return NextResponse.json({ error: 'Usuario no autenticado.' }, { status: 401 });
		}

		// Obtener officeId de los query params
		const { searchParams } = new URL(req.url);
		const officeId = searchParams.get('officeId');
		console.log('[GET /api/clinic/profile] Buscando perfil para officeId:', officeId);

		// Verificar que el usuario tenga una organización
		const orgId = authenticatedUser.organizationId;
		if (!orgId) {
			return NextResponse.json({ error: 'El usuario no está asignado a una organización.' }, { status: 404 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		// 168: ---------------- clinic_profile ----------------
		let clinicProfile: any = null;
		const cpFetch = await tryFromVariants(supabase, CLINIC_PROFILE_VARIANTS, '*');
		if (cpFetch.name) {
			let query = supabase.from(cpFetch.name).select('*').eq('organization_id', orgId);
			
			if (officeId) {
				query = query.eq('office_id', officeId);
			} else {
				query = query.is('office_id', null);
			}

			const cpQ = await query.maybeSingle();
			if (!cpQ.error && cpQ.data) {
				clinicProfile = cpQ.data;
				// Parsear location y photos si son strings JSON
				if (clinicProfile.location && typeof clinicProfile.location === 'string') {
					try {
						clinicProfile.location = JSON.parse(clinicProfile.location);
					} catch {
						// Si no es JSON válido, dejarlo como está
					}
				}
				if (clinicProfile.photos && typeof clinicProfile.photos === 'string') {
					try {
						const parsedPhotos = JSON.parse(clinicProfile.photos);
						// Convertir paths de Supabase Storage a URLs públicas
						if (Array.isArray(parsedPhotos)) {
							clinicProfile.photos = parsedPhotos.map((photo: string) => {
								// Si ya es una URL completa, devolverla tal cual
								if (photo.startsWith('http://') || photo.startsWith('https://')) {
									return photo;
								}
								// Si es un path de Supabase Storage, convertir a URL pública
								if (photo.startsWith('clinic-photos/')) {
									const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
									const bucket = 'clinic-photos';
									return `${supabaseUrl}/storage/v1/object/public/${bucket}/${photo}`;
								}
								return photo;
							});
						} else {
							clinicProfile.photos = parsedPhotos;
						}
					} catch {
						// Si no es JSON válido, dejarlo como está
					}
				}
				
				// Convertir profile_photo a URL pública si es un path de Supabase Storage
				if (clinicProfile.profile_photo && typeof clinicProfile.profile_photo === 'string') {
					const profilePhoto = clinicProfile.profile_photo;
					if (!profilePhoto.startsWith('http://') && !profilePhoto.startsWith('https://')) {
						if (profilePhoto.startsWith('clinic-photos/')) {
							const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
							const bucket = 'clinic-photos';
							clinicProfile.profile_photo = `${supabaseUrl}/storage/v1/object/public/${bucket}/${profilePhoto}`;
						}
					}
				}
			}
		}

		// ---------------- Organization ----------------
		let orgData: any = null;
		const orgFetch = await tryFromVariants(supabase, ORG_VARIANTS, 'id, name, specialistCount, planId, inviteBaseUrl, phone, contactEmail');
		if (orgFetch.name) {
			const oQ = await supabase.from(orgFetch.name).select('id, name, specialistCount, planId, inviteBaseUrl, phone, contactEmail').eq('id', orgId).maybeSingle();
			if (!oQ.error && oQ.data) orgData = oQ.data;
		}

		// ---------------- Última Subscription ----------------
		let subscription: any = null;
		const subsFetch = await tryFromVariants(supabase, SUBS_VARIANTS, '*');
		if (subsFetch.name) {
			const sQ = await supabase.from(subsFetch.name).select('id, planId, startDate, endDate, status, planSnapshot, createdAt').eq('organizationId', orgId).order('createdAt', { ascending: false }).limit(1).maybeSingle();
			if (!sQ.error && sQ.data) subscription = sQ.data;
		}

		// ---------------- Plan (por subscription.planId o orgData.planId) ----------------
		let plan: any = null;
		const planFetch = await tryFromVariants(supabase, PLAN_VARIANTS, '*');
		const planIdToLookup = subscription?.planId ?? orgData?.planId;
		if (planFetch.name && planIdToLookup) {
			const pQ = await supabase.from(planFetch.name).select('*').eq('id', planIdToLookup).maybeSingle();
			if (!pQ.error && pQ.data) plan = pQ.data;
		}

		// ---------------- invites no usadas ----------------
		let invitesCount = 0;
		const inviteFetch = await tryFromVariants(supabase, INVITE_VARIANTS, '*');
		if (inviteFetch.name) {
			const iQ = await supabase.from(inviteFetch.name).select('*', { count: 'exact', head: true }).eq('organizationId', orgId).eq('used', false);
			if (!iQ.error) invitesCount = iQ.count ?? 0;
		}

		// ---------------- conteos adicionales ----------------
		let usersCount = 0;
		const userFetch = await tryFromVariants(supabase, USER_VARIANTS, 'id');
		if (userFetch.name) {
			const uQ = await supabase.from(userFetch.name).select('id', { count: 'exact', head: true }).eq('organizationId', orgId);
			if (!uQ.error) usersCount = uQ.count ?? 0;
		}

		let appointmentsCount = 0;
		const aQ = await supabase.from('appointment').select('id', { count: 'exact', head: true }).eq('organization_id', orgId);
		if (!aQ.error) appointmentsCount = aQ.count ?? 0;

		const specialistCount = orgData?.specialistCount ?? 0;
		const capacityPerDay = clinicProfile?.capacity_per_day ?? null;

		return NextResponse.json({
			profile: clinicProfile,
			clinicProfile,
			organization: orgData,
			subscription: subscription
				? {
						id: subscription.id,
						startDate: subscription.startDate,
						endDate: subscription.endDate,
						status: subscription.status,
						planSnapshot: subscription.planSnapshot,
				  }
				: null,
			plan,
			specialistCount,
			capacityPerDay,
			invitesAvailable: invitesCount ?? 0,
			counts: {
				users: usersCount,
				appointments: appointmentsCount,
			},
		});
	} catch (error: any) {
		console.error('Error en GET /api/clinic/profile:', error);
		return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
	}
}

export async function PUT(req: Request) {
	try {
		// Usar getAuthenticatedUser de auth-guards que maneja correctamente la restauración de sesión
		const authenticatedUser = await getAuthenticatedUser();
		
		if (!authenticatedUser) {
			console.error('[PUT /api/clinic/profile] Usuario no autenticado');
			return NextResponse.json({ error: 'Usuario no autenticado.' }, { status: 401 });
		}

		// Verificar que el usuario tenga una organización
		const orgId = authenticatedUser.organizationId;
		if (!orgId) {
			return NextResponse.json({ error: 'El usuario no está asignado a una organización.' }, { status: 404 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();
		const body = await req.json();

		// encontrar tabla clinic_profile
		const cpFetch = await tryFromVariants(supabase, CLINIC_PROFILE_VARIANTS, '*');
		if (!cpFetch.name) return NextResponse.json({ error: 'No se encontró la tabla clinic_profile.' }, { status: 500 });

		// Verificar si ya existe un registro para esta organización (y oficina si aplica)
		let query = supabase
			.from(cpFetch.name)
			.select('id')
			.eq('organization_id', orgId);
		
		if (body.office_id) {
			query = query.eq('office_id', body.office_id);
		} else {
			query = query.is('office_id', null);
		}

		const existingCheck = await query.maybeSingle();

		// Preparar datos para insertar/actualizar
		const dataToSave: any = {
			organization_id: orgId,
			legal_name: body.legal_name || null,
			trade_name: body.trade_name || null,
			address_operational: body.address_operational || null,
			phone_fixed: body.phone_fixed || null,
			phone_mobile: body.phone_mobile || null,
			contact_email: body.contact_email || null,
			website: body.website || null,
			social_facebook: body.social_facebook || null,
			social_instagram: body.social_instagram || null,
			sanitary_license: body.sanitary_license || null,
			liability_insurance_number: body.liability_insurance_number || null,
			offices_count: body.offices_count || 0,
			has_cashea: body.has_cashea !== undefined ? Boolean(body.has_cashea) : false,
			office_id: body.office_id || null,
			updated_at: new Date().toISOString(),
		};

		// Agregar campos JSON si existen
		if (body.specialties !== undefined) {
			dataToSave.specialties = body.specialties 
				? (typeof body.specialties === 'string' ? body.specialties : JSON.stringify(body.specialties))
				: null;
		}

		if (body.opening_hours !== undefined) {
			dataToSave.opening_hours = body.opening_hours 
				? (typeof body.opening_hours === 'string' ? body.opening_hours : JSON.stringify(body.opening_hours))
				: null;
		}

		if (body.capacity_per_day !== undefined) {
			dataToSave.capacity_per_day = body.capacity_per_day || null;
		}

		if (body.location !== undefined) {
			dataToSave.location = body.location 
				? (typeof body.location === 'string' ? body.location : JSON.stringify(body.location))
				: null;
		}

		if (body.photos !== undefined) {
			dataToSave.photos = body.photos 
				? (typeof body.photos === 'string' ? body.photos : JSON.stringify(body.photos))
				: null;
		}

		if (body.profile_photo !== undefined) {
			dataToSave.profile_photo = body.profile_photo || null;
		}

		let result;
		if (existingCheck.data) {
			// Actualizar registro existente
			const { id, ...updates } = dataToSave;
			let updateQuery = supabase
				.from(cpFetch.name)
				.update(updates)
				.eq('organization_id', orgId);
			
			if (body.office_id) {
				updateQuery = updateQuery.eq('office_id', body.office_id);
			} else {
				updateQuery = updateQuery.is('office_id', null);
			}

			result = await updateQuery.select('*').single();
		} else {
			// Crear nuevo registro
			result = await supabase
				.from(cpFetch.name)
				.insert(dataToSave)
				.select('*')
				.single();
		}

		if (result.error) {
			console.error('Error guardando clinic_profile:', result.error);
			console.error('Datos intentados:', JSON.stringify(dataToSave, null, 2));
			return NextResponse.json({ 
				error: 'Error al guardar la información.',
				details: result.error.message 
			}, { status: 500 });
		}

		// crear invites extras si aplica
		if (body.extraInvites && Number(body.extraInvites) > 0) {
			const inviteFetch = await tryFromVariants(supabase, INVITE_VARIANTS, '*');
			if (inviteFetch.name) {
				const inserts = Array.from({ length: Number(body.extraInvites) }).map(() => ({
					organizationId: orgId,
					token: crypto.randomUUID(),
					expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
					role: 'MEDICO',
					invitedById: authenticatedUser.userId,
				}));
				const ins = await supabase.from(inviteFetch.name).insert(inserts);
				if (ins.error) console.warn('Error creando invites:', ins.error);
			} else {
				console.warn('No se encontró tabla Invite para crear invitaciones.');
			}
		}

		return NextResponse.json(result.data);
	} catch (error: any) {
		console.error('Error en PATCH /api/clinic/profile:', error);
		return NextResponse.json({ error: 'Error al actualizar la información.' }, { status: 500 });
	}
}
