/**
 * Helper para autenticación de usuarios de roles internos (Client-side)
 */

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
 * Obtiene la sesión del usuario de rol desde el servidor (usando API)
 */
export async function getRoleUserSession(): Promise<RoleUserSession | null> {
	try {
		const res = await fetch('/api/role-users/login', {
			credentials: 'include',
		});

		if (!res.ok) {
			return null;
		}

		const data = await res.json();
		if (!data.authenticated || !data.user) {
			return null;
		}

		// Transformar la respuesta de la API al formato RoleUserSession
		return {
			roleUserId: data.user.id,
			roleId: data.user.role.id,
			organizationId: data.user.organizationId,
			firstName: data.user.firstName,
			lastName: data.user.lastName,
			identifier: data.user.identifier,
			roleName: data.user.role.name,
			permissions: data.user.permissions || [],
		};
	} catch (err) {
		console.error('[Role User Auth Client] Error obteniendo sesión:', err);
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

