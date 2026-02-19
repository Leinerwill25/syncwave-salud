// src/app/api/invites/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

type CreateInviteBody = {
	email: string;
	role?: string;
	expiresAt?: string;
};

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const USER_ROLES = ['ADMIN', 'MEDICO', 'ENFERMERA', 'RECEPCION', 'FARMACIA', 'PACIENTE'] as const;
type UserRole = (typeof USER_ROLES)[number];

function parseRoleOrDefault(roleCandidate?: string): UserRole {
	if (!roleCandidate) return 'MEDICO';
	const allowed = USER_ROLES as readonly string[];
	return allowed.includes(roleCandidate) ? (roleCandidate as UserRole) : 'MEDICO';
}

/** Extrae token desde Authorization header, x-* headers o cookies crudas */
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
				return raw;
			}
		}
	} catch (err) {
		console.error('extractAccessTokenFromRequest error', err);
	}
	return null;
}

/** Base64url decode (Node + navegador) */
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

/** Decodifica payload del JWT — devuelve objeto parsed o null */
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

/** Intenta resolver usuario: primero Supabase Admin (si config), luego fallback por sub/email en JWT */
async function resolveDbUserFromToken(token: string | null) {
	if (!token) return null;

	const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
		? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
		: null;

	if (!supabaseAdmin) return null;

	// 1) Si hay SUPABASE admin creds, usarlo
	try {
		const userResp = await supabaseAdmin.auth.getUser(token);
		const supUser = (userResp as any)?.data?.user ?? null;
		if (supUser?.id) {
			// buscar en DB por authId usando Supabase (tabla User según Database.sql)
			const { data: dbUser } = await supabaseAdmin
				.from('users')
				.select('id, email, role, organizationId, authId')
				.eq('authId', supUser.id)
				.maybeSingle();
			if (dbUser) return dbUser;
			// si no existe por authId, intentar por email si la respuesta lo tiene
			if (supUser?.email) {
				const { data: dbByEmail } = await supabaseAdmin
					.from('users')
					.select('id, email, role, organizationId, authId')
					.eq('email', supUser.email)
					.maybeSingle();
				if (dbByEmail) return dbByEmail;
			}
		}
	} catch (err) {
		console.warn('supabaseAdmin.auth.getUser falló, continuando con fallback JWT', err);
	}

	// 2) Fallback: parsear payload del JWT para obtener sub o email
	const payload = decodeJwtPayload(token);
	if (!payload) return null;
	const authId = payload.sub ?? payload.user_id ?? null;
	const email = payload.email ?? null;
	if (authId && supabaseAdmin) {
		const { data: dbUser } = await supabaseAdmin
			.from('users')
			.select('id, email, role, organizationId, authId')
			.eq('authId', authId)
			.maybeSingle();
		if (dbUser) return dbUser;
	}
	if (email && supabaseAdmin) {
		const { data: dbByEmail } = await supabaseAdmin
			.from('users')
			.select('id, email, role, organizationId, authId')
			.eq('email', email)
			.maybeSingle();
		if (dbByEmail) return dbByEmail;
	}
	return null;
}

function isValidEmail(e?: string) {
	if (!e) return false;
	return /^\S+@\S+\.\S+$/.test(e.trim());
}

/** Genera token seguro */
function generateToken() {
	// preferimos randomUUID si está, sino hex
	try {
		if ((crypto as any).randomUUID) return (crypto as any).randomUUID();
		return crypto.randomBytes(20).toString('hex');
	} catch {
		return Math.random().toString(36).slice(2, 12);
	}
}

