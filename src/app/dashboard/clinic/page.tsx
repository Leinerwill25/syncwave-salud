import React from 'react';
import prisma from '@/lib/prisma';
import ClinicStats from '@/components/ClinicStats';
import InviteList from '@/components/InviteList';
import SpecialistsTable from '@/components/SpecialistsTable';
import PatientsList from '@/components/PatientsList';

import { createClient } from '@supabase/supabase-js';
import { cookies, headers } from 'next/headers';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const TEST_ORG_ID = process.env.TEST_ORG_ID ?? null;

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null;

/** safe JSON parse helper */
function safeJsonParse<T = any>(v: string | null | undefined): T | null {
	if (!v) return null;
	try {
		return JSON.parse(v) as T;
	} catch {
		return null;
	}
}

/**
 * IMPORTANTE: en tu entorno headers() y cookies() devuelven Promises,
 * por eso esta función es async y hace `await headers()` y `await cookies()`.
 *
 * Esta versión es más robusta: revisa Authorization header, varios nombres de cookie,
 * y como fallback parsea la cabecera 'cookie'.
 */
async function getAccessTokenFromRequest(): Promise<string | null> {
	try {
		const hdrs = await headers();

		// 1) Authorization header (Bearer)
		const authHeader = hdrs.get('authorization') || hdrs.get('Authorization');
		if (authHeader && authHeader.startsWith('Bearer ')) {
			const t = authHeader.split(' ')[1].trim();
			if (t) return t;
		}

		// 2) x-auth-token or x-access-token
		const xAuth = hdrs.get('x-auth-token') || hdrs.get('x-access-token');
		if (xAuth) return xAuth;

		// 3) Cookies via next/headers()
		const ck = await cookies();
		const knownKeys = ['sb-access-token', 'sb:token', 'supabase-auth-token', 'sb-session', 'supabase-session', 'sb'];

		for (const k of knownKeys) {
			const c = ck.get(k);
			const val = c?.value ?? null;
			if (!val) continue;
			// puede ser token crudo o JSON con estructuras
			const parsed = safeJsonParse<any>(val);
			if (!parsed) {
				// token crudo
				return val;
			}
			// parsed could be several shapes
			if (typeof parsed === 'string') return parsed;
			if (parsed?.access_token && typeof parsed.access_token === 'string') return parsed.access_token;
			if (parsed?.currentSession?.access_token) return parsed.currentSession.access_token;
			if (parsed?.session?.access_token) return parsed.session.access_token;
			if (parsed?.token?.access_token) return parsed.token.access_token;
			if (parsed?.accessToken && typeof parsed.accessToken === 'string') return parsed.accessToken;
		}

		// 4) Raw cookie header fallback (parse raw string)
		const cookieHeader = hdrs.get('cookie') || '';
		if (cookieHeader) {
			const tokensToMatch = ['sb-access-token', 'sb:token', 'supabase-auth-token', 'sb-session', 'supabase-session', 'sb'];
			for (const key of tokensToMatch) {
				const regex = new RegExp(`${key}=([^;]+)`);
				const m = cookieHeader.match(regex);
				if (m && m[1]) {
					const candidate = decodeURIComponent(m[1]);
					const parsed = safeJsonParse<any>(candidate);
					if (!parsed) return candidate;
					if (typeof parsed === 'string') return parsed;
					if (parsed?.access_token) return parsed.access_token;
					if (parsed?.session?.access_token) return parsed.session.access_token;
				}
			}
		}
	} catch (err) {
		console.error('getAccessTokenFromRequest error:', err);
	}
	return null;
}

/** decode sub/user_id from JWT payload (NO verifica firma) */
function decodeJwtSub(token: string | null): string | null {
	if (!token) return null;
	try {
		const parts = token.split('.');
		if (parts.length < 2) return null;
		const payload = parts[1];
		// base64url -> base64
		const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
		// pad
		const pad = b64.length % 4;
		const padded = pad ? b64 + '='.repeat(4 - pad) : b64;
		const decoded = Buffer.from(padded, 'base64').toString('utf8');
		const obj = JSON.parse(decoded);
		return (obj?.sub as string) ?? (obj?.user_id as string) ?? null;
	} catch (err) {
		// no crítico
	}
	return null;
}

