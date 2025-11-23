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

		// Manejar FormData para captura de pantalla
		let metodo_pago: string;
		let numero_referencia: string | null = null;
		let captura_pago_url: string | null = null;

		const contentType = request.headers.get('content-type');
		if (contentType?.includes('multipart/form-data')) {
			const formData = await request.formData();
			metodo_pago = formData.get('metodo_pago') as string;
			numero_referencia = formData.get('numero_referencia') as string | null;
			const capturaFile = formData.get('captura_pago') as File | null;

			if (!metodo_pago) {
				return NextResponse.json({ error: 'Método de pago es requerido' }, { status: 400 });
			}

			// Si hay una captura, subirla a Supabase Storage
			if (capturaFile && capturaFile.size > 0) {
				try {
					// TODO: Implementar upload a Supabase Storage
					// Por ahora, guardamos como base64 en notas o creamos un campo específico
					// const fileExt = capturaFile.name.split('.').pop();
					// const fileName = `${id}-${Date.now()}.${fileExt}`;
					// const { data: uploadData, error: uploadError } = await supabase.storage
					// 	.from('payment-screenshots')
					// 	.upload(fileName, capturaFile);
					// if (uploadError) throw uploadError;
					// captura_pago_url = uploadData.path;
					
					// Por ahora, guardamos la URL como placeholder
					captura_pago_url = `payment-screenshots/${id}-${Date.now()}.jpg`;
				} catch (uploadErr) {
					console.error('[Patient Pay API] Error subiendo captura:', uploadErr);
					// No fallar el pago si la captura falla, pero registrar el error
				}
			}
		} else {
			const body = await request.json();
			metodo_pago = body.metodo_pago;
			numero_referencia = body.numero_referencia || null;
		}

		if (!metodo_pago) {
			return NextResponse.json({ error: 'Método de pago es requerido' }, { status: 400 });
		}

		// Verificar que la factura existe y pertenece al paciente
		interface FacturaData {
			id: string;
			patient_id: string;
			estado_pago: string;
			total: number;
			currency: string;
			appointment_id?: string | null;
			doctor_id?: string | null;
			organization_id?: string | null;
			notas?: string | null;
			appointment?: Array<{
				doctor?: Array<{
					id: string;
					name: string;
					email: string;
				}>;
			}> | null;
		}

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
				notas,
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

		const typedFactura = factura as FacturaData;

		if (typedFactura.estado_pago === 'pagada') {
			return NextResponse.json({ error: 'Esta factura ya ha sido pagada' }, { status: 400 });
		}

		// Preparar datos de actualización
		const updateData: {
			estado_pago: string;
			metodo_pago: string;
			fecha_pago: string;
			notas?: string;
		} = {
			estado_pago: 'pagada',
			metodo_pago: metodo_pago,
			fecha_pago: new Date().toISOString(),
		};

		// Si hay número de referencia o captura, agregarlo a las notas
		if (numero_referencia || captura_pago_url) {
			const notasParts: string[] = [];
			if (typedFactura.notas) {
				notasParts.push(typedFactura.notas);
			}
			if (numero_referencia) {
				notasParts.push(`Número de referencia: ${numero_referencia}`);
			}
			if (captura_pago_url) {
				notasParts.push(`Captura de pago: ${captura_pago_url}`);
			}
			updateData.notas = notasParts.join('\n');
		}

		// Actualizar el estado de pago
		const { data: updatedFactura, error: updateError } = await supabase
			.from('facturacion')
			.update(updateData)
			.eq('id', id)
			.select()
			.single();

		if (updateError) {
			console.error('[Patient Pay API] Error actualizando factura:', updateError);
			return NextResponse.json({ error: 'Error al procesar el pago' }, { status: 500 });
		}

		// Crear notificación para el médico si existe
		if (typedFactura.doctor_id) {
			try {
				const appointment = Array.isArray(typedFactura.appointment) ? typedFactura.appointment[0] : typedFactura.appointment;
				const doctor = appointment?.doctor && Array.isArray(appointment.doctor) ? appointment.doctor[0] : undefined;
				const doctorName = doctor?.name || 'Médico';
				await createNotification({
					userId: typedFactura.doctor_id,
					type: 'PAYMENT_RECEIVED',
					title: 'Pago Recibido',
					message: `El paciente ha pagado la factura de ${typedFactura.total} ${typedFactura.currency}`,
					payload: {
						facturaId: id,
						patientId: patient.patientId,
						total: typedFactura.total,
						currency: typedFactura.currency,
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

