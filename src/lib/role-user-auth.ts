/**
 * Helper para autenticación de usuarios de roles internos (Server-side only)
 * 
 * Para funciones client-side, usa role-user-auth-client.ts
 */

import { cookies } from 'next/headers';

export interface RoleUserSession {
	roleUserId: string;
	roleId: string;
	organizationId: string;
	firstName: string;
	lastName: string;
	identifier: string;
	roleName: string;
	permissions: Array<{
		id: string;
		module: string;
		permissions: Record<string, boolean>;
	}>;
}

/**
 * Obtiene la sesión del usuario de rol desde el servidor (para API routes y Server Components)
 * 
 * NO usar en Client Components. Para Client Components, usar role-user-auth-client.ts
 */
export async function getRoleUserSessionFromServer(): Promise<RoleUserSession | null> {
	try {
		const cookieStore = await cookies();
		const sessionCookie = cookieStore.get('role-user-session');

		if (!sessionCookie?.value) {
			return null;
		}

		const sessionData = JSON.parse(sessionCookie.value) as RoleUserSession;
		return sessionData;
	} catch (err) {
		console.error('[Role User Auth Server] Error obteniendo sesión del servidor:', err);
		return null;
	}
}

/**
 * Verifica si el usuario de rol tiene permiso para un módulo y acción específica
 */
export function hasRoleUserPermission(
	session: RoleUserSession | null,
	module: string,
	permission: 'view' | 'create' | 'edit' | 'delete' | 'confirm' | 'schedule' | 'cancel'
): boolean {
	if (!session) return false;

	const modulePermission = session.permissions.find((p) => p.module === module);
	if (!modulePermission) return false;

	return modulePermission.permissions[permission] === true;
}

/**
 * Obtiene todos los módulos a los que el usuario de rol tiene acceso
 */
export function getRoleUserAccessibleModules(session: RoleUserSession | null): string[] {
	if (!session) return [];

	return session.permissions
		.filter((p) => p.permissions.view === true || p.permissions.create === true || p.permissions.edit === true)
		.map((p) => p.module);
}

