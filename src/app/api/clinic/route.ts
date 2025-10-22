// app/api/clinic/route.ts
import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PrismaClient } from '@prisma/client';

console.log('Loaded route: /api/clinic');

// --- Try to load Prisma client if available ---
let prisma: PrismaClient | null = null;
try {
	// require puede devolver distintas formas; lo tratamos como unknown y luego extraemos posibles PrismaClient.
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const mod = require('@/lib/prisma') as unknown;
	// mod puede ser { default: PrismaClient } o { prisma: PrismaClient } o directamente PrismaClient
	const modObj = mod as { default?: PrismaClient; prisma?: PrismaClient } | PrismaClient;
	prisma = (modObj as { default?: PrismaClient }).default ?? (modObj as { prisma?: PrismaClient }).prisma ?? (modObj as PrismaClient) ?? null;
} catch {
	prisma = null;
}

// Supabase server client (usamos service role key para poder verificar tokens)
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY;
const useSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const supabase: SupabaseClient | null = useSupabase ? createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!) : null;

// Memory fallback storage (typed)
const MEMORY_DB: Record<string, unknown>[] = [];

/** Clinic template type (suficientemente genérico para el formulario) */
type ClinicTemplate = {
	organizationId: string;
	legalRif: string;
	rif: string;
	legalName: string;
	tradeName: string;
	entityType: string;
	addressFiscal: string;
	addressOperational: string;
	stateProvince: string;
	cityMunicipality: string;
	postalCode: string;
	phoneFixed: string;
	phoneMobile: string;
	contactEmail: string;
	email: string;
	website: string;
	socialFacebook: string;
	socialInstagram: string;
	socialLinkedin: string;
	officesCount: number;
	specialties: unknown[];
	openingHours: string;
	capacityPerDay: string | number;
	employeesCount: number | null;
	directorName: string;
	adminName: string;
	directorIdNumber: string;
	directorId: string;
	sanitaryLicense: string;
	liabilityInsuranceNumber: string;
	bankName: string;
	bankAccountType: string;
	bankAccountNumber: string;
	bankAccountOwner: string;
	accountType: string;
	accountNumber: string;
	accountOwner: string;
	currency: string;
	paymentMethods: unknown[];
	billingSeries: string;
	taxRegime: string;
	billingAddress: string;
	createdAt: string;
	updatedAt: string;
};

function defaultClinicTemplate(): ClinicTemplate {
	return {
		organizationId: '',
		legalRif: '',
		rif: '',
		legalName: '',
		tradeName: '',
		entityType: '',
		addressFiscal: '',
		addressOperational: '',
		stateProvince: '',
		cityMunicipality: '',
		postalCode: '',
		phoneFixed: '',
		phoneMobile: '',
		contactEmail: '',
		email: '',
		website: '',
		socialFacebook: '',
		socialInstagram: '',
		socialLinkedin: '',
		officesCount: 0,
		specialties: [],
		openingHours: '',
		capacityPerDay: '',
		employeesCount: null,
		directorName: '',
		adminName: '',
		directorIdNumber: '',
		directorId: '',
		sanitaryLicense: '',
		liabilityInsuranceNumber: '',
		bankName: '',
		bankAccountType: '',
		bankAccountNumber: '',
		bankAccountOwner: '',
		accountType: '',
		accountNumber: '',
		accountOwner: '',
		currency: '',
		paymentMethods: [],
		billingSeries: '',
		taxRegime: '',
		billingAddress: '',
		createdAt: '',
		updatedAt: '',
	};
}

/** sanitizeForClient: recursivo, convierte null/undefined a '' y Date a ISO */
function sanitizeForClient(value: unknown): unknown {
	if (value === null || value === undefined) return '';
	if (value instanceof Date) return value.toISOString();
	if (Array.isArray(value)) return value.map(sanitizeForClient);
	if (typeof value === 'object' && value !== null) {
		const out: Record<string, unknown> = {};
		for (const k of Object.keys(value as Record<string, unknown>)) {
			out[k] = sanitizeForClient((value as Record<string, unknown>)[k]);
		}
		return out;
	}
	return value;
}

