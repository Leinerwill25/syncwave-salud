// lib/auth-guards.ts
// Guards de autenticación y autorización para proteger rutas y APIs

import { cookies, headers } from 'next/headers';
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
		const headerStore = await headers();
		let supabase = await createSupabaseServerClient();
		
		// 1. Intentar obtener token desde el header Authorization (más confiable para fetch)
		const authHeader = headerStore.get('authorization') || headerStore.get('Authorization');
		let token: string | null = null;
		if (authHeader?.startsWith('Bearer ')) {
			token = authHeader.split(' ')[1];
		}

		// 2. Si no hay header, buscar en cookies de forma exhaustiva
		if (!token) {
			const allCookies = cookieStore.getAll();
			for (const cookie of allCookies) {
				const value = cookie.value;
				if (!value) continue;

				// Caso A: Cookie de token directo (sb-access-token)
				if (cookie.name.includes('access-token')) {
					token = value;
					break;
				}

				// Caso B: Objeto JSON (supabase-auth-token, sb:token, etc.)
				try {
					const parsed = JSON.parse(value);
					const extracted = parsed?.access_token || parsed?.currentSession?.access_token || parsed?.session?.access_token;
					if (extracted) {
						token = extracted;
						break;
					}
				} catch {
					// No es JSON, ignorar
				}
			}
		}

		// 3. Validar el token con Supabase
		let user: any = null;
		if (token) {
			const { data: { user: userData }, error } = await supabase.auth.getUser(token);
			if (!error && userData) {
				user = userData;
			}
		}

		// 4. Fallback: getSession estándar si no hay token explícito o falló getUser(token)
		if (!user) {
			const { data: { session } } = await supabase.auth.getSession();
			user = session?.user || null;
		}

		// 5. Último intento: getUser() sin argumentos (por si el adapter tiene su propio estado)
		if (!user) {
			const { data: { user: userData } } = await supabase.auth.getUser();
			user = userData;
		}

		if (!user) {
			console.warn('[Auth Guard] No se pudo obtener usuario autenticado');
			return null;
		}

		// 6. Buscar el usuario en la base de datos de la aplicación
		const tableCandidates = ['users', 'user'];
		let appUser: any = null;

		for (const tableName of tableCandidates) {
			const { data, error } = await supabase
				.from(tableName)
				.select('id, email, role, organizationId, patientProfileId')
				.eq('authId', user.id)
				.maybeSingle();

			if (!error && data) {
				appUser = data;
				break;
			}
			
			if (user.email) {
				const { data: byEmail } = await supabase
					.from(tableName)
					.select('id, email, role, organizationId, patientProfileId')
					.eq('email', user.email)
					.maybeSingle();
				
				if (byEmail) {
					appUser = byEmail;
					break;
				}
			}
		}

		if (!appUser) {
			console.warn('[Auth Guard] Usuario no encontrado en BD para authId:', user.id);
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
		console.error('[Auth Guard] Error catastrófico:', err);
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

