import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PrismaClient } from '@prisma/client';

console.log('Loaded route: /api/clinic');

// --- Try to load Prisma client if available ---
let prisma: PrismaClient | null = null;
try {
	const mod = require('@/lib/prisma') as any;
	prisma = mod?.default ?? mod?.prisma ?? (mod instanceof Object && 'PrismaClient' in mod ? new mod.PrismaClient() : null);
} catch {
	prisma = null;
}

// --- Supabase server client ---
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY;
const useSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const supabase: SupabaseClient | null = useSupabase ? createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!) : null;

// --- Fallback memory store ---
const MEMORY_DB: Record<string, unknown>[] = [];

// --- Helper functions ---
function sanitizeForClient(value: unknown): unknown {
	if (value === null || value === undefined) return '';
	if (value instanceof Date) return value.toISOString();
	if (Array.isArray(value)) return value.map(sanitizeForClient);
	if (typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = sanitizeForClient(v);
		return out;
	}
	return value;
}

function ensureTemplateMerged(raw: unknown) {
	const base = {
		organizationId: '',
		legalRif: '',
		legalName: '',
		tradeName: '',
		entityType: '',
		addressFiscal: '',
		addressOperational: '',
		stateProvince: '',
		cityMunicipality: '',
		postalCode: '',
		contactEmail: '',
		specialties: [],
		paymentMethods: [],
	};
	return { ...base, ...(sanitizeForClient(raw) as Record<string, unknown>) };
}

function getBearerTokenFromHeaders(headers: Headers) {
	const auth = headers.get('authorization') ?? headers.get('Authorization');
	if (!auth) return null;
	const match = auth.match(/Bearer\s+(.+)/i);
	return match ? match[1] : null;
}

function getTokenFromRequest(headers: Headers) {
	const headerToken = getBearerTokenFromHeaders(headers);
	if (headerToken) return headerToken;
	const cookie = headers.get('cookie') ?? '';
	const match = cookie.match(/(?:^|;\s*)sb-access-token=([^;]+)/);
	if (!match) return null;
	try {
		return decodeURIComponent(match[1]);
	} catch {
		return match[1];
	}
}

async function resolveOrganizationId(body: any, headers: Headers) {
	if (body.organizationId) return { organizationId: body.organizationId };
	const token = getTokenFromRequest(headers);
	if (!token || !supabase) return { error: 'Token inválido o faltante. No se puede obtener organizationId.' };

	const { data, error } = await supabase.auth.getUser(token);
	if (error || !data?.user) return { error: 'Token inválido o expirado.' };

	if (!prisma) return { error: 'No se pudo acceder a la base de datos.' };
	const user = await prisma.user.findUnique({ where: { authId: data.user.id } });
	if (!user?.organizationId) return { error: 'El usuario no tiene organizationId asociado.' };
	return { organizationId: user.organizationId };
}

function mapBodyToPrismaClinic(body: any, organizationId: string) {
	const specialties = Array.isArray(body.specialties) ? body.specialties : [];
	const paymentMethods = Array.isArray(body.paymentMethods) ? body.paymentMethods : [];

	return {
		legalRif: body.rif ?? null,
		legalName: body.legalName ?? null,
		tradeName: body.tradeName ?? null,
		entityType: body.entityType ?? null,
		addressFiscal: body.addressFiscal ?? null,
		addressOperational: body.addressOperational ?? null,
		stateProvince: body.state ?? null,
		cityMunicipality: body.city ?? null,
		postalCode: body.postalCode ?? null,
		phoneFixed: body.phone ?? null,
		phoneMobile: body.whatsapp ?? null,
		contactEmail: body.email ?? null,
		website: body.website ?? null,
		socialFacebook: body.social_facebook ?? null,
		socialInstagram: body.social_instagram ?? null,
		socialLinkedin: body.social_linkedin ?? null,
		officesCount: Number(body.officesCount) || 0,
		specialties,
		openingHours: body.openingHours ?? null,
		capacityPerDay: Number(body.capacityPerDay) || null,
		employeesCount: Number(body.employeesCount) || null,
		directorName: body.directorName ?? null,
		adminName: body.adminName ?? null,
		directorIdNumber: body.directorId ?? null,
		sanitaryLicense: body.sanitaryLicense ?? null,
		liabilityInsuranceNumber: body.liabilityInsuranceNumber ?? null,
		bankName: body.bankName ?? null,
		bankAccountType: body.accountType ?? null,
		bankAccountNumber: body.accountNumber ?? null,
		bankAccountOwner: body.accountOwner ?? null,
		currency: body.currency ?? null,
		paymentMethods,
		billingSeries: body.billingSeries ?? null,
		taxRegime: body.taxRegime ?? null,
		billingAddress: body.billingAddress ?? null,
		updatedAt: new Date(),
		...(organizationId ? { organization: { connect: { id: organizationId } } } : {}),
	};
}

// --- POST handler ---
export async function POST(request: Request) {
	try {
		const body = await request.json().catch(() => null);
		if (!body) return NextResponse.json({ ok: false, error: 'El cuerpo de la solicitud debe ser JSON.' }, { status: 400 });

		const { organizationId, error } = await resolveOrganizationId(body, request.headers);
		if (error) return NextResponse.json({ ok: false, error }, { status: 401 });

		if (!prisma) return NextResponse.json({ ok: false, error: 'Prisma no inicializado.' }, { status: 500 });

		const modelClient = (prisma as any).clinicProfile;
		if (!modelClient) return NextResponse.json({ ok: false, error: 'No se encontró el modelo clinicProfile en Prisma.' }, { status: 500 });

		const existing = await modelClient.findUnique({
			where: { organizationId },
		});

		const prismaData = mapBodyToPrismaClinic(body, organizationId);

		if (existing) {
			delete prismaData.organization; // 🔧 evitar error de Prisma
			const updated = await modelClient.update({
				where: { organizationId },
				data: prismaData,
			});
			return NextResponse.json({ ok: true, data: ensureTemplateMerged(updated) });
		}

		const created = await modelClient.create({ data: prismaData });
		return NextResponse.json({ ok: true, data: ensureTemplateMerged(created) });
	} catch (err: any) {
		console.error('Error en /api/clinic POST', err);
		return NextResponse.json({ ok: false, error: err.message ?? String(err) }, { status: 500 });
	}
}

// --- GET handler ---
export async function GET() {
	try {
		if (!prisma) return NextResponse.json({ ok: false, error: 'Prisma no inicializado.' }, { status: 500 });

		const modelClient = (prisma as any).clinicProfile;
		const items = await modelClient.findMany({ orderBy: { createdAt: 'desc' } });
		return NextResponse.json({ ok: true, data: items.map(ensureTemplateMerged) });
	} catch (err: any) {
		console.error('Error en /api/clinic GET', err);
		return NextResponse.json({ ok: false, error: err.message ?? String(err) }, { status: 500 });
	}
}
