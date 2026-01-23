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
			return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
		}

		const body = await req.json();
		const { email, password } = body;

		if (!email || !password) {
			return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 });
		}

		console.log(`[Login Multiple Users] Intentando login para email: ${email.trim()}`);

		// 1. Buscar todos los usuarios con ese email en la tabla User
		const { data: allUsers, error: usersError } = await supabaseAdmin
			.from('user')
			.select('id, email, role, authId, passwordHash')
			.eq('email', email.trim());

		if (usersError) {
			console.error('[Login Multiple Users] Error buscando usuarios:', usersError);
			return NextResponse.json({ error: 'Error al buscar usuarios' }, { status: 500 });
		}

		console.log(`[Login Multiple Users] Encontrados ${allUsers?.length || 0} usuarios con ese email`);

		if (!allUsers || allUsers.length === 0) {
			console.log('[Login Multiple Users] No se encontraron usuarios, intentando login normal');
			// Intentar login normal con Supabase Auth
			const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
				email: email.trim(),
				password: password,
			});

			if (authError || !authData?.user) {
				return NextResponse.json({ error: 'Invalid login credentials' }, { status: 401 });
			}

			return NextResponse.json({
				success: true,
				user: authData.user,
				session: authData.session,
			});
		}

		// 2. Verificar si hay usuarios con roles RECEPCION/RECEPCIONISTA (estos pueden tener passwordHash)
		const allowedRoles = ['RECEPCION', 'RECEPCIONISTA', 'PACIENTE'];
		const relevantUsers = allUsers.filter(u => {
			const role = String(u.role || '').toUpperCase();
			return allowedRoles.includes(role);
		});

		console.log(`[Login Multiple Users] Usuarios relevantes encontrados: ${relevantUsers.length}`, 
			relevantUsers.map(u => ({ id: u.id, role: u.role, hasAuthId: !!u.authId, hasPasswordHash: !!u.passwordHash })));
		console.log(`[Login Multiple Users] Todos los usuarios:`, 
			allUsers.map(u => ({ id: u.id, role: u.role, hasAuthId: !!u.authId, hasPasswordHash: !!u.passwordHash })));

		// 3. Primero intentar login normal con Supabase Auth (puede funcionar si el usuario principal tiene authId)
		let successfulAuth: any = null;
		let successfulUser: any = null;

		console.log('[Login Multiple Users] Intentando login normal con Supabase Auth');
		const { data: normalAuthData, error: normalAuthError } = await supabaseAnon.auth.signInWithPassword({
			email: email.trim(),
			password: password,
		});

		if (!normalAuthError && normalAuthData?.user && normalAuthData?.session) {
			console.log('[Login Multiple Users] Login normal exitoso');
			// Login exitoso, buscar el usuario correspondiente
			successfulAuth = normalAuthData;
			successfulUser = allUsers.find(u => u.authId === normalAuthData.user.id) || relevantUsers[0];
		} else {
			console.log('[Login Multiple Users] Login normal falló, verificando passwordHash de TODOS los usuarios');
			console.log(`[Login Multiple Users] Error de Supabase Auth:`, normalAuthError?.message);

			// 4. Si el login normal falla, verificar passwordHash de TODOS los usuarios con ese email
			// Esto es importante porque usuarios RECEPCION pueden tener passwordHash mientras otros roles tienen authId
			for (const user of allUsers) {
				console.log(`[Login Multiple Users] Verificando usuario ${user.id} (rol: ${user.role}, authId: ${user.authId || 'null'}, passwordHash: ${user.passwordHash ? 'existe' : 'no existe'})`);
				
				if (user.passwordHash) {
					try {
						const passwordMatch = await bcrypt.compare(password, user.passwordHash);
						console.log(`[Login Multiple Users] Comparación de contraseña para usuario ${user.id}: ${passwordMatch ? 'COINCIDE' : 'NO COINCIDE'}`);
						
						if (passwordMatch) {
							console.log(`[Login Multiple Users] Contraseña correcta encontrada para usuario ${user.id} (rol: ${user.role})`);
							
							// Contraseña correcta encontrada
							// Buscar o crear usuario en Supabase Auth
							try {
								// Buscar usuario en Supabase Auth por email
								const { data: authUsersList } = await supabaseAdmin.auth.admin.listUsers();
								const authUser = authUsersList?.users?.find((u: any) => u.email?.toLowerCase() === email.trim().toLowerCase());
								
								// También buscar si algún otro usuario con este email ya tiene authId
								const userWithAuthId = allUsers.find(u => u.authId && u.id !== user.id);
								
								if (authUser) {
									console.log(`[Login Multiple Users] Usuario encontrado en Supabase Auth con ID: ${authUser.id}`);
									// Usuario existe en Supabase Auth, actualizar contraseña
									const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
										password: password,
									});
									
									if (updateError) {
										console.error(`[Login Multiple Users] Error actualizando contraseña:`, updateError);
									} else {
										console.log(`[Login Multiple Users] Contraseña actualizada en Supabase Auth`);
									}
									
									// Actualizar authId en TODOS los usuarios con este email que no lo tengan
									for (const u of allUsers) {
										if (!u.authId || u.authId !== authUser.id) {
											await supabaseAdmin
												.from('user')
												.update({ authId: authUser.id })
												.eq('id', u.id);
											console.log(`[Login Multiple Users] authId actualizado para usuario ${u.id} (rol: ${u.role})`);
										}
									}
									
									// Intentar login nuevamente
									const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
										email: email.trim(),
										password: password,
									});

									if (!authError && authData?.user && authData?.session) {
										console.log(`[Login Multiple Users] Login exitoso después de actualizar contraseña`);
										successfulAuth = authData;
										// Preferir el usuario con rol RECEPCION si existe, sino usar el que tiene la contraseña correcta
										successfulUser = relevantUsers.find(u => u.id === user.id) || user;
										break;
									} else {
										console.error(`[Login Multiple Users] Error en login después de actualizar:`, authError?.message);
									}
								} else if (userWithAuthId && userWithAuthId.authId) {
									console.log(`[Login Multiple Users] Otro usuario con este email tiene authId: ${userWithAuthId.authId}`);
									// Usar el authId existente de otro usuario
									const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userWithAuthId.authId, {
										password: password,
									});
									
									if (!updateError) {
										// Actualizar authId en todos los usuarios
										for (const u of allUsers) {
											if (!u.authId || u.authId !== userWithAuthId.authId) {
												await supabaseAdmin
													.from('user')
													.update({ authId: userWithAuthId.authId })
													.eq('id', u.id);
											}
										}
										
										// Intentar login
										const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
											email: email.trim(),
											password: password,
										});

										if (!authError && authData?.user && authData?.session) {
											successfulAuth = authData;
											successfulUser = relevantUsers.find(u => u.id === user.id) || user;
											break;
										}
									}
								} else {
									console.log(`[Login Multiple Users] Usuario no existe en Supabase Auth, creándolo`);
									// Usuario no existe en Supabase Auth, crearlo
									const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
										email: email.trim(),
										password: password,
										email_confirm: true,
									});

									if (!createError && newAuthUser?.user) {
										console.log(`[Login Multiple Users] Usuario creado en Supabase Auth con ID: ${newAuthUser.user.id}`);
										// Actualizar authId en TODOS los usuarios con este email
										for (const u of allUsers) {
											await supabaseAdmin
												.from('user')
												.update({ authId: newAuthUser.user.id })
												.eq('id', u.id);
											console.log(`[Login Multiple Users] authId actualizado para usuario ${u.id} (rol: ${u.role})`);
										}

										// Intentar login
										const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
											email: email.trim(),
											password: password,
										});

										if (!authError && authData?.user && authData?.session) {
											console.log(`[Login Multiple Users] Login exitoso después de crear usuario`);
											successfulAuth = authData;
											successfulUser = relevantUsers.find(u => u.id === user.id) || user;
											break;
										} else {
											console.error(`[Login Multiple Users] Error en login después de crear:`, authError?.message);
										}
									} else {
										console.error(`[Login Multiple Users] Error creando usuario en Supabase Auth:`, createError);
									}
								}
							} catch (err) {
								console.error(`[Login Multiple Users] Error en proceso de autenticación:`, err);
							}
						}
					} catch (err) {
						console.error(`[Login Multiple Users] Error comparando passwordHash para usuario ${user.id}:`, err);
					}
				} else {
					console.log(`[Login Multiple Users] Usuario ${user.id} no tiene passwordHash`);
				}
			}
		}

		// 5. Si no se encontró ninguna autenticación exitosa, retornar error
		if (!successfulAuth) {
			console.log('[Login Multiple Users] No se pudo autenticar con ninguna contraseña');
			return NextResponse.json({ error: 'Invalid login credentials' }, { status: 401 });
		}

		// 6. Retornar éxito
		console.log(`[Login Multiple Users] Login exitoso para usuario ${successfulUser?.id} (rol: ${successfulUser?.role})`);
		return NextResponse.json({
			success: true,
			user: successfulAuth.user,
			session: successfulAuth.session,
			dbUser: successfulUser,
		});
	} catch (err) {
		console.error('[Login Multiple Users] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error al iniciar sesión', detail: errorMessage }, { status: 500 });
	}
}

