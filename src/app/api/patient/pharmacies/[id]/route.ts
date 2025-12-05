// app/api/patient/pharmacies/[id]/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const { id } = await params;
		const pharmacyId = id;

		const { data: pharmacy, error } = await supabase
			.from('Organization')
			.select(`
				id,
				name,
				type,
				clinic_profile:clinic_profile!clinic_profile_org_fk (
					*
				)
			`)
			.eq('id', pharmacyId)
			.eq('type', 'FARMACIA')
			.maybeSingle();

		if (error || !pharmacy) {
			return NextResponse.json({ error: 'Farmacia no encontrada' }, { status: 404 });
		}

		return NextResponse.json(pharmacy);
	} catch (err: any) {
		console.error('[Patient Pharmacy Detail API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}
