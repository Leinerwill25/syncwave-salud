// src/app/api/invite/send/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const NEXT_PUBLIC_INVITE_BASE_URL = process.env.NEXT_PUBLIC_INVITE_BASE_URL ?? '';
const NEXT_PUBLIC_VERCEL_URL = process.env.NEXT_PUBLIC_VERCEL_URL ?? '';
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'no-reply@yourdomain.com';

/** Extrae token desde Authorization header, x-* headers o cookies crudas (server-side) */
function extractAccessTokenFromRequest(req: Request): string | null {
	try {
		const auth = req.headers.get('authorization') || req.headers.get('Authorization');
		if (auth && auth.startsWith('Bearer ')) return auth.split(' ')[1].trim();

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
				// not JSON -> raw token
				return raw;
			}
		}
	} catch (err) {
		console.error('extractAccessTokenFromRequest error', err);
	}
	return null;
}

/** Base64url decode compatible Node/browser */
function base64UrlDecode(payload: string): string {
	const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
	const pad = b64.length % 4;
	const padded = pad ? b64 + '='.repeat(4 - pad) : b64;
	if (typeof Buffer !== 'undefined') return Buffer.from(padded, 'base64').toString('utf8');
	if (typeof atob !== 'undefined') {
		return decodeURIComponent(Array.prototype.map.call(atob(padded), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
	}
	throw new Error('No base64 decode available');
}

/** Decodifica sub/email del JWT (sin verificar firma) — solo fallback */
function decodeJwtPayload(token: string | null): any | null {
	if (!token) return null;
	try {
		const parts = token.split('.');
		if (parts.length < 2) return null;
		const decoded = base64UrlDecode(parts[1]);
		return JSON.parse(decoded);
	} catch {
		return null;
	}
}

/** Resuelve el dbUser dado un token.
 *  Intenta Supabase Admin (si hay credenciales), sino fallback con payload JWT.
 */
async function resolveDbUserFromToken(token: string | null) {
	if (!token) return null;

	// 1) Supabase Admin si está configurado
	if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
		try {
			const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
			const userResp = await supabaseAdmin.auth.getUser(token);
			const supUser = (userResp as any)?.data?.user ?? null;
			if (supUser?.id) {
				let dbUser = await prisma.user.findFirst({ where: { authId: supUser.id } });
				if (dbUser) return dbUser;
				if (supUser?.email) {
					dbUser = await prisma.user.findFirst({ where: { email: supUser.email } });
					if (dbUser) return dbUser;
				}
			}
		} catch (err) {
			console.warn('supabaseAdmin.auth.getUser failed, will fallback to JWT payload', err);
		}
	}

	// 2) Fallback: decode JWT payload
	const payload = decodeJwtPayload(token);
	if (!payload) return null;
	const authId = payload.sub ?? payload.user_id ?? null;
	const email = payload.email ?? null;
	if (authId) {
		const dbUser = await prisma.user.findFirst({ where: { authId } });
		if (dbUser) return dbUser;
	}
	if (email) {
		const dbUser = await prisma.user.findFirst({ where: { email } });
		if (dbUser) return dbUser;
	}
	return null;
}

/** Envía correo usando Resend */
async function sendInviteEmail(opts: { to: string; token: string; organizationId: string; inviteBaseUrl?: string | undefined }) {
	try {
		const { sendNotificationEmail } = await import('@/lib/email');
		const base = opts.inviteBaseUrl ?? NEXT_PUBLIC_INVITE_BASE_URL ?? '';
		const origin = base ? base.replace(/\/$/, '') : NEXT_PUBLIC_VERCEL_URL ? `https://${NEXT_PUBLIC_VERCEL_URL}` : '';
		const url = `${origin}/invite/${opts.token}`;

		// Obtener nombre de la organización
		let organizationName: string | undefined;
		try {
			const org = await prisma.organization.findUnique({ 
				where: { id: opts.organizationId },
				select: { name: true }
			});
			organizationName = org?.name || undefined;
		} catch {
			// Ignorar error
		}

		// Obtener rol de la invitación
		let role: string | undefined;
		try {
			const invite = await prisma.invite.findUnique({
				where: { token: opts.token },
				select: { role: true }
			});
			role = invite?.role?.toString() || undefined;
		} catch {
			// Ignorar error
		}

		const result = await sendNotificationEmail('INVITE', opts.to, {
			inviteUrl: url,
			organizationName,
			role,
		});

		if (result.success) {
			console.log('[sendInviteEmail] Email enviado exitosamente a', opts.to);
			return true;
		} else {
			console.error('[sendInviteEmail] Error enviando email:', result.error);
			return false;
		}
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Unknown error';
		console.error('[sendInviteEmail] Exception:', errorMessage);
		return false;
	}
}

export async function POST(req: Request) {
	try {
		const token = extractAccessTokenFromRequest(req);
		if (!token) return NextResponse.json({ ok: false, message: 'No autenticado (token ausente)' }, { status: 401 });

		const dbUser = await resolveDbUserFromToken(token);
		if (!dbUser) return NextResponse.json({ ok: false, message: 'Usuario no encontrado / no autorizado' }, { status: 401 });

		const body = await req.json().catch(() => ({}));
		const { id, email } = body ?? {};
		if (!id) return NextResponse.json({ ok: false, message: 'Missing invite id' }, { status: 400 });
		if (!email || typeof email !== 'string' || !/\S+@\S+\.\S+/.test(email)) return NextResponse.json({ ok: false, message: 'Email inválido' }, { status: 400 });

		const normalizedEmail = email.trim().toLowerCase();

		// traer invitación
		const invite = await prisma.invite.findUnique({ where: { id } });
		if (!invite) return NextResponse.json({ ok: false, message: 'Invitación no encontrada' }, { status: 404 });

		// verificar pertenencia org del usuario
		const orgIdUser = dbUser.organizationId;
		if (!orgIdUser || invite.organizationId !== orgIdUser) {
			return NextResponse.json({ ok: false, message: 'No autorizado para enviar esta invitación' }, { status: 403 });
		}

		// comprobar que no exista otra invitación con ese email en la misma org (excluyendo la actual)
		const existing = await prisma.invite.findFirst({
			where: { email: normalizedEmail, organizationId: invite.organizationId },
			select: { id: true, email: true },
		});
		if (existing && existing.id !== id) {
			return NextResponse.json({ ok: false, message: 'El correo ya está asignado a otra invitación en la organización.', conflict: { email: existing.email, inviteId: existing.id } }, { status: 409 });
		}

		// obtener inviteBaseUrl desde organización si existe
		const org = await prisma.organization.findUnique({ where: { id: invite.organizationId } });
		const inviteBaseUrl = org?.inviteBaseUrl ?? NEXT_PUBLIC_INVITE_BASE_URL ?? undefined;

		// actualizar email en la invitación (si cambió)
		const updatedInvite = await prisma.invite.update({ where: { id }, data: { email: normalizedEmail } });

		// enviar correo usando token actual
		const sent = await sendInviteEmail({ to: normalizedEmail, token: updatedInvite.token, organizationId: updatedInvite.organizationId, inviteBaseUrl });
		if (!sent) throw new Error('No se pudo enviar el correo');

		return NextResponse.json({ ok: true });
	} catch (err: any) {
		console.error('POST /api/invite/send error', err);
		return NextResponse.json({ ok: false, message: err?.message ?? 'Server error' }, { status: 500 });
	}
}
