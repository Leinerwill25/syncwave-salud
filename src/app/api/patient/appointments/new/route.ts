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
		const { doctor_id, organization_id, scheduled_at, duration_minutes, reason, location, selected_service } = body;

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

		// Crear la cita (SIN crear facturación aún - se creará cuando el médico confirme)
		const { data: appointment, error: appointmentError } = await supabase
			.from('appointment')
			.insert({
				patient_id: patient.patientId,
				doctor_id: doctor_id || null,
				organization_id: organization_id || null,
				scheduled_at: appointmentDate.toISOString(),
				duration_minutes: appointmentDuration,
				status: 'SCHEDULED',
				reason: reason || null,
				location: location || null,
				selected_service: selected_service || null, // Guardar el servicio seleccionado
			})
			.select()
			.single();

		if (appointmentError) {
			console.error('[New Appointment API] Error:', appointmentError);
			return NextResponse.json({ error: 'Error al crear la cita', detail: appointmentError.message }, { status: 500 });
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

			await createNotification({
				userId: doctor_id,
				organizationId: organization_id || null,
				type: 'APPOINTMENT_REQUEST',
				title: 'Nueva Cita Solicitada',
				message: `El paciente ${patient.patient.firstName} ${patient.patient.lastName} ha solicitado una cita para el ${formattedDate}${selected_service ? ` - Servicio: ${selected_service.name} (${selected_service.price} ${selected_service.currency})` : ''}`,
				payload: {
					appointmentId: appointment.id,
					appointment_id: appointment.id,
					patient_id: patient.patientId,
					patientName: `${patient.patient.firstName} ${patient.patient.lastName}`,
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

