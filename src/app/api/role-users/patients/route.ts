import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getRoleUserSessionFromServer } from '@/lib/role-user-auth';

// GET: Obtener lista de pacientes sin información médica sensible
export async function GET(request: NextRequest) {
	try {
		// Verificar sesión del usuario de rol
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado. Debe iniciar sesión como usuario de rol.' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		// Obtener todos los pacientes que tienen citas o consultas con esta organización
		// Primero obtenemos las citas de la organización (todas las citas programadas y confirmadas)
		const { data: appointments, error: appointmentsError } = await supabase
			.from('appointment')
			.select('id, patient_id, scheduled_at, status, reason, location')
			.eq('organization_id', session.organizationId)
			.in('status', ['SCHEDULED', 'CONFIRMED'])
			.order('scheduled_at', { ascending: false });

		if (appointmentsError) {
			console.error('[Role Users Patients] Error obteniendo citas:', appointmentsError);
			return NextResponse.json({ error: 'Error al obtener citas' }, { status: 500 });
		}

		// Obtener consultas realizadas (para contar asistencias y fechas)
		const { data: consultations, error: consultationsError } = await supabase
			.from('consultation')
			.select('patient_id, scheduled_at, consultation_date, status')
			.eq('organization_id', session.organizationId)
			.in('status', ['COMPLETED', 'ATTENDED'])
			.order('consultation_date', { ascending: false });

		if (consultationsError) {
			console.error('[Role Users Patients] Error obteniendo consultas:', consultationsError);
		}

		// Obtener IDs únicos de pacientes
		const patientIds = new Set<string>();
		appointments?.forEach((apt) => {
			if (apt.patient_id) patientIds.add(apt.patient_id);
		});
		consultations?.forEach((cons) => {
			if (cons.patient_id) patientIds.add(cons.patient_id);
		});

		if (patientIds.size === 0) {
			return NextResponse.json({ patients: [] });
		}

		// Obtener información básica de los pacientes
		const { data: patients, error: patientsError } = await supabase
			.from('Patient')
			.select('id, firstName, lastName, identifier, phone, email')
			.in('id', Array.from(patientIds));

		if (patientsError) {
			console.error('[Role Users Patients] Error obteniendo pacientes:', patientsError);
			return NextResponse.json({ error: 'Error al obtener pacientes' }, { status: 500 });
		}

		// Combinar datos de pacientes con sus citas y consultas
		const patientsWithAppointments = (patients || []).map((patient) => {
			// Citas programadas de este paciente
			const scheduledAppointments =
				appointments
					?.filter((apt) => apt.patient_id === patient.id && (apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED'))
					.map((apt) => ({
						id: apt.id || '',
						patient_id: apt.patient_id || '',
						scheduled_at: apt.scheduled_at || '',
						status: apt.status || '',
						reason: apt.reason || null,
						location: apt.location || null,
					})) || [];

			// Consultas realizadas (para contar asistencias y obtener fechas)
			const patientConsultations =
				consultations?.filter((cons) => cons.patient_id === patient.id && (cons.status === 'COMPLETED' || cons.status === 'ATTENDED')) ||
				[];

			// Contar asistencias
			const attendedCount = patientConsultations.length;

			// Obtener fechas de consultas (sin información médica)
			const consultationDates = patientConsultations
				.map((cons) => cons.consultation_date || cons.scheduled_at)
				.filter((date): date is string => !!date);

			return {
				patient: {
					id: patient.id,
					firstName: patient.firstName,
					lastName: patient.lastName,
					identifier: patient.identifier,
					phone: patient.phone,
					email: patient.email,
				},
				scheduledAppointments,
				attendedCount,
				consultationDates: consultationDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime()), // Más recientes primero
			};
		});

		return NextResponse.json({ patients: patientsWithAppointments });
	} catch (err) {
		console.error('[Role Users Patients] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error interno', detail: errorMessage }, { status: 500 });
	}
}

