// app/api/patient/labs/[id]/route.ts
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
		const { supabase } = createSupabaseServerClient(cookieStore);

		const { id } = await params;
		const labId = id;

		const { data: lab, error } = await supabase
			.from('Organization')
			.select(`
				id,
				name,
				type,
				clinic_profile:clinic_profile!clinic_profile_org_fk (
					*
				)
			`)
			.eq('id', labId)
			.eq('type', 'LABORATORIO')
			.maybeSingle();

		if (error || !lab) {
			return NextResponse.json({ error: 'Laboratorio no encontrado' }, { status: 404 });
		}

		return NextResponse.json(lab);
	} catch (err: any) {
		console.error('[Patient Lab Detail API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}
