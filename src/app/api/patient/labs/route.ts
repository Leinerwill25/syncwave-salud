// app/api/patient/labs/route.ts
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
		const examType = url.searchParams.get('exam_type');
		const search = url.searchParams.get('search');

		// Buscar organizaciones de tipo LABORATORIO
		let query = supabase
			.from('organization')
			.select(`
				id,
				name,
				type,
				clinic_profile:clinic_profile!clinic_profile_org_fk (
					id,
					legal_name,
					trade_name,
					address_operational,
					phone_mobile,
					phone_fixed,
					contact_email,
					specialties,
					opening_hours,
					website
				)
			`)
			.eq('type', 'LABORATORIO')
			.range(offset, offset + perPage - 1);

		if (search) {
			query = query.ilike('name', `%${search}%`);
		}

		const { data: labs, error, count } = await query;

		if (error) {
			console.error('[Patient Labs API] Error:', error);
			return NextResponse.json({ error: 'Error al obtener laboratorios' }, { status: 500 });
		}

		// Filtrar por tipo de examen si se proporciona
		let filteredLabs = labs || [];
		if (examType && labs) {
			filteredLabs = labs.filter((lab: any) => {
				const clinicProfile = lab.clinic_profile;
				if (!clinicProfile) return false;
				const specialties = parseSpecialties(clinicProfile.specialties);
				return specialties.some((s: any) => {
					const specName = typeof s === 'string' ? s : s?.name || s?.specialty || '';
					return specName.toLowerCase().includes(examType.toLowerCase());
				});
			});
		}

		return NextResponse.json({
			data: filteredLabs,
			meta: {
				page,
				per_page: perPage,
				total: count || filteredLabs.length,
			},
		});
	} catch (err: any) {
		console.error('[Patient Labs API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

