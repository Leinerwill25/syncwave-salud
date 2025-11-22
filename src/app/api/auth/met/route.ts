// src/app/api/auth/met/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import createSupabaseServerClient from '@/app/adapters/server';

/**
 * Helper: intenta reconstruir sesión a partir de cookies conocidas.
 * Retorna true si logró setear sesión en el cliente.
 */
async function tryRestoreSessionFromCookies(supabase: any, cookieStore: any): Promise<boolean> {
	if (!cookieStore) return false;

	const tried: string[] = [];
	const cookieCandidates = ['sb-session', 'sb:token', 'supabase-auth-token', 'sb-access-token', 'sb-refresh-token'];

	for (const name of cookieCandidates) {
		tried.push(name);
		try {
			const c = typeof cookieStore.get === 'function' ? cookieStore.get(name) : undefined;
			const raw = c?.value ?? null;
			if (!raw) continue;

			// Intentar parsear JSON primero
			let parsed: any = null;
			try {
				parsed = JSON.parse(raw);
			} catch {
				parsed = null;
			}

			let access_token: string | null = null;
			let refresh_token: string | null = null;

			if (parsed) {
				// buscar access/refresh en varias rutas
				access_token = parsed?.access_token ?? parsed?.currentSession?.access_token ?? parsed?.current_session?.access_token ?? null;
				refresh_token = parsed?.refresh_token ?? parsed?.currentSession?.refresh_token ?? parsed?.current_session?.refresh_token ?? null;

				// algunos formatos guardan en currentSession
				if (!access_token && parsed?.currentSession && typeof parsed.currentSession === 'object') {
					access_token = parsed.currentSession.access_token ?? null;
					refresh_token = parsed.currentSession.refresh_token ?? null;
				}
			} else {
				// no JSON: puede ser sólo el access token
				if (name === 'sb-access-token') {
					access_token = raw;
				} else if (name === 'sb-refresh-token') {
					refresh_token = raw;
				}
			}

			if (!access_token && !refresh_token) continue;

			// Llamamos a setSession para que supabase-js tenga la sesión en memoria
			const payload: any = {};
			if (access_token) payload.access_token = access_token;
			if (refresh_token) payload.refresh_token = refresh_token;

			const { data, error } = await supabase.auth.setSession(payload);
			if (error) {
				console.debug(`[auth/met] Intento de setSession desde cookie "${name}" fallo:`, error.message);
				continue;
			}

			if (data?.session) {
				console.debug(`[auth/met] Sesión restaurada desde cookie "${name}"`);
				return true;
			}

			// si setSession no devolvió session, intentar getSession luego de setSession igualmente
			const { data: sessionAfter } = await supabase.auth.getSession();
			if (sessionAfter?.session) {
				console.debug(`[auth/met] Sesión disponible luego de setSession (cookie: "${name}")`);
				return true;
			}
		} catch (err: any) {
			console.debug(`[auth/met] Error procesando cookie "${name}":`, err?.message ?? String(err));
			continue;
		}
	}

	return false;
}

/**
 * Devuelve el id de la tabla User (app user) mapeado desde auth user id (authId).
 * También devuelve organizationId y organizationName si están disponibles.
 */
export async function GET(req: NextRequest) {
	try {
		// 1) Obtener cookieStore (como /api/dashboard/medic/kpis)
		const cookieStore = await cookies();

		// 2) Crear cliente Supabase pasando el cookieStore
		const { supabase } = createSupabaseServerClient(cookieStore);

		// 3) Intentar obtener la sesión normalmente
		let { data: sessionData, error: sessionError } = await supabase.auth.getSession();

		// 4) Si session es null — intentamos reconstruir desde las cookies como fallback
		if (!sessionData?.session) {
			const restored = await tryRestoreSessionFromCookies(supabase, cookieStore);
			if (restored) {
				// reconsultar sesión
				const after = await supabase.auth.getSession();
				sessionData = after.data ?? after;
				sessionError = after.error ?? sessionError;
			}
		}

		// 5) Obtener usuario de la sesión o intentar getUser()
		let authUser = null;
		if (sessionData?.session?.user) {
			authUser = sessionData.session.user;
		} else {
			// Fallback: intentar obtener token del header Authorization
			const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
			const token = authHeader.replace('Bearer ', '').trim();

			if (token) {
				const { data: userData, error: userErr } = await supabase.auth.getUser(token);
				if (!userErr && userData?.user) {
					authUser = userData.user;
				}
			} else {
				// Último intento: getUser() sin parámetros
				const { data: userData, error: userErr } = await supabase.auth.getUser();
				if (!userErr && userData?.user) {
					authUser = userData.user;
				}
			}
		}

		if (!authUser) {
			console.warn('/api/auth/met: No se pudo obtener usuario autenticado');
			return NextResponse.json({ error: 'No hay sesión activa' }, { status: 401 });
		}

		// 5) Buscar el perfil en la tabla User usando authId
		const { data: appUser, error: appUserErr } = await supabase.from('User').select('id, organizationId').eq('authId', authUser.id).maybeSingle();

		if (appUserErr) {
			console.error('/api/auth/met error buscando User por authId:', appUserErr);
			return NextResponse.json({ error: 'Error interno' }, { status: 500 });
		}

		if (!appUser) {
			// No existe perfil en tabla User para el auth user
			return NextResponse.json({ error: 'Perfil de aplicación no encontrado para el usuario autenticado' }, { status: 401 });
		}

		// 6) Opcional: intentar obtener nombre de la organización
		let orgName: string | null = null;
		if (appUser.organizationId) {
			const { data: org, error: orgErr } = await supabase.from('Organization').select('name').eq('id', appUser.organizationId).maybeSingle();
			if (!orgErr && org) orgName = (org as any).name ?? null;
		}

		return NextResponse.json({
			id: appUser.id, // <-- ESTE es el id de la tabla User (app user)
			email: authUser.email ?? null,
			organizationId: appUser.organizationId ?? null,
			organizationName: orgName,
		});
	} catch (err) {
		console.error('/api/auth/met error', err);
		return NextResponse.json({ error: 'Error interno' }, { status: 500 });
	}
}
