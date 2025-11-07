// app/api/clinic-profile/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

/**
 * DEV: permite forzar una org id desde env para desarrollo
 */
const TEST_ORG_ID = process.env.TEST_ORG ?? process.env.TEST_ORG_ID ?? null;

/** Extrae access token desde Authorization header o cookies crudas (server-side) */
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

/** base64url decode (Node/browser) */
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

/** Resuelve auth user id usando Supabase Admin + JWT sub fallback */
async function resolveAuthUserId(token: string | null, supabaseAdmin: any): Promise<string | null> {
	if (!token) return null;
	// intentar con supabaseAdmin
	try {
		const userResp = await supabaseAdmin.auth.getUser(token);
		if ((userResp as any)?.data?.user?.id) {
			return (userResp as any).data.user.id;
		}
		// en algunos escenarios supabase devuelve data: { user: null } - we fallback below
		console.warn('supabaseAdmin.auth.getUser returned no user, resp:', userResp);
	} catch (err) {
		console.warn('supabaseAdmin.auth.getUser error (fallthrough to jwt-sub):', err);
	}
	// fallback simple: decode sub without verification
	const sub = decodeJwtSub(token);
	if (sub) {
		console.warn('Using JWT-sub fallback to resolve authId. (No signature verification)');
		return sub;
	}
	return null;
}

/** safe parse helper: si recibe string intenta JSON.parse, si no deja como está */
function safeParseMaybeJson(input: any) {
	if (input == null) return input;
	if (typeof input === 'string') {
		const t = input.trim();
		if (t === '') return null;
		try {
			return JSON.parse(t);
		} catch {
			// no es JSON: si contiene comas devolver array split, sino retornar string
			if (t.includes(','))
				return t
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean);
			return t;
		}
	}
	return input;
}

