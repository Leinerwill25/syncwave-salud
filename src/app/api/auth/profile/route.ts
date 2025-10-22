import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies, headers } from 'next/headers';

// Variables de entorno
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
	console.warn('Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. /api/auth/profile will fail to validate tokens.');
}

// Cliente admin de Supabase (con service role key)
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null;

// Helper para extraer token del header o cookies
async function extractAccessTokenFromCookies(): Promise<string | null> {
	try {
		const ck = await cookies();
		const candidates = [ck.get('sb-access-token')?.value, ck.get('supabase-auth-token')?.value, ck.get('sb:token')?.value];

		for (const c of candidates) {
			if (!c) continue;
			try {
				const parsed = JSON.parse(c);
				if (parsed?.access_token) return parsed.access_token;
			} catch {
				return c; // si no es JSON, devuelve el valor literal
			}
		}
	} catch (err) {
		console.error('Error reading cookies in server:', err);
	}
	return null;
}

export async function GET(req: NextRequest) {
	try {
		if (!supabaseAdmin) {
			return NextResponse.json({ ok: false, message: 'Supabase admin client not configured on server.' }, { status: 500 });
		}

		// 1️⃣ Intentar leer token desde header o cookie
		const hdrs = await headers();
		const authHeader = hdrs.get('authorization') || hdrs.get('Authorization') || req.headers.get('authorization');
		let token: string | null = null;

		if (authHeader && authHeader.startsWith('Bearer ')) {
			token = authHeader.split(' ')[1];
		} else if (req.headers.get('x-auth-token')) {
			token = req.headers.get('x-auth-token');
		} else {
			token = await extractAccessTokenFromCookies();
		}

		if (!token) {
			return NextResponse.json({ ok: false, message: 'No access token provided (header or cookie).' }, { status: 401 });
		}

		// 2️⃣ Obtener usuario desde Supabase Auth
		let userResp;
		try {
			userResp = await supabaseAdmin.auth.getUser(token);
		} catch (err) {
			console.error('supabaseAdmin.auth.getUser error:', err);
			return NextResponse.json({ ok: false, message: 'Error validating token with Supabase.' }, { status: 401 });
		}

		const supaUser = (userResp as any)?.data?.user ?? null;
		if (!supaUser || !supaUser.id) {
			console.warn('Token did not resolve to a supabase user', userResp);
			return NextResponse.json({ ok: false, message: 'Token inválido o expirado.' }, { status: 401 });
		}

		const authId = supaUser.id as string;
		const email = supaUser.email as string | null;

		// 3️⃣ Buscar en tabla User del schema público de Supabase
		const { data: user, error: userErr } = await supabaseAdmin.from('User').select('id, role, organizationId, used').eq('authId', authId).maybeSingle();

		if (userErr) {
			console.error('Error fetching user row from Supabase:', userErr);
			return NextResponse.json({ ok: false, message: 'Error interno al consultar el usuario.' }, { status: 500 });
		}

		if (!user) {
			console.warn(`No app user linked for authId=${authId}. supabase user email=${email}`);
			return NextResponse.json({ ok: false, message: 'Usuario no encontrado en la aplicación.' }, { status: 404 });
		}

		// 4️⃣ Si el usuario está desactivado (used = false)
		if (user.used === false) {
			return NextResponse.json({ message: 'Tu cuenta está suspendida. Contacta con soporte.' }, { status: 403 });
		}

		// 5️⃣ OK — devolver datos del perfil
		return NextResponse.json({
			ok: true,
			data: {
				userId: user.id,
				role: user.role,
				organizationId: user.organizationId,
			},
		});
	} catch (err: any) {
		console.error('GET /api/auth/profile error:', err);
		return NextResponse.json({ ok: false, message: err?.message || 'Error interno del servidor' }, { status: 500 });
	}
}
