// lib/auth-guards.ts
// Guards de autenticación y autorización para proteger rutas y APIs

import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { NextResponse } from 'next/server';

export type UserRole = 'ADMIN' | 'CLINICA' | 'MEDICO' | 'FARMACIA' | 'PACIENTE';

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
		const { supabase } = createSupabaseServerClient(cookieStore);

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

		// Obtener usuario de la app
		const { data: appUser, error: userError } = await supabase
			.from('User')
			.select('id, email, role, organizationId, patientProfileId')
			.eq('authId', user.id)
			.maybeSingle();

		if (userError) {
			console.error('[Auth Guard] Error obteniendo usuario de la app:', userError);
			return null;
		}

		if (!appUser) {
			console.warn('[Auth Guard] No se encontró usuario en la tabla User para authId:', user.id);
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
 * Restaura la sesión desde cookies
 */
export async function tryRestoreSessionFromCookies(supabase: SupabaseClient, cookieStore: CookieStore): Promise<boolean> {
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
				const getNestedValue = (obj: Record<string, unknown>, ...paths: string[]): string | null => {
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
						if (typeof current === 'string') return current;
					}
					return null;
				};

				if (name === 'sb-session') {
					access_token = getNestedValue(parsed, 'access_token', 'session.access_token', 'currentSession.access_token');
					refresh_token = getNestedValue(parsed, 'refresh_token', 'session.refresh_token', 'currentSession.refresh_token');
				} else {
					access_token = getNestedValue(parsed, 'access_token', 'currentSession.access_token', 'current_session.access_token');
					refresh_token = getNestedValue(parsed, 'refresh_token', 'currentSession.refresh_token', 'current_session.refresh_token');
					
					// Algunos formatos guardan en currentSession como objeto
					if (!access_token && parsed?.currentSession && typeof parsed.currentSession === 'object') {
						const cs = parsed.currentSession as Record<string, unknown>;
						access_token = (cs.access_token as string) || null;
						refresh_token = (cs.refresh_token as string) || null;
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

			// Intentar setSession primero
			const sessionPayload: { access_token: string; refresh_token?: string } = {
				access_token: access_token || '',
			};
			if (refresh_token) {
				sessionPayload.refresh_token = refresh_token;
			}

			const { data, error } = await supabase.auth.setSession(sessionPayload);
			if (error) {
				// Si solo tenemos refresh_token y falla setSession, intentar refreshSession
				if (refresh_token && !access_token) {
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

			// Verificar si la sesión está disponible después de setSession
			const { data: sessionAfter } = await supabase.auth.getSession();
			if (sessionAfter?.session) return true;
		} catch (err) {
			// Continuar con la siguiente cookie si hay error
			continue;
		}
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
	'/dashboard/clinic': ['ADMIN', 'CLINICA'],
	'/dashboard/medic': ['MEDICO'],
	'/dashboard/pharmacy': ['FARMACIA'],
	'/dashboard/patient': ['PACIENTE'],
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