/** Combina defaults con valores sanitizados */
function ensureTemplateMerged(raw: unknown): ClinicTemplate {
	const defaults = defaultClinicTemplate();
	const sanitized = sanitizeForClient(raw ?? {}) as Record<string, unknown>;
	return { ...defaults, ...sanitized } as ClinicTemplate;
}

/** Validaciones mínimas del payload */
function validateClinicPayloadMinimal(body: unknown): string[] {
	const errors: string[] = [];
	if (!body || typeof body !== 'object') {
		errors.push('Payload vacío');
		return errors;
	}
	const b = body as Record<string, unknown>;
	if (!b.rif) errors.push('rif es requerido');
	if (!b.legalName) errors.push('legalName es requerido');
	if (!b.addressFiscal) errors.push('addressFiscal es requerido');
	if (!b.email) errors.push('email es requerido');
	return errors;
}

/** Mapear body al shape que espera Prisma — devolvemos Record<string, unknown> */
function mapBodyToPrismaClinic(body: unknown, organizationId: string): Record<string, unknown> {
	const b = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
	const specialties = Array.isArray(b.specialties) ? b.specialties : [];
	const paymentMethods = Array.isArray(b.paymentMethods) ? b.paymentMethods : [];

	return {
		organizationId,
		legalRif: b.rif ?? null,
		legalName: b.legalName ?? null,
		tradeName: b.tradeName ?? null,
		entityType: b.entityType ?? null,
		addressFiscal: b.addressFiscal ?? null,
		addressOperational: b.addressOperational ?? null,
		stateProvince: b.state ?? null,
		cityMunicipality: b.city ?? null,
		postalCode: b.postalCode ?? null,
		phoneFixed: b.phone ?? null,
		phoneMobile: b.whatsapp ?? null,
		contactEmail: b.email ?? null,
		website: b.website ?? null,
		socialFacebook: b.social_facebook ?? b.socialFacebook ?? null,
		socialInstagram: b.social_instagram ?? b.socialInstagram ?? null,
		socialLinkedin: b.social_linkedin ?? b.socialLinkedin ?? null,
		officesCount: typeof b.officesCount !== 'undefined' ? Number(b.officesCount) || 0 : 0,
		specialties,
		openingHours: b.openingHours ?? null,
		capacityPerDay: typeof b.capacityPerDay !== 'undefined' ? Number(b.capacityPerDay) : null,
		employeesCount: typeof b.employeesCount !== 'undefined' ? Number(b.employeesCount) : null,
		directorName: b.directorName ?? null,
		adminName: b.adminName ?? null,
		directorIdNumber: b.directorId ?? null,
		sanitaryLicense: b.sanitaryLicense ?? null,
		liabilityInsuranceNumber: b.liabilityInsuranceNumber ?? null,
		bankName: b.bankName ?? null,
		bankAccountType: b.accountType ?? null,
		bankAccountNumber: b.accountNumber ?? null,
		bankAccountOwner: b.accountOwner ?? null,
		accountType: b.accountType ?? null,
		accountNumber: b.accountNumber ?? null,
		accountOwner: b.accountOwner ?? null,
		currency: b.currency ?? null,
		paymentMethods,
		billingSeries: b.billingSeries ?? null,
		taxRegime: b.taxRegime ?? null,
		billingAddress: b.billingAddress ?? null,
	};
}

/** Helpers para extraer token de headers / cookies */
function getBearerTokenFromHeaders(headers: Headers): string | null {
	const auth = headers.get('authorization') ?? headers.get('Authorization');
	if (!auth) return null;
	const m = auth.match(/Bearer\s+(.+)/i);
	return m ? m[1] : null;
}

function getTokenFromRequest(headers: Headers): string | null {
	const headerToken = getBearerTokenFromHeaders(headers);
	if (headerToken) return headerToken;
	const cookieHeader = headers.get('cookie') ?? '';
	if (!cookieHeader) return null;
	const m = cookieHeader.match(/(?:^|;\s*)sb-access-token=([^;]+)/);
	if (m && m[1]) {
		try {
			return decodeURIComponent(m[1]);
		} catch {
			return m[1];
		}
	}
	return null;
}

