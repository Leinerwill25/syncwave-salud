// app/dashboard/page.tsx (o donde tengas el ClinicDashboardPage)
import React from 'react';
import prisma from '@/lib/prisma';
import ClinicStats from '@/components/ClinicStats';
// import InviteList from '@/components/InviteList';
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
 * Obtiene token/headers desde next/headers (server environment)
 */
async function getAccessTokenFromRequest(): Promise<string | null> {
	try {
		const hdrs = await headers();

		// Authorization: Bearer ...
		const authHeader = hdrs.get('authorization') || hdrs.get('Authorization');
		if (authHeader && authHeader.startsWith('Bearer ')) {
			const t = authHeader.split(' ')[1].trim();
			if (t) return t;
		}

		// x-auth-token / x-access-token
		const xAuth = hdrs.get('x-auth-token') || hdrs.get('x-access-token');
		if (xAuth) return xAuth;

		// cookies via next/headers()
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

		// raw cookie header fallback
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

/** Obtiene authId (supabase user id) desde supabaseAdmin using token */
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
	} catch {
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
		const userResp = await supabaseAdmin.auth.getUser(token);
		if ((userResp as any)?.data?.user?.id) {
			return (userResp as any).data.user.id;
		}
	} catch (err) {
		console.error('getSupabaseAuthIdFromRequest supabase error:', err);
	}

	// fallback JWT decode
	return decodeJwtSub(token);
}

/** Principal: devuelve organizationId (o TEST_ORG_ID si está seteado)
 *  Resuelto desde Supabase table "User" usando authId.
 */
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

	if (!supabaseAdmin) {
		if (process.env.NODE_ENV !== 'production') {
			console.warn('supabaseAdmin not configured; cannot resolve organization via Supabase.');
		}
		return null;
	}

	try {
		// Usamos tabla "User" y buscamos organizationId por authId
		const { data, error } = await supabaseAdmin.from('User').select('organizationId').eq('authId', authId).limit(1).maybeSingle();

		if (error) {
			if (process.env.NODE_ENV !== 'production') console.warn('Supabase: error fetching user organizationId:', error);
		} else if (data) {
			return data.organizationId ?? null;
		}
	} catch (err) {
		console.error('getCurrentOrganizationId supabase error:', err);
	}

	// fallback: intentar extraer organizationId desde token payload
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
		} catch {
			// ignore
		}
	}

	return null;
}

/**
 * fetchRecentPatientsForOrgViaSupabase (CORREGIDO para tu schema):
 *
 * - Trae todos los Patient
 * - Trae todos los User con role='PACIENTE' y organizationId = organizationId
 * - Usa user.patientProfileId para mapear a Patient.id (esa es la relación en tu schema)
 * - Devuelve los pacientes asociados a los usuarios que pertenezcan a la org en sesión.
 */
