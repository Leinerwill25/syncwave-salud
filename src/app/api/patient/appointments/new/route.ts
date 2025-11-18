// app/api/patient/appointments/new/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const body = await request.json();
		const { doctor_id, organization_id, scheduled_at, duration_minutes, reason, location } = body;

		if (!scheduled_at) {
			return NextResponse.json({ error: 'scheduled_at es requerido' }, { status: 400 });
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

		// Crear la cita
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
			})
			.select()
			.single();

		if (appointmentError) {
			console.error('[New Appointment API] Error:', appointmentError);
			return NextResponse.json({ error: 'Error al crear la cita', detail: appointmentError.message }, { status: 500 });
		}

		// Crear notificación para el médico si existe
		if (doctor_id) {
			const { error: notifError } = await supabase
				.from('Notification')
				.insert({
					userId: doctor_id,
					organizationId: organization_id || null,
					type: 'APPOINTMENT_REQUEST',
					title: 'Nueva Cita Solicitada',
					message: `El paciente ${patient.patient.firstName} ${patient.patient.lastName} ha solicitado una cita para el ${appointmentDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
					payload: {
						appointment_id: appointment.id,
						patient_id: patient.patientId,
						scheduled_at: scheduled_at,
					},
					read: false,
				});

			if (notifError) {
				console.error('[New Appointment API] Error creando notificación:', notifError);
				// No fallar la creación de la cita si la notificación falla
			}
		}

		return NextResponse.json({
			success: true,
			appointment,
			message: 'Cita creada correctamente. El médico recibirá una notificación.',
		});
	} catch (err: any) {
		console.error('[New Appointment API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

