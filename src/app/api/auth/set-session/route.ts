// src/app/api/auth/set-session/route.ts
import { NextResponse } from 'next/server';
import { serialize } from 'cookie';

type Body = {
	access_token?: string;
	refresh_token?: string;
	expires_in?: number; // segundos
	session?: any;
};

// Opciones genéricas para cookies
const cookieOpts = (maxAge?: number) => ({
	httpOnly: true,
	secure: process.env.NODE_ENV === 'production', // false en localhost
	sameSite: 'lax' as const,
	path: '/',
	maxAge,
});

// Crea payload que Supabase SSR espera en la cookie sb:token
function makeSbTokenPayload(access_token: string, refresh_token: string | null, expiresAtSeconds: number) {
	return JSON.stringify({
		currentSession: {
			access_token,
			expires_at: expiresAtSeconds,
			refresh_token: refresh_token ?? null,
			provider_token: null,
		},
		persistSession: true,
	});
}

export async function POST(req: Request) {
	try {
		const body = (await req.json()) as Body;
		const { access_token, refresh_token, expires_in, session } = body;

		if (!access_token) {
			return NextResponse.json({ ok: false, message: 'access_token missing' }, { status: 400 });
		}

		const maxAge = typeof expires_in === 'number' && expires_in > 0 ? Math.floor(expires_in) : 60 * 60;
		const expiresAtSeconds = Math.floor(Date.now() / 1000) + maxAge;

		const cookiesToSet: string[] = [];

		// Cookie simple de access token
		cookiesToSet.push(serialize('sb-access-token', access_token, cookieOpts(maxAge)));

		// Cookie de refresh token
		if (refresh_token) {
			cookiesToSet.push(serialize('sb-refresh-token', refresh_token, cookieOpts(60 * 60 * 24 * 30))); // 30 días
		}

		// Cookie sb:token que Supabase SSR utiliza
		const sbTokenPayload = makeSbTokenPayload(access_token, refresh_token ?? null, expiresAtSeconds);
		cookiesToSet.push(serialize('sb:token', sbTokenPayload, cookieOpts(maxAge)));

		// Cookie alternativa para compatibilidad
		cookiesToSet.push(serialize('supabase-auth-token', sbTokenPayload, cookieOpts(maxAge)));

		// Cookie opcional con la sesión completa (solo si la envían)
		if (session) {
			const s = typeof session === 'string' ? session : JSON.stringify(session);
			cookiesToSet.push(serialize('sb-session', s, cookieOpts(maxAge)));
		}

		// Enviar todas las cookies en la respuesta
		const res = NextResponse.json({ ok: true }, { status: 200 });
		cookiesToSet.forEach((c) => res.headers.append('Set-Cookie', c));

		return res;
	} catch (err: any) {
		console.error('[Auth] set-session error', err);
		return NextResponse.json({ ok: false, message: err?.message ?? 'Unknown error' }, { status: 500 });
	}
}
