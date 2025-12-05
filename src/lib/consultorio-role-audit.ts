/**
 * Helper para registrar acciones en el audit log de roles internos
 */

import { getRoleUserSessionFromServer } from './role-user-auth';

interface AuditLogParams {
	organizationId: string;
	roleId?: string;
	roleUserId?: string;
	userFirstName: string;
	userLastName: string;
	userIdentifier: string;
	actionType: 'create' | 'update' | 'delete' | 'view' | 'confirm' | 'schedule' | 'cancel' | 'approve' | 'reject';
	module: 'pacientes' | 'consultas' | 'citas' | 'recetas' | 'ordenes' | 'resultados' | 'mensajes' | 'tareas' | 'reportes' | 'roles';
	entityType: string;
	entityId?: string;
	actionDetails?: Record<string, unknown>;
	ipAddress?: string;
	userAgent?: string;
}

/**
 * Registra una acción en el audit log
 * Esta función puede ser llamada desde el frontend o desde API routes
 */
export async function logConsultorioRoleAction(params: AuditLogParams): Promise<void> {
	try {
		const response = await fetch('/api/medic/roles/audit-log', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify(params),
		});

		if (!response.ok) {
			console.error('[Audit Log] Error registrando acción:', await response.text());
		}
	} catch (err) {
		console.error('[Audit Log] Error:', err);
		// No lanzar error, solo loguear para no interrumpir el flujo principal
	}
}

/**
 * Registra una acción realizada por un usuario de rol
 * Obtiene automáticamente la información de la sesión del usuario de rol
 * Esta función puede ser llamada desde API routes (server-side)
 */
export async function logRoleUserAction(params: {
	actionType: 'create' | 'update' | 'delete' | 'view' | 'confirm' | 'schedule' | 'cancel' | 'approve' | 'reject';
	module: 'pacientes' | 'consultas' | 'citas' | 'recetas' | 'ordenes' | 'resultados' | 'mensajes' | 'tareas' | 'reportes' | 'roles';
	entityType: string;
	entityId?: string;
	actionDetails?: Record<string, unknown>;
}): Promise<void> {
	try {
		// Importar dinámicamente para evitar problemas en client components
		const { getRoleUserSessionFromServer } = await import('./role-user-auth');
		const session = await getRoleUserSessionFromServer();
		
		if (!session) {
			console.warn('[Audit Log] No se pudo obtener sesión de usuario de rol');
			return;
		}

		// Llamar directamente a la API de audit log
		const { cookies } = await import('next/headers');
		const cookieStore = await cookies();
		const { createSupabaseServerClient } = await import('@/app/adapters/server');
		const supabase = await createSupabaseServerClient();

		// Obtener IP y User-Agent del request si es posible
		const ipAddress = 'unknown'; // Se puede obtener del request si se pasa como parámetro
		const userAgent = 'server-side'; // Se puede obtener del request si se pasa como parámetro

		await supabase.from('consultorio_role_audit_log').insert({
			organization_id: session.organizationId,
			role_id: session.roleId,
			role_user_id: session.roleUserId,
			user_first_name: session.firstName,
			user_last_name: session.lastName,
			user_identifier: session.identifier,
			action_type: params.actionType,
			module: params.module,
			entity_type: params.entityType,
			entity_id: params.entityId || null,
			action_details: params.actionDetails || {},
			ip_address: ipAddress,
			user_agent: userAgent,
		});
	} catch (err) {
		console.error('[Audit Log] Error registrando acción de usuario de rol:', err);
		// No lanzar error para no interrumpir el flujo principal
	}
}

