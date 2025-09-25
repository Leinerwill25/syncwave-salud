// app/api/clinic-profile/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const TEST_ORG_ID = process.env.TEST_ORG_ID ?? null;

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null;

/** Extrae access token desde Authorization header o cookies crudas (server-side) */
function extractAccessTokenFromRequest(req: Request): string | null {
	try {
		// 1) Authorization header
		const auth = req.headers.get('authorization') || req.headers.get('Authorization');
		if (auth && auth.startsWith('Bearer ')) {
			const t = auth.split(' ')[1].trim();
			if (t) return t;
		}

		// 2) x-access-token / x-auth-token
		const xAuth = req.headers.get('x-access-token') || req.headers.get('x-auth-token');
		if (xAuth) return xAuth;

		// 3) Cookies raw header
		const cookieHeader = req.headers.get('cookie') || '';
		if (!cookieHeader) return null;

		const keys = ['sb-access-token', 'sb:token', 'supabase-auth-token', 'sb-session', 'supabase-session', 'sb'];
		for (const k of keys) {
			const match = cookieHeader.match(new RegExp(`${k}=([^;]+)`));
			if (!match) continue;
			const raw = decodeURIComponent(match[1]);

			// Algunas cookies contienen JSON (session object)
			try {
				const parsed = JSON.parse(raw);
				if (!parsed) continue;
				if (typeof parsed === 'string') return parsed;
				if (parsed?.access_token) return parsed.access_token;
				if (parsed?.currentSession?.access_token) return parsed.currentSession.access_token;
				if (parsed?.session?.access_token) return parsed.session.access_token;
				if (parsed?.token?.access_token) return parsed.token.access_token;
				if (parsed?.accessToken) return parsed.accessToken;
			} catch {
				// no era JSON -> token crudo
				return raw;
			}
		}
	} catch (err) {
		console.error('extractAccessTokenFromRequest error', err);
	}
	return null;
}

/** Decodifica sub del JWT sin verificar signature — solo fallback en dev */
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
	} catch (err) {
		return null;
	}
}

export async function GET(req: Request) {
	try {
		// 1) Dev shortcut: si TEST_ORG_ID está seteado devolver datos de esa org
		if (TEST_ORG_ID) {
			const profileDev = await (prisma as any).clinicProfile.findUnique({ where: { organizationId: TEST_ORG_ID } });
			if (!profileDev) return NextResponse.json({ ok: false, message: 'clinic profile not found (TEST_ORG_ID)' }, { status: 404 });
			return NextResponse.json({ ok: true, profile: profileDev }, { status: 200 });
		}

		// 2) Asegurarnos que supabaseAdmin exista
		if (!supabaseAdmin) {
			console.error('Supabase service role client not configurado (SUPABASE_SERVICE_ROLE_KEY faltante).');
			return NextResponse.json({ ok: false, message: 'server misconfiguration' }, { status: 500 });
		}

		// 3) Extraer token (header o cookies)
		const token = extractAccessTokenFromRequest(req);
		if (!token) {
			return NextResponse.json({ ok: false, message: 'not authenticated (no token found)' }, { status: 401 });
		}

		// 4) Intentar resolver auth user via supabaseAdmin
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
			// continue to fallback
		}

		// 5) Fallback: decodificar sub del JWT (solo fallback)
		if (!authUserId) {
			authUserId = decodeJwtSub(token);
			if (authUserId) {
				console.warn('Using JWT-sub fallback to resolve authId. (No signature verification)');
			}
		}

		if (!authUserId) {
			return NextResponse.json({ ok: false, message: 'not authenticated (could not resolve authId)' }, { status: 401 });
		}

		// 6) Buscar usuario en tabla User para obtener organizationId
		const appUser = await prisma.user.findFirst({
			where: { authId: authUserId },
			select: { organizationId: true },
		});

		if (!appUser?.organizationId) {
			return NextResponse.json({ ok: false, message: 'organization not found for user' }, { status: 401 });
		}

		const organizationId = appUser.organizationId;

		// 7) Traer clinic_profile por organizationId
		// <-- Aquí usamos (prisma as any).clinicProfile para evitar el error de tipo.
		// Una vez que hayas ejecutado `prisma generate` y recompilado, puedes cambiar a prisma.clinicProfile
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

		if (!profile) {
			return NextResponse.json({ ok: false, message: 'clinic profile not found' }, { status: 404 });
		}

		return NextResponse.json({ ok: true, profile }, { status: 200 });
	} catch (err: any) {
		console.error('GET /api/clinic-profile error', err);
		return NextResponse.json({ ok: false, message: err?.message ?? 'server error' }, { status: 500 });
	}
}
