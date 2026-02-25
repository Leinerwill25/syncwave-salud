import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getRoleUserSessionFromServer } from '@/lib/role-user-auth';

// GET: Obtener lista de pacientes registrados y no registrados asociados a la organización
export async function GET(request: NextRequest) {
	try {
		// Verificar sesión del usuario de rol
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado. Debe iniciar sesión como usuario de rol.' }, { status: 401 });
		}

		const supabase = await createSupabaseServerClient();

		// 1. Obtener citas de la organización
		const { data: appointments, error: appointmentsError } = await supabase
			.from('appointment')
			.select('id, patient_id, unregistered_patient_id, scheduled_at, status, reason, location')
			.eq('organization_id', session.organizationId)
			.order('scheduled_at', { ascending: false });

		if (appointmentsError) {
			console.error('[Role Users Patients] Error obteniendo citas:', appointmentsError);
			return NextResponse.json({ error: 'Error al obtener citas' }, { status: 500 });
		}

		// 2. Obtener consultas realizadas
		const { data: consultations, error: consultationsError } = await supabase
			.from('consultation')
			.select('patient_id, appointment_id, scheduled_at, consultation_date, status')
			.eq('organization_id', session.organizationId)
			.in('status', ['COMPLETED', 'ATTENDED'])
			.order('consultation_date', { ascending: false });

		if (consultationsError) {
			console.error('[Role Users Patients] Error obteniendo consultas:', consultationsError);
		}

		// 3. Obtener IDs de pacientes (registrados y no registrados)
		const patientIds = new Set<string>();
		const unregisteredPatientIds = new Set<string>();

		appointments?.forEach((apt) => {
			if (apt.patient_id) patientIds.add(apt.patient_id);
			if (apt.unregistered_patient_id) unregisteredPatientIds.add(apt.unregistered_patient_id);
		});
		consultations?.forEach((cons) => {
			if (cons.patient_id) patientIds.add(cons.patient_id);
            // Si hay consultas vinculadas a citas que tienen unregistered_patient_id
            if (cons.appointment_id) {
                const apt = appointments?.find(a => a.id === cons.appointment_id);
                if (apt?.unregistered_patient_id) unregisteredPatientIds.add(apt.unregistered_patient_id);
            }
		});

		// 4. Obtener información de pacientes REGISTRADOS
		let registeredPatientsArr: any[] = [];
		if (patientIds.size > 0) {
			const { data: pData, error: pError } = await supabase
				.from('patient')
				.select('id, firstName, lastName, identifier, phone')
				.in('id', Array.from(patientIds));
			
			if (!pError && pData) {
				registeredPatientsArr = pData;
			}
		}

		// 5. Obtener información de pacientes NO REGISTRADOS
		let unregisteredPatientsArr: any[] = [];
		if (unregisteredPatientIds.size > 0) {
			const { data: uData, error: uError } = await supabase
				.from('unregisteredpatients')
				.select('id, first_name, last_name, identification, phone, created_by')
				.in('id', Array.from(unregisteredPatientIds));
			
			if (!uError && uData) {
				unregisteredPatientsArr = uData;
			}
		}

		// 6. Mapear creadores (médicos) para pacientes no registrados
		const creatorIds = new Set<string>(unregisteredPatientsArr.map(p => p.created_by).filter(id => !!id));
		let creatorsMap: Record<string, string> = {};
		if (creatorIds.size > 0) {
			const { data: cData } = await supabase
				.from('medic_profile')
				.select('id, doctor:doctor_id(name)')
				.in('id', Array.from(creatorIds));
			
			cData?.forEach((c: any) => {
				const doctorData = Array.isArray(c.doctor) ? c.doctor[0] : c.doctor;
				creatorsMap[c.id] = doctorData?.name || 'Médico';
			});
		}

		// 7. Combinar y normalizar
		const allPatients: any[] = [];

		// Procesar Registrados
		registeredPatientsArr.forEach(p => {
			const patientApts = appointments?.filter(a => a.patient_id === p.id) || [];
			const patientCons = consultations?.filter(c => c.patient_id === p.id) || [];
			
			allPatients.push({
				patient: {
					id: p.id,
					firstName: p.firstName,
					lastName: p.lastName,
					identifier: p.identifier,
					phone: p.phone,
					isUnregistered: false
				},
				scheduledAppointments: patientApts.map(a => ({
					id: a.id,
					scheduled_at: a.scheduled_at,
					status: a.status,
					reason: a.reason,
					location: a.location
				})),
				attendedCount: patientCons.length,
				consultationDates: patientCons.map(c => c.consultation_date || c.scheduled_at).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
			});
		});

		// Procesar No Registrados
		unregisteredPatientsArr.forEach(p => {
			const patientApts = appointments?.filter(a => a.unregistered_patient_id === p.id) || [];
			// Para consultas, usualmente están ligadas a la cita
			const aptIds = new Set(patientApts.map(a => a.id));
			const patientCons = consultations?.filter(c => aptIds.has(c.appointment_id)) || [];

			allPatients.push({
				patient: {
					id: p.id,
					firstName: p.first_name,
					lastName: p.last_name,
					identifier: p.identification,
					phone: p.phone,
					isUnregistered: true,
					createdBy: p.created_by ? creatorsMap[p.created_by] : null
				},
				scheduledAppointments: patientApts.map(a => ({
					id: a.id,
					scheduled_at: a.scheduled_at,
					status: a.status,
					reason: a.reason,
					location: a.location
				})),
				attendedCount: patientCons.length,
				consultationDates: patientCons.map(c => c.consultation_date || c.scheduled_at).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
			});
		});

		return NextResponse.json({ patients: allPatients });
	} catch (err) {
		console.error('[Role Users Patients] Error:', err);
		return NextResponse.json({ error: 'Error interno' }, { status: 500 });
	}
}

