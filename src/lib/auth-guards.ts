// lib/auth-guards.ts
// Guards de autenticación y autorización para proteger rutas y APIs

import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { NextResponse } from 'next/server';

export type UserRole = 'ADMIN' | 'MEDICO' | 'ENFERMERA' | 'ENFERMERO' | 'RECEPCION' | 'FARMACIA' | 'PACIENTE' | 'LABORATORIO';

export interface AuthenticatedUser {
	authId: string;
	userId: string;
	email: string;
	role: UserRole;
	organizationId?: string | null;
	patientProfileId?: string | null;
}

/**
 * Obtiene el usuario autenticado desde la sesión
 * Retorna null si no está autenticado
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
	try {
		const cookieStore = await cookies();
		let supabase = await createSupabaseServerClient();
		
		// Fix defensivo: asegurar que supabase no sea una promesa pendiente (por si acaso)
		if (supabase && typeof (supabase as any).then === 'function') {
			supabase = await (supabase as any);
		}

		if (!supabase || !supabase.auth) {
			console.error('[Auth Guard] CRITICAL: Supabase client is invalid or missing auth!', { 
				type: typeof supabase, 
				hasAuth: !!supabase?.auth,
				keys: supabase ? Object.keys(supabase) : [] 
			});
			// Intentar recuperar creando un cliente básico si falla el adapter (fallback de emergencia)
			// Esto ayuda si el problema es cookies() o algo en el adapter
			if (!supabase?.auth) {
				const { createClient } = await import('@supabase/supabase-js');
				supabase = createClient(
					process.env.NEXT_PUBLIC_SUPABASE_URL!,
					process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
				) as any;
			}
		}

		// Intentar obtener sesión primero

		let { data: sessionData, error: sessionError } = await supabase.auth.getSession();

		// Si no hay sesión, intentar restaurar desde cookies
		if (!sessionData?.session) {
			const restored = await tryRestoreSessionFromCookies(supabase as unknown as SupabaseClient, cookieStore);
			if (restored) {
				const after = await supabase.auth.getSession();
				sessionData = after.data ?? after;
				sessionError = after.error ?? sessionError;
			}
		}

		// Obtener usuario de la sesión o intentar getUser()
		let user = sessionData?.session?.user || null;

		// Si no hay usuario en la sesión, intentar getUser()
		if (!user) {
			const { data: { user: userData }, error: authError } = await supabase.auth.getUser();
			if (!authError && userData) {
				user = userData;
			}
		}

		// Si aún no hay usuario, intentar restaurar desde cookies nuevamente y luego getUser()
		if (!user) {
			const restored = await tryRestoreSessionFromCookies(supabase as unknown as SupabaseClient, cookieStore);
			if (restored) {
				// Intentar getSession después de restaurar
				const afterSession = await supabase.auth.getSession();
				if (afterSession.data?.session?.user) {
					user = afterSession.data.session.user;
				} else {
					// Si aún no hay usuario, intentar getUser()
					const afterUser = await supabase.auth.getUser();
					user = afterUser.data?.user ?? null;
				}
			}
		}

		if (!user) {
			console.warn('[Auth Guard] No se pudo obtener usuario autenticado después de todos los intentos');
			return null;
		}

		// Obtener usuario de la app - usar nombres robustos
		const tableCandidates = ['users', 'user', '"users"', '"user"', '"User"', 'User'];
		let appUser: any = null;
		let lastError: any = null;
		let usedTableName: string | null = null;

		// Verificar sesión antes de consultar - CRÍTICO para que RLS funcione
		const { data: sessionCheck } = await supabase.auth.getSession();
		
		// Si no hay sesión activa, intentar restaurar antes de consultar
		if (!sessionCheck?.session) {
			console.warn('[Auth Guard] No hay sesión activa antes de consultar, intentando restaurar...');
			await tryRestoreSessionFromCookies(supabase as unknown as SupabaseClient, cookieStore);
		}

		// Verificar que tenemos una sesión activa antes de consultar (necesaria para RLS)
		const { data: finalSessionCheck } = await supabase.auth.getSession();
		if (!finalSessionCheck?.session) {
			console.error('[Auth Guard] CRITICAL: No hay sesión activa. Las políticas RLS requerirán auth.uid() que será NULL.');
			console.error('[Auth Guard] Esto causará que la consulta sea bloqueada por RLS.');
		}

		for (const tableName of tableCandidates) {
			try {
				const { data, error } = await supabase
					.from(tableName === 'User' ? 'user' : tableName)
					.select('id, email, role, organizationId, patientProfileId')
					.eq('authId', user.id)
					.maybeSingle();

				if (error) {
					lastError = error;
					// Si es error de tabla no encontrada, probar siguiente candidato
					if (String(error?.code) === 'PGRST205' || String(error?.message).includes('Could not find the table')) {
						continue;
					}
					// Si es error de permisos RLS, el usuario existe pero no podemos verlo sin sesión
					// En este punto, no podemos hacer mucho más
					continue;
				}

				if (data) {
					appUser = data;
					usedTableName = tableName;
					break;
				}
			} catch (err: any) {
				continue;
			}
		}

		// Fallback: buscar por email si no se encontró por authId (esto ayuda si el authId está desincronizado)
		if (!appUser) {
			for (const tableName of ['users', 'user']) {
				try {
					const { data } = await supabase.from(tableName).select('id, email, role, organizationId, patientProfileId, authId').eq('email', user.email).maybeSingle();
					if (data) {
						appUser = data;
						// Si encontramos por email pero el authId era diferente o nulo, podríamos actualizarlo,
						// pero aquí solo lo usamos para autenticar
						break;
					}
				} catch { continue; }
			}
		}

		if (!appUser) {
			console.warn('[Auth Guard] Usuario no encontrado en BD para authId:', user.id, 'email:', user.email);
			return null;
		}

		return {
			authId: user.id,
			userId: appUser.id,
			email: appUser.email,
			role: appUser.role as UserRole,
			organizationId: appUser.organizationId,
			patientProfileId: appUser.patientProfileId,
		};
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Auth Guard] Error:', errorMessage, err);
		// Retornar null solo en errores fatales
		return null;
	}
}

interface CookieStore {
	get?: (name: string) => { value?: string } | undefined;
}

interface SupabaseClient {
	auth: {
		getUser: () => Promise<{ data: { user: { id: string } | null }; error: Error | null }>;
		getSession: () => Promise<{ data: { session: { access_token: string; refresh_token: string } | null } }>;
		setSession: (payload: { access_token: string; refresh_token: string }) => Promise<{ data: { session: { access_token: string; refresh_token: string } | null } | null; error: Error | null }>;
		refreshSession: (payload: { refresh_token: string }) => Promise<{ data: { session: { access_token: string; refresh_token: string } | null } | null; error: Error | null }>;
	};
}

/**
 * Restaura la sesión desde cookies - Versión ultra-robusta para producción
 */
