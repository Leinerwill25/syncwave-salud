import { NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';
import { createClient } from '@supabase/supabase-js';
import { createNotifications } from '@/lib/notifications';
import { sendNotificationEmail } from '@/lib/email';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await context.params;
		const supabase = await createSupabaseServerClient();
		const body = await req.json();

		if (!id) {
			return NextResponse.json({ error: 'ID de cita no proporcionado.' }, { status: 400 });
		}

		// 1️⃣ Obtener cita actual antes del cambio (incluyendo selected_service)
		const { data: current, error: fetchErr } = await supabaseAdmin.from('appointment').select('*, selected_service').eq('id', id).single();

		if (fetchErr || !current) return NextResponse.json({ error: 'Cita no encontrada.' }, { status: 404 });

		const updateFields: Record<string, any> = {};
		if (body.status) updateFields.status = body.status;
		if (body.scheduled_at) updateFields.scheduled_at = body.scheduled_at;
		if (body.reason) updateFields.reason = body.reason;
		if (body.location) updateFields.location = body.location;
		updateFields.updated_at = new Date().toISOString();

		// 2️⃣ Actualizar cita usando supabaseAdmin (Service Role) para mayor estabilidad y permisos adecuados
		const { error: updateError } = await supabaseAdmin
			.from('appointment')
			.update(updateFields)
			.eq('id', id);

		if (updateError) {
			console.error('❌ Error al actualizar cita (Supabase Admin):', updateError);
			throw new Error(updateError.message);
		}

		// Usar los datos de current con los campos actualizados (evitamos hacer select para evitar problemas con foreign keys)
		const data = {
			id: current.id,
			patient_id: current.patient_id,
			doctor_id: current.doctor_id,
			organization_id: current.organization_id,
			status: updateFields.status || current.status,
			reason: updateFields.reason || current.reason,
			scheduled_at: updateFields.scheduled_at || current.scheduled_at,
		};

		// 3️⃣ Si el status cambió a "CONFIRMADA" o "CONFIRMED" → habilitar pago en facturación existente
		const isConfirmed = body.status === 'CONFIRMADA' || body.status === 'CONFIRMED';
		const wasNotConfirmed = current.status !== 'CONFIRMADA' && current.status !== 'CONFIRMED';
		if (body.status && isConfirmed && wasNotConfirmed) {
			const { patient_id, doctor_id, organization_id } = current;

			try {
				// Buscar facturación existente para esta cita
				const { data: existingFacturacion, error: facturacionFetchError } = await supabaseAdmin.from('facturacion').select('id, total, currency, notas').eq('appointment_id', id).maybeSingle();

				if (facturacionFetchError) {
					console.error('[Appointment Update] Error buscando facturación:', facturacionFetchError);
				} else if (existingFacturacion) {
					// Actualizar notas para indicar que la cita fue confirmada y el pago está disponible
					const notasActualizadas = existingFacturacion.notas ? `${existingFacturacion.notas}\n\nCita confirmada. El pago está ahora disponible.` : 'Cita confirmada. El pago está ahora disponible.';

					const { error: updateFacturacionError } = await supabaseAdmin
						.from('facturacion')
						.update({
							notas: notasActualizadas,
						})
						.eq('id', existingFacturacion.id);

					if (updateFacturacionError) {
						console.error('[Appointment Update] Error actualizando facturación:', updateFacturacionError);
					} else {
						console.log('[Appointment Update] Facturación actualizada - pago habilitado:', existingFacturacion.id);

						// Crear notificación al paciente sobre el pago disponible
						try {
							// Obtener información del paciente y su user_id
							const { data: patientData } = await supabaseAdmin.from('patient').select('firstName, lastName').eq('id', patient_id).maybeSingle();

							// Obtener el user_id del paciente
							let userData: { id: string } | null = null;
							try {
								const { data, error } = await supabaseAdmin.from('users').select('id').eq('patientProfileId', patient_id).maybeSingle();
								if (!error && data) {
									userData = data;
								}
							} catch (err) {
								console.warn('[Appointment Update] Error obteniendo user_id del paciente:', err);
							}

							const patientName = patientData ? `${patientData.firstName} ${patientData.lastName}` : 'Paciente';
							const patientUserId = userData?.id || null;

							if (patientUserId) {
								await createNotifications([
									{
										userId: patientUserId,
										organizationId: organization_id || null,
										type: 'PAYMENT_DUE',
										title: 'Pago Disponible',
										message: `Tu cita ha sido confirmada. Ya puedes realizar el pago de ${existingFacturacion.total} ${existingFacturacion.currency}.`,
										payload: {
											facturacionId: existingFacturacion.id,
											appointmentId: id,
											appointment_id: id,
											total: existingFacturacion.total,
											currency: existingFacturacion.currency,
											paymentUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://ashira.click'}/dashboard/patient/pagos`,
										},
										sendEmail: true,
									},
								]);
							} else {
								console.warn('[Appointment Update] No se encontró user_id para el paciente, no se creó notificación');
							}
						} catch (notifError) {
							console.error('[Appointment Update] Error creando notificación:', notifError);
						}
					}
				} else {
					console.warn('[Appointment Update] No se encontró facturación existente para la cita. Debería haberse creado al generar la cita.');
				}
			} catch (error) {
				console.error('[Appointment Update] Error procesando confirmación:', error);
			}
		}

		// 4️⃣ Si la cita estaba CONFIRMADA y se reagenda (cambió scheduled_at), actualizar consultation.started_at si existe
		if (current.status === 'CONFIRMADA' && body.scheduled_at && body.scheduled_at !== current.scheduled_at) {
			// Buscar consultation asociada a esta cita
			const { data: consultation, error: consultationError } = await supabaseAdmin.from('consultation').select('id, started_at').eq('appointment_id', id).maybeSingle();

			if (!consultationError && consultation && consultation.started_at) {
				// Actualizar started_at con la nueva fecha/hora
				const { error: consultationUpdateError } = await supabaseAdmin.from('consultation').update({ started_at: body.scheduled_at, updated_at: new Date().toISOString() }).eq('id', consultation.id);

				if (consultationUpdateError) {
					console.warn('[Appointment Update] Error actualizando consultation.started_at:', consultationUpdateError);
					// No fallar la operación principal, solo loguear el warning
				}
			}
		}

		// 5️⃣ Si cambió el status → crear notificaciones y enviar emails
		if (body.status && body.status !== current.status) {
			const { patient_id, doctor_id, organization_id, scheduled_at, reason, location } = current;
			const statusText = body.status.replace('_', ' ').toLowerCase();

			// Obtener información del paciente y doctor para los emails
			let patientName: string | undefined;
			let doctorName: string | undefined;
			let patientUserId: string | null = null;
			let unregisteredEmail: string | null = null;

			try {
				// Helper para consultar la tabla user con diferentes variantes
				const queryUserTable = async (queryFn: (tableName: string) => any) => {
					return queryFn('users');
				};

				const [patientRes, doctorRes, patientUserRes, unregisteredRes, orgRes, medicProfileRes] = await Promise.all([
					patient_id 
						? supabaseAdmin.from('patient').select('firstName, lastName').eq('id', patient_id).maybeSingle()
						: Promise.resolve({ data: null }),
					doctor_id
						? queryUserTable((tableName) => supabaseAdmin.from(tableName).select('name').eq('id', doctor_id).maybeSingle())
						: Promise.resolve({ data: null }),
					patient_id
						? queryUserTable((tableName) => supabaseAdmin.from(tableName).select('id').eq('patientProfileId', patient_id).maybeSingle())
						: Promise.resolve({ data: null }),
					current.unregistered_patient_id
						? supabaseAdmin.from('unregisteredpatients').select('first_name, last_name, email').eq('id', current.unregistered_patient_id).maybeSingle()
						: Promise.resolve({ data: null }),
					organization_id
						? supabaseAdmin.from('organization').select('phone').eq('id', organization_id).maybeSingle()
						: Promise.resolve({ data: null }),
					doctor_id
						? supabaseAdmin.from('medic_profile').select('whatsapp_number').eq('doctor_id', doctor_id).maybeSingle()
						: Promise.resolve({ data: null }),
				]);

				if (patientRes.data) {
					patientName = `${patientRes.data.firstName} ${patientRes.data.lastName}`;
				} else if (unregisteredRes.data) {
					patientName = `${unregisteredRes.data.first_name} ${unregisteredRes.data.last_name}`;
				}
				
				if (doctorRes.data) doctorName = doctorRes.data.name || undefined;
				if (patientUserRes.data) patientUserId = patientUserRes.data.id;
				if (unregisteredRes.data) unregisteredEmail = unregisteredRes.data.email;

				const contactPhone = orgRes?.data?.phone || medicProfileRes?.data?.whatsapp_number || '';
				(data as any).contactPhone = contactPhone;

			} catch (err) {
				console.warn('[Appointment Update] Error obteniendo datos para notificaciones:', err);
			}

			const appointmentDate = scheduled_at
				? new Date(scheduled_at).toLocaleDateString('es-ES', {
						weekday: 'long',
						year: 'numeric',
						month: 'long',
						day: 'numeric',
						hour: '2-digit',
						minute: '2-digit',
				  })
				: '';

			const appointmentUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ashira.click'}/dashboard/${patientUserId ? 'patient' : 'public'}/appointments`;

			// 5.1 Enviar email directo a paciente NO registrado si aplica
			if (unregisteredEmail && !patientUserId) {
				try {
					await sendNotificationEmail(
						'APPOINTMENT_STATUS',
						unregisteredEmail,
						{
							patientName,
							doctorName,
							scheduledAt: appointmentDate,
							reason: current.selected_service?.name || reason || null,
							location: location || null,
							appointmentUrl: '', 
							status: body.status,
							newStatus: body.status,
							contactPhone: (data as any).contactPhone,
							isForDoctor: false,
							isUnregisteredPatient: true
						}
					);
				} catch (emailErr) {
					console.error('[Appointment Update] Error enviando email a no registrado:', emailErr);
				}
			}

			// Crear notificaciones solo si tenemos los user_ids
			const notifications = [];
			
			if (patientUserId) {
				notifications.push({
					userId: patientUserId,
					organizationId: organization_id || null,
					type: 'APPOINTMENT_STATUS',
					title: `Tu cita ha sido ${statusText}`,
					message: `El estado de tu cita programada ha cambiado a "${body.status}".`,
					payload: {
						appointmentId: id,
						appointment_id: id,
						newStatus: body.status,
						role: 'PATIENT',
						patientName,
						doctorName,
						scheduledAt: appointmentDate,
						reason: reason || null,
						location: location || null,
						appointmentUrl,
						contactPhone: (data as any).contactPhone,
						isForDoctor: false,
					},
					sendEmail: true,
				});
			}

			if (doctor_id) {
				notifications.push({
					userId: doctor_id,
					organizationId: organization_id || null,
					type: 'APPOINTMENT_STATUS',
					title: `Cita ${statusText}`,
					message: `El estado de una cita que atiendes ahora es "${body.status}".`,
					payload: {
						appointmentId: id,
						appointment_id: id,
						newStatus: body.status,
						role: 'MEDIC',
						patientName,
						doctorName,
						scheduledAt: appointmentDate,
						reason: reason || null,
						location: location || null,
						appointmentUrl,
						isForDoctor: true,
					},
					sendEmail: true,
				});
			}

			if (notifications.length > 0) {
				try {
					await createNotifications(notifications);
				} catch (notifError) {
					console.error('[Appointment Update] Error creando notificaciones:', notifError);
				}
			}
		}

		// 6️⃣ Obtener la cita actualizada completa para retornarla
		const { data: updatedAppointment, error: fetchUpdatedError } = await supabaseAdmin
			.from('appointment')
			.select('*, selected_service, patient:patient_id(firstName, lastName, identifier, phone), doctor:doctor_id(name)')
			.eq('id', id)
			.single();

		if (fetchUpdatedError) {
			console.warn('[Appointment Update] Error obteniendo cita actualizada, retornando datos construidos:', fetchUpdatedError);
			// Retornar datos construidos si falla el fetch
			return NextResponse.json({ success: true, appointment: data });
		}

		// Normalizar el estado: convertir "EN_ESPERA" a "EN ESPERA" para consistencia con el frontend
		const normalizeStatus = (status: string): string => {
			if (status === 'EN_ESPERA') return 'EN ESPERA';
			if (status === 'NO_ASISTIO') return 'NO ASISTIÓ';
			return status;
		};

		// Formatear la respuesta para que coincida con el formato esperado por el frontend
		const formattedAppointment = {
			id: updatedAppointment.id,
			patient: updatedAppointment.patient 
				? `${updatedAppointment.patient.firstName} ${updatedAppointment.patient.lastName}`
				: 'Paciente no registrado',
			patientFirstName: updatedAppointment.patient?.firstName || null,
			patientLastName: updatedAppointment.patient?.lastName || null,
			patientIdentifier: updatedAppointment.patient?.identifier || null,
			patientPhone: updatedAppointment.patient?.phone || null,
			reason: updatedAppointment.reason || '',
			time: updatedAppointment.scheduled_at 
				? new Date(updatedAppointment.scheduled_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
				: '',
			scheduled_at: updatedAppointment.scheduled_at,
			status: normalizeStatus(updatedAppointment.status),
			location: updatedAppointment.location || null,
			selected_service: updatedAppointment.selected_service,
		};

		return NextResponse.json({ success: true, appointment: formattedAppointment });
	} catch (error) {
		console.error('❌ Error general al actualizar cita:', error);
		const errorMessage = error instanceof Error ? error.message : 'Error interno';
		return NextResponse.json({ error: 'Error interno al actualizar cita.', detail: errorMessage }, { status: 500 });
	}
}
