// app/api/public/appointments/new/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createNotification } from '@/lib/notifications';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// Cliente Supabase con service_role para operaciones públicas
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
	auth: { persistSession: false },
});

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const {
			unregisteredPatientId,
			doctorId,
			organizationId,
			scheduledAt,
			durationMinutes,
			selectedService,
		} = body;

		// Validaciones
		if (!unregisteredPatientId) {
			return NextResponse.json({ error: 'unregisteredPatientId es requerido' }, { status: 400 });
		}

		if (!doctorId) {
			return NextResponse.json({ error: 'doctorId es requerido' }, { status: 400 });
		}

		if (!organizationId) {
			return NextResponse.json({ error: 'organizationId es requerido' }, { status: 400 });
		}

		if (!scheduledAt) {
			return NextResponse.json({ error: 'scheduledAt es requerido' }, { status: 400 });
		}

		if (!selectedService || !selectedService.name) {
			return NextResponse.json({ error: 'Debe seleccionar un servicio' }, { status: 400 });
		}

		// Validar que la fecha no sea en el pasado
		const appointmentDate = new Date(scheduledAt);
		if (appointmentDate < new Date()) {
			return NextResponse.json({ error: 'No se pueden agendar citas en el pasado' }, { status: 400 });
		}

		// Verificar que el paciente no registrado existe
		const { data: unregisteredPatient, error: patientError } = await supabaseAdmin
			.from('unregisteredpatients')
			.select('id, first_name, last_name, phone, email')
			.eq('id', unregisteredPatientId)
			.maybeSingle();

		if (patientError || !unregisteredPatient) {
			return NextResponse.json({ error: 'Paciente no registrado no encontrado' }, { status: 404 });
		}

		// Verificar disponibilidad
		const dateStr = appointmentDate.toISOString().split('T')[0];
		const { data: existingAppointments } = await supabaseAdmin
			.from('appointment')
			.select('scheduled_at, duration_minutes')
			.eq('doctor_id', doctorId)
			.gte('scheduled_at', new Date(dateStr + 'T00:00:00Z').toISOString())
			.lte('scheduled_at', new Date(dateStr + 'T23:59:59Z').toISOString())
			.in('status', ['SCHEDULED', 'IN_PROGRESS']);

		const appointmentDuration = durationMinutes || 30;
		const isConflict = existingAppointments?.some((apt: any) => {
			const aptTime = new Date(apt.scheduled_at);
			const newTime = appointmentDate;
			const diffMinutes = Math.abs((aptTime.getTime() - newTime.getTime()) / (1000 * 60));
			return diffMinutes < (apt.duration_minutes || 30);
		});

		if (isConflict) {
			return NextResponse.json({ error: 'El horario seleccionado no está disponible' }, { status: 400 });
		}

		// Crear la cita
		// NOTA: Esta cita viene de la página pública (c/[id])
		// NO tiene created_by_role_user_id, NO tiene booked_by_patient_id, NO tiene created_by_doctor_id
		// Solo tiene unregistered_patient_id, lo cual la identifica como "Página Pública"
		const appointmentData: any = {
			patient_id: null, // Paciente no registrado
			unregistered_patient_id: unregisteredPatientId,
			doctor_id: doctorId,
			organization_id: organizationId,
			scheduled_at: appointmentDate.toISOString(),
			duration_minutes: appointmentDuration,
			status: 'SCHEDULED',
			selected_service: selectedService,
			// No establecer created_by_role_user_id, booked_by_patient_id, ni created_by_doctor_id
			// Esto la identifica como cita de página pública
		};

		const { data: appointment, error: appointmentError } = await supabaseAdmin
			.from('appointment')
			.insert(appointmentData)
			.select()
			.single();

		if (appointmentError) {
			console.error('[Public Appointment API] Error:', appointmentError);
			return NextResponse.json(
				{ error: 'Error al crear la cita', detail: appointmentError.message },
				{ status: 500 }
			);
		}

		// Crear facturación inmediatamente con estado pendiente
		const price = parseFloat(selectedService.price || '0');
		const currency = selectedService.currency || 'USD';
		const subtotal = price;
		const impuestos = 0;
		const total = subtotal;

		const { data: facturacion, error: facturacionError } = await supabaseAdmin
			.from('facturacion')
			.insert({
				appointment_id: appointment.id,
				patient_id: null, // Paciente no registrado
				unregistered_patient_id: unregisteredPatientId,
				doctor_id: doctorId,
				organization_id: organizationId,
				subtotal: subtotal,
				impuestos: impuestos,
				total: total,
				currency: currency,
				estado_factura: 'emitida',
				estado_pago: 'pendiente',
				fecha_emision: new Date().toISOString(),
				notas: `Facturación generada al crear la cita. Servicio: ${selectedService.name}. El pago estará disponible una vez que el médico confirme la cita.`,
			})
			.select('id')
			.single();

		if (facturacionError) {
			console.error('[Public Appointment API] Error creando facturación:', facturacionError);
			// No fallar la creación de la cita si falla la facturación
		}

		// Crear notificación y enviar email al médico
		if (doctorId) {
			// Obtener información del doctor
			let doctorName: string | undefined;
			try {
				const { data: doctor } = await supabaseAdmin
					.from('user')
					.select('name, email')
					.eq('id', doctorId)
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

			const appointmentUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000'}/dashboard/medic/citas`;

			const notificationMessage = `El paciente ${unregisteredPatient.first_name} ${unregisteredPatient.last_name} (${unregisteredPatient.phone}) ha solicitado una cita para el ${formattedDate} - Servicio: ${selectedService.name} (${selectedService.price} ${selectedService.currency})`;

			await createNotification({
				userId: doctorId,
				organizationId: organizationId,
				type: 'APPOINTMENT_REQUEST',
				title: 'Nueva Cita Solicitada (Paciente No Registrado)',
				message: notificationMessage,
				payload: {
					appointmentId: appointment.id,
					appointment_id: appointment.id,
					unregisteredPatientId: unregisteredPatientId,
					patientName: `${unregisteredPatient.first_name} ${unregisteredPatient.last_name}`,
					patientPhone: unregisteredPatient.phone,
					patientEmail: unregisteredPatient.email,
					doctorName: doctorName,
					scheduled_at: scheduledAt,
					scheduledAt: formattedDate,
					selected_service: selectedService,
					appointmentUrl,
					isForDoctor: true,
					isUnregisteredPatient: true,
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
		console.error('[Public Appointment API] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error interno', detail: errorMessage }, { status: 500 });
	}
}

