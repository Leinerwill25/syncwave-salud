import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const { access_token, refresh_token } = body;

		if (!access_token) {
			return NextResponse.json({ ok: false, message: 'access_token missing' }, { status: 400 });
		}

		const response = NextResponse.json({ ok: true }, { status: 200 });
		const cookieStore = await cookies();

		const supabase = createServerClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
			{
				cookies: {
					getAll() {
						return cookieStore.getAll();
					},
					setAll(cookiesToSet) {
						cookiesToSet.forEach(({ name, value, options }) =>
							response.cookies.set(name, value, options)
						);
					},
				},
			}
		);

		// Esto establece las cookies correctamente en la respuesta usando el SDK
		await supabase.auth.setSession({
			access_token,
			refresh_token: refresh_token || '',
		});

		// También establecemos una cookie simple para nuestros guards manuales que buscan 'sb-access-token'
		response.cookies.set('sb-access-token', access_token, {
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7, // 7 días
		});

		return response;
	} catch (err: any) {
		console.error('[Auth] set-session error', err);
		return NextResponse.json({ ok: false, message: err?.message ?? 'Unknown error' }, { status: 500 });
	}
}
