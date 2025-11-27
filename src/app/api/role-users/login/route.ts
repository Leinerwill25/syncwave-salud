import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import bcrypt from 'bcryptjs';

// POST: Login para usuarios de roles internos
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { identifier, email, password } = body;

		if (!password) {
			return NextResponse.json({ error: 'La contraseña es requerida' }, { status: 400 });
		}

		if (!identifier && !email) {
			return NextResponse.json({ error: 'Debe proporcionar cédula o email' }, { status: 400 });
		}

		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		let userEmail: string | null = null;
		let roleUser: any = null;

		// Si se proporciona email, buscar directamente en User/Supabase Auth
		if (email) {
			userEmail = email.trim();
		} else if (identifier) {
			// Si se proporciona cédula, buscar en consultorio_role_users para obtener el email
			const { data: roleUsers, error: searchError } = await supabase
				.from('consultorio_role_users')
				.select('*, consultorio_roles(*)')
				.eq('identifier', identifier.trim())
				.eq('is_active', true)
				.maybeSingle();

			if (searchError) {
				console.error('[Role User Login] Error buscando usuario por cédula:', searchError);
				return NextResponse.json({ error: 'Error al buscar usuario' }, { status: 500 });
			}

			if (!roleUsers) {
				return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
			}

			if (!roleUsers.is_active) {
				return NextResponse.json({ error: 'Este usuario ha sido deshabilitado. Contacta al administrador del consultorio.' }, { status: 403 });
			}

			if (!roleUsers.email) {
				return NextResponse.json({ error: 'Usuario no encontrado o inactivo' }, { status: 404 });
			}

			userEmail = roleUsers.email;
			roleUser = roleUsers;
		} else {
			return NextResponse.json({ error: 'Debe proporcionar cédula o email' }, { status: 400 });
		}

		// Intentar login con Supabase Auth usando email y contraseña
		const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
			email: userEmail,
			password: password,
		});

		if (authError || !authData?.user) {
			return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
		}

		// Obtener información del usuario de la tabla User
		const { data: appUser, error: userError } = await supabase
			.from('User')
			.select('id, email, role, organizationId')
			.eq('authId', authData.user.id)
			.maybeSingle();

		if (userError || !appUser) {
			console.error('[Role User Login] Error obteniendo usuario de User table:', userError);
			return NextResponse.json({ error: 'Error al obtener información del usuario' }, { status: 500 });
		}

		// Verificar que el usuario tenga el flag isRoleUser en metadata o que esté en consultorio_role_users
		const isRoleUser = authData.user.user_metadata?.isRoleUser === true;

		if (!isRoleUser) {
			// Si no tiene el flag, verificar que esté en consultorio_role_users
			if (!roleUser) {
				const { data: roleUsersCheck } = await supabase
					.from('consultorio_role_users')
					.select('*, consultorio_roles(*)')
					.eq('email', userEmail)
					.eq('is_active', true)
					.maybeSingle();

				if (!roleUsersCheck) {
					return NextResponse.json({ error: 'Usuario no autorizado para este tipo de acceso' }, { status: 403 });
				}

				if (!roleUsersCheck.is_active) {
					return NextResponse.json({ error: 'Este usuario ha sido deshabilitado. Contacta al administrador del consultorio.' }, { status: 403 });
				}

				roleUser = roleUsersCheck;
			}
		} else {
			// Si tiene el flag, obtener información de consultorio_role_users
			if (!roleUser) {
				const { data: roleUsersCheck } = await supabase
					.from('consultorio_role_users')
					.select('*, consultorio_roles(*)')
					.eq('email', userEmail)
					.eq('is_active', true)
					.maybeSingle();

				if (!roleUsersCheck) {
					return NextResponse.json({ error: 'Usuario de rol no encontrado' }, { status: 404 });
				}

				if (!roleUsersCheck.is_active) {
					return NextResponse.json({ error: 'Este usuario ha sido deshabilitado. Contacta al administrador del consultorio.' }, { status: 403 });
				}

				roleUser = roleUsersCheck;
			}
		}

		// Obtener información del rol y organización
		const role = Array.isArray(roleUser.consultorio_roles) ? roleUser.consultorio_roles[0] : roleUser.consultorio_roles;
		if (!role) {
			return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 });
		}

		// Verificar que la organización del usuario coincida
		if (appUser.organizationId !== roleUser.organization_id) {
			return NextResponse.json({ error: 'Error de organización: el usuario no pertenece a esta organización' }, { status: 403 });
		}

		// Obtener permisos del rol
		const { data: permissions } = await supabase
			.from('consultorio_role_permissions')
			.select('*')
			.eq('role_id', role.id);

		// Actualizar last_access_at
		await supabase
			.from('consultorio_role_users')
			.update({ last_access_at: new Date().toISOString() })
			.eq('id', roleUser.id);

		// Crear sesión (usaremos cookies para mantener la sesión)
		const sessionData = {
			roleUserId: roleUser.id,
			roleId: role.id,
			organizationId: roleUser.organization_id,
			firstName: roleUser.first_name,
			lastName: roleUser.last_name,
			identifier: roleUser.identifier,
			roleName: role.role_name,
			permissions: permissions || [],
		};

		// Guardar sesión en cookie
		const cookieStoreResponse = await cookies();
		cookieStoreResponse.set('role-user-session', JSON.stringify(sessionData), {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7, // 7 días
			path: '/',
		});

		// Registrar login en audit log
		await supabase.from('consultorio_role_audit_log').insert({
			organization_id: roleUser.organization_id,
			role_id: role.id,
			role_user_id: roleUser.id,
			user_first_name: roleUser.first_name,
			user_last_name: roleUser.last_name,
			user_identifier: roleUser.identifier,
			action_type: 'view',
			module: 'roles',
			entity_type: 'login',
			action_details: {
				description: 'Inicio de sesión exitoso',
			},
		});

		return NextResponse.json({
			success: true,
			user: {
				id: roleUser.id,
				firstName: roleUser.first_name,
				lastName: roleUser.last_name,
				identifier: roleUser.identifier,
				role: {
					id: role.id,
					name: role.role_name,
					description: role.role_description,
				},
				organizationId: roleUser.organization_id,
				permissions: permissions || [],
			},
		});
	} catch (err) {
		console.error('[Role User Login] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error al iniciar sesión', detail: errorMessage }, { status: 500 });
	}
}