/** resuelve authId usando supabaseAdmin y el token (más robusto y con fallback para dev) */
async function getSupabaseAuthIdFromRequest(): Promise<string | null> {
	if (!supabaseAdmin) {
		if (process.env.NODE_ENV !== 'production') {
			console.warn('Supabase admin client not configured (SUPABASE_SERVICE_ROLE_KEY missing).');
		}
		return null;
	}

	try {
		const hdrs = await headers();
		const directAuthId = hdrs.get('x-auth-id') || hdrs.get('x-auth') || null;
		if (directAuthId) {
			if (process.env.NODE_ENV !== 'production') {
				console.log('DEBUG: directAuthId header found:', directAuthId);
			}
			return directAuthId;
		}
	} catch (err) {
		// ignore
	}

	const token = await getAccessTokenFromRequest();
	if (!token) {
		if (process.env.NODE_ENV !== 'production') {
			console.warn('No token extracted from request (cookies/headers).');
		}
		return null;
	}

	try {
		if (process.env.NODE_ENV !== 'production') {
			console.log('DEBUG: token (truncated):', token?.slice ? token.slice(0, 12) + '...' : token);
		}

		// supabaseAdmin.auth.getUser espera el access token; en algunos setups puede devolver error si token expiró
		const userResp = await supabaseAdmin.auth.getUser(token);
		if ((userResp as any)?.data?.user?.id) {
			return (userResp as any).data.user.id;
		}

		if ((userResp as any)?.error) {
			if (process.env.NODE_ENV !== 'production') {
				console.warn('supabaseAdmin.auth.getUser returned error:', (userResp as any).error);
			}
		} else {
			if (process.env.NODE_ENV !== 'production') {
				console.warn('supabaseAdmin.auth.getUser did not return user, resp:', userResp);
			}
		}
	} catch (err) {
		console.error('getSupabaseAuthIdFromRequest supabase error:', err);
	}

	// fallback: intentar extraer 'sub' del JWT sin verificar (útil para debugging/dev)
	const maybeSub = decodeJwtSub(token);
	if (maybeSub) {
		if (process.env.NODE_ENV !== 'production') {
			console.log('DEBUG: extracted sub from token payload (fallback):', maybeSub);
		}
		return maybeSub;
	}

	return null;
}

/** Principal: devuelve organizationId (o TEST_ORG_ID si está seteado) */
export async function getCurrentOrganizationId(): Promise<string | null> {
	if (TEST_ORG_ID) {
		if (process.env.NODE_ENV !== 'production') {
			console.log('DEBUG: using TEST_ORG_ID from env.');
		}
		return TEST_ORG_ID;
	}

	const authId = await getSupabaseAuthIdFromRequest();
	if (!authId) {
		if (process.env.NODE_ENV !== 'production') {
			console.log('DEBUG: authId not resolved from request.');
		}
		return null;
	}

	if (process.env.NODE_ENV !== 'production') {
		console.log('DEBUG: getCurrentOrganizationId - resolved authId:', authId);
	}

	// IMPORTANT: añadimos un log temporario para debug, para ver qué retorna prisma
	const user = await prisma.user.findFirst({
		where: { authId },
		select: { organizationId: true },
	});

	if (!user) {
		console.warn(`No app user linked for authId=${authId}.`);
	}

	if (process.env.NODE_ENV !== 'production') {
		console.log('DEBUG: organizationId found in DB:', user?.organizationId ?? null);
	}

	return user?.organizationId ?? null;
}