/** Resolver organizationId desde body o token — devuelve { organizationId?, error? } */
async function resolveOrganizationId(body: unknown, headers: Headers): Promise<{ organizationId?: string; error?: string }> {
	if (body && typeof body === 'object' && 'organizationId' in (body as Record<string, unknown>)) {
		const orgId = (body as Record<string, unknown>).organizationId;
		if (typeof orgId === 'string' && orgId.trim() !== '') return { organizationId: orgId };
		return { organizationId: String(orgId ?? '') };
	}

	const token = getTokenFromRequest(headers);
	if (!token) {
		return {
			error: 'No se recibió token de sesión. Envíe Authorization: Bearer <access_token> o incluya organizationId en el body.',
		};
	}

	if (!useSupabase || !supabase) {
		return { error: 'Supabase service key no configurada en el servidor. No se puede validar sesión.' };
	}

	try {
		const { data, error } = await supabase.auth.getUser(token);
		if (error) {
			console.error('Supabase auth.getUser error', error);
			return { error: 'Token inválido o expirado.' };
		}
		const user = data?.user;
		if (!user) return { error: 'No se pudo resolver usuario desde token.' };

		if (prisma) {
			try {
				// --- CORRECCIÓN: usar la firma correcta de Prisma sin casts inseguros ---
				// Prisma espera: prisma.user.findUnique({ where: { authId: string } })
				const found = await prisma.user.findUnique({ where: { authId: user.id } });
				if (found && found.organizationId) {
					return { organizationId: String(found.organizationId) };
				}
				return { error: 'Usuario encontrado pero no tiene organizationId asociado en la tabla User.' };
			} catch (e) {
				console.error('Error buscando user en Prisma por authId', e);
				return { error: 'Error interno buscando usuario en DB.' };
			}
		}

		return { error: 'No se encontró organizationId asociado al usuario.' };
	} catch (err) {
		console.error('resolveOrganizationId unexpected', err);
		return { error: 'Error inesperado al resolver sesión.' };
	}
}

