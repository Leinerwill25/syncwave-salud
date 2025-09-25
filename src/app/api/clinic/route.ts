// app/api/clinic/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

console.log('Loaded route: /api/clinic');

// Cargar prisma si existe
let prisma: any = null;
try {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const mod = require('@/lib/prisma');
	prisma = mod?.default ?? mod?.prisma ?? mod;
} catch (e) {
	prisma = null;
}

// Supabase server client (usamos service role key para poder verificar tokens)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const useSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const supabase = useSupabase ? createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!) : null;

const MEMORY_DB: any[] = [];

/**
 * defaultClinicTemplate
 * Devuelve un objeto con todas las keys que el formulario puede esperar,
 * inicializadas para evitar `undefined` (inputs controlados).
 */
function defaultClinicTemplate() {
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
		specialties: [] as any[],
		openingHours: '',
		capacityPerDay: '' as string | number,
		employeesCount: null as number | null,
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
		paymentMethods: [] as any[],
		billingSeries: '',
		taxRegime: '',
		billingAddress: '',
		createdAt: '',
		updatedAt: '',
	};
}

/**
 * sanitizeForClient
 * Recorre recursivamente un objeto/array y:
 * - reemplaza null/undefined por '' (evita warning en inputs controlados)
 * - convierte Date a ISO string
 */
function sanitizeForClient(obj: any): any {
	if (obj === null) return '';
	if (obj === undefined) return '';
	if (obj instanceof Date) return obj.toISOString();
	if (Array.isArray(obj)) return obj.map(sanitizeForClient);
	if (typeof obj === 'object') {
		const out: any = {};
		for (const k of Object.keys(obj)) {
			out[k] = sanitizeForClient(obj[k]);
		}
		return out;
	}
	return obj;
}

/**
 * ensureTemplateMerged
 * Combina defaults con los datos reales sanitizados para garantizar que
 * todas las propiedades esperadas existen y no son undefined.
 */
function ensureTemplateMerged(raw: any) {
	const defaults = defaultClinicTemplate();
	const sanitized = sanitizeForClient(raw ?? {});
	return { ...defaults, ...sanitized };
}

function validateClinicPayloadMinimal(body: any) {
	const errors: string[] = [];
	if (!body) {
		errors.push('Payload vacío');
		return errors;
	}
	if (!body.rif) errors.push('rif es requerido');
	if (!body.legalName) errors.push('legalName es requerido');
	if (!body.addressFiscal) errors.push('addressFiscal es requerido');
	if (!body.email) errors.push('email es requerido');
	return errors;
}

function mapBodyToPrismaClinic(body: any, organizationId: string) {
	const specialties = Array.isArray(body.specialties) ? body.specialties : [];
	const paymentMethods = Array.isArray(body.paymentMethods) ? body.paymentMethods : [];

	return {
		organizationId: organizationId,
		legalRif: body.rif ?? null,
		legalName: body.legalName,
		tradeName: body.tradeName ?? null,
		entityType: body.entityType ?? null,

		addressFiscal: body.addressFiscal,
		addressOperational: body.addressOperational ?? null,
		stateProvince: body.state ?? null,
		cityMunicipality: body.city ?? null,
		postalCode: body.postalCode ?? null,

		phoneFixed: body.phone ?? null,
		phoneMobile: body.whatsapp ?? null,
		contactEmail: body.email,
		website: body.website ?? null,
		socialFacebook: body.social_facebook ?? body.socialFacebook ?? null,
		socialInstagram: body.social_instagram ?? body.socialInstagram ?? null,
		socialLinkedin: body.social_linkedin ?? body.socialLinkedin ?? null,

		officesCount: typeof body.officesCount !== 'undefined' ? Number(body.officesCount) || 0 : 0,
		specialties: specialties,
		openingHours: body.openingHours ?? null,
		capacityPerDay: typeof body.capacityPerDay !== 'undefined' ? Number(body.capacityPerDay) : null,
		employeesCount: typeof body.employeesCount !== 'undefined' ? Number(body.employeesCount) : null,

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
		paymentMethods: paymentMethods,

		billingSeries: body.billingSeries ?? null,
		taxRegime: body.taxRegime ?? null,
		billingAddress: body.billingAddress ?? null,
	};
}

function getBearerTokenFromHeaders(headers: Headers) {
	const auth = headers.get('authorization') || headers.get('Authorization');
	if (!auth) return null;
	const m = auth.match(/Bearer\s+(.+)/i);
	return m ? m[1] : null;
}

