// app/api/clinic-profile/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';

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

/** Normaliza campos JSON que pueden ser null */
function normalizeJsonFields(profile: any) {
	if (!profile) return profile;

	// Normalizar specialties
	if (profile.specialties === null || profile.specialties === undefined) {
		profile.specialties = [];
	} else if (typeof profile.specialties === 'string') {
		try {
			profile.specialties = JSON.parse(profile.specialties);
		} catch {
			profile.specialties = [];
		}
	}

	// Normalizar opening_hours
	if (profile.opening_hours === null || profile.opening_hours === undefined) {
		profile.opening_hours = [];
	} else if (typeof profile.opening_hours === 'string') {
		try {
			profile.opening_hours = JSON.parse(profile.opening_hours);
		} catch {
			profile.opening_hours = [];
		}
	}

	// Normalizar payment_methods
	if (profile.payment_methods === null || profile.payment_methods === undefined) {
		profile.payment_methods = [];
	} else if (typeof profile.payment_methods === 'string') {
		try {
			profile.payment_methods = JSON.parse(profile.payment_methods);
		} catch {
			profile.payment_methods = [];
		}
	}

	// Normalizar location
	if (profile.location === null || profile.location === undefined) {
		profile.location = null;
	} else if (typeof profile.location === 'string') {
		try {
			profile.location = JSON.parse(profile.location);
		} catch {
			profile.location = null;
		}
	}

	// Normalizar photos
	if (profile.photos === null || profile.photos === undefined) {
		profile.photos = [];
	} else if (typeof profile.photos === 'string') {
		try {
			profile.photos = JSON.parse(profile.photos);
		} catch {
			profile.photos = [];
		}
	}

	return profile;
}

/** Convierte campos snake_case a camelCase para la respuesta */
function toCamelCase(profile: any) {
	if (!profile) return profile;

	return {
		id: profile.id,
		organizationId: profile.organization_id,
		legalRif: profile.legal_rif,
		legalName: profile.legal_name,
		tradeName: profile.trade_name,
		entityType: profile.entity_type,
		addressFiscal: profile.address_fiscal,
		addressOperational: profile.address_operational,
		stateProvince: profile.state_province,
		cityMunicipality: profile.city_municipality,
		postalCode: profile.postal_code,
		phoneFixed: profile.phone_fixed,
		phoneMobile: profile.phone_mobile,
		contactEmail: profile.contact_email,
		website: profile.website,
		socialFacebook: profile.social_facebook,
		socialInstagram: profile.social_instagram,
		socialLinkedin: profile.social_linkedin,
		officesCount: profile.offices_count,
		specialties: profile.specialties,
		openingHours: profile.opening_hours,
		capacityPerDay: profile.capacity_per_day,
		employeesCount: profile.employees_count,
		directorName: profile.director_name,
		adminName: profile.admin_name,
		directorIdNumber: profile.director_id_number,
		sanitaryLicense: profile.sanitary_license,
		liabilityInsuranceNumber: profile.liability_insurance_number,
		bankName: profile.bank_name,
		bankAccountType: profile.bank_account_type,
		bankAccountNumber: profile.bank_account_number,
		bankAccountOwner: profile.bank_account_owner,
		currency: profile.currency,
		paymentMethods: profile.payment_methods,
		billingSeries: profile.billing_series,
		taxRegime: profile.tax_regime,
		billingAddress: profile.billing_address,
		createdAt: profile.created_at,
		updatedAt: profile.updated_at,
		location: profile.location,
		photos: profile.photos,
		profilePhoto: profile.profile_photo,
		hasCashea: profile.has_cashea,
	};
}

/** GET handler (trae profile por organizationId) */
export async function GET(req: Request) {
	try {
		const supabase = await createSupabaseServerClient();

		// Obtener usuario autenticado
		let authUser = null;
		const { data: { user: userFromSession }, error: authError } = await supabase.auth.getUser();
		
		if (!authError && userFromSession) {
			authUser = userFromSession;
		} else {
			// Fallback: intentar obtener token desde request
			const token = extractAccessTokenFromRequest(req);
			if (!token) {
				return NextResponse.json({ ok: false, message: 'not authenticated (no token found)' }, { status: 401 });
			}

			// Intentar obtener usuario con el token
			const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token);
			if (tokenError || !tokenUser) {
				return NextResponse.json({ ok: false, message: 'not authenticated (could not resolve authId)' }, { status: 401 });
			}
			authUser = tokenUser;
		}

		if (!authUser) {
			return NextResponse.json({ ok: false, message: 'not authenticated' }, { status: 401 });
		}

		// Obtener organizationId desde tabla User usando Supabase
		const { data: appUser, error: userError } = await supabase
			.from('user')
			.select('organizationId')
			.eq('authId', authUser.id)
			.maybeSingle();

		if (userError || !appUser?.organizationId) {
			return NextResponse.json({ ok: false, message: 'organization not found for user' }, { status: 401 });
		}

		const organizationId = appUser.organizationId;

		// Dev shortcut
		const targetOrgId = TEST_ORG_ID || organizationId;

		// Obtener profile desde Supabase
		const { data: profile, error: profileError } = await supabase
			.from('clinic_profile')
			.select('*')
			.eq('organization_id', targetOrgId)
			.maybeSingle();

		if (profileError) {
			console.error('Error obteniendo clinic_profile:', profileError);
			return NextResponse.json({ ok: false, message: 'Error obteniendo perfil de clínica' }, { status: 500 });
		}

		if (!profile) {
			return NextResponse.json({ ok: false, message: 'clinic profile not found' }, { status: 404 });
		}

		// Normalizar campos JSON y convertir a camelCase
		const normalized = normalizeJsonFields(profile);
		const camelCaseProfile = toCamelCase(normalized);

		return NextResponse.json({ ok: true, profile: camelCaseProfile }, { status: 200 });
	} catch (err: any) {
		console.error('GET /api/clinic-profile error', err);
		return NextResponse.json({ ok: false, message: err?.message ?? 'server error' }, { status: 500 });
	}
}