/** GET handler (trae profile por organizationId) */
export async function GET(req: Request) {
	try {
		// Dev shortcut
		if (TEST_ORG_ID) {
			const prismaModule = await import('@/lib/prisma');
			const prisma = prismaModule.default ?? prismaModule;
			const profileDev = await (prisma as any).clinicProfile.findUnique({ where: { organizationId: TEST_ORG_ID } });
			if (!profileDev) return NextResponse.json({ ok: false, message: 'clinic profile not found (TEST_ORG_ID)' }, { status: 404 });
			return NextResponse.json({ ok: true, profile: profileDev }, { status: 200 });
		}

		const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
		const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

		if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
			console.error('Supabase service role client not configurado (SUPABASE_SERVICE_ROLE_KEY o SUPABASE_URL faltante).');
			return NextResponse.json({ ok: false, message: 'server misconfiguration' }, { status: 500 });
		}

		const [{ createClient }, prismaModule] = await Promise.all([import('@supabase/supabase-js'), import('@/lib/prisma')]);
		const prisma = prismaModule.default ?? prismaModule;
		const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

		const token = extractAccessTokenFromRequest(req);
		if (!token) return NextResponse.json({ ok: false, message: 'not authenticated (no token found)' }, { status: 401 });

		const authUserId = await resolveAuthUserId(token, supabaseAdmin);
		if (!authUserId) return NextResponse.json({ ok: false, message: 'not authenticated (could not resolve authId)' }, { status: 401 });

		// obtener organizationId desde tabla User
		const appUser = await (prisma as any).user.findFirst({
			where: { authId: authUserId },
			select: { organizationId: true },
		});

		if (!appUser?.organizationId) {
			return NextResponse.json({ ok: false, message: 'organization not found for user' }, { status: 401 });
		}

		const organizationId = appUser.organizationId;

		const profile = await (prisma as any).clinicProfile.findUnique({
			where: { organizationId },
			select: {
				id: true,
				organizationId: true,
				legalRif: true,
				legalName: true,
				tradeName: true,
				entityType: true,
				addressFiscal: true,
				addressOperational: true,
				stateProvince: true,
				cityMunicipality: true,
				postalCode: true,
				phoneFixed: true,
				phoneMobile: true,
				contactEmail: true,
				website: true,
				socialFacebook: true,
				socialInstagram: true,
				socialLinkedin: true,
				officesCount: true,
				specialties: true,
				openingHours: true,
				capacityPerDay: true,
				employeesCount: true,
				directorName: true,
				adminName: true,
				directorIdNumber: true,
				sanitaryLicense: true,
				liabilityInsuranceNumber: true,
				bankName: true,
				bankAccountType: true,
				bankAccountNumber: true,
				bankAccountOwner: true,
				currency: true,
				paymentMethods: true,
				billingSeries: true,
				taxRegime: true,
				billingAddress: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		if (!profile) return NextResponse.json({ ok: false, message: 'clinic profile not found' }, { status: 404 });

		return NextResponse.json({ ok: true, profile }, { status: 200 });
	} catch (err: any) {
		console.error('GET /api/clinic-profile error', err);
		return NextResponse.json({ ok: false, message: err?.message ?? 'server error' }, { status: 500 });
	}
}

/** PUT handler: actualiza (o crea) clinicProfile para la organization del usuario */
export async function PUT(req: Request) {
	try {
		// Dev shortcut: si TEST_ORG_ID -> actualizar para esa org sin auth
		if (TEST_ORG_ID) {
			const body = await req.json().catch(() => ({}));
			const prismaModule = await import('@/lib/prisma');
			const prisma = prismaModule.default ?? prismaModule;

			// normalizaciones basicas
			const payload: any = { ...body };
			payload.specialties = safeParseMaybeJson(payload.specialties) ?? [];
			payload.openingHours = safeParseMaybeJson(payload.openingHours) ?? [];
			payload.paymentMethods = safeParseMaybeJson(payload.paymentMethods) ?? [];

			const upserted = await (prisma as any).clinicProfile.upsert({
				where: { organizationId: TEST_ORG_ID },
				update: { ...payload },
				create: { organizationId: TEST_ORG_ID, ...payload },
			});

			return NextResponse.json({ ok: true, profile: upserted }, { status: 200 });
		}

		const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
		const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

		if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
			console.error('Supabase service role client not configurado (SUPABASE_SERVICE_ROLE_KEY o SUPABASE_URL faltante).');
			return NextResponse.json({ ok: false, message: 'server misconfiguration' }, { status: 500 });
		}

		const [{ createClient }, prismaModule] = await Promise.all([import('@supabase/supabase-js'), import('@/lib/prisma')]);
		const prisma = prismaModule.default ?? prismaModule;
		const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

		const token = extractAccessTokenFromRequest(req);
		if (!token) return NextResponse.json({ ok: false, message: 'not authenticated (no token found)' }, { status: 401 });

		const authUserId = await resolveAuthUserId(token, supabaseAdmin);
		if (!authUserId) return NextResponse.json({ ok: false, message: 'not authenticated (could not resolve authId)' }, { status: 401 });

		const appUser = await (prisma as any).user.findFirst({
			where: { authId: authUserId },
			select: { organizationId: true },
		});

		if (!appUser?.organizationId) {
			return NextResponse.json({ ok: false, message: 'organization not found for user' }, { status: 401 });
		}

		const organizationId = appUser.organizationId;

		// leer body y normalizar
		const body = await req.json().catch(() => ({}));
		const payload: any = { ...body };

		// Intentar parsear campos que pueden venir como strings
		payload.specialties = safeParseMaybeJson(payload.specialties) ?? [];
		payload.openingHours = safeParseMaybeJson(payload.openingHours) ?? [];
		payload.paymentMethods = safeParseMaybeJson(payload.paymentMethods) ?? [];

		// Evitar que campos no permitidos rompan el upsert: seleccionar sólo keys relevantes
		const allowedKeys = new Set(['legalRif', 'legalName', 'tradeName', 'entityType', 'addressFiscal', 'addressOperational', 'stateProvince', 'cityMunicipality', 'postalCode', 'phoneFixed', 'phoneMobile', 'contactEmail', 'website', 'socialFacebook', 'socialInstagram', 'socialLinkedin', 'officesCount', 'specialties', 'openingHours', 'capacityPerDay', 'employeesCount', 'directorName', 'adminName', 'directorIdNumber', 'sanitaryLicense', 'liabilityInsuranceNumber', 'bankName', 'bankAccountType', 'bankAccountNumber', 'bankAccountOwner', 'currency', 'paymentMethods', 'billingSeries', 'taxRegime', 'billingAddress']);

		const dataToUpdate: any = {};
		for (const k of Object.keys(payload)) {
			if (allowedKeys.has(k)) dataToUpdate[k] = payload[k];
		}

		// Normalizaciones simples: empty string -> null for optional fields (if you prefer '')
		for (const k of Object.keys(dataToUpdate)) {
			if (typeof dataToUpdate[k] === 'string' && dataToUpdate[k].trim() === '') {
				dataToUpdate[k] = null;
			}
		}

		// Upsert (crea si no existe)
		const upserted = await (prisma as any).clinicProfile.upsert({
			where: { organizationId },
			update: { ...dataToUpdate },
			create: { organizationId, ...dataToUpdate },
		});

		return NextResponse.json({ ok: true, profile: upserted }, { status: 200 });
	} catch (err: any) {
		console.error('PUT /api/clinic-profile error', err);
		return NextResponse.json({ ok: false, message: err?.message ?? 'server error' }, { status: 500 });
	}
}
