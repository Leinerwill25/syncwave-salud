// app/api/patient/pharmacies/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';

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
		const search = url.searchParams.get('search');

		// Buscar organizaciones de tipo FARMACIA
		let query = supabase
			.from('organization')
			.select(`
				id,
				name,
				type,
				clinic_profile:organization_id (
					id,
					legal_name,
					trade_name,
					address_operational,
					phone_mobile,
					phone_fixed,
					contact_email,
					opening_hours,
					website
				)
			`)
			.eq('type', 'FARMACIA')
			.range(offset, offset + perPage - 1);

		if (search) {
			query = query.ilike('name', `%${search}%`);
		}

		const { data: pharmacies, error, count } = await query;

		if (error) {
			console.error('[Patient Pharmacies API] Error:', error);
			return NextResponse.json({ error: 'Error al obtener farmacias' }, { status: 500 });
		}

		return NextResponse.json({
			data: pharmacies || [],
			meta: {
				page,
				per_page: perPage,
				total: count || 0,
			},
		});
	} catch (err: any) {
		console.error('[Patient Pharmacies API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

