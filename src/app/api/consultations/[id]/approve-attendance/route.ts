// app/api/consultations/[id]/approve-attendance/route.ts
// API para aprobar que el paciente asistió a la consulta y pagó

import { NextRequest, NextResponse } from 'next/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { createNotification } from '@/lib/notifications';

export async function POST(
	request: NextRequest,
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
		const { approved, facturacionId } = body;

		if (typeof approved !== 'boolean') {
			return NextResponse.json({ error: 'El campo "approved" es requerido (true/false)' }, { status: 400 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		// Obtener la consulta
		const { data: consultation, error: consultationError } = await supabase
			.from('consultation')
			.select('id, appointment_id, patient_id, unregistered_patient_id, doctor_id, organization_id, started_at')
			.eq('id', id)
			.eq('doctor_id', user.userId)
			.single();

		if (consultationError || !consultation) {
			return NextResponse.json({ error: 'Consulta no encontrada o no autorizada' }, { status: 404 });
		}

		// Si se aprobó, buscar o crear facturación y marcarla como pagada
		if (approved) {
			let facturacionToUpdate: string | null = facturacionId || null;

			// Si no se proporcionó facturacionId, buscar facturación asociada a la consulta o appointment
			if (!facturacionToUpdate) {
				// Buscar facturación por appointment_id si existe
				if (consultation.appointment_id) {
					const { data: facturacionByAppointment } = await supabase
						.from('facturacion')
						.select('id')
						.eq('appointment_id', consultation.appointment_id)
						.eq('doctor_id', user.userId)
						.maybeSingle();

					if (facturacionByAppointment) {
						facturacionToUpdate = facturacionByAppointment.id;
					}
				}

				// Si aún no hay facturación, buscar por patient_id o unregistered_patient_id y doctor_id
				if (!facturacionToUpdate) {
					const query = supabase
						.from('facturacion')
						.select('id')
						.eq('doctor_id', user.userId)
						.in('estado_pago', ['pendiente', 'pendiente_verificacion'])
						.order('fecha_emision', { ascending: false })
						.limit(1);

					if (consultation.patient_id) {
						query.eq('patient_id', consultation.patient_id);
					} else if (consultation.unregistered_patient_id) {
						query.eq('unregistered_patient_id', consultation.unregistered_patient_id);
					}

					const { data: facturacionByPatient } = await query.maybeSingle();
					if (facturacionByPatient) {
						facturacionToUpdate = facturacionByPatient.id;
					}
				}
			}

			// Actualizar facturación a pagada si existe
			if (facturacionToUpdate) {
				const { data: updatedFacturacion, error: updateError } = await supabase
					.from('facturacion')
					.update({
						estado_pago: 'pagada',
						fecha_pago: new Date().toISOString(),
						metodo_pago: 'EFECTIVO', // Por defecto efectivo cuando se aprueba manualmente
					})
					.eq('id', facturacionToUpdate)
					.select('total, currency')
					.single();

				if (updateError) {
					console.error('[Approve Attendance API] Error actualizando facturación:', updateError);
					// No fallar si no se puede actualizar la facturación
				} else {
					// Crear notificación al paciente si es registrado
					if (consultation.patient_id) {
						try {
							const { data: userData } = await supabase
								.from('user')
								.select('id')
								.eq('patientProfileId', consultation.patient_id)
								.maybeSingle();

							if (userData?.id) {
								await createNotification({
									userId: userData.id,
									organizationId: consultation.organization_id || null,
									type: 'PAYMENT_APPROVED',
									title: 'Pago Aprobado',
									message: `Tu pago de ${updatedFacturacion.total} ${updatedFacturacion.currency} ha sido aprobado.`,
									payload: {
										facturaId: facturacionToUpdate,
										total: updatedFacturacion.total,
										currency: updatedFacturacion.currency,
										consultationId: id,
									},
									sendEmail: true,
								});
							}
						} catch (notifError) {
							console.error('[Approve Attendance API] Error creando notificación:', notifError);
						}
					}
				}
			}
		}

		return NextResponse.json({
			success: true,
			message: approved ? 'Asistencia y pago aprobados correctamente' : 'Aprobación cancelada',
			consultationId: id,
		});
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Approve Attendance API] Error:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