export async function tryRestoreSessionFromCookies(supabase: SupabaseClient, cookieStore: any): Promise<boolean> {
	if (!cookieStore) return false;

	try {
		// 1. Obtener todas las cookies para buscar por prefijo dinámico
		const allCookies = typeof cookieStore.getAll === 'function' ? cookieStore.getAll() : [];
		
		// 2. Identificar cookies candidatas (formato estándar de Supabase SSR)
		// Supabase suele usar sb-<project-id>-auth-token o sb-access-token / sb-refresh-token
		const candidates = allCookies.filter((c: any) => 
			c.name.includes('auth-token') || 
			c.name.includes('sb-') || 
			c.name.includes('supabase-')
		);

		for (const cookie of candidates) {
			const rawValue = cookie.value;
			if (!rawValue) continue;

			let access_token: string | null = null;
			let refresh_token: string | null = null;

			// Intentar parsear como JSON (muchos formatos de Supabase guardan un objeto)
			try {
				const parsed = JSON.parse(rawValue);
				access_token = parsed?.access_token || parsed?.currentSession?.access_token || parsed?.session?.access_token;
				refresh_token = parsed?.refresh_token || parsed?.currentSession?.refresh_token || parsed?.session?.refresh_token;
			} catch {
				// Si no es JSON, ver si es el token directo (pasa con sb-access-token)
				if (cookie.name.includes('access-token')) access_token = rawValue;
				if (cookie.name.includes('refresh-token')) refresh_token = rawValue;
			}

			if (access_token && refresh_token) {
				const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
				if (!error && data?.session) return true;
			} else if (refresh_token) {
				const { data, error } = await supabase.auth.refreshSession({ refresh_token });
				if (!error && data?.session) return true;
			}
		}

		// 3. Intento secundario: Si no funcionó lo anterior, probar con los nombres fijos clásicos
		const fixedNames = ['sb-session', 'sb:token', 'supabase-auth-token', 'sb-access-token', 'sb-refresh-token'];
		for (const name of fixedNames) {
			const c = typeof cookieStore.get === 'function' ? cookieStore.get(name) : undefined;
			if (!c?.value) continue;
			
			try {
				const parsed = JSON.parse(c.value);
				const at = parsed?.access_token || parsed?.currentSession?.access_token;
				const rt = parsed?.refresh_token || parsed?.currentSession?.refresh_token;
				if (at && rt) {
					const { data, error } = await supabase.auth.setSession({ access_token: at, refresh_token: rt });
					if (!error && data?.session) return true;
				}
			} catch {
				// ignore
			}
		}
	} catch (err) {
		console.error('[Auth Guard] Error catastrófico restaurando sesión:', err);
	}

	return false;
}