/** Definición mínima del cliente de modelo Prisma que usamos (evitar any) */
type ModelClient = {
	findUnique: (args: { where: Record<string, unknown> }) => Promise<Record<string, unknown> | null>;
	create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
	update: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
	findMany?: (args?: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
};

/** Intentar obtener un model client (ej: clinicProfile, clinic) desde prisma */
function getModelClient(prismaClient: PrismaClient, names: string[]): ModelClient | null {
	const p = prismaClient as unknown as Record<string, unknown>;
	for (const name of names) {
		const candidate = p[name];
		if (candidate && typeof candidate === 'object') {
			// cast seguro a ModelClient (tenemos runtime check above)
			return candidate as unknown as ModelClient;
		}
	}
	return null;
}

/** POST handler */
export async function POST(request: Request): Promise<NextResponse> {
	try {
		let body: unknown = null;
		try {
			body = await request.json();
		} catch {
			return NextResponse.json({ ok: false, errors: ['Payload debe ser JSON válido o no puede estar vacío'] }, { status: 400 });
		}

		const errors = validateClinicPayloadMinimal(body);
		if (errors.length) return NextResponse.json({ ok: false, errors }, { status: 400 });

		const resolved = await resolveOrganizationId(body, request.headers);
		if (resolved.error) {
			return NextResponse.json({ ok: false, errors: [resolved.error] }, { status: 401 });
		}
		const organizationId = resolved.organizationId ?? '';
		const prismaData = mapBodyToPrismaClinic(body, organizationId);

		if (prisma) {
			const modelClient = getModelClient(prisma, ['clinicProfile', 'clinic', 'clinic_profile']);
			if (!modelClient) {
				console.error('Prisma client loaded but no matching model found. Prisma keys:', Object.keys(prisma as unknown as Record<string, unknown>));
				return NextResponse.json({ ok: false, error: 'Prisma no configurado para el modelo de clinic' }, { status: 500 });
			}

			try {
				const where = { organizationId };

				// Intentar encontrar existente
				let existing: Record<string, unknown> | null = null;
				try {
					existing = await modelClient.findUnique({ where });
				} catch (findErr) {
					console.warn('Warning al buscar existing clinicProfile (puede ser que el campo where no exista):', findErr);
					existing = null;
				}

				if (existing) {
					const updated = await modelClient.update({ where, data: prismaData });
					const responseObj = ensureTemplateMerged(updated);
					return NextResponse.json({ ok: true, data: responseObj }, { status: 200 });
				} else {
					const created = await modelClient.create({ data: prismaData });
					const responseObj = ensureTemplateMerged(created);
					return NextResponse.json({ ok: true, data: responseObj }, { status: 201 });
				}
			} catch (dbErr: unknown) {
				console.error('Prisma create/update error', dbErr);
				const dbErrObj = dbErr as Record<string, unknown>;
				if (typeof dbErrObj.code === 'string' && dbErrObj.code === 'P2002') {
					try {
						const where = { organizationId };
						const existingAfterErr = await modelClient.findUnique({ where });
						if (existingAfterErr) {
							const updated = await modelClient.update({ where, data: prismaData });
							const responseObj = ensureTemplateMerged(updated);
							return NextResponse.json({ ok: true, data: responseObj }, { status: 200 });
						}
					} catch (recoverErr) {
						console.error('Error intentando recuperar/update tras P2002', recoverErr);
					}
				}

				const msg = typeof dbErrObj?.message === 'string' ? dbErrObj.message : String(dbErrObj);
				return NextResponse.json({ ok: false, error: msg }, { status: 500 });
			}
		}

		// fallback memoria
		MEMORY_DB.push(prismaData);
		return NextResponse.json({ ok: true, data: ensureTemplateMerged(prismaData), note: 'stored_in_memory' }, { status: 201 });
	} catch (err: unknown) {
		console.error('API /api/clinic POST unexpected error', err);
		const message = err instanceof Error ? err.message : String(err);
		return NextResponse.json({ ok: false, error: message }, { status: 500 });
	}
}

/** GET handler (lista) */
export async function GET(): Promise<NextResponse> {
	try {
		if (prisma) {
			const modelClient = getModelClient(prisma, ['clinicProfile', 'clinic', 'clinic_profile']);
			if (!modelClient) {
				console.error('Prisma client loaded but no matching model found. Prisma keys:', Object.keys(prisma as unknown as Record<string, unknown>));
				return NextResponse.json({ ok: false, error: 'Prisma no configurado para el modelo de clinic' }, { status: 500 });
			}

			try {
				const items = await (modelClient.findMany ? modelClient.findMany({ orderBy: { createdAt: 'desc' } }) : Promise.resolve([]));
				if (!items || items.length === 0) {
					return NextResponse.json({ ok: true, data: [ensureTemplateMerged({})] });
				}
				const sanitizedItems = Array.isArray(items) ? items.map((it) => ensureTemplateMerged(it)) : [ensureTemplateMerged(items)];
				return NextResponse.json({ ok: true, data: sanitizedItems });
			} catch (dbErr: unknown) {
				console.error('Prisma findMany error', dbErr);
				const msg = (dbErr as Record<string, unknown>)?.message ?? String(dbErr);
				return NextResponse.json({ ok: false, error: msg }, { status: 500 });
			}
		}

		// fallback memoria
		if (!MEMORY_DB.length) {
			return NextResponse.json({ ok: true, data: [ensureTemplateMerged({})] });
		}
		return NextResponse.json({ ok: true, data: MEMORY_DB.map((d) => ensureTemplateMerged(d)) });
	} catch (err: unknown) {
		console.error('API /api/clinic GET unexpected error', err);
		const message = err instanceof Error ? err.message : String(err);
		return NextResponse.json({ ok: false, error: message }, { status: 500 });
	}
}