export async function POST(req: Request) {
	try {
		const token = extractAccessTokenFromRequest(req);
		if (!token) return NextResponse.json({ error: 'Not authenticated (no token)' }, { status: 401 });

		const dbUser = await resolveDbUserFromToken(token);
		if (!dbUser) return NextResponse.json({ error: 'User not found / unauthorized' }, { status: 401 });

		// << FIX: validar organizationId existe y estrechar el tipo >>
		const orgId = dbUser.organizationId;
		if (!orgId) {
			return NextResponse.json({ error: 'User is not associated with an organization' }, { status: 403 });
		}

		// Security: Only allow specific roles to create invites
		const userRole = (dbUser.role || '').toUpperCase();
		const allowedRoles = ['ADMIN', 'MEDICO', 'RECEPCION', 'RECEPCIONISTA'];
		if (!allowedRoles.includes(userRole)) {
			console.warn(`[Invites API] Unauthorized invite attempt by role: ${userRole}`);
			return NextResponse.json({ error: 'Unauthorized: insufficient privileges to create invites' }, { status: 403 });
		}

		const body = (await req.json().catch(() => ({}))) as CreateInviteBody;
		if (!body?.email || !isValidEmail(body.email)) return NextResponse.json({ error: 'email is required and must be valid' }, { status: 400 });

		const email = body.email.trim().toLowerCase();
		const role = parseRoleOrDefault(body.role);
		const expiresAt = body.expiresAt ? new Date(body.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

		// generar token seguro
		const tokenGenerated = generateToken();

		// crear invitación usando Supabase (tabla Invite según Database.sql)
		// Campos: organizationId, email, token, role, invitedById, used, expiresAt, createdAt
		const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
			? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
			: null;

		if (!supabaseAdmin) {
			return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
		}

		const { data: invite, error: inviteError } = await supabaseAdmin
			.from('invite')
			.insert({
				organizationId: orgId,
				email,
				token: tokenGenerated,
				role: role, // USER-DEFINED type según Database.sql
				invitedById: dbUser.id,
				used: false,
				expiresAt: expiresAt.toISOString(),
			})
			.select('id, email, token, role, used, expiresAt, createdAt')
			.single();

		if (inviteError) {
			console.error('[Invites API] Error creando invite:', inviteError);
			return NextResponse.json({ error: 'Error al crear invitación' }, { status: 500 });
		}

		const inviteData = invite as any;
		return NextResponse.json(
			{
				id: inviteData.id,
				email: inviteData.email,
				token: inviteData.token,
				role: inviteData.role,
				used: inviteData.used,
				expiresAt: inviteData.expiresAt ? (typeof inviteData.expiresAt === 'string' ? inviteData.expiresAt : new Date(inviteData.expiresAt).toISOString()) : null,
				createdAt: inviteData.createdAt ? (typeof inviteData.createdAt === 'string' ? inviteData.createdAt : new Date(inviteData.createdAt).toISOString()) : new Date().toISOString(),
			},
			{ status: 201 }
		);
	} catch (err: any) {
		console.error('API POST /api/invites error:', err);
		return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
	}
}

export async function DELETE(req: Request) {
	try {
		const token = extractAccessTokenFromRequest(req);
		if (!token) return NextResponse.json({ error: 'Not authenticated (no token)' }, { status: 401 });

		const dbUser = await resolveDbUserFromToken(token);
		if (!dbUser) return NextResponse.json({ error: 'User not found / unauthorized' }, { status: 401 });

		const { id } = (await req.json().catch(() => ({}))) as { id?: string };
		if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

		const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
			? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
			: null;

		if (!supabaseAdmin) {
			return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
		}

		const { data: existing, error: findError } = await supabaseAdmin
			.from('invite')
			.select('organizationId')
			.eq('id', id)
			.maybeSingle();

		if (findError || !existing) {
			return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
		}
		const existingOrgId = (existing as any).organizationId;
		if (existingOrgId !== dbUser.organizationId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
		}

		const { error: deleteError } = await supabaseAdmin
			.from('invite')
			.delete()
			.eq('id', id);

		if (deleteError) {
			console.error('[Invites API] Error eliminando invite:', deleteError);
			return NextResponse.json({ error: 'Error al eliminar invitación' }, { status: 500 });
		}

		return NextResponse.json({ ok: true });
	} catch (err: any) {
		console.error('API DELETE /api/invites error:', err);
		return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
	}
}
