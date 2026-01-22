import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Usar service role key para evitar RLS
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY ?? '';

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
	? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
	: null;

// POST: Login para superadmin
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { username, password } = body;

		if (!username || !password) {
			return NextResponse.json({ error: 'Usuario y contraseña son requeridos' }, { status: 400 });
		}

		if (!supabaseAdmin) {
			console.error('[Analytics Login] Supabase admin client no configurado');
			return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
		}

		const supabase = supabaseAdmin;

		// Buscar superadmin por username
		const { data: admin, error: adminError } = await supabase
			.from('superadmin')
			.select('id, username, password_hash, email, is_active, last_login_at, last_login_ip')
			.eq('username', username.trim())
			.maybeSingle();

		if (adminError) {
			console.error('[Analytics Login] Error buscando superadmin:', adminError);
			return NextResponse.json({ error: 'Error al buscar usuario' }, { status: 500 });
		}

		if (!admin) {
			return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
		}

		if (!admin.is_active) {
			return NextResponse.json({ error: 'Este usuario ha sido deshabilitado' }, { status: 403 });
		}

		// Verificar contraseña
		const isValidPassword = await bcrypt.compare(password, admin.password_hash);
		if (!isValidPassword) {
			return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
		}

		// Obtener IP del cliente
		const ipAddress = request.headers.get('x-forwarded-for') || 
			request.headers.get('x-real-ip') || 
			'unknown';

		// Actualizar last_login_at y last_login_ip
		await supabase
			.from('superadmin')
			.update({
				last_login_at: new Date().toISOString(),
				last_login_ip: ipAddress,
				updated_at: new Date().toISOString()
			})
			.eq('id', admin.id);

		// Crear sesión (usaremos cookies para mantener la sesión)
		const sessionData = {
			adminId: admin.id,
			username: admin.username,
			email: admin.email,
			loginAt: new Date().toISOString()
		};

		// Guardar sesión en cookie
		const cookieStore = await cookies();
		cookieStore.set('analytics-admin-session', JSON.stringify(sessionData), {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7, // 7 días
			path: '/',
		});

		return NextResponse.json({
			success: true,
			user: {
				id: admin.id,
				username: admin.username,
				email: admin.email
			},
		});
	} catch (err) {
		console.error('[Analytics Login] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error al iniciar sesión', detail: errorMessage }, { status: 500 });
	}
}

// GET: Verificar sesión actual
export async function GET(request: NextRequest) {
	try {
		const cookieStore = await cookies();
		const sessionCookie = cookieStore.get('analytics-admin-session');

		if (!sessionCookie?.value) {
			return NextResponse.json({ authenticated: false }, { status: 200 });
		}

		const sessionData = JSON.parse(sessionCookie.value);

		// Verificar que el admin aún existe y está activo
		if (!supabaseAdmin) {
			return NextResponse.json({ authenticated: false }, { status: 200 });
		}

		const { data: admin } = await supabaseAdmin
			.from('superadmin')
			.select('id, username, email, is_active')
			.eq('id', sessionData.adminId)
			.eq('is_active', true)
			.maybeSingle();

		if (!admin) {
			// Limpiar cookie si el admin ya no existe o está inactivo
			cookieStore.delete('analytics-admin-session');
			return NextResponse.json({ authenticated: false }, { status: 200 });
		}

		return NextResponse.json({
			authenticated: true,
			user: {
				id: admin.id,
				username: admin.username,
				email: admin.email
			},
		});
	} catch (err) {
		console.error('[Analytics Login] Error verificando sesión:', err);
		return NextResponse.json({ authenticated: false }, { status: 200 });
	}
}

// DELETE: Logout
export async function DELETE(request: NextRequest) {
	try {
		const cookieStore = await cookies();
		cookieStore.delete('analytics-admin-session');

		return NextResponse.json({ success: true });
	} catch (err) {
		console.error('[Analytics Login] Error en logout:', err);
		return NextResponse.json({ error: 'Error al cerrar sesión' }, { status: 500 });
	}
}

