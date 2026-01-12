// src/app/api/auth/clear-session/route.ts
import { NextResponse } from 'next/server';
import { serialize } from 'cookie';

// Lista de todas las cookies de sesión que debemos limpiar
const SESSION_COOKIES = [
	'sb-access-token',
	'sb-refresh-token',
	'sb:token',
	'supabase-auth-token',
	'sb-session',
	// Cookies adicionales que Supabase puede usar
	'supabase-auth-token',
	'supabase-token',
	'supabase-auth',
];

// Opciones para eliminar cookies (maxAge: 0, expires en el pasado)
const deleteCookieOpts = {
	httpOnly: true,
	secure: process.env.NODE_ENV === 'production',
	sameSite: 'lax' as const,
	path: '/',
	maxAge: 0,
	expires: new Date(0),
};

export async function POST() {
	try {
		const cookiesToDelete: string[] = [];

		// Crear headers Set-Cookie para eliminar cada cookie
		SESSION_COOKIES.forEach((cookieName) => {
			cookiesToDelete.push(serialize(cookieName, '', deleteCookieOpts));
		});

		const res = NextResponse.json({ ok: true, message: 'Sesión limpiada' }, { status: 200 });
		
		// Agregar todos los headers Set-Cookie para eliminar las cookies
		cookiesToDelete.forEach((cookie) => {
			res.headers.append('Set-Cookie', cookie);
		});

		return res;
	} catch (err: any) {
		console.error('[Auth] clear-session error', err);
		return NextResponse.json({ ok: false, message: err?.message ?? 'Unknown error' }, { status: 500 });
	}
}

