// app/api/patient/clinics/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { parseSpecialties } from '@/lib/safe-json-parse';

export async function GET(request: Request) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const url = new URL(request.url);
		const page = parseInt(url.searchParams.get('page') || '1', 10);
		const perPage = Math.min(parseInt(url.searchParams.get('per_page') || '20', 10), 100);
		const offset = (page - 1) * perPage;
		const specialty = url.searchParams.get('specialty');
		const search = url.searchParams.get('search');

		let query = supabase
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
				social_instagram,
				organization:Organization!clinic_profile_org_fk (
					id,
					name,
					type
				)
			`)
			.range(offset, offset + perPage - 1);

		if (search) {
			query = query.or(`legal_name.ilike.%${search}%,trade_name.ilike.%${search}%`);
		}

		const { data: clinics, error, count } = await query;

		if (error) {
			console.error('[Patient Clinics API] Error:', error);
			return NextResponse.json({ error: 'Error al obtener clínicas' }, { status: 500 });
		}

		// Filtrar por especialidad si se proporciona
		let filteredClinics = clinics || [];
		if (specialty && clinics) {
			filteredClinics = clinics.filter((clinic: any) => {
				const specialties = parseSpecialties(clinic.specialties);
				return specialties.some((s: any) => {
					const specName = typeof s === 'string' ? s : s?.name || s?.specialty || '';
					return specName.toLowerCase().includes(specialty.toLowerCase());
				});
			});
		}

		// Asegurar que cada clínica tenga organization_id disponible
		const clinicsWithOrgId = (filteredClinics || []).map((clinic: any) => ({
			...clinic,
			organization_id: clinic.organization_id || clinic.organization?.id,
		}));

		return NextResponse.json({
			data: clinicsWithOrgId,
			meta: {
				page,
				per_page: perPage,
				total: count || filteredClinics.length,
			},
		});
	} catch (err: any) {
		console.error('[Patient Clinics API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

