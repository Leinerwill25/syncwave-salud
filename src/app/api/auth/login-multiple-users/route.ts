import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
	console.warn('Warning: SUPABASE credentials not set. /api/auth/login-multiple-users will fail.');
}

// Cliente admin de Supabase (con service role key)
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY 
	? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
	: null;

// Cliente anónimo para autenticación
const supabaseAnon = SUPABASE_URL && SUPABASE_ANON_KEY
	? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
	: null;

/**
 * Endpoint para login que maneja usuarios con múltiples registros
 * Específicamente para roles RECEPCION y "Asistente De Citas"
 * Intenta autenticar con cualquiera de las contraseñas guardadas
 */
export async function POST(req: NextRequest) {
	try {
		if (!supabaseAdmin || !supabaseAnon) {
			console.error('[Login Multiple Users] Error: Credenciales de Supabase no configuradas');
			return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
		}

		const body = await req.json();
		const { email, password } = body;

		if (!email || !password) {
			return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 });
		}

		const emailTrimmed = email.trim();
		console.log(`[Login Multiple Users] ===== INICIO LOGIN para: ${emailTrimmed} =====`);

		// 1. Buscar todos los usuarios con ese email en la tabla User
		const { data: allUsers, error: usersError } = await supabaseAdmin
			.from('user')
			.select('id, email, role, authId, passwordHash')
			.eq('email', emailTrimmed);

		if (usersError) {
			console.error('[Login Multiple Users] Error buscando usuarios:', usersError);
			return NextResponse.json({ error: 'Error al buscar usuarios' }, { status: 500 });
		}

		console.log(`[Login Multiple Users] Encontrados ${allUsers?.length || 0} usuarios:`, 
			allUsers?.map(u => ({ id: u.id, role: u.role, hasAuthId: !!u.authId, hasPasswordHash: !!u.passwordHash })));

		if (!allUsers || allUsers.length === 0) {
			console.log('[Login Multiple Users] No se encontraron usuarios, intentando login normal');
			const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
				email: emailTrimmed,
				password: password,
			});

			if (authError || !authData?.user) {
				console.log('[Login Multiple Users] Login normal falló:', authError?.message);
				return NextResponse.json({ error: 'Invalid login credentials' }, { status: 401 });
			}

			return NextResponse.json({
				success: true,
				user: authData.user,
				session: authData.session,
			});
		}

		// 2. Filtrar usuarios con roles RECEPCION/RECEPCIONISTA/PACIENTE
		const allowedRoles = ['RECEPCION', 'RECEPCIONISTA', 'PACIENTE'];
		const relevantUsers = allUsers.filter(u => {
			const role = String(u.role || '').toUpperCase();
			return allowedRoles.includes(role);
		});

		console.log(`[Login Multiple Users] Usuarios relevantes: ${relevantUsers.length}`);

		// 3. PRIMERO verificar passwordHash de usuarios RECEPCION/RECEPCIONISTA (estos tienen passwordHash)
		// Esto es importante porque si hay un authId con contraseña diferente, el login normal fallará
		console.log('[Login Multiple Users] Paso 1: Verificando passwordHash PRIMERO (antes de login normal)');
		
		let validPasswordUser: any = null;
		
		// Priorizar usuarios RECEPCION/RECEPCIONISTA que tienen passwordHash
		const recepcionUsers = allUsers.filter(u => {
			const role = String(u.role || '').toUpperCase();
			return (role === 'RECEPCION' || role === 'RECEPCIONISTA') && u.passwordHash;
		});
		
		// Si hay usuarios RECEPCION, verificar su passwordHash primero
		if (recepcionUsers.length > 0) {
			console.log(`[Login Multiple Users] Encontrados ${recepcionUsers.length} usuarios RECEPCION con passwordHash, verificando primero`);
			
			for (const user of recepcionUsers) {
				try {
					console.log(`[Login Multiple Users] Verificando passwordHash para usuario RECEPCION ${user.id}`);
					const passwordMatch = await bcrypt.compare(password, user.passwordHash);
					
					if (passwordMatch) {
						console.log(`[Login Multiple Users] ✓ Contraseña válida encontrada en usuario RECEPCION ${user.id}`);
						validPasswordUser = user;
						break;
					} else {
						console.log(`[Login Multiple Users] ✗ Contraseña NO coincide para usuario RECEPCION ${user.id}`);
					}
				} catch (err) {
					console.error(`[Login Multiple Users] Error comparando passwordHash para usuario ${user.id}:`, err);
				}
			}
		}
		
		// Si no encontramos en RECEPCION, verificar otros usuarios
		if (!validPasswordUser) {
			console.log('[Login Multiple Users] No se encontró contraseña válida en usuarios RECEPCION, verificando otros usuarios');
			for (const user of allUsers) {
				if (user.passwordHash && !recepcionUsers.find(u => u.id === user.id)) {
					try {
						console.log(`[Login Multiple Users] Verificando passwordHash para usuario ${user.id} (rol: ${user.role})`);
						const passwordMatch = await bcrypt.compare(password, user.passwordHash);
						
						if (passwordMatch) {
							console.log(`[Login Multiple Users] ✓ Contraseña válida encontrada en usuario ${user.id} (rol: ${user.role})`);
							validPasswordUser = user;
							break;
						}
					} catch (err) {
						console.error(`[Login Multiple Users] Error comparando passwordHash para usuario ${user.id}:`, err);
					}
				}
			}
		}

		// 4. Si encontramos una contraseña válida en passwordHash, sincronizar con Supabase Auth ANTES de intentar login
		if (validPasswordUser) {
			console.log(`[Login Multiple Users] Paso 2: Contraseña válida encontrada en passwordHash, sincronizando con Supabase Auth PRIMERO`);

			// 5. Contraseña válida encontrada, sincronizar con Supabase Auth
			try {
			// Buscar usuario en Supabase Auth por email
			const { data: authUsersList } = await supabaseAdmin.auth.admin.listUsers();
			const authUser = authUsersList?.users?.find((u: any) => u.email?.toLowerCase() === emailTrimmed.toLowerCase());
			
			if (authUser) {
				console.log(`[Login Multiple Users] Usuario existe en Supabase Auth (ID: ${authUser.id}), actualizando contraseña`);
				// Usuario existe, actualizar contraseña
				const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
					password: password,
				});
				
				if (updateError) {
					console.error(`[Login Multiple Users] Error actualizando contraseña:`, updateError);
					return NextResponse.json({ error: 'Error al actualizar contraseña' }, { status: 500 });
				}
				
				console.log(`[Login Multiple Users] ✓ Contraseña actualizada en Supabase Auth`);
				
				// Actualizar authId en TODOS los usuarios con este email
				for (const u of allUsers) {
					if (!u.authId || u.authId !== authUser.id) {
						const { error: updateAuthIdError } = await supabaseAdmin
							.from('user')
							.update({ authId: authUser.id })
							.eq('id', u.id);
						
						if (updateAuthIdError) {
							console.error(`[Login Multiple Users] Error actualizando authId para usuario ${u.id}:`, updateAuthIdError);
						} else {
							console.log(`[Login Multiple Users] ✓ authId actualizado para usuario ${u.id} (rol: ${u.role})`);
						}
					}
				}
				
				// Esperar un momento para que la actualización se propague
				await new Promise(resolve => setTimeout(resolve, 1000));
				
				// Intentar login con nuevo cliente para evitar caché
				const freshSupabaseAnon = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
				const { data: authData, error: authError } = await freshSupabaseAnon.auth.signInWithPassword({
					email: emailTrimmed,
					password: password,
				});

				if (!authError && authData?.user && authData?.session) {
					console.log(`[Login Multiple Users] ✓ Login exitoso después de actualizar contraseña`);
					const recepcionUser = allUsers.find(u => String(u.role || '').toUpperCase() === 'RECEPCION');
					const selectedUser = recepcionUser || validPasswordUser;
					
					return NextResponse.json({
						success: true,
						user: authData.user,
						session: authData.session,
						dbUser: selectedUser,
					});
				} else {
					console.error(`[Login Multiple Users] ✗ Error en login después de actualizar:`, authError?.message);
					return NextResponse.json({ error: 'Error al iniciar sesión después de actualizar contraseña' }, { status: 500 });
				}
			} else {
				console.log(`[Login Multiple Users] Usuario NO existe en Supabase Auth, creándolo`);
				// Usuario no existe, crearlo
				const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
					email: emailTrimmed,
					password: password,
					email_confirm: true,
				});

				if (createError || !newAuthUser?.user) {
					console.error(`[Login Multiple Users] Error creando usuario en Supabase Auth:`, createError);
					return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
				}

				console.log(`[Login Multiple Users] ✓ Usuario creado en Supabase Auth (ID: ${newAuthUser.user.id})`);
				
				// Actualizar authId en TODOS los usuarios con este email
				for (const u of allUsers) {
					const { error: updateAuthIdError } = await supabaseAdmin
						.from('user')
						.update({ authId: newAuthUser.user.id })
						.eq('id', u.id);
					
					if (updateAuthIdError) {
						console.error(`[Login Multiple Users] Error actualizando authId para usuario ${u.id}:`, updateAuthIdError);
					} else {
						console.log(`[Login Multiple Users] ✓ authId actualizado para usuario ${u.id} (rol: ${u.role})`);
					}
				}

				// Esperar un momento para que el usuario se cree
				await new Promise(resolve => setTimeout(resolve, 1000));
				
				// Intentar login con nuevo cliente
				const freshSupabaseAnon = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
				const { data: authData, error: authError } = await freshSupabaseAnon.auth.signInWithPassword({
					email: emailTrimmed,
					password: password,
				});

				if (!authError && authData?.user && authData?.session) {
					console.log(`[Login Multiple Users] ✓ Login exitoso después de crear usuario`);
					const recepcionUser = allUsers.find(u => String(u.role || '').toUpperCase() === 'RECEPCION');
					const selectedUser = recepcionUser || validPasswordUser;
					
					return NextResponse.json({
						success: true,
						user: authData.user,
						session: authData.session,
						dbUser: selectedUser,
					});
				} else {
					console.error(`[Login Multiple Users] ✗ Error en login después de crear:`, authError?.message);
					return NextResponse.json({ error: 'Error al iniciar sesión después de crear usuario' }, { status: 500 });
				}
			}
			} catch (err) {
				console.error(`[Login Multiple Users] Error en proceso de sincronización:`, err);
				return NextResponse.json({ error: 'Error interno al sincronizar usuario' }, { status: 500 });
			}
		} else {
			// 5. Si no encontramos passwordHash válido, intentar login normal
			console.log('[Login Multiple Users] Paso 2: No se encontró passwordHash válido, intentando login normal');
			const { data: normalAuthData, error: normalAuthError } = await supabaseAnon.auth.signInWithPassword({
				email: emailTrimmed,
				password: password,
			});

			if (!normalAuthError && normalAuthData?.user && normalAuthData?.session) {
				console.log('[Login Multiple Users] ✓ Login normal exitoso');
				const recepcionUser = allUsers.find(u => String(u.role || '').toUpperCase() === 'RECEPCION');
				const selectedUser = recepcionUser || allUsers.find(u => u.authId === normalAuthData.user.id) || allUsers[0];
				
				return NextResponse.json({
					success: true,
					user: normalAuthData.user,
					session: normalAuthData.session,
					dbUser: selectedUser,
				});
			}

			console.log('[Login Multiple Users] ✗ Login normal también falló:', normalAuthError?.message);
			return NextResponse.json({ error: 'Invalid login credentials' }, { status: 401 });
		}
	} catch (err) {
		console.error('[Login Multiple Users] Error general:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error al iniciar sesión', detail: errorMessage }, { status: 500 });
	}
}
