// app/api/patient/appointments/new/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { createNotification } from '@/lib/notifications';

export async function POST(request: Request) {
	try {
		// Obtener paciente autenticado (esta función ya maneja la restauración de sesión)
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado. Por favor inicia sesión nuevamente.' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const body = await request.json();
		const { doctor_id, organization_id, scheduled_at, duration_minutes, reason, location, selected_service, patient_id, booked_by_patient_id } = body;

		if (!scheduled_at) {
			return NextResponse.json({ error: 'scheduled_at es requerido' }, { status: 400 });
		}

		// Validar que se haya seleccionado un servicio
		if (!selected_service || !selected_service.name || !selected_service.price) {
			return NextResponse.json({ error: 'Debe seleccionar un servicio para agendar la cita' }, { status: 400 });
		}

		// Validar que la fecha no sea en el pasado
		const appointmentDate = new Date(scheduled_at);
		if (appointmentDate < new Date()) {
			return NextResponse.json({ error: 'No se pueden agendar citas en el pasado' }, { status: 400 });
		}

		// Verificar disponibilidad
		const dateStr = appointmentDate.toISOString().split('T')[0];
		const { data: existingAppointments } = await supabase
			.from('appointment')
			.select('scheduled_at, duration_minutes')
			.eq('doctor_id', doctor_id)
			.gte('scheduled_at', new Date(dateStr + 'T00:00:00Z').toISOString())
			.lte('scheduled_at', new Date(dateStr + 'T23:59:59Z').toISOString())
			.in('status', ['SCHEDULED', 'IN_PROGRESS']);

		const appointmentDuration = duration_minutes || 30;
		const isConflict = existingAppointments?.some((apt: any) => {
			const aptTime = new Date(apt.scheduled_at);
			const newTime = appointmentDate;
			const diffMinutes = Math.abs((aptTime.getTime() - newTime.getTime()) / (1000 * 60));
			return diffMinutes < (apt.duration_minutes || 30);
		});

		if (isConflict) {
			return NextResponse.json({ error: 'El horario seleccionado no está disponible' }, { status: 400 });
		}

		// Determinar el patient_id final
		// Si se proporciona patient_id (de grupo familiar), usarlo; si no, usar el paciente autenticado
		const finalPatientId = patient_id || patient.patientId;
		
		// Verificar que si se proporciona patient_id, el usuario tenga permiso (es dueño del grupo)
		if (patient_id && patient_id !== patient.patientId) {
			// Verificar que el paciente autenticado es dueño de un grupo familiar
			// y que el patient_id proporcionado pertenece a su grupo
			const { data: familyGroup } = await supabase
				.from('FamilyGroup')
				.select('id')
				.eq('ownerId', patient.patientId)
				.maybeSingle();

			if (!familyGroup) {
				return NextResponse.json({ error: 'No tienes permiso para agendar citas para otros pacientes' }, { status: 403 });
			}

			// Verificar que el paciente pertenece al grupo familiar
			const { data: membership } = await supabase
				.from('FamilyGroupMember')
				.select('id')
				.eq('familyGroupId', familyGroup.id)
				.eq('patientId', patient_id)
				.maybeSingle();

			if (!membership) {
				return NextResponse.json({ error: 'El paciente seleccionado no pertenece a tu grupo familiar' }, { status: 403 });
			}
		}

		// Crear la cita
		const appointmentData: any = {
			patient_id: finalPatientId,
			doctor_id: doctor_id || null,
			organization_id: organization_id || null,
			scheduled_at: appointmentDate.toISOString(),
			duration_minutes: appointmentDuration,
			status: 'SCHEDULED',
			reason: reason || null,
			location: location || null,
			selected_service: selected_service || null, // Guardar el servicio seleccionado
		};

		// Agregar booked_by_patient_id si se proporciona (indica que fue reservada por el dueño del grupo)
		if (booked_by_patient_id) {
			appointmentData.booked_by_patient_id = booked_by_patient_id;
		}

		const { data: appointment, error: appointmentError } = await supabase
			.from('appointment')
			.insert(appointmentData)
			.select()
			.single();

		if (appointmentError) {
			console.error('[New Appointment API] Error:', appointmentError);
			return NextResponse.json({ error: 'Error al crear la cita', detail: appointmentError.message }, { status: 500 });
		}

		// Obtener información del paciente para la notificación
		let patientForAppointment: any = null;
		if (finalPatientId !== patient.patientId) {
			const { data: patientData } = await supabase
				.from('Patient')
				.select('firstName, lastName')
				.eq('id', finalPatientId)
				.maybeSingle();
			patientForAppointment = patientData;
		} else {
			patientForAppointment = patient.patient;
		}

		// Crear facturación inmediatamente con estado pendiente (el pago se habilitará cuando se confirme)
		const price = parseFloat(selected_service.price || '0');
		const currency = selected_service.currency || 'USD';
		const subtotal = price;
		const impuestos = 0; // Puedes calcular impuestos si es necesario
		const total = subtotal + impuestos;

		const { data: facturacion, error: facturacionError } = await supabase
			.from('facturacion')
			.insert({
				appointment_id: appointment.id,
				patient_id: finalPatientId, // Usar el patient_id de la cita
				doctor_id: doctor_id || null,
				organization_id: organization_id || null,
				subtotal: subtotal,
				impuestos: impuestos,
				total: total,
				currency: currency,
				estado_factura: 'emitida',
				estado_pago: 'pendiente', // Pendiente hasta que se confirme la cita
				fecha_emision: new Date().toISOString(),
				notas: `Facturación generada al crear la cita. Servicio: ${selected_service.name}. El pago estará disponible una vez que el médico confirme la cita.`,
			})
			.select('id')
			.single();

		if (facturacionError) {
			console.error('[New Appointment API] Error creando facturación:', facturacionError);
			// No fallar la creación de la cita si falla la facturación, pero registrar el error
		} else {
			console.log('[New Appointment API] Facturación creada:', facturacion.id);
		}

		// Crear notificación y enviar email al médico si existe
		if (doctor_id) {
			// Obtener información del doctor para el email
			let doctorName: string | undefined;
			try {
				const { data: doctor } = await supabase
					.from('User')
					.select('name')
					.eq('id', doctor_id)
					.maybeSingle();
				doctorName = doctor?.name || undefined;
			} catch {
				// Ignorar error
			}

			const formattedDate = appointmentDate.toLocaleDateString('es-ES', {
				weekday: 'long',
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			});

			const appointmentUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000'}/dashboard/medic/consultas/${appointment.id}`;

			// Construir mensaje de notificación
			let notificationMessage = `El paciente ${patientForAppointment?.firstName || ''} ${patientForAppointment?.lastName || ''} ha solicitado una cita para el ${formattedDate}`;
			
			// Si la cita fue reservada por el dueño del grupo para otro miembro, indicarlo
			if (booked_by_patient_id && booked_by_patient_id !== finalPatientId) {
				notificationMessage += ` (Reservada por ${patient.patient.firstName} ${patient.patient.lastName} del grupo familiar)`;
			}
			
			if (selected_service) {
				notificationMessage += ` - Servicio: ${selected_service.name} (${selected_service.price} ${selected_service.currency})`;
			}

			await createNotification({
				userId: doctor_id,
				organizationId: organization_id || null,
				type: 'APPOINTMENT_REQUEST',
				title: 'Nueva Cita Solicitada',
				message: notificationMessage,
				payload: {
					appointmentId: appointment.id,
					appointment_id: appointment.id,
					patient_id: finalPatientId,
					patientName: `${patientForAppointment?.firstName || ''} ${patientForAppointment?.lastName || ''}`,
					bookedByPatientId: booked_by_patient_id || null,
					bookedByPatientName: booked_by_patient_id ? `${patient.patient.firstName} ${patient.patient.lastName}` : null,
					doctorName: doctorName,
					scheduled_at: scheduled_at,
					scheduledAt: formattedDate,
					reason: reason || null,
					location: location || null,
					selected_service: selected_service || null,
					appointmentUrl,
					isForDoctor: true,
				},
				sendEmail: true,
			});
		}

		return NextResponse.json({
			success: true,
			appointment,
			message: 'Cita creada correctamente. El médico recibirá una notificación.',
		});
	} catch (err) {
		console.error('[New Appointment API] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error interno', detail: errorMessage }, { status: 500 });
	}
}

