// app/api/clinic/profile/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';

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

const PLAN_VARIANTS = ['Plan', 'plan', '"Plan"', '"public"."Plan"'];
const ORG_VARIANTS = ['Organization', 'organization', '"Organization"', '"public"."Organization"'];
const USER_VARIANTS = ['User', 'user', '"User"', '"public"."User"'];
const SUBS_VARIANTS = ['Subscription', 'subscription', '"Subscription"', '"public"."Subscription"'];
const INVITE_VARIANTS = ['Invite', 'invite', '"Invite"', '"public"."Invite"'];
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
		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		// Intentar restaurar sesión desde cookies
		let { data: { user }, error: userError } = await supabase.auth.getUser();
		
		if (userError || !user) {
			// Intentar restaurar sesión desde cookies
			const restored = await tryRestoreSessionFromCookies(supabase, cookieStore);
			if (restored) {
				const after = await supabase.auth.getUser();
				user = after.data?.user ?? null;
				userError = after.error ?? null;
			}
		}

		if (userError || !user) {
			console.error('auth.getUser error', userError);
			return NextResponse.json({ error: 'Usuario no autenticado.' }, { status: 401 });
		}

		// Detectar tabla User y validar existencia
		const userFetch = await tryFromVariants(supabase, USER_VARIANTS, 'id, organizationId, authId, email');
		if (!userFetch.name) {
			console.error('No se encontró tabla User en variantes probadas.');
			return NextResponse.json({ error: 'No se pudo leer la tabla de usuarios.' }, { status: 500 });
		}

		// --------------- Buscar el registro del usuario ----------------
		// Intento 1: buscar por authId (campo authId en tu tabla User)
		const qAuth = await supabase.from(userFetch.name).select('id, organizationId, authId, email').eq('authId', user.id).maybeSingle();
		let userRecord: { id: string; organizationId?: string | null; authId?: string | null; email?: string | null } | null = null;
		if (!qAuth.error && qAuth.data) {
			userRecord = qAuth.data;
		} else {
			// Fallback por email en la tabla User
			const qEmail = await supabase.from(userFetch.name).select('id, organizationId, authId, email').eq('email', user.email).maybeSingle();
			if (!qEmail.error && qEmail.data) {
				userRecord = qEmail.data;
			}
		}

		if (!userRecord) {
			console.error('No se encontró registro User para authId/email.');
			return NextResponse.json({ error: 'No se encontró la organización del usuario.' }, { status: 404 });
		}

		const orgId = userRecord.organizationId;
		if (!orgId) return NextResponse.json({ error: 'El usuario no está asignado a una organización.' }, { status: 404 });

		// ---------------- clinic_profile ----------------
		let clinicProfile: any = null;
		const cpFetch = await tryFromVariants(supabase, CLINIC_PROFILE_VARIANTS, '*');
		if (cpFetch.name) {
			const cpQ = await supabase.from(cpFetch.name).select('*').eq('organization_id', orgId).maybeSingle();
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
						clinicProfile.photos = JSON.parse(clinicProfile.photos);
					} catch {
						// Si no es JSON válido, dejarlo como está
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
		const uQ = await supabase.from(userFetch.name).select('id', { count: 'exact', head: true }).eq('organizationId', orgId);
		if (!uQ.error) usersCount = uQ.count ?? 0;

		let appointmentsCount = 0;
		const aQ = await supabase.from('appointment').select('id', { count: 'exact', head: true }).eq('organization_id', orgId);
		if (!aQ.error) appointmentsCount = aQ.count ?? 0;

		const specialistCount = orgData?.specialistCount ?? 0;
		const storagePerSpecialistMB = clinicProfile?.storagePerSpecialistMB ?? clinicProfile?.capacity_per_day ?? 500;

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
			storagePerSpecialistMB,
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
		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);
		const body = await req.json();

		// Intentar restaurar sesión desde cookies
		let { data: { user }, error: userError } = await supabase.auth.getUser();
		
		if (userError || !user) {
			// Intentar restaurar sesión desde cookies
			const restored = await tryRestoreSessionFromCookies(supabase, cookieStore);
			if (restored) {
				const after = await supabase.auth.getUser();
				user = after.data?.user ?? null;
				userError = after.error ?? null;
			}
		}

		if (userError || !user) {
			return NextResponse.json({ error: 'Usuario no autenticado.' }, { status: 401 });
		}

		// validar existencia tabla User
		const userFetch = await tryFromVariants(supabase, USER_VARIANTS, 'id, organizationId, authId, email');
		if (!userFetch.name) return NextResponse.json({ error: 'No se pudo leer la tabla de usuarios.' }, { status: 500 });

		// Buscar user record por authId, fallback por email
		const qAuth = await supabase.from(userFetch.name).select('id, organizationId, authId, email').eq('authId', user.id).maybeSingle();
		let userRecord: { id: string; organizationId?: string | null } | null = null;
		if (!qAuth.error && qAuth.data) {
			userRecord = qAuth.data;
		} else {
			const qEmail = await supabase.from(userFetch.name).select('id, organizationId, authId, email').eq('email', user.email).maybeSingle();
			if (!qEmail.error && qEmail.data) userRecord = qEmail.data;
		}

		if (!userRecord) return NextResponse.json({ error: 'No se encontró la organización del usuario.' }, { status: 404 });

		const orgId = userRecord.organizationId;
		if (!orgId) return NextResponse.json({ error: 'El usuario no está asignado a una organización.' }, { status: 404 });

		// encontrar tabla clinic_profile
		const cpFetch = await tryFromVariants(supabase, CLINIC_PROFILE_VARIANTS, '*');
		if (!cpFetch.name) return NextResponse.json({ error: 'No se encontró la tabla clinic_profile.' }, { status: 500 });

		const updates: any = {
			legal_name: body.legal_name,
			trade_name: body.trade_name,
			address_operational: body.address_operational,
			phone_fixed: body.phone_fixed,
			phone_mobile: body.phone_mobile,
			contact_email: body.contact_email,
			website: body.website,
			offices_count: body.offices_count,
			specialties: body.specialties,
			storagePerSpecialistMB: body.storagePerSpecialistMB ?? 500,
			updated_at: new Date().toISOString(),
		};

		// Agregar location (coordenadas de Google Maps) si existe
		if (body.location) {
			updates.location = typeof body.location === 'string' ? body.location : JSON.stringify(body.location);
		}

		// Agregar photos si existe
		if (body.photos) {
			updates.photos = typeof body.photos === 'string' ? body.photos : JSON.stringify(body.photos);
		}

		// Agregar profile_photo si existe
		if (body.profile_photo) {
			updates.profile_photo = body.profile_photo;
		}

		const updateRes = await supabase.from(cpFetch.name).update(updates).eq('organization_id', orgId).select('*').maybeSingle();
		if (updateRes.error) {
			console.error('Error actualizando clinic_profile:', updateRes.error);
			return NextResponse.json({ error: 'Error al actualizar la información.' }, { status: 500 });
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
					invitedById: userRecord!.id,
				}));
				const ins = await supabase.from(inviteFetch.name).insert(inserts);
				if (ins.error) console.warn('Error creando invites:', ins.error);
			} else {
				console.warn('No se encontró tabla Invite para crear invitaciones.');
			}
		}

		return NextResponse.json(updateRes.data);
	} catch (error: any) {
		console.error('Error en PATCH /api/clinic/profile:', error);
		return NextResponse.json({ error: 'Error al actualizar la información.' }, { status: 500 });
	}
}
