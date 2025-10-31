// app/api/clinic-profile/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

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

export async function GET(req: Request) {
	try {
		// DEV shortcut: si TEST_ORG_ID → devolver profile de esa org (import dinámico)
		if (TEST_ORG_ID) {
			const prismaModule = await import('@/lib/prisma');
			const prisma = prismaModule.default ?? prismaModule;
			const profileDev = await (prisma as any).clinicProfile.findUnique({ where: { organizationId: TEST_ORG_ID } });
			if (!profileDev) return NextResponse.json({ ok: false, message: 'clinic profile not found (TEST_ORG_ID)' }, { status: 404 });
			return NextResponse.json({ ok: true, profile: profileDev }, { status: 200 });
		}

		// Leemos vars DENTRO del handler (no top-level)
		const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
		const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

		if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
			console.error('Supabase service role client not configurado (SUPABASE_SERVICE_ROLE_KEY o SUPABASE_URL faltante).');
			return NextResponse.json({ ok: false, message: 'server misconfiguration' }, { status: 500 });
		}

		// import dinámico de supabase y prisma (evita side-effects en module evaluation)
		const [{ createClient }, prismaModule] = await Promise.all([import('@supabase/supabase-js'), import('@/lib/prisma')]);
		const prisma = prismaModule.default ?? prismaModule;
		const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

		// Extraer token
		const token = extractAccessTokenFromRequest(req);
		if (!token) return NextResponse.json({ ok: false, message: 'not authenticated (no token found)' }, { status: 401 });

		// Intentar resolver usuario con supabaseAdmin
		let authUserId: string | null = null;
		try {
			const userResp = await supabaseAdmin.auth.getUser(token);
			if ((userResp as any)?.data?.user?.id) {
				authUserId = (userResp as any).data.user.id;
			} else {
				console.warn('supabaseAdmin.auth.getUser did not return user, resp:', userResp);
			}
		} catch (err) {
			console.error('supabaseAdmin.auth.getUser error:', err);
			// fallback abajo
		}

		// Fallback por sub del JWT
		if (!authUserId) {
			authUserId = decodeJwtSub(token);
			if (authUserId) console.warn('Using JWT-sub fallback to resolve authId. (No signature verification)');
		}

		if (!authUserId) return NextResponse.json({ ok: false, message: 'not authenticated (could not resolve authId)' }, { status: 401 });

		// Buscar usuario en tabla User para obtener organizationId
		const appUser = await prisma.user.findFirst({
			where: { authId: authUserId },
			select: { organizationId: true },
		});

		if (!appUser?.organizationId) {
			return NextResponse.json({ ok: false, message: 'organization not found for user' }, { status: 401 });
		}

		const organizationId = appUser.organizationId;

		// Traer clinic_profile por organizationId
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
