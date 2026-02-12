import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null;

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

		if (!supabaseAdmin) {
			return NextResponse.json({ error: 'Configuración de Supabase no disponible' }, { status: 500 });
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

		// Verificar que no exista un usuario con ese email en la tabla User usando Supabase
		// PERMITIR mismo email si tiene rol diferente (ej: DOCTOR puede tener también PACIENTE)
		// Si existe, reutilizar el authId existente en lugar de crear uno nuevo
		const { data: existingUsersByEmail } = await supabaseAdmin
			.from('users')
			.select('id, email, role, authId')
			.eq('email', email.trim());

		// Variable para almacenar el authId existente si hay un usuario compatible
		let existingAuthId: string | null = null;
		let shouldReuseAuth = false;

		if (existingUsersByEmail && existingUsersByEmail.length > 0) {
			// Roles permitidos para tener el mismo email: DOCTOR/MEDICO puede tener PACIENTE, RECEPCION/RECEPCIONISTA puede tener PACIENTE
			const allowedRoleCombinations: Record<string, string[]> = {
				'MEDICO': ['PACIENTE'],
				'DOCTOR': ['PACIENTE'],
				'RECEPCION': ['PACIENTE'],
				'RECEPCIONISTA': ['PACIENTE'],
				'PACIENTE': ['MEDICO', 'DOCTOR', 'RECEPCION', 'RECEPCIONISTA'],
			};

			// El nuevo usuario será de rol RECEPCION (usuario de rol interno)
			const newRoleUpper = 'RECEPCION';
			const existingRoles = existingUsersByEmail.map(u => String(u.role || '').toUpperCase()).filter(r => r);

			// Verificar si el nuevo rol es compatible con los roles existentes
			const isCompatible = existingRoles.some(existingRole => {
				// Si el nuevo rol está en la lista de permitidos para el rol existente, o viceversa
				return allowedRoleCombinations[existingRole]?.includes(newRoleUpper) || 
				       allowedRoleCombinations[newRoleUpper]?.includes(existingRole);
			});

			if (!isCompatible) {
				return NextResponse.json({ 
					error: `Ya existe un usuario registrado con ese correo electrónico con rol(es): ${existingRoles.join(', ')}. Solo se permite el mismo email si los roles son compatibles (ej: DOCTOR puede tener también PACIENTE).` 
				}, { status: 409 });
			}

			// Si es compatible, reutilizar el authId del primer usuario existente
			// Todos los usuarios con el mismo email deben tener el mismo authId
			const firstExistingUser = existingUsersByEmail.find(u => u.authId);
			if (firstExistingUser && firstExistingUser.authId) {
				existingAuthId = firstExistingUser.authId;
				shouldReuseAuth = true;
				console.log(`[Roles API] Reutilizando authId existente ${existingAuthId} para email ${email.trim()} con nuevo rol RECEPCION`);
			}
		}

		// Verificar que no exista un usuario con esa cédula en la tabla User (buscando en patient)
		// PERMITIR mismo identifier si tiene rol diferente (ej: DOCTOR puede tener también PACIENTE)
		const { data: existingPatientByIdentifier } = await supabaseAdmin
			.from('patient')
			.select('id, patientProfileId')
			.eq('identifier', identifier.trim())
			.maybeSingle();

		if (existingPatientByIdentifier) {
			// Verificar si hay un user asociado a este patient
			const { data: existingUserByPatientId } = await supabaseAdmin
				.from('users')
				.select('id, role')
				.eq('patientProfileId', existingPatientByIdentifier.id)
				.maybeSingle();

			if (existingUserByPatientId) {
				// Roles permitidos para tener el mismo identifier: DOCTOR/MEDICO puede tener PACIENTE, RECEPCION/RECEPCIONISTA puede tener PACIENTE
				const allowedRoleCombinations: Record<string, string[]> = {
					'MEDICO': ['PACIENTE'],
					'DOCTOR': ['PACIENTE'],
					'RECEPCION': ['PACIENTE'],
					'RECEPCIONISTA': ['PACIENTE'],
					'PACIENTE': ['MEDICO', 'DOCTOR', 'RECEPCION', 'RECEPCIONISTA'],
				};

				const existingRole = String(existingUserByPatientId.role || '').toUpperCase();
				const newRoleUpper = 'RECEPCION'; // El nuevo usuario será de rol RECEPCION (usuario de rol interno)

				// Verificar si el nuevo rol es compatible con el rol existente
				const isCompatible = allowedRoleCombinations[existingRole]?.includes(newRoleUpper) || 
				                     allowedRoleCombinations[newRoleUpper]?.includes(existingRole);

				if (!isCompatible) {
					return NextResponse.json({ 
						error: `Ya existe un usuario registrado con esa cédula de identidad con rol: ${existingRole}. Solo se permite el mismo identifier si los roles son compatibles (ej: DOCTOR puede tener también PACIENTE).` 
					}, { status: 409 });
				}
			}
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
		// PERMITIR mismo email si tiene rol diferente (ej: DOCTOR puede tener también PACIENTE)
		const { data: existingRoleUsersByEmail } = await supabase
			.from('consultorio_role_users')
			.select('id, email, role_id')
			.eq('email', email.trim());

		if (existingRoleUsersByEmail && existingRoleUsersByEmail.length > 0) {
			// Obtener los nombres de los roles existentes
			const existingRoleIds = existingRoleUsersByEmail.map(u => u.role_id).filter(id => id);
			if (existingRoleIds.length > 0) {
				const { data: existingRoles } = await supabase
					.from('consultorio_roles')
					.select('id, role_name')
					.in('id', existingRoleIds);

				if (existingRoles && existingRoles.length > 0) {
					const existingRoleNames = existingRoles.map(r => r.role_name).filter(name => name);
					// Permitir si el email ya está en otro rol interno (roles internos pueden compartir email)
					// Solo rechazar si es exactamente el mismo rol
					const isSameRole = existingRoleIds.includes(roleId);
					if (isSameRole) {
						return NextResponse.json({ 
							error: `Ya existe un usuario con ese correo electrónico asignado al rol "${existingRoleNames.join(', ')}"` 
						}, { status: 409 });
					}
					// Si es diferente rol, permitir (puede tener múltiples roles internos)
				}
			}
		}

		// Hash de contraseña
		const passwordHash = await bcrypt.hash(password.trim(), 10);

		// Crear usuario en Supabase Auth o reutilizar existente
		let supabaseUserId: string | null = null;
		let supabaseCreated = false;

		try {
			// Si hay un authId existente compatible, reutilizarlo en lugar de crear uno nuevo
			if (shouldReuseAuth && existingAuthId) {
				supabaseUserId = existingAuthId;
				supabaseCreated = false; // No creamos uno nuevo, solo reutilizamos
				console.log(`[Roles API] Reutilizando usuario de Supabase Auth con ID: ${existingAuthId}`);
			} else {
				// Crear nuevo usuario en Supabase Auth
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
					supabaseCreated = true;
				} else {
					console.error('[Roles API] No se pudo obtener el ID del usuario de Supabase');
					return NextResponse.json({ error: 'Error al crear el usuario en el sistema de autenticación' }, { status: 500 });
				}
			}
		} catch (supabaseErr: unknown) {
			console.error('[Roles API] Error creando usuario en Supabase Auth:', supabaseErr);
			const errorMessage = supabaseErr instanceof Error ? supabaseErr.message : 'Error desconocido';
			return NextResponse.json({ error: `Error al crear el usuario: ${errorMessage}` }, { status: 500 });
		}

		// Verificar si ya existe un User con este email Y rol RECEPCION
		// Si existe, reutilizarlo en lugar de crear uno nuevo
		const { data: existingUserWithRole, error: existingUserCheckError } = await supabaseAdmin
			.from('users')
			.select('id, email, role, authId')
			.eq('email', email.trim())
			.eq('role', 'RECEPCION')
			.maybeSingle();

		// Verificar si ya existe un usuario con el mismo authId
		// Si existe, no podemos usar ese authId para el nuevo registro (violaría la restricción UNIQUE)
		let authIdToUse: string | null = null;
		if (supabaseUserId) {
			const authIdStr = String(supabaseUserId);
			const { data: existingUserWithAuthId } = await supabaseAdmin
				.from('users')
				.select('id, email, role')
				.eq('authId', authIdStr)
				.maybeSingle();
			
			if (existingUserWithAuthId) {
				// Ya existe un usuario con este authId, no podemos usarlo para el nuevo registro
				// El nuevo registro tendrá authId como null, ya que el authId ya está asociado a otro registro
				console.log(`[Roles API] AuthId ${authIdStr} ya está en uso por usuario ${existingUserWithAuthId.id} (${existingUserWithAuthId.email}, ${existingUserWithAuthId.role}). El nuevo registro tendrá authId null.`);
				authIdToUse = null;
			} else {
				authIdToUse = authIdStr;
			}
		}

		let appUserId: string;
		
		if (existingUserWithRole && !existingUserCheckError) {
			// Ya existe un usuario con este email y rol, reutilizarlo
			console.log('[Roles API] Usuario ya existe con este email y rol RECEPCION, reutilizando:', existingUserWithRole.id);
			appUserId = existingUserWithRole.id;
			
			// Actualizar el authId solo si no tenía uno y ahora lo tenemos Y no está en uso
			if (!existingUserWithRole.authId && authIdToUse) {
				const { error: updateError } = await supabaseAdmin
					.from('users')
					.update({ authId: authIdToUse })
					.eq('id', appUserId);
				
				if (!updateError) {
					console.log('[Roles API] AuthId actualizado para usuario existente');
				}
			}
		} else {
			// Crear nuevo usuario en la tabla User usando Supabase
			try {
				const fullName = `${firstName.trim()} ${lastName.trim()}`;
				const { data: newAppUser, error: userCreateError } = await supabaseAdmin
					.from('users')
					.insert({
						email: email.trim(),
						name: fullName,
						role: 'RECEPCION',
						organizationId: user.organizationId,
						authId: authIdToUse, // Usar authIdToUse que puede ser null si ya está en uso
						passwordHash: passwordHash,
					} as any)
					.select('id')
					.single();

				if (userCreateError || !newAppUser) {
					throw new Error(userCreateError?.message || 'Error al crear usuario en tabla user');
				}

				appUserId = (newAppUser as any).id;
			} catch (userErr: unknown) {
				console.error('[Roles API] Error creando usuario en User table:', userErr);
				// Si falla la creación en User, intentar eliminar el usuario de Supabase Auth (solo si lo creamos)
				if (supabaseAdmin && supabaseUserId && supabaseCreated) {
					try {
						await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);
					} catch (deleteErr) {
						console.error('[Roles API] Error eliminando usuario de Supabase después de fallo:', deleteErr);
					}
				}
				const errorMessage = userErr instanceof Error ? userErr.message : 'Error desconocido';
				return NextResponse.json({ error: `Error al crear el usuario en la base de datos: ${errorMessage}` }, { status: 500 });
			}
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
				await supabaseAdmin.from('users').delete().eq('id', appUserId);
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
			.from('users')
			.select('name')
			.eq('id', user.userId)
			.maybeSingle();

		const userName = (userData as any)?.name || 'Usuario';
		const nameParts = userName.split(' ');
		const auditFirstName = nameParts[0] || 'Usuario';
		const auditLastName = nameParts.slice(1).join(' ') || '';

		// Registrar en auditoría
		await supabase.from('consultorio_role_audit_log').insert({
			organization_id: user.organizationId,
			role_id: roleId,
			role_user_id: (newRoleUser as any).id,
			user_first_name: auditFirstName,
			user_last_name: auditLastName,
			user_identifier: '',
			action_type: 'create',
			module: 'roles',
			entity_type: 'consultorio_role_user',
			entity_id: (newRoleUser as any).id,
			action_details: {
				description: `Usuario ${firstName} ${lastName} (${identifier}) agregado al rol "${(role as any).role_name}". Usuario creado en sistema de autenticación y tabla User.`,
				user_first_name: auditFirstName,
				user_last_name: auditLastName,
				user_identifier: identifier,
				user_email: email.trim(),
				app_user_id: appUserId,
				supabase_auth_id: supabaseUserId,
			},
		} as any);

		return NextResponse.json({
			success: true,
			user: {
				...(newRoleUser as any),
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
