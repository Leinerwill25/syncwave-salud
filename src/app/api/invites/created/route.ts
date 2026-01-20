// src/app/api/invites/created/route.ts
export const runtime = 'nodejs'; // obliga Node runtime (crypto, dependencias CJS)

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

type Body = {
	email?: string;
	role?: string;
	expiresAt?: string | null;
	organizationId?: string;
};

type UserRole = 'ADMIN' | 'MEDICO' | 'ENFERMERA' | 'RECEPCION' | 'FARMACIA' | 'PACIENTE';
const VALID_ROLES: UserRole[] = ['ADMIN', 'MEDICO', 'ENFERMERA', 'RECEPCION', 'FARMACIA', 'PACIENTE'];
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_EXPIRES_DAYS = 30;

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function generateToken(lenBytes = 20) {
	return crypto.randomBytes(lenBytes).toString('hex');
}

/** Extrae token desde Authorization header, x-* headers o cookies crudas (server-side) */
function extractAccessTokenFromRequest(req: Request): string | null {
	try {
		const auth = req.headers.get('authorization') || req.headers.get('Authorization');
		if (auth && auth.startsWith('Bearer ')) {
			const t = auth.split(' ')[1].trim();
			if (t) return t;
		}

		const xAuth = req.headers.get('x-access-token') || req.headers.get('x-auth-token');
		if (xAuth) return xAuth;

		const cookieHeader = req.headers.get('cookie') || '';
		if (!cookieHeader) return null;

		const keys = ['sb-access-token', 'sb:token', 'supabase-auth-token', 'sb-session', 'supabase-session', 'sb'];
		for (const k of keys) {
			const match = cookieHeader.match(new RegExp(`${k}=([^;]+)`));
			if (!match) continue;
			const raw = decodeURIComponent(match[1]);
			try {
				const parsed = JSON.parse(raw);
				if (typeof parsed === 'string') return parsed;
				if (parsed?.access_token) return parsed.access_token;
				if (parsed?.currentSession?.access_token) return parsed.currentSession.access_token;
				if (parsed?.session?.access_token) return parsed.session.access_token;
				if (parsed?.token?.access_token) return parsed.token.access_token;
				if (parsed?.accessToken) return parsed.accessToken;
			} catch {
				return raw;
			}
		}
	} catch (err) {
		console.error('extractAccessTokenFromRequest error', err);
	}
	return null;
}

