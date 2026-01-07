// app/api/medic/tasks/route.ts
// API para gestionar tareas del médico

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { apiRequireRole } from '@/lib/auth-guards';

// GET - Lista tareas del médico
export async function GET(req: Request) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const url = new URL(req.url);
		const patientId = url.searchParams.get('patientId');
		const consultationId = url.searchParams.get('consultationId');
		const completed = url.searchParams.get('completed'); // true/false

		// Nota: Ya no usamos la relación Patient:patient_id porque patient_id puede ser de Patient o unregisteredpatients
		let query = supabase
			.from('task')
			.select(`
				id,
				title,
				description,
				assigned_to,
				patient_id,
				unregistered_patient_id,
				related_consultation_id,
				due_at,
				completed,
				created_by,
				created_at,
				updated_at,
				consultation:related_consultation_id (
					id,
					chief_complaint,
					diagnosis
				)
			`)
			.or(`assigned_to.eq.${user.userId},created_by.eq.${user.userId}`)
			.order('created_at', { ascending: false });

		if (patientId) {
			// Buscar tanto en patient_id como en unregistered_patient_id
			query = query.or(`patient_id.eq.${patientId},unregistered_patient_id.eq.${patientId}`);
		}

		if (consultationId) {
			query = query.eq('related_consultation_id', consultationId);
		}

		if (completed === 'true') {
			query = query.eq('completed', true);
		} else if (completed === 'false') {
			query = query.eq('completed', false);
		}

		const { data: tasks, error } = await query;

		if (error) {
			console.error('[Medic Tasks API] Error:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		// Obtener información de pacientes (tanto registrados como no registrados)
		const patientIds = new Set<string>();
		const unregisteredPatientIds = new Set<string>();

		(tasks || []).forEach((t: any) => {
			if (t.patient_id) patientIds.add(t.patient_id);
			if (t.unregistered_patient_id) unregisteredPatientIds.add(t.unregistered_patient_id);
		});

		// Obtener pacientes registrados
		const registeredPatientsMap = new Map();
		if (patientIds.size > 0) {
			const { data: registeredPatients } = await supabase
				.from('patient')
				.select('id, firstName, lastName, identifier')
				.in('id', Array.from(patientIds));

			if (registeredPatients) {
				registeredPatients.forEach((p: any) => {
					registeredPatientsMap.set(p.id, p);
				});
			}
		}

		// Obtener pacientes no registrados
		const unregisteredPatientsMap = new Map();
		if (unregisteredPatientIds.size > 0) {
			const { data: unregisteredPatients } = await supabase
				.from('unregisteredpatients')
				.select('id, first_name, last_name, identification')
				.in('id', Array.from(unregisteredPatientIds));

			if (unregisteredPatients) {
				unregisteredPatients.forEach((up: any) => {
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
		const tasksWithPatients = (tasks || []).map((t: any) => {
			let patientInfo = null;

			// Intentar obtener de pacientes registrados primero
			if (t.patient_id && registeredPatientsMap.has(t.patient_id)) {
				patientInfo = registeredPatientsMap.get(t.patient_id);
			}
			// Si no está en registrados, puede ser un paciente no registrado (usando su ID como patient_id)
			else if (t.patient_id && unregisteredPatientsMap.has(t.patient_id)) {
				patientInfo = unregisteredPatientsMap.get(t.patient_id);
			}
			// Si hay unregistered_patient_id, usar ese
			else if (t.unregistered_patient_id && unregisteredPatientsMap.has(t.unregistered_patient_id)) {
				patientInfo = unregisteredPatientsMap.get(t.unregistered_patient_id);
			}

			return {
				...t,
				Patient: patientInfo,
			};
		});

		return NextResponse.json({ tasks: tasksWithPatients }, { status: 200 });
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Tasks API] Error inesperado:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

// POST - Crear nueva tarea
export async function POST(req: Request) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const body = await req.json();
		const { title, description, assigned_to, patient_id, related_consultation_id, due_at } = body;

		if (!title) {
			return NextResponse.json({ error: 'El título es requerido' }, { status: 400 });
		}

		// Determinar si el patient_id es de un paciente registrado o no registrado
		let finalPatientId = patient_id || null;
		let unregisteredPatientId = null;

		if (patient_id) {
			// Verificar si existe en Patient
			const { data: registeredPatient } = await supabase
				.from('patient')
				.select('id')
				.eq('id', patient_id)
				.maybeSingle();

			if (!registeredPatient) {
				// No está en Patient, verificar si está en unregisteredpatients
				const { data: unregisteredPatient } = await supabase
					.from('unregisteredpatients')
					.select('id')
					.eq('id', patient_id)
					.maybeSingle();

				if (unregisteredPatient) {
					// Es un paciente no registrado
					unregisteredPatientId = patient_id;
					finalPatientId = null; // No usar patient_id para pacientes no registrados
				} else {
					return NextResponse.json(
						{ error: 'El patient_id proporcionado no existe en Patient ni en unregisteredpatients' },
						{ status: 400 }
					);
				}
			}
			// Si está en Patient, usar finalPatientId normalmente
		}

		const { data: task, error } = await supabase
			.from('task')
			.insert({
				title,
				description: description || null,
				assigned_to: assigned_to || user.userId,
				patient_id: finalPatientId,
				unregistered_patient_id: unregisteredPatientId,
				related_consultation_id: related_consultation_id || null,
				due_at: due_at ? new Date(due_at).toISOString() : null,
				completed: false,
				created_by: user.userId,
			})
			.select(`
				id,
				title,
				description,
				assigned_to,
				patient_id,
				unregistered_patient_id,
				related_consultation_id,
				due_at,
				completed,
				created_by,
				created_at,
				updated_at
			`)
			.single();

		if (error) {
			console.error('[Medic Tasks API] Error creando tarea:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ task }, { status: 201 });
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Tasks API] Error inesperado:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

