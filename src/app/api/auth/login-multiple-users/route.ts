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

		// 1. Buscar todos los usuarios con ese email en la tabla User
		const { data: allUsers, error: usersError } = await supabaseAdmin
			.from('user')
			.select('id, email, role, authId, passwordHash')
			.eq('email', email.trim());

		if (usersError) {
			console.error('[Login Multiple Users] Error buscando usuarios:', usersError);
			return NextResponse.json({ error: 'Error al buscar usuarios' }, { status: 500 });
		}

		if (!allUsers || allUsers.length === 0) {
			return NextResponse.json({ error: 'Invalid login credentials' }, { status: 401 });
		}

		// 2. Filtrar solo usuarios con roles RECEPCION o que sean "Asistente De Citas"
		// También incluir PACIENTE si hay usuarios RECEPCION (para compatibilidad)
		const allowedRoles = ['RECEPCION', 'RECEPCIONISTA', 'PACIENTE'];
		const relevantUsers = allUsers.filter(u => {
			const role = String(u.role || '').toUpperCase();
			return allowedRoles.includes(role);
		});

		// Si no hay usuarios relevantes, intentar login normal
		if (relevantUsers.length === 0) {
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

		// 3. Primero intentar login normal con Supabase Auth (puede funcionar si el usuario principal tiene authId)
		let successfulAuth: any = null;
		let successfulUser: any = null;

		const { data: normalAuthData, error: normalAuthError } = await supabaseAnon.auth.signInWithPassword({
			email: email.trim(),
			password: password,
		});

		if (!normalAuthError && normalAuthData?.user && normalAuthData?.session) {
			// Login exitoso, buscar el usuario correspondiente
			successfulAuth = normalAuthData;
			successfulUser = allUsers.find(u => u.authId === normalAuthData.user.id) || relevantUsers[0];
		} else {
			// 4. Si el login normal falla, verificar passwordHash de usuarios relevantes
			for (const user of relevantUsers) {
				if (user.passwordHash) {
					try {
						const passwordMatch = await bcrypt.compare(password, user.passwordHash);
						if (passwordMatch) {
							// Contraseña correcta encontrada
							// Intentar hacer login con Supabase Auth usando el email
							// Si el usuario tiene authId, el login debería funcionar
							if (user.authId) {
								// Verificar que el authId corresponde a un usuario en Supabase Auth
								try {
									const { data: supabaseUser } = await supabaseAdmin.auth.admin.getUserById(user.authId);
									if (supabaseUser?.user?.email === email.trim()) {
										// Intentar login nuevamente (puede que la contraseña haya cambiado en Supabase Auth)
										const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
											email: email.trim(),
											password: password,
										});

										if (!authError && authData?.user && authData?.session) {
											successfulAuth = authData;
											successfulUser = user;
											break;
										}
									}
								} catch (err) {
									console.warn(`[Login Multiple Users] Error verificando authId ${user.authId}:`, err);
								}
							}

							// Si llegamos aquí, la contraseña es correcta pero no podemos autenticar con Supabase Auth
							// Esto puede pasar si el usuario tiene passwordHash pero no authId, o si el authId no corresponde
							// Intentar crear/actualizar el usuario en Supabase Auth con esta contraseña
							try {
								// Verificar si existe un usuario en Supabase Auth con este email
								const { data: existingAuthUser } = await supabaseAdmin.auth.admin.listUsers();
								const authUser = existingAuthUser?.users?.find((u: any) => u.email === email.trim());
								
								if (authUser) {
									// Usuario existe en Supabase Auth, actualizar contraseña
									await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
										password: password,
									});
									
									// Intentar login nuevamente
									const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
										email: email.trim(),
										password: password,
									});

									if (!authError && authData?.user && authData?.session) {
										// Actualizar authId en la tabla user si no lo tiene
										if (!user.authId) {
											await supabaseAdmin
												.from('user')
												.update({ authId: authData.user.id })
												.eq('id', user.id);
										}
										
										successfulAuth = authData;
										successfulUser = user;
										break;
									}
								} else {
									// Usuario no existe en Supabase Auth, crearlo
									const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
										email: email.trim(),
										password: password,
										email_confirm: true,
									});

									if (!createError && newAuthUser?.user) {
										// Actualizar authId en la tabla user
										await supabaseAdmin
											.from('user')
											.update({ authId: newAuthUser.user.id })
											.eq('id', user.id);

										// Intentar login
										const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
											email: email.trim(),
											password: password,
										});

										if (!authError && authData?.user && authData?.session) {
											successfulAuth = authData;
											successfulUser = user;
											break;
										}
									}
								}
							} catch (err) {
								console.warn(`[Login Multiple Users] Error creando/actualizando usuario en Supabase Auth:`, err);
							}
						}
					} catch (err) {
						console.warn(`[Login Multiple Users] Error comparando passwordHash para usuario ${user.id}:`, err);
					}
				}
			}
		}

		// 5. Si no se encontró ninguna autenticación exitosa, retornar error
		if (!successfulAuth) {
			return NextResponse.json({ error: 'Invalid login credentials' }, { status: 401 });
		}

		// 5. Retornar éxito
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