/** Decodifica sub del JWT sin verificar signature — fallback */
function base64UrlDecode(payload: string): string {
	const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
	const pad = b64.length % 4;
	const padded = pad ? b64 + '='.repeat(4 - pad) : b64;
	if (typeof Buffer !== 'undefined') return Buffer.from(padded, 'base64').toString('utf8');
	// fallback (unlikely en runtime=node)
	if (typeof atob !== 'undefined') {
		return decodeURIComponent(Array.prototype.map.call(atob(padded), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
	}
	throw new Error('No base64 decode available');
}
function decodeJwtSub(token: string | null): string | null {
	if (!token) return null;
	try {
		const parts = token.split('.');
		if (parts.length < 2) return null;
		const decoded = base64UrlDecode(parts[1]);
		const obj = JSON.parse(decoded);
		return (obj?.sub as string) ?? (obj?.user_id as string) ?? null;
	} catch {
		return null;
	}
}

export async function POST(req: Request) {
	try {
		// 0) leer body sin lanzar si mal JSON
		const body = (await req.json().catch(() => ({}))) as Body;

		// 1) extraer token del request
		const token = extractAccessTokenFromRequest(req);
		if (!token) return NextResponse.json({ ok: false, message: 'Not authenticated (no token)' }, { status: 401 });

		// 2) crear supabase admin dentro del handler (evita side-effects en module evaluation)
		let supabaseAdmin = null as ReturnType<typeof createClient> | null;
		if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
			supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
		}

		if (!supabaseAdmin) {
			return NextResponse.json({ ok: false, message: 'Supabase no configurado' }, { status: 500 });
		}

		// 3) intentar resolver usuario auth via supabaseAdmin (si está disponible)
		let authUserId: string | null = null;
		if (supabaseAdmin) {
			try {
				const userResp = await supabaseAdmin.auth.getUser(token);
				if ((userResp as any)?.data?.user?.id) authUserId = (userResp as any).data.user.id;
			} catch (err) {
				console.warn('supabaseAdmin.auth.getUser error (continuando con fallback):', err);
			}
		}

		// 4) fallback: decodificar sub del JWT
		if (!authUserId) {
			authUserId = decodeJwtSub(token);
			if (!authUserId) return NextResponse.json({ ok: false, message: 'Not authenticated (could not resolve user)' }, { status: 401 });
		}

		// 5) buscar dbUser por authId usando Supabase
		const { data: dbUser, error: userError } = await supabaseAdmin
			.from('user')
			.select('id, email, role, organizationId, authId')
			.eq('authId', authUserId)
			.maybeSingle();

		if (userError || !dbUser) {
			return NextResponse.json({ ok: false, message: 'User not found in DB' }, { status: 401 });
		}

		// 6) determinamos organizationId (body override allowed but must match user's org)
		const userOrgId = (dbUser as any).organizationId;
		const organizationId = body?.organizationId ?? userOrgId;
		if (!organizationId) return NextResponse.json({ ok: false, message: 'OrganizationId missing' }, { status: 400 });
		if (userOrgId !== organizationId) {
			return NextResponse.json({ ok: false, message: 'Not authorized for this organization' }, { status: 403 });
		}

		// 7) validar email y role
		const emailRaw = body?.email;
		if (!emailRaw || typeof emailRaw !== 'string' || !emailRegex.test(emailRaw.trim())) {
			return NextResponse.json({ ok: false, message: 'Invalid email' }, { status: 400 });
		}
		const email = emailRaw.trim().toLowerCase();

		const roleCandidate = String(body?.role ?? 'PACIENTE')
			.trim()
			.toUpperCase();
		if (!VALID_ROLES.includes(roleCandidate as UserRole)) {
			return NextResponse.json({ ok: false, message: `Invalid role. Allowed: ${VALID_ROLES.join(', ')}` }, { status: 400 });
		}
		const role = roleCandidate as UserRole;

		// 8) comprobar invitación existente dentro de la misma organización
		const { data: existing, error: existingError } = await supabaseAdmin
			.from('invite')
			.select('id, email, organizationId')
			.eq('email', email)
			.eq('organizationId', organizationId)
			.maybeSingle();

		if (existingError && existingError.code !== 'PGRST116') {
			console.error('[invites/created] Error buscando invite existente:', existingError);
			return NextResponse.json({ ok: false, message: 'Error al verificar invitación existente' }, { status: 500 });
		}

		if (existing) {
			const existingInvite = existing as any;
			return NextResponse.json(
				{
					ok: false,
					message: 'Email already assigned to an invitation in this organization.',
					conflict: { email: existingInvite.email, inviteId: existingInvite.id, organizationId: existingInvite.organizationId },
				},
				{ status: 409 }
			);
		}

		// 9) calcular expiresAt
		let expiresAt: Date;
		if (body?.expiresAt) {
			const d = new Date(body.expiresAt);
			if (Number.isNaN(d.getTime())) {
				return NextResponse.json({ ok: false, message: 'Invalid expiresAt. Use ISO datetime' }, { status: 400 });
			}
			expiresAt = d;
		} else {
			expiresAt = new Date(Date.now() + DEFAULT_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
		}

		// 10) generar token e insertar usando Supabase
		const tokenGenerated = generateToken();
		const invitedById = (dbUser as any).id ?? null;

		const { data: created, error: createError } = await supabaseAdmin
			.from('invite')
			.insert({
				organizationId,
				email,
				token: tokenGenerated,
				role,
				invitedById,
				used: false,
				expiresAt: expiresAt.toISOString(),
			} as any)
			.select()
			.single();

		if (createError) {
			console.error('[invites/created] Error creando invite:', createError);
			return NextResponse.json({ ok: false, message: 'Error al crear invitación' }, { status: 500 });
		}

		return NextResponse.json({ ok: true, invite: created }, { status: 201 });
	} catch (err: any) {
		console.error('POST /api/invites/created error', err);
		return NextResponse.json({ ok: false, message: err?.message ?? 'server error' }, { status: 500 });
	}
}
