import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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
async function findUsersByEmail(admin: SupabaseClient, email: string) {
  const tableCandidates = ['users', 'user', 'User', '"users"', '"user"', '"User"'];
  for (const tableName of tableCandidates) {
    const { data, error } = await admin.from(tableName).select('id, email, role, authId, passwordHash').eq('email', email);
    if (!error && data?.length) return data;
  }
  return [];
}

async function verifyUserPasswords(users: any[], password: string) {
  const recepcionUsers = users.filter(u => {
    const role = String(u.role || '').toUpperCase();
    return (role === 'RECEPCION' || role === 'RECEPCIONISTA') && u.passwordHash;
  });

  for (const user of [...recepcionUsers, ...users.filter(u => u.passwordHash && !recepcionUsers.includes(u))]) {
    try {
      if (await bcrypt.compare(password, user.passwordHash)) return user;
    } catch (err) {
      console.error(`[Login Multiple Users] Password check error for user ${user.id}:`, err);
    }
  }
  return null;
}

async function syncAuthAndUsers(admin: SupabaseClient, email: string, password: string, validUser: any, allUsers: any[]) {
  const { data: authUsers } = await admin.auth.admin.listUsers();
  let authUser = authUsers?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

  if (authUser) {
    const { error: updateError } = await admin.auth.admin.updateUserById(authUser.id, { password });
    if (updateError) throw updateError;
  } else {
    const { data: newAuth, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (createError) throw createError;
    authUser = newAuth.user;
  }

  // Update authId for all relevant users
  for (const u of allUsers) {
    if (u.authId === authUser!.id) continue;
    if (!u.authId || u.id === validUser.id) {
       await admin.from('users').update({ authId: authUser!.id }).eq('id', u.id);
       u.authId = authUser!.id;
    }
  }
  return authUser;
}

export async function POST(req: NextRequest) {
  const admin = supabaseAdmin;
  const anon = supabaseAnon;

  try {
    if (!admin || !anon) {
      return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
    }

    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 });

    const emailTrimmed = email.trim();
    const allUsers = await findUsersByEmail(admin, emailTrimmed);

    if (allUsers.length === 0) {
      const { data, error } = await anon.auth.signInWithPassword({ email: emailTrimmed, password });
      if (error || !data?.user) return NextResponse.json({ error: 'Invalid login credentials' }, { status: 401 });
      return NextResponse.json({ success: true, user: data.user, session: data.session });
    }

    const validPasswordUser = await verifyUserPasswords(allUsers, password);

    if (validPasswordUser) {
      await syncAuthAndUsers(admin, emailTrimmed, password, validPasswordUser, allUsers);
      await new Promise(r => setTimeout(r, 1000));
      
      const { data: authData, error } = await createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, { auth: { persistSession: false } }).auth.signInWithPassword({ email: emailTrimmed, password });
      
      if (error || !authData?.user) return NextResponse.json({ error: 'Error al iniciar sesión tras sincronizar' }, { status: 500 });

      const selectedUser = allUsers.find((u: any) => ['RECEPCION', 'RECEPCIONISTA'].includes(String(u.role || '').toUpperCase())) || validPasswordUser;
      return NextResponse.json({ success: true, user: authData.user, session: authData.session, dbUser: selectedUser });
    } else {
      const { data: authData, error } = await anon.auth.signInWithPassword({ email: emailTrimmed, password });
      if (error || !authData?.user) return NextResponse.json({ error: 'Invalid login credentials' }, { status: 401 });
      
      const selectedUser = allUsers.find((u: any) => u.authId === authData.user.id) || allUsers[0];
      return NextResponse.json({ success: true, user: authData.user, session: authData.session, dbUser: selectedUser });
    }

	} catch (err) {
		console.error('[Login Multiple Users] Error general:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error al iniciar sesión', detail: errorMessage }, { status: 500 });
	}
}
