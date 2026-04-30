// app/api/patient/clinics/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { parseSpecialties } from '@/lib/safe-json-parse';

import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		// Usamos el cliente admin para acceder al directorio público sin bloqueos de RLS
		const supabaseAdmin = createClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.SUPABASE_SERVICE_ROLE_KEY!
		);

		const url = new URL(request.url);
		const page = parseInt(url.searchParams.get('page') || '1', 10);
		const perPage = Math.min(parseInt(url.searchParams.get('per_page') || '20', 10), 100);
		const offset = (page - 1) * perPage;
		const specialty = url.searchParams.get('specialty');
		const search = url.searchParams.get('search');

		// PASO 1: Obtener las organizaciones tipo CLINICA
		let orgQuery = supabaseAdmin
			.from('organization')
			.select('id, name, type, contactEmail, phone, address')
			.eq('type', 'CLINICA')
			.range(offset, offset + perPage - 1);

		if (search) {
			orgQuery = orgQuery.or(`name.ilike.%${search}%,address.ilike.%${search}%`);
		}

		const { data: organizations, error: orgsError } = await orgQuery;

		if (orgsError) {
			console.error('[Patient Clinics API] Error al buscar organizaciones:', orgsError);
			return NextResponse.json({ error: 'Error al obtener organizaciones de clínicas' }, { status: 500 });
		}

		if (!organizations || organizations.length === 0) {
			return NextResponse.json({
				data: [],
				meta: { page, per_page: perPage, total: 0 },
			});
		}

		const orgIds = organizations.map(org => org.id);

		// PASO 2: Obtener los perfiles de clínica correspondientes
		const { data: clinicProfiles, error: profilesError } = await supabaseAdmin
			.from('clinic_profile')
			.select(`
				id,
				organization_id,
				legal_name,
				trade_name,
				address_operational,
				phone_mobile,
				phone_fixed,
				contact_email,
				specialties,
				opening_hours,
				website,
				social_facebook,
				social_instagram
			`)
			.in('organization_id', orgIds);

		if (profilesError) {
			console.error('[Patient Clinics API] Error al buscar perfiles:', profilesError);
		}

		// Construir el resultado combinando la organización y el perfil
		const clinicsData = organizations.map(org => {
			const profile = clinicProfiles?.find(p => p.organization_id === org.id) || {};
			return {
				...profile,
				organization_id: org.id,
				organization: {
					id: org.id,
					name: org.name,
					type: org.type
				}
			};
		});

		// Filtrar por especialidad si se proporciona
		let finalClinics = clinicsData;
		if (specialty) {
			finalClinics = finalClinics.filter((clinic: any) => {
				const specialties = parseSpecialties(clinic.specialties);
				return specialties.some((s: any) => {
					const specName = typeof s === 'string' ? s : s?.name || s?.specialty || '';
					return specName.toLowerCase().includes(specialty.toLowerCase());
				});
			});
		}

		return NextResponse.json({
			data: finalClinics,
			meta: {
				page,
				per_page: perPage,
				total: finalClinics.length,
			},
		});
	} catch (err: any) {
		console.error('[Patient Clinics API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