async function fetchRecentPatientsForOrgViaSupabase(organizationId: string, take = 8) {
	if (!supabaseAdmin) {
		if (process.env.NODE_ENV !== 'production') {
			console.warn('Supabase admin client not configured; cannot fetch patients via Supabase.');
		}
		return [];
	}

	try {
		// 1) Obtener todos los pacientes
		const { data: allPatientsRaw, error: patientsErr } = await supabaseAdmin.from('Patient').select('*');
		if (patientsErr) {
			console.error('Supabase: error fetching Patient table:', patientsErr);
			return [];
		}
		const allPatients: any[] = Array.isArray(allPatientsRaw) ? allPatientsRaw : [];

		// 2) Obtener users con role = 'PACIENTE' y organizationId = organizationId
		const { data: patientUsersRaw, error: usersErr } = await supabaseAdmin.from('User').select('id, email, organizationId, role, patientProfileId').eq('role', 'PACIENTE').eq('organizationId', organizationId);

		if (usersErr) {
			console.error('Supabase: error fetching Users (role=PACIENTE):', usersErr);
			return [];
		}
		const patientUsers: any[] = Array.isArray(patientUsersRaw) ? patientUsersRaw : [];

		// Construir mapa patientProfileId -> user
		const patientToUserMap = new Map<string, any>();
		for (const u of patientUsers) {
			if (u?.patientProfileId) {
				patientToUserMap.set(String(u.patientProfileId), u);
			}
		}

		// Filtrar pacientes cuyos id aparezcan en patientToUserMap
		const matched = allPatients.filter((p) => {
			if (!p?.id) return false;
			return patientToUserMap.has(String(p.id));
		});

		// Ordenar por createdAt desc y tomar los primeros `take`
		const sorted = matched.sort((a, b) => {
			const da = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
			const db = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
			return db - da;
		});

		// Mapear a forma esperada por PatientsList, y adjuntar organizationId tomado del user relacionado
		const result = sorted.slice(0, take).map((p) => {
			const user = patientToUserMap.get(String(p.id));
			return {
				id: p.id,
				firstName: p.firstName ?? p.firstname ?? null,
				lastName: p.lastName ?? p.lastname ?? null,
				createdAt: p.createdAt ?? null,
				organizationId: user?.organizationId ?? null,
				userId: user?.id ?? null,
				email: p.email ?? user?.email ?? null,
			};
		});

		if (process.env.NODE_ENV !== 'production') {
			console.log(`DEBUG: fetchRecentPatientsForOrgViaSupabase matched ${result.length} patients for org ${organizationId}`);
		}

		return result;
	} catch (err) {
		console.error('fetchRecentPatientsForOrgViaSupabase error:', err);
		return [];
	}
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
		// Ahora obtenemos pacientes usando exclusivamente Supabase y filtrando por User.role='PACIENTE' + organizationId
		fetchRecentPatientsForOrgViaSupabase(organizationId, 8),
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
					<SpecialistsTable users={recentSpecialists} />

					{/* Pasamos clinicOrganizationId para que el componente UI use el mismo filtro (aunque ya se filtró en servidor) */}
					<PatientsList patients={recentPatients} clinicOrganizationId={organizationId} />
					{/* <InviteList initialInvites={invites} organizationId={organizationId} totalSlots={org?.specialistCount ?? invites.length} /> */}
				</div>

				<aside aria-labelledby="org-details-title" className="space-y-6">
					<div className="relative bg-white/95 border border-slate-200 rounded-2xl p-6 shadow-md max-w-sm">
						<div className="absolute -top-3 left-6 w-20 h-1 rounded-full bg-gradient-to-r from-sky-600 to-indigo-600 shadow-sm" aria-hidden />

						<h3 id="org-details-title" className="text-lg font-semibold text-slate-800 mb-1">
							Detalles
						</h3>
						<p className="text-sm text-slate-500 mb-4">Información de contacto y plazas planificadas</p>

						<dl className="grid gap-4 text-sm text-slate-600">
							<div className="flex flex-col">
								<dt className="text-xs text-slate-500">Dirección</dt>
								<dd className="mt-1 font-medium text-slate-800 break-words">{org?.address ?? '—'}</dd>
							</div>

							<div className="flex flex-col">
								<dt className="text-xs text-slate-500">Teléfono</dt>
								<dd className="mt-1 font-medium text-slate-800">{org?.phone ?? '—'}</dd>
							</div>

							<div className="flex flex-col">
								<dt className="text-xs text-slate-500">Especialistas planeados</dt>
								<dd className="mt-1 font-medium text-slate-800">{org?.specialistCount ?? 0}</dd>
							</div>

							{org?.inviteBaseUrl && (
								<div className="flex flex-col">
									<dt className="text-xs text-slate-500">Link de invitación</dt>
									<dd className="mt-1 font-medium text-slate-800 break-words">
										<a href={org.inviteBaseUrl} target="_blank" rel="noopener noreferrer" className="inline-block truncate max-w-full text-sm hover:underline" title={org.inviteBaseUrl}>
											{org.inviteBaseUrl}
										</a>
									</dd>
								</div>
							)}
						</dl>

						<div className="mt-4 text-xs text-slate-400">Puedes copiar o abrir el enlace desde la configuración.</div>
					</div>
				</aside>
			</section>
		</div>
	);
}
