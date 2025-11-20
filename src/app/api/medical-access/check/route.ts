// app/api/medical-access/check/route.ts
// API para verificar si un médico tiene acceso al historial completo de un paciente

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { apiRequireRole } from '@/lib/auth-guards';

export async function GET(request: Request) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const doctor = authResult.user!;
		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const url = new URL(request.url);
		const patient_id = url.searchParams.get('patient_id');

		if (!patient_id) {
			return NextResponse.json({ error: 'patient_id es requerido' }, { status: 400 });
		}

		// Verificar si el médico tiene una consulta/cita con el paciente
		const { data: hasConsultation, error: consultError } = await supabase
			.from('consultation')
			.select('id')
			.eq('patient_id', patient_id)
			.eq('doctor_id', doctor.id)
			.limit(1)
			.maybeSingle();

		if (consultError) {
			console.error('[Medical Access Check API] Error verificando consulta:', consultError);
		}

		const { data: hasAppointment, error: aptError } = await supabase
			.from('appointment')
			.select('id')
			.eq('patient_id', patient_id)
			.eq('doctor_id', doctor.id)
			.limit(1)
			.maybeSingle();

		if (aptError) {
			console.error('[Medical Access Check API] Error verificando cita:', aptError);
		}

		// Verificar si tiene un grant activo
		const { data: grant, error: grantError } = await supabase
			.from('MedicalAccessGrant')
			.select('id, granted_at, expires_at')
			.eq('patient_id', patient_id)
			.eq('doctor_id', doctor.id)
			.eq('is_active', true)
			.maybeSingle();

		if (grantError && grantError.code !== 'PGRST116') {
			console.error('[Medical Access Check API] Error verificando grant:', grantError);
		}

		// Verificar si el grant está expirado
		let hasFullAccess = false;
		if (grant) {
			const expiresAt = grant.expires_at ? new Date(grant.expires_at).getTime() : null;
			hasFullAccess = !expiresAt || expiresAt > Date.now();
		}

		return NextResponse.json({
			hasConsultation: !!hasConsultation || !!hasAppointment,
			hasFullAccess,
			grant: grant || null,
		});
	} catch (err: any) {
		console.error('[Medical Access Check API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

