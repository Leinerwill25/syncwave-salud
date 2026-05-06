// app/api/patient/appointments/[id]/confirm/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { awardPoints } from '@/lib/actions/points';

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
		const supabase = await createSupabaseServerClient();

		// Verificar que la cita existe y pertenece al paciente
		const { data: appointment, error: fetchError } = await supabase
			.from('appointment')
			.select('id, patient_id, status, scheduled_at')
			.eq('id', id)
			.eq('patient_id', patient.patientId)
			.single();

		if (fetchError || !appointment) {
			return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
		}

		// Solo se pueden confirmar citas futuras y en estado SCHEDULED
		const isPast = new Date(appointment.scheduled_at) < new Date();
		if (isPast) {
			return NextResponse.json({ error: 'No se puede confirmar una cita que ya pasó' }, { status: 400 });
		}

		if (appointment.status !== 'SCHEDULED') {
			return NextResponse.json({ error: 'Solo se pueden confirmar citas programadas' }, { status: 400 });
		}

		// Otorgar puntos (+25 Pulsos)
		// Verificamos si ya se otorgaron puntos por esta cita específica para evitar duplicados
		const { data: existingAward } = await supabase
			.from('patient_points_transactions')
			.select('id')
			.eq('patient_id', patient.authId)
			.eq('event_type', 'appointment_confirmed')
			.eq('reference_id', id)
			.maybeSingle();

		if (existingAward) {
			return NextResponse.json({ 
				success: true, 
				message: 'Cita ya confirmada anteriormente',
				pointsAwarded: false 
			});
		}

		const awardResult = await awardPoints(patient.authId, 'appointment_confirmed', id, 'appointment');

		return NextResponse.json({
			success: true,
			message: 'Cita confirmada exitosamente. ¡Has ganado 25 Pulsos!',
			pointsAwarded: awardResult.awarded
		});
	} catch (err: any) {
		console.error('[Patient Appointment Confirm API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}
