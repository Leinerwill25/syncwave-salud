import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getRoleUserSessionFromServer } from '@/lib/role-user-auth';

// GET: Obtener lista de usuarios disponibles para iniciar conversación
export async function GET(req: NextRequest) {
	try {
		const supabase = await createSupabaseServerClient();

		// Intentar obtener sesión de role-user primero
		let currentUserId: string | null = null;
		let currentUserType: 'user' | 'role_user' = 'user';
		let organizationId: string | null = null;

		try {
			const roleUserSession = await getRoleUserSessionFromServer();
			if (roleUserSession) {
				currentUserId = roleUserSession.roleUserId;
				currentUserType = 'role_user';
				organizationId = roleUserSession.organizationId;
			}
		} catch {
			// No es role-user
		}

		// Si no es role-user, obtener usuario regular
		if (!currentUserId) {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
			}

			const { data: appUser } = await supabase.from('User').select('id, organizationId').eq('authId', user.id).maybeSingle();

			if (!appUser) {
				return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
			}

			currentUserId = appUser.id;
			currentUserType = 'user';
			organizationId = appUser.organizationId;
		}

		if (!organizationId) {
			return NextResponse.json({ error: 'No se pudo determinar la organización' }, { status: 400 });
		}

		const users: Array<{ id: string; type: 'user' | 'role_user'; name: string }> = [];

		// Obtener doctores de la organización
		if (currentUserType === 'role_user') {
			// Role-users pueden ver doctores
			const { data: doctors } = await supabase.from('User').select('id, name, role').eq('"organizationId"', organizationId).eq('role', 'MEDICO');

			if (doctors && Array.isArray(doctors)) {
				doctors.forEach((doc: any) => {
					users.push({
						id: doc.id,
						type: 'user',
						name: doc.name || `Doctor (${doc.role})`,
					});
				});
			}
		} else {
			// Doctores pueden ver otros doctores y role-users
			// Otros doctores
			const { data: otherDoctors } = await supabase.from('User').select('id, name, role').eq('"organizationId"', organizationId).eq('role', 'MEDICO').neq('id', currentUserId);

			if (otherDoctors && Array.isArray(otherDoctors)) {
				otherDoctors.forEach((doc: any) => {
					users.push({
						id: doc.id,
						type: 'user',
						name: doc.name || `Doctor (${doc.role})`,
					});
				});
			}

			// Role-users de la organización (todos, sin excluir)
			const { data: roleUsers, error: roleUsersError } = await supabase.from('consultorio_role_users').select('id, first_name, last_name, consultorio_roles(role_name)').eq('organization_id', organizationId);

			console.log('[Messaging API] Role-users obtenidos:', roleUsers?.length || 0, 'Error:', roleUsersError);

			if (roleUsersError) {
				console.error('[Messaging API] Error obteniendo role-users:', roleUsersError);
			}

			if (roleUsers && Array.isArray(roleUsers)) {
				roleUsers.forEach((ru: any) => {
					// Construir nombre completo desde first_name y last_name
					const fullName = [ru.first_name, ru.last_name].filter(Boolean).join(' ').trim();
					const roleName = ru.consultorio_roles?.role_name || null;
					users.push({
						id: ru.id,
						type: 'role_user',
						name: fullName || roleName || 'Usuario',
					});
				});
			}
		}

		return NextResponse.json({ success: true, users }, { status: 200 });
	} catch (err: any) {
		console.error('[Messaging API] Error:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}