// GET: Verificar sesión actual
export async function GET(request: NextRequest) {
	try {
		const cookieStore = await cookies();
		const sessionCookie = cookieStore.get('role-user-session');

		if (!sessionCookie?.value) {
			return NextResponse.json({ authenticated: false }, { status: 200 });
		}

		const sessionData = JSON.parse(sessionCookie.value);

		// Verificar que el usuario aún existe y está activo
		const { supabase } = createSupabaseServerClient(cookieStore);
		const { data: roleUser } = await supabase
			.from('consultorio_role_users')
			.select('*, consultorio_roles(*)')
			.eq('id', sessionData.roleUserId)
			.eq('is_active', true)
			.single();

		if (!roleUser) {
			// Limpiar cookie si el usuario ya no existe
			cookieStore.delete('role-user-session');
			return NextResponse.json({ authenticated: false }, { status: 200 });
		}

		// Obtener permisos actualizados
		const { data: permissions } = await supabase
			.from('consultorio_role_permissions')
			.select('*')
			.eq('role_id', sessionData.roleId);

		return NextResponse.json({
			authenticated: true,
			user: {
				id: roleUser.id,
				firstName: roleUser.first_name,
				lastName: roleUser.last_name,
				identifier: roleUser.identifier,
				role: {
					id: sessionData.roleId,
					name: sessionData.roleName,
				},
				organizationId: roleUser.organization_id,
				permissions: permissions || [],
			},
		});
	} catch (err) {
		console.error('[Role User Login] Error verificando sesión:', err);
		return NextResponse.json({ authenticated: false }, { status: 200 });
	}
}

// DELETE: Logout
export async function DELETE(request: NextRequest) {
	try {
		const cookieStore = await cookies();
		cookieStore.delete('role-user-session');

		return NextResponse.json({ success: true });
	} catch (err) {
		console.error('[Role User Login] Error en logout:', err);
		return NextResponse.json({ error: 'Error al cerrar sesión' }, { status: 500 });
	}
}

