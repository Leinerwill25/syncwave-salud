// app/api/medic/labs/route.ts
// API para que el médico vea resultados de laboratorio

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { apiRequireRole } from '@/lib/auth-guards';

// GET - Lista resultados de laboratorio relacionados con el médico
export async function GET(req: Request) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		// Type assertion: después de la validación, user está garantizado
		const authenticatedUser = user;

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const url = new URL(req.url);
		const patientId = url.searchParams.get('patientId');
		const consultationId = url.searchParams.get('consultationId');
		const isCritical = url.searchParams.get('isCritical');

		// Obtener resultados donde el médico es el ordering_provider o donde el paciente tiene consultas con el médico
		// Nota: Ya no usamos la relación Patient:patient_id porque patient_id puede ser de Patient o unregisteredpatients
		let query = supabase
			.from('lab_result')
			.select(`
				id,
				patient_id,
				unregistered_patient_id,
				consultation_id,
				ordering_provider_id,
				result_type,
				result,
				attachments,
				is_critical,
				reported_at,
				created_at,
				consultation:consultation_id (
					id,
					chief_complaint,
					diagnosis,
					doctor_id
				)
			`)
			.order('reported_at', { ascending: false, nullsFirst: false })
			.order('created_at', { ascending: false });

		// Filtrar por médico: ordenados por él o consultas con él
		// Primero obtenemos resultados donde ordering_provider_id es el médico
		const { data: orderedResults, error: orderedError } = await supabase
			.from('lab_result')
			.select('id')
			.eq('ordering_provider_id', authenticatedUser.userId);

		if (orderedError) {
			console.error('[Medic Labs API] Error:', orderedError);
		}

		// También obtenemos consultas del médico para encontrar resultados relacionados
		const { data: consultations, error: consultationsError } = await supabase
			.from('consultation')
			.select('id')
			.eq('doctor_id', authenticatedUser.userId);

		if (consultationsError) {
			console.error('[Medic Labs API] Error consultas:', consultationsError);
		}

		const consultationIds = (consultations || []).map((c) => c.id);
		const orderedResultIds = (orderedResults || []).map((r) => r.id);

		// Filtrar resultados
		if (orderedResultIds.length > 0 || consultationIds.length > 0) {
			query = query.or(
				`ordering_provider_id.eq.${authenticatedUser.userId},consultation_id.in.(${consultationIds.join(',')})`
			);
		} else {
			// Si no hay resultados, retornar vacío
			return NextResponse.json({ results: [] }, { status: 200 });
		}

		if (patientId) {
			// Buscar tanto en patient_id como en unregistered_patient_id
			query = query.or(`patient_id.eq.${patientId},unregistered_patient_id.eq.${patientId}`);
		}

		if (consultationId) {
			query = query.eq('consultation_id', consultationId);
		}

		if (isCritical === 'true') {
			query = query.eq('is_critical', true);
		}

		const { data: results, error } = await query;

		if (error) {
			console.error('[Medic Labs API] Error:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		// Tipos para los resultados
		interface LabResult {
			id: string;
			patient_id: string | null;
			unregistered_patient_id: string | null;
			consultation_id: string | null;
			ordering_provider_id: string;
			result_type: string;
			result: unknown;
			attachments: string[] | null;
			is_critical: boolean;
			reported_at: string | null;
			created_at: string;
			consultation?: {
				id: string;
				chief_complaint: string | null;
				diagnosis: string | null;
				doctor_id: string;
			} | {
				id: string;
				chief_complaint: string | null;
				diagnosis: string | null;
				doctor_id: string;
			}[] | null;
		}

		interface RegisteredPatient {
			id: string;
			firstName: string;
			lastName: string;
			identifier: string;
		}

		interface UnregisteredPatient {
			id: string;
			first_name: string;
			last_name: string;
			identification: string;
		}

		interface NormalizedPatient {
			id: string;
			firstName: string;
			lastName: string;
			identifier: string;
			is_unregistered: true;
		}

		// Filtrar manualmente para asegurar que solo vemos resultados relevantes
		const filteredResults = (results || []).filter((r) => {
			return (
				r.ordering_provider_id === authenticatedUser.userId ||
				(consultationIds.length > 0 && consultationIds.includes(r.consultation_id || ''))
			);
		});

		// Obtener información de pacientes (tanto registrados como no registrados)
		const patientIds = new Set<string>();
		const unregisteredPatientIds = new Set<string>();

		filteredResults.forEach((r) => {
			if (r.patient_id) patientIds.add(r.patient_id);
			if (r.unregistered_patient_id) unregisteredPatientIds.add(r.unregistered_patient_id);
		});

		// Obtener pacientes registrados
		const registeredPatientsMap = new Map<string, RegisteredPatient>();
		if (patientIds.size > 0) {
			const { data: registeredPatients } = await supabase
				.from('Patient')
				.select('id, firstName, lastName, identifier')
				.in('id', Array.from(patientIds));

			if (registeredPatients) {
				registeredPatients.forEach((p: RegisteredPatient) => {
					registeredPatientsMap.set(p.id, p);
				});
			}
		}

		// Obtener pacientes no registrados
		const unregisteredPatientsMap = new Map<string, NormalizedPatient>();
		if (unregisteredPatientIds.size > 0) {
			const { data: unregisteredPatients } = await supabase
				.from('unregisteredpatients')
				.select('id, first_name, last_name, identification')
				.in('id', Array.from(unregisteredPatientIds));

			if (unregisteredPatients) {
				unregisteredPatients.forEach((up: UnregisteredPatient) => {
					unregisteredPatientsMap.set(up.id, {
						id: up.id,
						firstName: up.first_name,
						lastName: up.last_name,
						identifier: up.identification,
						is_unregistered: true,
					});
				});
			}
		}

		// Combinar resultados con información de pacientes
		const resultsWithPatients = filteredResults.map((r) => {
			let patientInfo: RegisteredPatient | NormalizedPatient | null = null;
			
			// Intentar obtener de pacientes registrados primero
			if (r.patient_id && registeredPatientsMap.has(r.patient_id)) {
				patientInfo = registeredPatientsMap.get(r.patient_id) || null;
			}
			// Si no está en registrados, puede ser un paciente no registrado (usando su ID como patient_id)
			else if (r.patient_id && unregisteredPatientsMap.has(r.patient_id)) {
				patientInfo = unregisteredPatientsMap.get(r.patient_id) || null;
			}
			// Si hay unregistered_patient_id, usar ese
			else if (r.unregistered_patient_id && unregisteredPatientsMap.has(r.unregistered_patient_id)) {
				patientInfo = unregisteredPatientsMap.get(r.unregistered_patient_id) || null;
			}

			return {
				...r,
				Patient: patientInfo,
			};
		});

		return NextResponse.json({ results: resultsWithPatients }, { status: 200 });
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Labs API] Error inesperado:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

