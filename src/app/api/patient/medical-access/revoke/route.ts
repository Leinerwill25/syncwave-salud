// app/api/patient/medical-access/revoke/route.ts
// API para que el paciente revoque el acceso médico a su historial

import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const body = await request.json();
		const { doctor_id } = body;

		if (!doctor_id) {
			return NextResponse.json({ error: 'doctor_id es requerido' }, { status: 400 });
		}

		// Revocar el grant (marcar como inactivo)
		const { data: revokedGrant, error: revokeError } = await supabase
			.from('MedicalAccessGrant')
			.update({
				is_active: false,
				revoked_at: new Date().toISOString(),
			})
			.eq('patient_id', patient.patientId)
			.eq('doctor_id', doctor_id)
			.eq('is_active', true)
			.select()
			.single();

		if (revokeError) {
			if (revokeError.code === 'PGRST116') {
				return NextResponse.json({ error: 'No se encontró un acceso activo para revocar' }, { status: 404 });
			}
			console.error('[Revoke Medical Access API] Error:', revokeError);
			return NextResponse.json({ error: 'Error al revocar acceso' }, { status: 500 });
		}

		return NextResponse.json({
			success: true,
			message: 'Acceso médico revocado correctamente',
			grant: revokedGrant,
		});
	} catch (err: any) {
		console.error('[Revoke Medical Access API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

