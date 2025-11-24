// app/api/patient/pagos/route.ts
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
		const { supabase } = createSupabaseServerClient(cookieStore);

		const url = new URL(request.url);
		const status = url.searchParams.get('status'); // pendiente, pagada, all

		let query = supabase
			.from('facturacion')
			.select(`
				id,
				appointment_id,
				patient_id,
				doctor_id,
				organization_id,
				subtotal,
				impuestos,
				total,
				currency,
				tipo_cambio,
				billing_series,
				numero_factura,
				estado_factura,
				estado_pago,
				metodo_pago,
				fecha_emision,
				fecha_pago,
				notas,
				created_at,
				updated_at,
				appointment:appointment!fk_facturacion_appointment (
					id,
					scheduled_at,
					status,
					reason,
					doctor:User!fk_appointment_doctor (
						id,
						name
					)
				),
				doctor_id,
				organization:Organization!fk_facturacion_org (
					id,
					name
				)
			`)
			.eq('patient_id', patient.patientId)
			.order('fecha_emision', { ascending: false });

		if (status === 'pendiente') {
			query = query.eq('estado_pago', 'pendiente');
		} else if (status === 'pagada') {
			query = query.eq('estado_pago', 'pagada');
		}

		const { data: facturas, error } = await query;

		if (error) {
			console.error('[Patient Pagos API] Error:', error);
			return NextResponse.json({ error: 'Error al obtener facturas' }, { status: 500 });
		}

		return NextResponse.json({
			data: facturas || [],
		});
	} catch (err: any) {
		console.error('[Patient Pagos API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