/** PUT handler: actualiza (o crea) clinicProfile para la organization del usuario */
export async function PUT(req: Request) {
	try {
		const supabase = await createSupabaseServerClient();

		// Obtener usuario autenticado
		let authUser = null;
		const { data: { user: userFromSession }, error: authError } = await supabase.auth.getUser();
		
		if (!authError && userFromSession) {
			authUser = userFromSession;
		} else {
			// Fallback: intentar obtener token desde request
			const token = extractAccessTokenFromRequest(req);
			if (!token) {
				return NextResponse.json({ ok: false, message: 'not authenticated (no token found)' }, { status: 401 });
			}

			// Intentar obtener usuario con el token
			const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token);
			if (tokenError || !tokenUser) {
				return NextResponse.json({ ok: false, message: 'not authenticated (could not resolve authId)' }, { status: 401 });
			}
			authUser = tokenUser;
		}

		if (!authUser) {
			return NextResponse.json({ ok: false, message: 'not authenticated' }, { status: 401 });
		}

		// Obtener organizationId desde tabla User usando Supabase
		const { data: appUser, error: userError } = await supabase
			.from('user')
			.select('organizationId')
			.eq('authId', authUser.id)
			.maybeSingle();

		if (userError || !appUser?.organizationId) {
			return NextResponse.json({ ok: false, message: 'organization not found for user' }, { status: 401 });
		}

		const organizationId = TEST_ORG_ID || appUser.organizationId;

		// Leer body y normalizar
		const body = await req.json().catch(() => ({}));
		const payload: any = { ...body };

		// Intentar parsear campos que pueden venir como strings
		payload.specialties = safeParseMaybeJson(payload.specialties) ?? [];
		payload.openingHours = safeParseMaybeJson(payload.openingHours) ?? [];
		payload.paymentMethods = safeParseMaybeJson(payload.paymentMethods) ?? [];

		// Convertir camelCase a snake_case para la base de datos
		const dataToUpdate: any = {
			legal_rif: payload.legalRif,
			legal_name: payload.legalName,
			trade_name: payload.tradeName,
			entity_type: payload.entityType,
			address_fiscal: payload.addressFiscal,
			address_operational: payload.addressOperational,
			state_province: payload.stateProvince,
			city_municipality: payload.cityMunicipality,
			postal_code: payload.postalCode,
			phone_fixed: payload.phoneFixed,
			phone_mobile: payload.phoneMobile,
			contact_email: payload.contactEmail,
			website: payload.website,
			social_facebook: payload.socialFacebook,
			social_instagram: payload.socialInstagram,
			social_linkedin: payload.socialLinkedin,
			offices_count: payload.officesCount,
			specialties: payload.specialties,
			opening_hours: payload.openingHours,
			capacity_per_day: payload.capacityPerDay,
			employees_count: payload.employeesCount,
			director_name: payload.directorName,
			admin_name: payload.adminName,
			director_id_number: payload.directorIdNumber,
			sanitary_license: payload.sanitaryLicense,
			liability_insurance_number: payload.liabilityInsuranceNumber,
			bank_name: payload.bankName,
			bank_account_type: payload.bankAccountType,
			bank_account_number: payload.bankAccountNumber,
			bank_account_owner: payload.bankAccountOwner,
			currency: payload.currency,
			payment_methods: payload.paymentMethods,
			billing_series: payload.billingSeries,
			tax_regime: payload.taxRegime,
			billing_address: payload.billingAddress,
		};

		// Normalizaciones: empty string -> null for optional fields
		for (const k of Object.keys(dataToUpdate)) {
			if (dataToUpdate[k] === undefined) {
				delete dataToUpdate[k];
			} else if (typeof dataToUpdate[k] === 'string' && dataToUpdate[k].trim() === '') {
				dataToUpdate[k] = null;
			}
		}

		// Upsert usando Supabase (insert o update)
		const { data: existingProfile } = await supabase
			.from('clinic_profile')
			.select('id')
			.eq('organization_id', organizationId)
			.maybeSingle();

		let upserted: any;

		if (existingProfile) {
			// Update
			const { data: updated, error: updateError } = await supabase
				.from('clinic_profile')
				.update({
					...dataToUpdate,
					updated_at: new Date().toISOString(),
				})
				.eq('organization_id', organizationId)
				.select()
				.single();

			if (updateError) {
				console.error('Error actualizando clinic_profile:', updateError);
				return NextResponse.json({ ok: false, message: 'Error actualizando perfil de clínica' }, { status: 500 });
			}

			upserted = updated;
		} else {
			// Create
			const { data: created, error: createError } = await supabase
				.from('clinic_profile')
				.insert({
					organization_id: organizationId,
					legal_name: dataToUpdate.legal_name || 'Clínica',
					...dataToUpdate,
				})
				.select()
				.single();

			if (createError) {
				console.error('Error creando clinic_profile:', createError);
				return NextResponse.json({ ok: false, message: 'Error creando perfil de clínica' }, { status: 500 });
			}

			upserted = created;
		}

		// Normalizar campos JSON y convertir a camelCase
		const normalized = normalizeJsonFields(upserted);
		const camelCaseProfile = toCamelCase(normalized);

		return NextResponse.json({ ok: true, profile: camelCaseProfile }, { status: 200 });
	} catch (err: any) {
		console.error('PUT /api/clinic-profile error', err);
		return NextResponse.json({ ok: false, message: err?.message ?? 'server error' }, { status: 500 });
	}
}