/**
 * Guard que requiere autenticación
 * Retorna el usuario autenticado o null
 */
export async function requireAuth(): Promise<AuthenticatedUser | null> {
	const user = await getAuthenticatedUser();
	return user;
}

/**
 * Guard que requiere un rol específico
 * Retorna el usuario si tiene el rol correcto, null si no
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<AuthenticatedUser | null> {
	const user = await getAuthenticatedUser();
	if (!user) return null;
	if (!allowedRoles.includes(user.role)) return null;
	return user;
}

/**
 * Guard para APIs - retorna NextResponse con error si no está autenticado
 */
export async function apiRequireAuth(): Promise<{ user?: AuthenticatedUser; response?: NextResponse }> {
	const user = await getAuthenticatedUser();
	if (!user) {
		return {
			response: NextResponse.json({ error: 'No autenticado' }, { status: 401 }),
		};
	}
	return { user };
}

/**
 * Guard para APIs - retorna NextResponse con error si no tiene el rol correcto
 */
export async function apiRequireRole(allowedRoles: UserRole[]): Promise<{ user?: AuthenticatedUser; response?: NextResponse }> {
	const authResult = await apiRequireAuth();
	if (authResult.response) return authResult;

	const user = authResult.user;
	if (!user) {
		return {
			response: NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 }),
		};
	}

	if (!allowedRoles.includes(user.role)) {
		return {
			response: NextResponse.json({ error: 'No autorizado - rol incorrecto' }, { status: 403 }),
		};
	}

	return { user };
}

/**
 * Mapeo de rutas a roles permitidos
 */
export const ROUTE_ROLE_MAP: Record<string, UserRole[]> = {
	'/dashboard/clinic': ['ADMIN'],
	'/dashboard/medic': ['MEDICO'],
	'/dashboard/pharmacy': ['FARMACIA'],
	'/dashboard/patient': ['PACIENTE'],
	'/nurse': ['ENFERMERA', 'ENFERMERO'],
};

/**
 * Obtiene los roles permitidos para una ruta
 */
export function getAllowedRolesForRoute(pathname: string): UserRole[] | null {
	for (const [route, roles] of Object.entries(ROUTE_ROLE_MAP)) {
		if (pathname.startsWith(route)) {
			return roles;
		}
	}
	return null;
}

