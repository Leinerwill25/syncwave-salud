// app/api/patient/pagos/[id]/pay/route.ts
// API para procesar el pago de una factura

import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { createNotification } from '@/lib/notifications';

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const { id } = await params;
		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const body = await request.json();
		const { metodo_pago } = body;

		if (!metodo_pago) {
			return NextResponse.json({ error: 'Método de pago es requerido' }, { status: 400 });
		}

		// Verificar que la factura existe y pertenece al paciente
		const { data: factura, error: fetchError } = await supabase
			.from('facturacion')
			.select(`
				id,
				patient_id,
				estado_pago,
				total,
				currency,
				appointment_id,
				doctor_id,
				organization_id,
				appointment:appointment_id (
					doctor:User!fk_appointment_doctor (
						id,
						name,
						email
					)
				)
			`)
			.eq('id', id)
			.eq('patient_id', patient.patientId)
			.single();

		if (fetchError || !factura) {
			return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
		}

		if (factura.estado_pago === 'pagada') {
			return NextResponse.json({ error: 'Esta factura ya ha sido pagada' }, { status: 400 });
		}

		// Actualizar el estado de pago
		const { data: updatedFactura, error: updateError } = await supabase
			.from('facturacion')
			.update({
				estado_pago: 'pagada',
				metodo_pago: metodo_pago,
				fecha_pago: new Date().toISOString(),
			})
			.eq('id', id)
			.select()
			.single();

		if (updateError) {
			console.error('[Patient Pay API] Error actualizando factura:', updateError);
			return NextResponse.json({ error: 'Error al procesar el pago' }, { status: 500 });
		}

		// Crear notificación para el médico si existe
		if (factura.doctor_id) {
			try {
				const doctorName = factura.appointment?.doctor?.name || 'Médico';
				await createNotification({
					userId: factura.doctor_id,
					type: 'PAYMENT_RECEIVED',
					title: 'Pago Recibido',
					message: `El paciente ha pagado la factura de ${factura.total} ${factura.currency}`,
					payload: {
						facturaId: id,
						patientId: patient.patientId,
						total: factura.total,
						currency: factura.currency,
						metodoPago: metodo_pago,
						facturaUrl: `/dashboard/medic/pagos/${id}`,
					},
					sendEmail: true,
				});
			} catch (notifError) {
				console.error('[Patient Pay API] Error creando notificación:', notifError);
				// No fallar el pago si la notificación falla
			}
		}

		return NextResponse.json({
			success: true,
			message: 'Pago procesado correctamente',
			data: updatedFactura,
		});
	} catch (err: any) {
		console.error('[Patient Pay API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

