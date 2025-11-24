// app/api/medic/pagos/efectuados/route.ts
// API para obtener pagos efectuados del médico (con referencia y captura)

import { NextResponse } from 'next/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';

export async function GET() {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		// Obtener facturas pagadas del médico actual que tengan número de referencia o captura
		const { data: facturas, error } = await supabase
			.from('facturacion')
			.select(`
				id,
				numero_factura,
				total,
				currency,
				metodo_pago,
				fecha_emision,
				fecha_pago,
				notas,
				appointment:appointment_id (
					id,
					scheduled_at,
					status,
					reason,
					patient:patient_id (
						id,
						firstName,
						lastName,
						identifier
					)
				),
				patient:patient_id (
					id,
					firstName,
					lastName,
					identifier
				)
			`)
			.eq('doctor_id', user.userId)
			.in('estado_pago', ['pagada', 'pendiente_verificacion'])
			.order('fecha_pago', { ascending: false, nullsFirst: false })
			.order('fecha_emision', { ascending: false });

		if (error) {
			console.error('[Medic Pagos Efectuados API] Error:', error);
			return NextResponse.json({ error: 'Error al obtener pagos efectuados' }, { status: 500 });
		}

		// Filtrar solo los que tienen referencia o captura en las notas
		const pagosConReferencia = (facturas || []).filter((factura) => {
			if (!factura.notas) return false;
			return factura.notas.includes('[REFERENCIA]') || factura.notas.includes('[CAPTURA]');
		});

		// Para cada pago, obtener las consultas asociadas al appointment
		const pagosConConsultas = await Promise.all(
			pagosConReferencia.map(async (pago) => {
				if (!pago.appointment?.id) return pago;

				const { data: consultas } = await supabase
					.from('consultation')
					.select('id, chief_complaint, diagnosis, created_at')
					.eq('appointment_id', pago.appointment.id)
					.eq('doctor_id', user.userId)
					.order('created_at', { ascending: false });

				return {
					...pago,
					appointment: pago.appointment
						? {
								...pago.appointment,
								consultations: consultas || [],
							}
						: null,
				};
			})
		);

		return NextResponse.json({
			data: pagosConConsultas,
		});
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Pagos Efectuados API] Error:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

