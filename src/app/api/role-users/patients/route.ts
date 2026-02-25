import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getRoleUserSessionFromServer } from '@/lib/role-user-auth';
import { createClient } from '@supabase/supabase-js';

// GET: Obtener lista de pacientes registrados y no registrados asociados a la organización
export async function GET(request: NextRequest) {
	try {
		// Verificar sesión del usuario de rol
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado. Debe iniciar sesión como usuario de rol.' }, { status: 401 });
		}

		// Usar service role para evitar problemas de RLS al acceder a datos de pacientes
		const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
		const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

		if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
			console.error('[Role Users Patients] Variables de entorno de Supabase no configuradas');
			return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
		}

		// Crear cliente con service role para evitar RLS
		const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: { persistSession: false },
		});

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

		// 2. Obtener consultas realizadas (todas las vinculadas a la organización)
		const { data: consultations, error: consultationsError } = await supabase
			.from('consultation')
			.select('patient_id, unregistered_patient_id, appointment_id, started_at, status')
			.eq('organization_id', session.organizationId);

		if (consultationsError) {
			console.error('[Role Users Patients] Error obteniendo consultas:', consultationsError);
		}

		// 3. Obtener IDs de pacientes (registrados y no registrados)
		const patientIds = new Set<string>();
		const unregisteredPatientIds = new Set<string>();

		appointments?.forEach((apt: any) => {
			if (apt.patient_id) patientIds.add(apt.patient_id as string);
			if (apt.unregistered_patient_id) unregisteredPatientIds.add(apt.unregistered_patient_id as string);
		});
		consultations?.forEach((cons: any) => {
			if (cons.patient_id) patientIds.add(cons.patient_id as string);
			if (cons.unregistered_patient_id) unregisteredPatientIds.add(cons.unregistered_patient_id as string);
		});

		// 4. Obtener información de pacientes REGISTRADOS
		let registeredPatientsArr: any[] = [];
		
		// 4a. Obtener pacientes que tienen citas o consultas
		if (patientIds.size > 0) {
			const { data: pData, error: pError } = await supabase
				.from('patient')
				.select('id, firstName, lastName, identifier, phone')
				.in('id', Array.from(patientIds));
			
			if (!pError && pData) {
				registeredPatientsArr = pData;
			}
		}

		// 4b. Obtener pacientes vinculados directamente a la organización vía tabla users que son pacientes
		// (Esto captura pacientes registrados por personal administrativo que aún no tienen citas)
		const { data: directPatients, error: directError } = await supabase
			.from('users')
			.select('patient:patientProfileId(id, firstName, lastName, identifier, phone)')
			.eq('organizationId', session.organizationId)
			.eq('role', 'PACIENTE');

		if (!directError && directPatients) {
			directPatients.forEach((u: any) => {
				if (u.patient && !registeredPatientsArr.some(p => p.id === u.patient.id)) {
					registeredPatientsArr.push(u.patient);
				}
			});
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
		registeredPatientsArr.forEach((p: any) => {
			const patientApts = (appointments as any[])?.filter(a => a.patient_id === p.id) || [];
			const patientCons = (consultations as any[])?.filter(c => c.patient_id === p.id) || [];
			
			allPatients.push({
				patient: {
					id: p.id,
					firstName: p.firstName,
					lastName: p.lastName,
					identifier: p.identifier,
					phone: p.phone,
					isUnregistered: false
				},
				scheduledAppointments: patientApts.map((a: any) => ({
					id: a.id,
					scheduled_at: a.scheduled_at,
					status: a.status,
					reason: a.reason,
					location: a.location
				})),
				attendedCount: patientCons.length,
				consultationDates: patientCons.map((c: any) => c.started_at).sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime())
			});
		});

		// Procesar No Registrados
		unregisteredPatientsArr.forEach((p: any) => {
			const patientApts = (appointments as any[])?.filter(a => a.unregistered_patient_id === p.id) || [];
			// Para consultas, usualmente están ligadas a la cita
			const aptIds = new Set(patientApts.map((a: any) => a.id));
			const patientCons = (consultations as any[])?.filter(c => aptIds.has(c.appointment_id)) || [];
 
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
				scheduledAppointments: patientApts.map((a: any) => ({
					id: a.id,
					scheduled_at: a.scheduled_at,
					status: a.status,
					reason: a.reason,
					location: a.location
				})),
				attendedCount: patientCons.length,
				consultationDates: patientCons.map((c: any) => c.started_at).sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime())
			});
		});

		return NextResponse.json({ patients: allPatients });
	} catch (err) {
		console.error('[Role Users Patients] Error:', err);
		return NextResponse.json({ error: 'Error interno' }, { status: 500 });
	}
}

