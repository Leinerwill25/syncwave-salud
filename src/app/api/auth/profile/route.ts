// app/api/auth/profile/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import { cookies, headers } from 'next/headers';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
	console.warn('Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. /api/auth/profile will fail to validate tokens.');
}

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null;

async function extractAccessTokenFromCookies(): Promise<string | null> {
	try {
		const ck = await cookies(); // important: await
		// common cookie names used by Supabase / different setups
		const candidates = [
			ck.get('sb-access-token')?.value,
			ck.get('supabase-auth-token')?.value,
			ck.get('sb:token')?.value,
			// sometimes supabase stores a JSON with access_token inside 'supabase-auth-token'
		];

		for (const c of candidates) {
			if (!c) continue;
			// If cookie value is JSON (supabase-auth-token), try to parse
			try {
				const parsed = JSON.parse(c);
				if (parsed?.access_token) return parsed.access_token;
			} catch (e) {
				// not JSON, treat as token string
				return c;
			}
		}
	} catch (err) {
		console.error('Error reading cookies in server:', err);
	}
	return null;
}

export async function GET(req: NextRequest) {
	try {
		// 1) Accept direct authId (retrocompat)
		const directAuthId = req.headers.get('x-auth-id') || req.nextUrl.searchParams.get('authId');
		if (directAuthId) {
			const user = await prisma.user.findUnique({
				where: { authId: directAuthId },
				select: { id: true, role: true, organizationId: true },
			});
			if (!user) return NextResponse.json({ ok: false, message: 'Usuario no encontrado (authId provided).' }, { status: 404 });
			return NextResponse.json({ ok: true, data: { userId: user.id, role: user.role, organizationId: user.organizationId } });
		}

		// 2) Otherwise, attempt to extract access token from Authorization header or cookies
		// headers() returns ReadonlyHeaders when awaited in App Router environment
		const hdrs = await headers();
		const authHeader = hdrs.get('authorization') || hdrs.get('Authorization') || req.headers.get('authorization');
		let token: string | null = null;

		if (authHeader && authHeader.startsWith('Bearer ')) {
			token = authHeader.split(' ')[1];
		} else if (req.headers.get('x-auth-token')) {
			token = req.headers.get('x-auth-token');
		} else {
			// try cookies
			token = await extractAccessTokenFromCookies();
		}

		if (!token) {
			return NextResponse.json({ ok: false, message: 'No access token provided (header or cookie).' }, { status: 401 });
		}

		if (!supabaseAdmin) {
			return NextResponse.json({ ok: false, message: 'Supabase admin client not configured on server.' }, { status: 500 });
		}

		// Use supabase admin client to resolve user by access token
		// Note: getUser accepts an access token and returns user info
		let userResp;
		try {
			userResp = await supabaseAdmin.auth.getUser(token);
		} catch (err) {
			console.error('supabaseAdmin.auth.getUser error:', err);
			return NextResponse.json({ ok: false, message: 'Error validating token with Supabase.' }, { status: 401 });
		}

		const supaUser = (userResp as any)?.data?.user ?? null;
		if (!supaUser || !supaUser.id) {
			// sometimes getUser returns error or null user
			console.warn('Token did not resolve to a supabase user', userResp);
			return NextResponse.json({ ok: false, message: 'Token inválido o expirado.' }, { status: 401 });
		}

		const authId = supaUser.id as string;

		// Now find our app user by authId
		const appUser = await prisma.user.findUnique({
			where: { authId },
			select: { id: true, role: true, organizationId: true },
		});

		if (!appUser) {
			// helpful debug message — often the reason you see 'no org' is because authId wasn't stored during register
			console.warn(`No app user linked for authId=${authId}. supabase user email=${supaUser.email}`);
			return NextResponse.json({ ok: false, message: 'Usuario no encontrado en la aplicación (authId no enlazado).' }, { status: 404 });
		}

		return NextResponse.json({
			ok: true,
			data: { userId: appUser.id, role: appUser.role, organizationId: appUser.organizationId },
		});
	} catch (err: any) {
		console.error('GET /api/auth/profile error:', err);
		return NextResponse.json({ ok: false, message: err?.message || 'Error interno' }, { status: 500 });
	}
}
