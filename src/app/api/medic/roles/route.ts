import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

// GET: Obtener todos los roles de la organización del médico
export async function GET(request: NextRequest) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();
		if (user.role !== 'MEDICO') {
			return NextResponse.json({ error: 'Acceso denegado: solo médicos' }, { status: 403 });
		}

		if (!user.organizationId) {
			return NextResponse.json({ error: 'Usuario no asociado a una organización' }, { status: 400 });
		}

		// Obtener todos los roles de la organización
		const { data: roles, error: rolesError } = await supabase
			.from('consultorio_roles')
			.select('*')
			.eq('organization_id', user.organizationId)
			.eq('is_active', true)
			.order('created_at', { ascending: false });

		if (rolesError) {
			console.error('[Roles API] Error obteniendo roles:', rolesError);
			return NextResponse.json({ error: 'Error al obtener roles' }, { status: 500 });
		}

		// Para cada rol, obtener usuarios asignados y permisos
		const rolesWithDetails = await Promise.all(
			(roles || []).map(async (role) => {
				// Obtener usuarios del rol
				const { data: roleUsers } = await supabase
					.from('consultorio_role_users')
					.select('*')
					.eq('role_id', role.id)
					.eq('is_active', true)
					.order('created_at', { ascending: false });

				// Obtener permisos del rol
				const { data: permissions } = await supabase
					.from('consultorio_role_permissions')
					.select('*')
					.eq('role_id', role.id)
					.order('module', { ascending: true });

				return {
					...role,
					users: roleUsers || [],
					permissions: permissions || [],
				};
			})
		);

		return NextResponse.json({ success: true, roles: rolesWithDetails });
	} catch (err) {
		console.error('[Roles API] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error interno', detail: errorMessage }, { status: 500 });
	}
}

// POST: Crear un nuevo rol
export async function POST(request: NextRequest) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();
		if (user.role !== 'MEDICO') {
			return NextResponse.json({ error: 'Acceso denegado: solo médicos' }, { status: 403 });
		}

		if (!user.organizationId) {
			return NextResponse.json({ error: 'Usuario no asociado a una organización' }, { status: 400 });
		}

		const body = await request.json();
		const { roleName, roleDescription, permissions } = body;

		if (!roleName || typeof roleName !== 'string' || roleName.trim().length === 0) {
			return NextResponse.json({ error: 'El nombre del rol es requerido' }, { status: 400 });
		}

		// Verificar que no exista un rol activo con el mismo nombre en la organización
		// IMPORTANTE: Filtrar por organization_id para que cada consultorio pueda tener sus propios roles
		const { data: existingRole } = await supabase
			.from('consultorio_roles')
			.select('id')
			.eq('organization_id', user.organizationId) // CRÍTICO: Filtrar por organización
			.eq('role_name', roleName.trim())
			.eq('is_active', true) // Solo considerar roles activos
			.maybeSingle();

		if (existingRole) {
			return NextResponse.json({ error: `El rol "${roleName.trim()}" ya existe en tu consultorio` }, { status: 409 });
		}

		// Crear el rol
		const { data: newRole, error: createError } = await supabase
			.from('consultorio_roles')
			.insert({
				organization_id: user.organizationId,
				created_by_user_id: user.userId,
				role_name: roleName.trim(),
				role_description: roleDescription?.trim() || null,
				is_active: true,
			})
			.select()
			.single();

		if (createError) {
			console.error('[Roles API] Error creando rol:', createError);
			return NextResponse.json({ error: 'Error al crear el rol' }, { status: 500 });
		}

		// Crear permisos si se proporcionaron
		if (permissions && Array.isArray(permissions) && permissions.length > 0) {
			const permissionsToInsert = permissions.map((perm: { module: string; permissions: Record<string, boolean> }) => ({
				role_id: newRole.id,
				module: perm.module,
				permissions: perm.permissions || {},
			}));

			const { error: permsError } = await supabase.from('consultorio_role_permissions').insert(permissionsToInsert);

			if (permsError) {
				console.error('[Roles API] Error creando permisos:', permsError);
				// No fallar si los permisos fallan, pero loguear el error
			}
		}

		// Obtener nombre del usuario desde la tabla User
		const { data: userData } = await supabase
			.from('users')
			.select('name')
			.eq('id', user.userId)
			.maybeSingle();

		const userName = userData?.name || 'Usuario';
		const nameParts = userName.split(' ');
		const firstName = nameParts[0] || 'Usuario';
		const lastName = nameParts.slice(1).join(' ') || '';

		// Registrar en auditoría
		await supabase.from('consultorio_role_audit_log').insert({
			organization_id: user.organizationId,
			role_id: newRole.id,
			user_first_name: firstName,
			user_last_name: lastName,
			user_identifier: '', // El médico no tiene identifier en User, pero podemos dejarlo vacío
			action_type: 'create',
			module: 'roles',
			entity_type: 'consultorio_role',
			entity_id: newRole.id,
			action_details: {
				description: `Rol "${roleName}" creado`,
				role_name: roleName,
			},
		});

		return NextResponse.json({ success: true, role: newRole });
	} catch (err) {
		console.error('[Roles API] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error interno', detail: errorMessage }, { status: 500 });
	}
}

