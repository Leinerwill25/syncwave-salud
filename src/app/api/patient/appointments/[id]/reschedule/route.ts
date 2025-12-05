// app/api/patient/appointments/[id]/reschedule/route.ts
// API para reagendar una cita

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
		const supabase = await createSupabaseServerClient();

		const body = await request.json();
		const { new_scheduled_at, reason } = body;

		if (!new_scheduled_at) {
			return NextResponse.json({ error: 'Nueva fecha y hora son requeridas' }, { status: 400 });
		}

		// Verificar que la cita existe y pertenece al paciente
		const { data: appointment, error: fetchError } = await supabase
			.from('appointment')
			.select(`
				id,
				patient_id,
				doctor_id,
				organization_id,
				scheduled_at,
				status,
				reason,
				doctor:User!fk_appointment_doctor (
					id,
					name,
					email
				),
				Patient:patient_id (
					firstName,
					lastName
				)
			`)
			.eq('id', id)
			.eq('patient_id', patient.patientId)
			.single();

		if (fetchError || !appointment) {
			return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
		}

		if (appointment.status !== 'SCHEDULED') {
			return NextResponse.json({ 
				error: 'Solo se pueden reagendar citas con estado SCHEDULED' 
			}, { status: 400 });
		}

		// Validar que la nueva fecha sea futura
		const newDate = new Date(new_scheduled_at);
		if (newDate <= new Date()) {
			return NextResponse.json({ 
				error: 'La nueva fecha debe ser futura' 
			}, { status: 400 });
		}

		// Verificar disponibilidad del doctor en la nueva fecha/hora
		const { data: conflictingAppointments, error: conflictError } = await supabase
			.from('appointment')
			.select('id')
			.eq('doctor_id', appointment.doctor_id)
			.eq('status', 'SCHEDULED')
			.eq('scheduled_at', new_scheduled_at)
			.neq('id', id)
			.limit(1);

		if (conflictError) {
			console.error('[Reschedule API] Error verificando conflictos:', conflictError);
		}

		if (conflictingAppointments && conflictingAppointments.length > 0) {
			return NextResponse.json({ 
				error: 'El doctor ya tiene una cita programada en ese horario' 
			}, { status: 400 });
		}

		// Actualizar la cita
		const { data: updatedAppointment, error: updateError } = await supabase
			.from('appointment')
			.update({
				scheduled_at: new_scheduled_at,
				status: 'SCHEDULED', // Mantener como SCHEDULED
				reason: reason || appointment.reason,
			})
			.eq('id', id)
			.select()
			.single();

		if (updateError) {
			console.error('[Reschedule API] Error actualizando cita:', updateError);
			return NextResponse.json({ error: 'Error al reagendar la cita' }, { status: 500 });
		}

		// Crear notificación para el médico
		if (appointment.doctor_id) {
			try {
				interface DoctorInfo {
					name?: string;
					email?: string;
				}
				interface PatientInfo {
					firstName?: string;
					lastName?: string;
				}
				const doctor: DoctorInfo | undefined = Array.isArray(appointment.doctor) 
					? appointment.doctor[0] as DoctorInfo
					: appointment.doctor as DoctorInfo | undefined;
				const doctorName = doctor?.name || 'Médico';
				
				const patientInfo: PatientInfo | undefined = Array.isArray(appointment.Patient)
					? appointment.Patient[0] as PatientInfo
					: appointment.Patient as PatientInfo | undefined;
				const patientName = patientInfo 
					? `${patientInfo.firstName || ''} ${patientInfo.lastName || ''}`.trim() || 'Paciente'
					: 'Paciente';
				
				const oldDate = new Date(appointment.scheduled_at);
				const newDate = new Date(new_scheduled_at);

				await createNotification({
					userId: appointment.doctor_id,
					type: 'APPOINTMENT_RESCHEDULED',
					title: 'Cita Reagendada',
					message: `${patientName} ha reagendado su cita de ${oldDate.toLocaleString('es-ES')} a ${newDate.toLocaleString('es-ES')}`,
					payload: {
						appointmentId: id,
						patientId: patient.patientId,
						oldScheduledAt: appointment.scheduled_at,
						newScheduledAt: new_scheduled_at,
						reason: reason || appointment.reason || null,
						appointmentUrl: `/dashboard/medic/citas/${id}`,
					},
					sendEmail: true,
				});
			} catch (notifError: unknown) {
				console.error('[Reschedule API] Error creando notificación:', notifError);
				// No fallar el reagendamiento si la notificación falla
			}
		}

		return NextResponse.json({
			success: true,
			message: 'Cita reagendada correctamente',
			data: updatedAppointment,
		});
	} catch (err: unknown) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Reschedule API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: errorMessage }, { status: 500 });
	}
}