function getTokenFromRequest(headers: Headers) {
	const headerToken = getBearerTokenFromHeaders(headers);
	if (headerToken) return headerToken;
	const cookieHeader = headers.get('cookie') || '';
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

async function resolveOrganizationId(body: any, headers: Headers): Promise<{ organizationId?: string; error?: string }> {
	if (body.organizationId) return { organizationId: String(body.organizationId) };

	const token = getTokenFromRequest(headers);
	if (!token) {
		return { error: 'No se recibió token de sesión. Envíe Authorization: Bearer <access_token> o incluya organizationId en el body.' };
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
				const found = await (prisma as any).user.findUnique({ where: { authId: user.id } });
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

/**
 * POST handler
 */
export async function POST(request: Request) {
	try {
		let body: any = null;
		try {
			body = await request.json();
		} catch (err) {
			return NextResponse.json({ ok: false, errors: ['Payload debe ser JSON válido o no puede estar vacío'] }, { status: 400 });
		}

		const errors = validateClinicPayloadMinimal(body);
		if (errors.length) return NextResponse.json({ ok: false, errors }, { status: 400 });

		const resolved = await resolveOrganizationId(body, request.headers);
		if (resolved.error) {
			return NextResponse.json({ ok: false, errors: [resolved.error] }, { status: 401 });
		}
		const organizationId = resolved.organizationId!;
		const prismaData = mapBodyToPrismaClinic(body, organizationId);

		if (prisma) {
			const modelClient = (prisma as any).clinicProfile ?? (prisma as any).clinic ?? (prisma as any).clinic_profile ?? null;

			if (!modelClient) {
				console.error('Prisma client loaded but no matching model found. Prisma keys:', Object.keys(prisma));
				return NextResponse.json({ ok: false, error: 'Prisma no configurado para el modelo de clinic' }, { status: 500 });
			}

			try {
				const where = { organizationId: organizationId };

				// Intentar encontrar existente
				let existing: any = null;
				try {
					existing = await modelClient.findUnique({ where });
				} catch (findErr) {
					console.warn('Warning al buscar existing clinicProfile (puede ser que el campo where no exista):', findErr);
					existing = null;
				}

				if (existing) {
					// Actualizar
					const updated = await modelClient.update({ where, data: prismaData });
					const responseObj = ensureTemplateMerged(updated);
					return NextResponse.json({ ok: true, data: responseObj }, { status: 200 });
				} else {
					// Crear
					const created = await modelClient.create({ data: prismaData });
					const responseObj = ensureTemplateMerged(created);
					return NextResponse.json({ ok: true, data: responseObj }, { status: 201 });
				}
			} catch (dbErr: any) {
				console.error('Prisma create/update error', dbErr);

				if (dbErr?.code === 'P2002') {
					try {
						const where = { organizationId: organizationId };
						const existingAfterErr = await (modelClient as any).findUnique({ where });
						if (existingAfterErr) {
							const updated = await (modelClient as any).update({ where, data: prismaData });
							const responseObj = ensureTemplateMerged(updated);
							return NextResponse.json({ ok: true, data: responseObj }, { status: 200 });
						}
					} catch (recoverErr) {
						console.error('Error intentando recuperar/update tras P2002', recoverErr);
					}
				}

				const msg = dbErr?.message ?? String(dbErr);
				return NextResponse.json({ ok: false, error: msg }, { status: 500 });
			}
		}

		// fallback memoria
		MEMORY_DB.push(prismaData);
		return NextResponse.json({ ok: true, data: ensureTemplateMerged(prismaData), note: 'stored_in_memory' }, { status: 201 });
	} catch (err: any) {
		console.error('API /api/clinic POST unexpected error', err);
		return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
	}
}

/**
 * GET handler (lista)
 */
export async function GET() {
	try {
		if (prisma) {
			const modelClient = (prisma as any).clinicProfile ?? (prisma as any).clinic ?? (prisma as any).clinic_profile ?? null;

			if (!modelClient) {
				console.error('Prisma client loaded but no matching model found. Prisma keys:', Object.keys(prisma));
				return NextResponse.json({ ok: false, error: 'Prisma no configurado para el modelo de clinic' }, { status: 500 });
			}

			try {
				const items = await modelClient.findMany({ orderBy: { createdAt: 'desc' } });
				// Si no hay items, devolvemos un template con keys definidas (útil para inicializar formularios)
				if (!items || items.length === 0) {
					return NextResponse.json({ ok: true, data: [ensureTemplateMerged({})] });
				}
				const sanitizedItems = Array.isArray(items) ? items.map((it) => ensureTemplateMerged(it)) : [ensureTemplateMerged(items)];
				return NextResponse.json({ ok: true, data: sanitizedItems });
			} catch (dbErr: any) {
				console.error('Prisma findMany error', dbErr);
				return NextResponse.json({ ok: false, error: dbErr?.message ?? String(dbErr) }, { status: 500 });
			}
		}

		// fallback memoria
		if (!MEMORY_DB.length) {
			return NextResponse.json({ ok: true, data: [ensureTemplateMerged({})] });
		}
		return NextResponse.json({ ok: true, data: MEMORY_DB.map((d) => ensureTemplateMerged(d)) });
	} catch (err: any) {
		console.error('API /api/clinic GET unexpected error', err);
		return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
	}
}
