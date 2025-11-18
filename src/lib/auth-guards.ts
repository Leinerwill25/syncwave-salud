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

		// Intentar obtener usuario desde la sesión
		let { data: { user }, error: authError } = await supabase.auth.getUser();

		// Si falla, intentar restaurar desde cookies
		if (authError || !user) {
			const restored = await tryRestoreSessionFromCookies(supabase, cookieStore);
			if (restored) {
				const after = await supabase.auth.getUser();
				user = after.data?.user ?? null;
			}
		}

		if (!user) {
			return null;
		}

		// Obtener usuario de la app
		const { data: appUser, error: userError } = await supabase
			.from('User')
			.select('id, email, role, organizationId, patientProfileId')
			.eq('authId', user.id)
			.maybeSingle();

		if (userError || !appUser) {
			console.error('[Auth Guard] Error obteniendo usuario:', userError);
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
	} catch (err: any) {
		console.error('[Auth Guard] Error:', err);
		return null;
	}
}

/**
 * Restaura la sesión desde cookies
 */
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
				} else {
					access_token = parsed?.access_token ?? parsed?.currentSession?.access_token ?? null;
					refresh_token = parsed?.refresh_token ?? parsed?.currentSession?.refresh_token ?? null;
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

			const { data: sessionAfter } = await supabase.auth.getSession();
			if (sessionAfter?.session) return true;
		} catch {
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
export async function apiRequireAuth(): Promise<{ user: AuthenticatedUser; response?: NextResponse }> {
	const user = await getAuthenticatedUser();
	if (!user) {
		return {
			user: null as any,
			response: NextResponse.json({ error: 'No autenticado' }, { status: 401 }),
		};
	}
	return { user };
}

/**
 * Guard para APIs - retorna NextResponse con error si no tiene el rol correcto
 */
export async function apiRequireRole(allowedRoles: UserRole[]): Promise<{ user: AuthenticatedUser; response?: NextResponse }> {
	const authResult = await apiRequireAuth();
	if (authResult.response) return authResult;

	const user = authResult.user;
	if (!allowedRoles.includes(user.role)) {
		return {
			user: null as any,
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

