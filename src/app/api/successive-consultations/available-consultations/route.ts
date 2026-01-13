// app/api/successive-consultations/available-consultations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

// GET: Obtener consultas que tienen órdenes de laboratorio (disponibles para consulta sucesiva)
export async function GET(req: NextRequest) {
	try {
		const authResult = await apiRequireRole(['MEDICO', 'ADMIN']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user || !user.userId) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const supabase = await createSupabaseServerClient();
		const url = new URL(req.url);
		const patientId = url.searchParams.get('patientId');

		// Obtener consultas del médico que tienen órdenes de laboratorio asociadas
		// Incluir tanto consultas con patient_id como con unregistered_patient_id
		let query = supabase
			.from('consultation')
			.select(`
				id,
				appointment_id,
				patient_id,
				unregistered_patient_id,
				doctor_id,
				organization_id,
				chief_complaint,
				diagnosis,
				notes,
				created_at,
				patient:patient_id(id, firstName, lastName, identifier),
				appointment:appointment_id(id, scheduled_at, reason, status)
			`)
			.eq('doctor_id', user.userId)
			.order('created_at', { ascending: false })
			.limit(100);

		if (patientId) {
			// Si se filtra por patientId, también buscar consultas del unregistered_patient_id relacionado
			query = query.eq('patient_id', patientId);
		}

		const { data: consultations, error: consultationError } = await query;

		if (consultationError) {
			console.error('Error obteniendo consultas:', consultationError);
			return NextResponse.json({ error: 'Error al obtener consultas' }, { status: 500 });
		}

		// Obtener pacientes no registrados para las consultas que los tienen
		const unregisteredPatientIds = (consultations || [])
			.filter(c => c.unregistered_patient_id)
			.map(c => c.unregistered_patient_id)
			.filter((id): id is string => !!id);

		let unregisteredPatientsMap: Record<string, { firstName: string; lastName: string; identifier?: string }> = {};

		if (unregisteredPatientIds.length > 0) {
			const { data: unregisteredData, error: unregisteredError } = await supabase
				.from('unregisteredpatients')
				.select('id, first_name, last_name, identification')
				.in('id', unregisteredPatientIds);

			if (!unregisteredError && unregisteredData) {
				unregisteredPatientsMap = unregisteredData.reduce((acc, up) => {
					acc[up.id] = {
						firstName: up.first_name || '',
						lastName: up.last_name || '',
						identifier: up.identification || undefined,
					};
					return acc;
				}, {} as Record<string, { firstName: string; lastName: string; identifier?: string }>);
			}
		}

		// Filtrar consultas que tienen lab_results o que podrían tener órdenes pendientes
		// También verificamos si ya existe una consulta sucesiva para evitar duplicados
		const consultationIds = (consultations || []).map(c => c.id);
		const { data: existingSuccessive } = await supabase
			.from('successive_consultations')
			.select('original_consultation_id')
			.in('original_consultation_id', consultationIds);

		const existingIds = new Set((existingSuccessive || []).map(s => s.original_consultation_id));

		// Filtrar y formatear resultados
		const availableConsultations = (consultations || [])
			.filter(c => !existingIds.has(c.id)) // Excluir consultas que ya tienen consulta sucesiva
			.map(c => {
				// Si tiene unregistered_patient_id, usar esos datos; si no, usar patient
				// c.patient puede ser un array o un objeto, así que tomamos el primer elemento si es array
				let patientData: any = Array.isArray(c.patient) ? c.patient[0] : c.patient;
				if (c.unregistered_patient_id && unregisteredPatientsMap[c.unregistered_patient_id]) {
					patientData = unregisteredPatientsMap[c.unregistered_patient_id];
				}

				return {
					id: c.id,
					patient: patientData,
					unregistered_patient_id: c.unregistered_patient_id || null,
					chief_complaint: c.chief_complaint,
					diagnosis: c.diagnosis,
					created_at: c.created_at,
					appointment: c.appointment,
				};
			});

		return NextResponse.json(availableConsultations, { status: 200 });
	} catch (error: any) {
		console.error('Error en GET /api/successive-consultations/available-consultations:', error);
		return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
	}
}

