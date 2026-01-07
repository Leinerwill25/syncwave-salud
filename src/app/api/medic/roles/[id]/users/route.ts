import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

function parseSupabaseCreateResp(resp: unknown): { id?: string; email?: string } | null {
	if (!resp || typeof resp !== 'object') return null;
	const r = resp as Record<string, unknown>;
	if (r.data && typeof r.data === 'object' && 'user' in r.data) {
		const u = (r.data as { user: unknown }).user;
		if (u && typeof u === 'object') {
			const user = u as Record<string, unknown>;
			return { id: typeof user.id === 'string' ? user.id : undefined, email: typeof user.email === 'string' ? user.email : undefined };
		}
	}
	if (r.user && typeof r.user === 'object') {
		const u = r.user as Record<string, unknown>;
		return { id: typeof u.id === 'string' ? u.id : undefined, email: typeof u.email === 'string' ? u.email : undefined };
	}
	return null;
}

// POST: Agregar un usuario a un rol
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id: roleId } = await params;
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

		// Verificar que el rol pertenece a la organización
		const { data: role } = await supabase
			.from('consultorio_roles')
			.select('*')
			.eq('id', roleId)
			.eq('organization_id', user.organizationId)
			.single();

		if (!role) {
			return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 });
		}

		const body = await request.json();
		const { firstName, lastName, identifier, email, phone, password } = body;

		// Validaciones obligatorias
		if (!firstName || !lastName || !identifier) {
			return NextResponse.json({ error: 'Nombre, apellido e identificación son requeridos' }, { status: 400 });
		}

		if (!email || typeof email !== 'string' || email.trim().length === 0) {
			return NextResponse.json({ error: 'El correo electrónico es obligatorio' }, { status: 400 });
		}

		// Validar formato de email
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email.trim())) {
			return NextResponse.json({ error: 'El correo electrónico no tiene un formato válido' }, { status: 400 });
		}

		if (!password || typeof password !== 'string' || password.trim().length < 8) {
			return NextResponse.json({ error: 'La contraseña es obligatoria y debe tener al menos 8 caracteres' }, { status: 400 });
		}

		// Verificar que no exista un usuario con ese email en la tabla User
		const existingUserByEmail = await prisma.user.findUnique({
			where: { email: email.trim() },
		});

		if (existingUserByEmail) {
			return NextResponse.json({ error: 'Ya existe un usuario registrado con ese correo electrónico' }, { status: 409 });
		}

		// Verificar que no exista un usuario con esa cédula en la tabla User
		const existingUserByIdentifier = await prisma.user.findFirst({
			where: {
				patientProfile: {
					identifier: identifier.trim(),
				},
			},
		});

		if (existingUserByIdentifier) {
			return NextResponse.json({ error: 'Ya existe un usuario registrado con esa cédula de identidad' }, { status: 409 });
		}

		// Verificar que no exista ya un usuario con esa cédula en este rol específico
		const { data: existingRoleUser } = await supabase
			.from('consultorio_role_users')
			.select('id')
			.eq('role_id', roleId)
			.eq('identifier', identifier.trim())
			.maybeSingle();

		if (existingRoleUser) {
			return NextResponse.json({ error: 'Ya existe un usuario con esa cédula asignado a este rol' }, { status: 409 });
		}

		// Verificar que no exista un usuario con ese email en consultorio_role_users
		const { data: existingRoleUserByEmail } = await supabase
			.from('consultorio_role_users')
			.select('id')
			.eq('email', email.trim())
			.maybeSingle();

		if (existingRoleUserByEmail) {
			return NextResponse.json({ error: 'Ya existe un usuario con ese correo electrónico asignado a otro rol' }, { status: 409 });
		}

		// Hash de contraseña
		const passwordHash = await bcrypt.hash(password.trim(), 10);

		// Crear usuario en Supabase Auth
		let supabaseUserId: string | null = null;
		if (supabaseAdmin) {
			try {
				const fullName = `${firstName.trim()} ${lastName.trim()}`;
				const createResp = await supabaseAdmin.auth.admin.createUser({
					email: email.trim(),
					password: password.trim(),
					email_confirm: true,
					user_metadata: {
						fullName: fullName,
						role: 'RECEPCION', // Rol para usuarios de roles internos (personal administrativo)
						identifier: identifier.trim(),
						organizationId: user.organizationId,
						isRoleUser: true, // Flag para identificar que es un usuario de rol interno
					},
				});

				const parsedResp = parseSupabaseCreateResp(createResp);
				if (parsedResp && parsedResp.id) {
					supabaseUserId = parsedResp.id;
				} else {
					console.error('[Roles API] No se pudo obtener el ID del usuario de Supabase');
					return NextResponse.json({ error: 'Error al crear el usuario en el sistema de autenticación' }, { status: 500 });
				}
			} catch (supabaseErr: unknown) {
				console.error('[Roles API] Error creando usuario en Supabase Auth:', supabaseErr);
				const errorMessage = supabaseErr instanceof Error ? supabaseErr.message : 'Error desconocido';
				return NextResponse.json({ error: `Error al crear el usuario: ${errorMessage}` }, { status: 500 });
			}
		} else {
			return NextResponse.json({ error: 'Configuración de Supabase no disponible' }, { status: 500 });
		}

		// Crear usuario en la tabla User
		let appUserId: string;
		try {
			const fullName = `${firstName.trim()} ${lastName.trim()}`;
			const newAppUser = await prisma.user.create({
				data: {
					email: email.trim(),
					name: fullName,
					role: 'RECEPCION', // Rol para usuarios de roles internos (personal administrativo)
					organizationId: user.organizationId,
					authId: supabaseUserId,
					passwordHash: passwordHash,
				},
			});
			appUserId = newAppUser.id;
		} catch (prismaErr: unknown) {
			console.error('[Roles API] Error creando usuario en User table:', prismaErr);
			// Si falla la creación en User, intentar eliminar el usuario de Supabase Auth
			if (supabaseAdmin && supabaseUserId) {
				try {
					await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);
				} catch (deleteErr) {
					console.error('[Roles API] Error eliminando usuario de Supabase después de fallo:', deleteErr);
				}
			}
			const errorMessage = prismaErr instanceof Error ? prismaErr.message : 'Error desconocido';
			return NextResponse.json({ error: `Error al crear el usuario en la base de datos: ${errorMessage}` }, { status: 500 });
		}

		// Crear el usuario del rol en consultorio_role_users
		const { data: newRoleUser, error: createError } = await supabase
			.from('consultorio_role_users')
			.insert({
				role_id: roleId,
				organization_id: user.organizationId,
				first_name: firstName.trim(),
				last_name: lastName.trim(),
				identifier: identifier.trim(),
				email: email.trim(),
				phone: phone?.trim() || null,
				password_hash: passwordHash,
				is_active: true,
			})
			.select()
			.single();

		if (createError) {
			console.error('[Roles API] Error creando usuario en consultorio_role_users:', createError);
			// Rollback: eliminar usuario de User y Supabase Auth
			try {
				await prisma.user.delete({ where: { id: appUserId } });
			} catch (deleteErr) {
				console.error('[Roles API] Error eliminando usuario de User después de fallo:', deleteErr);
			}
			if (supabaseAdmin && supabaseUserId) {
				try {
					await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);
				} catch (deleteErr) {
					console.error('[Roles API] Error eliminando usuario de Supabase después de fallo:', deleteErr);
				}
			}
			return NextResponse.json({ error: 'Error al agregar el usuario al rol' }, { status: 500 });
		}

		// Obtener nombre del usuario desde la tabla User
		const { data: userData } = await supabase
			.from('user')
			.select('name')
			.eq('id', user.userId)
			.maybeSingle();

		const userName = userData?.name || 'Usuario';
		const nameParts = userName.split(' ');
		const auditFirstName = nameParts[0] || 'Usuario';
		const auditLastName = nameParts.slice(1).join(' ') || '';

		// Registrar en auditoría
		await supabase.from('consultorio_role_audit_log').insert({
			organization_id: user.organizationId,
			role_id: roleId,
			role_user_id: newRoleUser.id,
			user_first_name: auditFirstName,
			user_last_name: auditLastName,
			user_identifier: '',
			action_type: 'create',
			module: 'roles',
			entity_type: 'consultorio_role_user',
			entity_id: newRoleUser.id,
			action_details: {
				description: `Usuario ${firstName} ${lastName} (${identifier}) agregado al rol "${role.role_name}". Usuario creado en sistema de autenticación y tabla User.`,
				user_first_name: auditFirstName,
				user_last_name: auditLastName,
				user_identifier: identifier,
				user_email: email.trim(),
				app_user_id: appUserId,
				supabase_auth_id: supabaseUserId,
			},
		});

		return NextResponse.json({
			success: true,
			user: {
				...newRoleUser,
				appUserId: appUserId,
				supabaseAuthId: supabaseUserId,
			},
		});
	} catch (err) {
		console.error('[Roles API] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error interno', detail: errorMessage }, { status: 500 });
	}
}

