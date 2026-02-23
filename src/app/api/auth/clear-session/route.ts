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

export async function POST(req: Request) {
	try {
		const cookiesToDelete: string[] = [];

		// 1. Obtener cookies enviadas en la petición para identificar nombres dinámicos
		const cookieHeader = req.headers.get('cookie') || '';
		const currentCookies = cookieHeader.split(';').map(c => c.trim().split('=')[0]);

		// 2. Identificar cookies que deben ser eliminadas
		const toClear = new Set([...SESSION_COOKIES]);
		currentCookies.forEach(name => {
			if (name.includes('supabase') || name.startsWith('sb-') || name.includes('auth-token')) {
				toClear.add(name);
			}
		});

		// 3. Crear headers Set-Cookie para eliminar cada cookie detectada
		toClear.forEach((cookieName) => {
			if (cookieName) {
				cookiesToDelete.push(serialize(cookieName, '', deleteCookieOpts));
			}
		});

		const res = NextResponse.json({ ok: true, message: 'Sesión limpiada totalmente' }, { status: 200 });
		
		// 4. Agregar todos los headers Set-Cookie
		cookiesToDelete.forEach((cookie) => {
			res.headers.append('Set-Cookie', cookie);
		});

		return res;
	} catch (err: any) {
		console.error('[Auth] clear-session error', err);
		return NextResponse.json({ ok: false, message: err?.message ?? 'Unknown error' }, { status: 500 });
	}
}