export default async function ClinicDashboardPage() {
	const organizationId = await getCurrentOrganizationId();

	if (!organizationId) {
		return (
			<div className="max-w-6xl mx-auto p-6">
				<div className="bg-white rounded-2xl p-8 shadow">
					<h1 className="text-2xl md:text-3xl font-bold text-slate-800">Resumen de la clínica</h1>
					<p className="mt-3 text-slate-600">
						No se detectó la organización en la sesión. Asegúrate de que el usuario esté autenticado y que su <code>authId</code> esté guardado en la tabla <code>User.authId</code>.
					</p>
					<div className="mt-6 text-sm text-slate-500">
						Para pruebas rápidas puedes temporalmente establecer <code>TEST_ORG_ID</code> en tu .env (ej: TEST_ORG_ID=tu-org-id).
					</div>
				</div>
			</div>
		);
	}

	const [org, specialistsCount, recentSpecialists, recentPatients, invites] = await Promise.all([
		prisma.organization.findUnique({
			where: { id: organizationId },
			select: { id: true, name: true, type: true, address: true, phone: true, specialistCount: true, planId: true, inviteBaseUrl: true },
		}),
		prisma.user.count({
			where: { organizationId, role: 'MEDICO' },
		}),
		prisma.user.findMany({
			where: { organizationId, role: 'MEDICO' },
			select: { id: true, email: true, name: true, createdAt: true },
			take: 8,
			orderBy: { createdAt: 'desc' },
		}),
		prisma.patient.findMany({
			select: { id: true, firstName: true, lastName: true, createdAt: true },
			take: 8,
			orderBy: { createdAt: 'desc' },
		}),
		prisma.invite.findMany({
			where: { organizationId },
			select: { id: true, email: true, token: true, role: true, used: true, expiresAt: true, createdAt: true },
			take: 5,
			orderBy: { createdAt: 'desc' },
		}),
	]);

	return (
		<div className="max-w-7xl mx-auto p-6 space-y-6">
			<header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold text-slate-900">{org?.name ?? 'Mi Clínica'}</h1>
					<div className="text-sm text-slate-600 mt-1">{org?.type ?? '—'}</div>
				</div>
				<div className="flex items-center gap-6">
					<div className="text-sm text-slate-700 text-right">
						<div className="text-xs text-slate-500">Especialistas registrados</div>
						<div className="text-xl font-semibold text-slate-900">{specialistsCount}</div>
					</div>
					<div className="text-sm text-slate-700 text-right">
						<div className="text-xs text-slate-500">Plan</div>
						<div className="text-lg font-medium text-slate-800">{org?.planId ?? 'Sin plan'}</div>
					</div>
				</div>
			</header>

			<ClinicStats organization={org} specialistsCount={specialistsCount} recentPatientsCount={recentPatients.length} />

			<section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 space-y-6">
					<div className="bg-white rounded-2xl p-6 border shadow-sm">
						<h2 className="text-lg font-semibold text-slate-800 mb-4">Especialistas recientes</h2>
						<SpecialistsTable users={recentSpecialists} />
					</div>

					<div className="bg-white rounded-2xl p-6 border shadow-sm">
						<h2 className="text-lg font-semibold text-slate-800 mb-4">Pacientes recientes</h2>
						<PatientsList patients={recentPatients} />
					</div>
					<div className="bg-white rounded-2xl p-6 border shadow-sm">
						<h3 className="text-lg font-semibold text-slate-800 mb-3">Invitaciones</h3>
						<InviteList initialInvites={invites} organizationId={organizationId} totalSlots={org?.specialistCount ?? invites.length} />
					</div>
				</div>

				<aside className="space-y-6">
					<div className="bg-white rounded-2xl p-6 border shadow-sm">
						<h3 className="text-lg font-semibold text-slate-800 mb-2">Detalles</h3>
						<div className="text-sm text-slate-600 space-y-3">
							<div>
								<span className="text-slate-500 block">Dirección</span>
								<div className="font-medium text-slate-800">{org?.address ?? '—'}</div>
							</div>
							<div>
								<span className="text-slate-500 block">Teléfono</span>
								<div className="font-medium text-slate-800">{org?.phone ?? '—'}</div>
							</div>
							<div>
								<span className="text-slate-500 block">Especialistas planeados</span>
								<div className="font-medium text-slate-800">{org?.specialistCount ?? 0}</div>
							</div>
							{org?.inviteBaseUrl && (
								<div>
									<span className="text-slate-500 block">Link de invitación</span>
									<div className="font-medium text-slate-800 break-words">{org.inviteBaseUrl}</div>
								</div>
							)}
						</div>
					</div>
				</aside>
			</section>
		</div>
	);
}
