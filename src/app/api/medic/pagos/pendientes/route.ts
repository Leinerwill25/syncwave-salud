// app/api/medic/pagos/pendientes/route.ts
// API para obtener pagos pendientes de verificación del médico

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

		// Obtener facturas con estado pendiente_verificacion del médico actual
		const { data: facturas, error } = await supabase
			.from('facturacion')
			.select(`
				id,
				numero_factura,
				total,
				currency,
				metodo_pago,
				fecha_emision,
				notas,
				appointment:appointment_id (
					id,
					scheduled_at,
					reason,
					patient:patient_id (
						id,
						firstName,
						lastName
					)
				),
				patient:patient_id (
					id,
					firstName,
					lastName
				)
			`)
			.eq('doctor_id', user.userId)
			.eq('estado_pago', 'pendiente_verificacion')
			.order('fecha_emision', { ascending: false });

		if (error) {
			console.error('[Medic Pagos Pendientes API] Error:', error);
			return NextResponse.json({ error: 'Error al obtener pagos pendientes' }, { status: 500 });
		}

		return NextResponse.json({
			data: facturas || [],
		});
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Pagos Pendientes API] Error:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

