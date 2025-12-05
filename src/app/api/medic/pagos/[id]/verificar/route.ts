// app/api/medic/pagos/[id]/verificar/route.ts
// API para verificar (aprobar o rechazar) un pago pendiente

import { NextResponse } from 'next/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { createNotification } from '@/lib/notifications';

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const { id } = await params;
		const body = await request.json();
		const { aprobar } = body;

		if (typeof aprobar !== 'boolean') {
			return NextResponse.json({ error: 'El campo "aprobar" es requerido (true/false)' }, { status: 400 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		// Verificar que la factura existe y pertenece al médico
		const { data: factura, error: fetchError } = await supabase
			.from('facturacion')
			.select('id, patient_id, total, currency, estado_pago, appointment_id')
			.eq('id', id)
			.eq('doctor_id', user.userId)
			.eq('estado_pago', 'pendiente_verificacion')
			.single();

		if (fetchError || !factura) {
			return NextResponse.json({ error: 'Factura no encontrada o ya verificada' }, { status: 404 });
		}

		// Actualizar el estado de pago
		const nuevoEstado = aprobar ? 'pagada' : 'pendiente';
		const fechaPago = aprobar ? new Date().toISOString() : null;

		const { data: updatedFactura, error: updateError } = await supabase
			.from('facturacion')
			.update({
				estado_pago: nuevoEstado,
				fecha_pago: fechaPago,
			})
			.eq('id', id)
			.select()
			.single();

		if (updateError) {
			console.error('[Medic Verificar Pago API] Error actualizando factura:', updateError);
			return NextResponse.json({ error: 'Error al verificar el pago' }, { status: 500 });
		}

		// Crear notificación para el paciente
		try {
			await createNotification({
				userId: factura.patient_id,
				type: aprobar ? 'PAYMENT_APPROVED' : 'PAYMENT_REJECTED',
				title: aprobar ? 'Pago Aprobado' : 'Pago Rechazado',
				message: aprobar
					? `Tu pago de ${factura.total} ${factura.currency} ha sido aprobado.`
					: `Tu pago de ${factura.total} ${factura.currency} ha sido rechazado. Por favor, contacta al médico para más información.`,
				payload: {
					facturaId: id,
					total: factura.total,
					currency: factura.currency,
					estado: nuevoEstado,
					facturaUrl: '/dashboard/patient/pagos',
				},
				sendEmail: true,
			});
		} catch (notifError) {
			console.error('[Medic Verificar Pago API] Error creando notificación:', notifError);
			// No fallar la verificación si la notificación falla
		}

		return NextResponse.json({
			success: true,
			message: aprobar ? 'Pago aprobado correctamente' : 'Pago rechazado',
			data: updatedFactura,
		});
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Verificar Pago API] Error:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

