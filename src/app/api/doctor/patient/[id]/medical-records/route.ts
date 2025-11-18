// app/api/doctor/patient/[id]/medical-records/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';

function validateToken(token: string): { patientId: string } | null {
	try {
		const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
		if (decoded.expiresAt && decoded.expiresAt < Date.now()) {
			return null; // Token expirado
		}
		return { patientId: decoded.patientId };
	} catch {
		return null;
	}
}

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const url = new URL(request.url);
		const token = url.searchParams.get('token');

		if (!token) {
			return NextResponse.json({ error: 'Token requerido' }, { status: 401 });
		}

		const tokenData = validateToken(token);
		if (!tokenData) {
			return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 });
		}

		const { id } = await params;
		const patientId = id;

		// Verificar que el token corresponde al paciente
		if (tokenData.patientId !== patientId) {
			return NextResponse.json({ error: 'Token no válido para este paciente' }, { status: 403 });
		}

		// Obtener registros médicos del paciente
		const { data: consultations, error: consultError } = await supabase
			.from('consultation')
			.select(`
				id,
				started_at,
				ended_at,
				chief_complaint,
				diagnosis,
				notes,
				vitals,
				doctor:User!fk_consultation_doctor (
					id,
					name
				)
			`)
			.eq('patient_id', patientId)
			.order('created_at', { ascending: false });

		const { data: prescriptions, error: prescError } = await supabase
			.from('prescription')
			.select(`
				id,
				issued_at,
				status,
				notes,
				prescription_item (
					id,
					name,
					dosage,
					frequency,
					instructions
				)
			`)
			.eq('patient_id', patientId)
			.order('created_at', { ascending: false });

		const { data: labResults, error: labError } = await supabase
			.from('lab_result')
			.select(`
				id,
				result_type,
				result,
				is_critical,
				reported_at
			`)
			.eq('patient_id', patientId)
			.order('reported_at', { ascending: false });

		const { data: appointments, error: apptError } = await supabase
			.from('appointment')
			.select(`
				id,
				scheduled_at,
				status,
				reason
			`)
			.eq('patient_id', patientId)
			.order('scheduled_at', { ascending: false });

		const { data: facturas, error: factError } = await supabase
			.from('facturacion')
			.select(`
				id,
				total,
				estado_pago,
				fecha_emision
			`)
			.eq('patient_id', patientId)
			.order('fecha_emision', { ascending: false });

		if (consultError || prescError || labError || apptError || factError) {
			console.error('[Medical Records API] Error:', consultError || prescError || labError || apptError || factError);
		}

		return NextResponse.json({
			patientId,
			consultations: consultations || [],
			prescriptions: prescriptions || [],
			labResults: labResults || [],
			appointments: appointments || [],
			facturas: facturas || [],
		});
	} catch (err: any) {
		console.error('[Medical Records API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}
