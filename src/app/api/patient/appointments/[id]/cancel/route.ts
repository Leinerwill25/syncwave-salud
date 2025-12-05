// app/api/patient/appointments/[id]/cancel/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const { id } = await params;
		const appointmentId = id;

		// Verificar que la cita pertenece al paciente
		const { data: appointment, error: checkError } = await supabase
			.from('appointment')
			.select('id, patient_id, status, scheduled_at')
			.eq('id', appointmentId)
			.eq('patient_id', patient.patientId)
			.maybeSingle();

		if (checkError || !appointment) {
			return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
		}

		// Verificar que la cita no esté cancelada o completada
		if (appointment.status === 'CANCELLED') {
			return NextResponse.json({ error: 'La cita ya está cancelada' }, { status: 400 });
		}

		// Cancelar la cita
		const { error: updateError } = await supabase
			.from('appointment')
			.update({ status: 'CANCELLED' })
			.eq('id', appointmentId);

		if (updateError) {
			console.error('[Cancel Appointment API] Error:', updateError);
			return NextResponse.json({ error: 'Error al cancelar la cita' }, { status: 500 });
		}

		return NextResponse.json({
			success: true,
			message: 'Cita cancelada correctamente',
		});
	} catch (err: any) {
		console.error('[Cancel Appointment API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

