import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

console.log('Loaded route: /api/clinic');

// --- Supabase server client ---
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
	console.warn('[Clinic API] Supabase credentials not configured');
}

const supabaseAdmin: SupabaseClient | null = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
	? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
	: null;

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
	if (!token || !supabaseAdmin) return { error: 'Token inválido o faltante. No se puede obtener organizationId.' };

	const { data, error } = await supabaseAdmin.auth.getUser(token);
	if (error || !data?.user) return { error: 'Token inválido o expirado.' };

	// Obtener usuario de la tabla user usando Supabase
	const { data: user, error: userError } = await supabaseAdmin
		.from('users')
		.select('id, organizationId')
		.eq('authId', data.user.id)
		.maybeSingle();

	if (userError || !user?.organizationId) {
		return { error: 'El usuario no tiene organizationId asociado.' };
	}
	return { organizationId: user.organizationId };
}

function mapBodyToSupabaseClinic(body: any, organizationId: string) {
	const specialties = Array.isArray(body.specialties) ? body.specialties : [];
	const paymentMethods = Array.isArray(body.paymentMethods) ? body.paymentMethods : [];

	return {
		organization_id: organizationId,
		legal_rif: body.rif ?? null,
		legal_name: body.legalName ?? null,
		trade_name: body.tradeName ?? null,
		entity_type: body.entityType ?? null,
		address_fiscal: body.addressFiscal ?? null,
		address_operational: body.addressOperational ?? null,
		state_province: body.state ?? null,
		city_municipality: body.city ?? null,
		postal_code: body.postalCode ?? null,
		phone_fixed: body.phone ?? null,
		phone_mobile: body.whatsapp ?? null,
		contact_email: body.email ?? null,
		website: body.website ?? null,
		social_facebook: body.social_facebook ?? null,
		social_instagram: body.social_instagram ?? null,
		social_linkedin: body.social_linkedin ?? null,
		offices_count: Number(body.officesCount) || 0,
		specialties: specialties,
		opening_hours: body.openingHours ?? null,
		capacity_per_day: Number(body.capacityPerDay) || null,
		employees_count: Number(body.employeesCount) || null,
		director_name: body.directorName ?? null,
		admin_name: body.adminName ?? null,
		director_id_number: body.directorId ?? null,
		sanitary_license: body.sanitaryLicense ?? null,
		liability_insurance_number: body.liabilityInsuranceNumber ?? null,
		bank_name: body.bankName ?? null,
		bank_account_type: body.accountType ?? null,
		bank_account_number: body.accountNumber ?? null,
		bank_account_owner: body.accountOwner ?? null,
		currency: body.currency ?? null,
		payment_methods: paymentMethods,
		billing_series: body.billingSeries ?? null,
		tax_regime: body.taxRegime ?? null,
		billing_address: body.billingAddress ?? null,
		updated_at: new Date().toISOString(),
	};
}

// Mapear de snake_case a camelCase para la respuesta
function mapSupabaseToClient(data: any) {
	if (!data) return null;
	return {
		organizationId: data.organization_id,
		legalRif: data.legal_rif,
		legalName: data.legal_name,
		tradeName: data.trade_name,
		entityType: data.entity_type,
		addressFiscal: data.address_fiscal,
		addressOperational: data.address_operational,
		stateProvince: data.state_province,
		cityMunicipality: data.city_municipality,
		postalCode: data.postal_code,
		contactEmail: data.contact_email,
		specialties: data.specialties || [],
		paymentMethods: data.payment_methods || [],
		...data,
	};
}

// --- POST handler ---
export async function POST(request: Request) {
	try {
		if (!supabaseAdmin) {
			return NextResponse.json({ ok: false, error: 'Supabase no configurado.' }, { status: 500 });
		}

		const body = await request.json().catch(() => null);
		if (!body) return NextResponse.json({ ok: false, error: 'El cuerpo de la solicitud debe ser JSON.' }, { status: 400 });

		const { organizationId, error } = await resolveOrganizationId(body, request.headers);
		if (error) return NextResponse.json({ ok: false, error }, { status: 401 });

		const clinicData = mapBodyToSupabaseClinic(body, organizationId);

		// Verificar si ya existe un perfil de clínica para esta organización
		const { data: existing, error: fetchError } = await supabaseAdmin
			.from('clinic_profile')
			.select('*')
			.eq('organization_id', organizationId)
			.maybeSingle();

		if (fetchError && fetchError.code !== 'PGRST116') {
			console.error('[Clinic API] Error buscando perfil existente:', fetchError);
			return NextResponse.json({ ok: false, error: 'Error al buscar perfil de clínica.' }, { status: 500 });
		}

		let result;
		if (existing) {
			// Actualizar perfil existente
			const { data: updated, error: updateError } = await supabaseAdmin
				.from('clinic_profile')
				.update(clinicData)
				.eq('organization_id', organizationId)
				.select()
				.single();

			if (updateError) {
				console.error('[Clinic API] Error actualizando perfil:', updateError);
				return NextResponse.json({ ok: false, error: 'Error al actualizar perfil de clínica.' }, { status: 500 });
			}
			result = updated;
		} else {
			// Crear nuevo perfil
			const { data: created, error: createError } = await supabaseAdmin
				.from('clinic_profile')
				.insert(clinicData)
				.select()
				.single();

			if (createError) {
				console.error('[Clinic API] Error creando perfil:', createError);
				return NextResponse.json({ ok: false, error: 'Error al crear perfil de clínica.' }, { status: 500 });
			}
			result = created;
		}

		return NextResponse.json({ ok: true, data: ensureTemplateMerged(mapSupabaseToClient(result)) });
	} catch (err: any) {
		console.error('Error en /api/clinic POST', err);
		return NextResponse.json({ ok: false, error: err.message ?? String(err) }, { status: 500 });
	}
}

// --- GET handler ---
export async function GET() {
	try {
		if (!supabaseAdmin) {
			return NextResponse.json({ ok: false, error: 'Supabase no configurado.' }, { status: 500 });
		}

		const { data: items, error } = await supabaseAdmin
			.from('clinic_profile')
			.select('*')
			.order('created_at', { ascending: false });

		if (error) {
			console.error('[Clinic API] Error obteniendo perfiles:', error);
			return NextResponse.json({ ok: false, error: 'Error al obtener perfiles de clínica.' }, { status: 500 });
		}

		return NextResponse.json({
			ok: true,
			data: (items || []).map((item) => ensureTemplateMerged(mapSupabaseToClient(item))),
		});
	} catch (err: any) {
		console.error('Error en /api/clinic GET', err);
		return NextResponse.json({ ok: false, error: err.message ?? String(err) }, { status: 500 });
	}
}
