// src/app/api/auth/set-session/route.ts
import { NextResponse } from 'next/server';
import { serialize } from 'cookie';

type Body = {
	access_token?: string;
	refresh_token?: string;
	expires_in?: number; // seconds
	// opcional: session object completo si lo tienes
	session?: any;
};

function cookieOpts(maxAge?: number) {
	return {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax' as const,
		path: '/',
		maxAge,
	};
}

export async function POST(req: Request) {
	try {
		const body = (await req.json()) as Body;
		const { access_token, refresh_token, expires_in, session } = body;

		if (!access_token) {
			return NextResponse.json({ ok: false, message: 'access_token missing' }, { status: 400 });
		}

		const maxAge = typeof expires_in === 'number' && expires_in > 0 ? Math.floor(expires_in) : 60 * 60; // 1h por defecto
		const expiresAt = Date.now() + maxAge * 1000;

		// Formato "sb:token" suele ser JSON con tokens/expiración (imitamos lo que algunos helpers esperan)
		const sbTokenPayload = JSON.stringify({
			access_token,
			token_type: 'bearer',
			expires_at: Math.floor(expiresAt / 1000), // segundos
			refresh_token: refresh_token ?? null,
		});

		// Forma compacta para algunos helpers / debug
		const supabaseAuthToken = JSON.stringify({
			currentSession: {
				access_token,
				refresh_token: refresh_token ?? null,
				expires_at: Math.floor(expiresAt / 1000),
			},
			// opcional: provider token / other fields if you have them
		});

		// Preparamos cookies (añadimos varios nombres para compatibilidad)
		const cookiesToSet: string[] = [];

		// acceso y refresh como cookies individuales (tu código anterior)
		cookiesToSet.push(serialize('sb-access-token', access_token, cookieOpts(maxAge)));
		if (refresh_token) {
			cookiesToSet.push(
				serialize('sb-refresh-token', refresh_token, cookieOpts(60 * 60 * 24 * 30)) // 30 días
			);
		}

		// cookie con payload JSON que algunos helpers esperan
		cookiesToSet.push(serialize('sb:token', sbTokenPayload, cookieOpts(maxAge)));

		// cookie alternativa que algunos proyectos usan (stringified session)
		cookiesToSet.push(serialize('supabase-auth-token', supabaseAuthToken, cookieOpts(maxAge)));

		// Si el cliente te envía un objeto session completo, lo guardamos también como 'sb.session' (opcional)
		if (session) {
			try {
				const s = typeof session === 'string' ? session : JSON.stringify(session);
				cookiesToSet.push(serialize('sb-session', s, cookieOpts(maxAge)));
			} catch {
				// ignore
			}
		}

		const res = NextResponse.json({ ok: true }, { status: 200 });
		// Append each Set-Cookie
		for (const c of cookiesToSet) {
			res.headers.append('Set-Cookie', c);
		}

		return res;
	} catch (err: any) {
		console.error('set-session error', err);
		return NextResponse.json({ ok: false, message: err?.message ?? 'error' }, { status: 500 });
	}
}
