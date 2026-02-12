import { createClient } from '@supabase/supabase-js';
import { cookies, headers } from 'next/headers';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const TEST_ORG_ID = process.env.TEST_ORG_ID ?? null;

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null;

function safeJsonParse<T = any>(v: string | null | undefined): T | null {
	if (!v) return null;
	try {
		return JSON.parse(v) as T;
	} catch {
		return null;
	}
}

async function getAccessTokenFromRequest(): Promise<string | null> {
	try {
		const hdrs = await headers();
		const authHeader = hdrs.get('authorization') || hdrs.get('Authorization');
		if (authHeader && authHeader.startsWith('Bearer ')) {
			const t = authHeader.split(' ')[1].trim();
			if (t) return t;
		}
		const xAuth = hdrs.get('x-auth-token') || hdrs.get('x-access-token');
		if (xAuth) return xAuth;

		const ck = await cookies();
		const knownKeys = ['sb-access-token', 'sb:token', 'supabase-auth-token', 'sb-session', 'supabase-session', 'sb'];

		for (const k of knownKeys) {
			const c = ck.get(k);
			const val = c?.value ?? null;
			if (!val) continue;
			const parsed = safeJsonParse<any>(val);
			if (!parsed) return val;
			if (typeof parsed === 'string') return parsed;
			if (parsed?.access_token && typeof parsed.access_token === 'string') return parsed.access_token;
			if (parsed?.currentSession?.access_token) return parsed.currentSession.access_token;
			if (parsed?.session?.access_token) return parsed.session.access_token;
			if (parsed?.token?.access_token) return parsed.token.access_token;
			if (parsed?.accessToken && typeof parsed.accessToken === 'string') return parsed.accessToken;
		}
	} catch (err) {
		console.error('getAccessTokenFromRequest error:', err);
	}
	return null;
}

function decodeJwtSub(token: string | null): string | null {
	if (!token) return null;
	try {
		const parts = token.split('.');
		if (parts.length < 2) return null;
		const payload = parts[1];
		const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
		const pad = b64.length % 4;
		const padded = pad ? b64 + '='.repeat(4 - pad) : b64;
		const decoded = Buffer.from(padded, 'base64').toString('utf8');
		const obj = JSON.parse(decoded);
		return (obj?.sub as string) ?? (obj?.user_id as string) ?? null;
	} catch {
		// ignore
	}
	return null;
}

async function getSupabaseAuthIdFromRequest(): Promise<string | null> {
	if (!supabaseAdmin) return null;

	try {
		const hdrs = await headers();
		const directAuthId = hdrs.get('x-auth-id') || hdrs.get('x-auth') || null;
		if (directAuthId) return directAuthId;
	} catch {}

	const token = await getAccessTokenFromRequest();
	if (!token) return null;

	try {
		const userResp = await supabaseAdmin.auth.getUser(token);
		if ((userResp as any)?.data?.user?.id) {
			return (userResp as any).data.user.id;
		}
	} catch (err) {
		console.error('getSupabaseAuthIdFromRequest supabase error:', err);
	}

	return decodeJwtSub(token);
}

export async function getCurrentOrganizationId(): Promise<string | null> {
	if (TEST_ORG_ID) return TEST_ORG_ID;

	const authId = await getSupabaseAuthIdFromRequest();
	if (!authId) return null;

	if (!supabaseAdmin) return null;

	try {
		const { data, error } = await supabaseAdmin.from('users').select('organizationId').eq('authId', authId).limit(1).maybeSingle();

		if (error) {
			console.warn('Supabase: error fetching user organizationId:', error);
		} else if (data) {
			return data.organizationId ?? null;
		}
	} catch (err) {
		console.error('getCurrentOrganizationId supabase error:', err);
	}

	const token = await getAccessTokenFromRequest();
	if (token) {
		try {
			const parts = token.split('.');
			if (parts.length >= 2) {
				const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
				const pad = payload.length % 4;
				const padded = pad ? payload + '='.repeat(4 - pad) : payload;
				const decoded = Buffer.from(padded, 'base64').toString('utf8');
				const obj = JSON.parse(decoded);
				if (obj?.organizationId) return obj.organizationId;
			}
		} catch {}
	}

	return null;
}
