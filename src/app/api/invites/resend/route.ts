// src/app/api/invites/resend/route.ts
export const runtime = 'nodejs'; // obliga runtime node (supabase admin, etc.)

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/** Config desde env */
const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

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

		const cookieHeader = req.headers.get('cookie') ?? '';
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
				// not JSON -> raw token
				return raw;
			}
		}
	} catch (err) {
		console.error('extractAccessTokenFromRequest error', err);
	}
	return null;
}

/** Base64url decode compatible con Node y navegadores */
function base64UrlDecode(payload: string): string {
	const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
	const pad = b64.length % 4;
	const padded = pad ? b64 + '='.repeat(4 - pad) : b64;

	if (typeof Buffer !== 'undefined') return Buffer.from(padded, 'base64').toString('utf8');
	if (typeof atob !== 'undefined') {
		// browser fallback
		return decodeURIComponent(Array.prototype.map.call(atob(padded), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
	}
	throw new Error('No base64 decode available');
}

/** Decodifica sub del JWT sin verificar signature — sólo fallback */
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

/** Busca el usuario en la DB por authId o email usando Supabase */
async function findDbUserBySupabaseUser(supabaseUser: any, supabaseAdmin: any) {
	if (!supabaseUser || !supabaseAdmin) return null;
	const authId = supabaseUser.id ?? null;
	const email = supabaseUser.email ?? null;
	let dbUser = null;
	if (authId) {
		const { data } = await supabaseAdmin
			.from('user')
			.select('id, email, role, organizationId, authId')
			.eq('authId', authId)
			.maybeSingle();
		dbUser = data;
	}
	if (!dbUser && email) {
		const { data } = await supabaseAdmin
			.from('user')
			.select('id, email, role, organizationId, authId')
			.eq('email', email)
			.maybeSingle();
		dbUser = data;
	}
	return dbUser;
}

/** Envía correo usando Resend */
async function sendInviteEmail(opts: { to: string; token: string; organizationId: string; inviteBaseUrl?: string | undefined }, supabaseAdmin: any) {
	try {
		const { sendNotificationEmail } = await import('@/lib/email');
		const base = opts.inviteBaseUrl ?? process.env.NEXT_PUBLIC_INVITE_BASE_URL ?? '';
		const origin = base ? base.replace(/\/$/, '') : process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : '';
		const url = `${origin}/invite/${opts.token}`;

		// Obtener nombre de la organización y rol usando Supabase
		let organizationName: string | undefined;
		let role: string | undefined;
		try {
			const { data: org } = await supabaseAdmin
				.from('organization')
				.select('name')
				.eq('id', opts.organizationId)
				.maybeSingle();
			organizationName = (org as any)?.name || undefined;

			const { data: invite } = await supabaseAdmin
				.from('invite')
				.select('role')
				.eq('token', opts.token)
				.maybeSingle();
			role = (invite as any)?.role?.toString() || undefined;
		} catch {
			// Ignorar error
		}

		const result = await sendNotificationEmail('INVITE', opts.to, {
			inviteUrl: url,
			organizationName,
			role,
		});

		return result.success;
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Unknown error';
		console.error('[sendInviteEmail] Exception:', errorMessage);
		return false;
	}
}

export async function POST(request: Request) {
	try {
		if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
			return NextResponse.json({ ok: false, message: 'Supabase no configurado' }, { status: 500 });
		}

		// 1) Extraer token del request
		const token = extractAccessTokenFromRequest(request);
		if (!token) return NextResponse.json({ ok: false, message: 'No autenticado (token ausente)' }, { status: 401 });

		// 2) Crear supabaseAdmin dentro del handler (evita side-effects en module evaluation)
		const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

		// 3) Intentar resolver supabase user vía supabaseAdmin
		let supabaseUser: any = null;
		try {
			const userResp = await supabaseAdmin.auth.getUser(token);
			if ((userResp as any)?.data?.user) supabaseUser = (userResp as any).data.user;
		} catch (err) {
			console.warn('[resend] supabaseAdmin.auth.getUser falló, se usará fallback', err);
		}

		// 4) Fallback: decodificar sub del JWT
		if (!supabaseUser) {
			const sub = decodeJwtSub(token);
			if (sub) {
				// Si sólo tenemos sub, intentamos buscar en DB por authId
				supabaseUser = { id: sub };
			}
		}

		// 5) Obtener dbUser usando Supabase
		const dbUser = await findDbUserBySupabaseUser(supabaseUser, supabaseAdmin);
		if (!dbUser) return NextResponse.json({ ok: false, message: 'No autorizado — usuario no encontrado' }, { status: 401 });

		// 6) leer body e id de invite
		const body = await request.json().catch(() => ({}));
		const { id, organizationId: orgIdFromBody } = body ?? {};
		if (!id) return NextResponse.json({ ok: false, message: 'Missing invite id' }, { status: 400 });

		// 7) traer invitación usando Supabase
		const { data: invite, error: inviteError } = await supabaseAdmin
			.from('invite')
			.select('*')
			.eq('id', id)
			.maybeSingle();

		if (inviteError || !invite) {
			return NextResponse.json({ ok: false, message: 'Invitación no encontrada' }, { status: 404 });
		}

		const inviteData = invite as any;

		if (!inviteData.email || !inviteData.token) {
			console.error('Invite no tiene email o token:', inviteData);
			return NextResponse.json({ ok: false, message: 'Invitación inválida (falta email o token)' }, { status: 400 });
		}

		// 8) validar organización: el usuario debe pertenecer a la misma org de la invitación
		const orgIdUser = (dbUser as any).organizationId;
		const effectiveOrgId = orgIdUser ?? orgIdFromBody;
		if (!effectiveOrgId || inviteData.organizationId !== effectiveOrgId) {
			return NextResponse.json({ ok: false, message: 'No autorizado para reenviar esta invitación' }, { status: 403 });
		}

		// 9) obtener organización para base url si aplica usando Supabase
		const { data: org } = await supabaseAdmin
			.from('organization')
			.select('inviteBaseUrl')
			.eq('id', inviteData.organizationId)
			.maybeSingle();
		const inviteBaseUrl: string | undefined = (org as any)?.inviteBaseUrl ?? process.env.NEXT_PUBLIC_INVITE_BASE_URL ?? undefined;

		// 10) enviar correo (implementa tu provider real)
		const sent = await sendInviteEmail(
			{
				to: inviteData.email,
				token: inviteData.token,
				organizationId: inviteData.organizationId,
				inviteBaseUrl,
			},
			supabaseAdmin
		);
		if (!sent) throw new Error('No se pudo enviar el correo');

		// 11) actualizar createdAt (o updatedAt) para registrar reenvío usando Supabase
		await supabaseAdmin
			.from('invite')
			.update({ createdAt: new Date().toISOString() } as any)
			.eq('id', id);

		return NextResponse.json({ ok: true });
	} catch (err: any) {
		console.error('POST /api/invites/resend error', err);
		return NextResponse.json({ ok: false, message: err?.message ?? 'Server error' }, { status: 500 });
	}
}
