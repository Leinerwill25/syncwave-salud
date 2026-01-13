// app/api/successive-consultations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

// GET: Obtener todas las consultas sucesivas del médico
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
		const consultationId = url.searchParams.get('consultationId');

		// Construir query base
		let query = supabase
			.from('successive_consultations')
			.select(`
				id,
				original_consultation_id,
				patient_id,
				unregistered_patient_id,
				doctor_id,
				organization_id,
				appointment_id,
				consultation_date,
				lab_results,
				results_description,
				observations,
				additional_fields,
				images,
				xrays,
				documents,
				diagnosis,
				icd11_code,
				icd11_title,
				notes,
				created_at,
				updated_at,
				patient:patient_id(id, firstName, lastName, identifier),
				doctor:doctor_id(id, name),
				original_consultation:original_consultation_id(id, chief_complaint, diagnosis, created_at),
				appointment:appointment_id(id, scheduled_at, reason)
			`)
			.order('consultation_date', { ascending: false });

		// Filtrar por doctor
		if (user.role === 'MEDICO') {
			query = query.eq('doctor_id', user.userId);
		}

		// Filtros opcionales
		if (patientId) {
			query = query.eq('patient_id', patientId);
		}

		if (consultationId) {
			query = query.eq('original_consultation_id', consultationId);
		}

		const { data, error } = await query;

		if (error) {
			console.error('Error obteniendo consultas sucesivas:', error);
			return NextResponse.json({ error: 'Error al obtener consultas sucesivas' }, { status: 500 });
		}

		// Obtener pacientes no registrados si existen
		const unregisteredPatientIds = (data || [])
			.filter((sc: any) => sc.unregistered_patient_id)
			.map((sc: any) => sc.unregistered_patient_id)
			.filter((id: any): id is string => !!id);

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

		// Enriquecer datos con información de pacientes no registrados
		const enrichedData = (data || []).map((sc: any) => {
			if (sc.unregistered_patient_id && unregisteredPatientsMap[sc.unregistered_patient_id]) {
				return {
					...sc,
					patient: unregisteredPatientsMap[sc.unregistered_patient_id],
				};
			}
			return sc;
		});

		return NextResponse.json(enrichedData, { status: 200 });
	} catch (error: any) {
		console.error('Error en GET /api/successive-consultations:', error);
		return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
	}
}

// POST: Crear una nueva consulta sucesiva
export async function POST(req: NextRequest) {
	try {
		const authResult = await apiRequireRole(['MEDICO', 'ADMIN']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user || !user.userId) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const body = await req.json();
		const {
			original_consultation_id,
			patient_id,
			unregistered_patient_id,
			appointment_id,
			consultation_date,
			lab_results,
			results_description,
			observations,
			additional_fields,
			images,
			xrays,
			documents,
			diagnosis,
			icd11_code,
			icd11_title,
			notes,
		} = body;

		// Validaciones
		if (!original_consultation_id) {
			return NextResponse.json(
				{ error: 'original_consultation_id es requerido' },
				{ status: 400 }
			);
		}

		if (!patient_id && !unregistered_patient_id) {
			return NextResponse.json(
				{ error: 'patient_id o unregistered_patient_id es requerido' },
				{ status: 400 }
			);
		}

		const supabase = await createSupabaseServerClient();

		// Obtener información de la consulta original para validar y obtener el paciente
		const { data: originalConsultation, error: consultationError } = await supabase
			.from('consultation')
			.select('id, doctor_id, organization_id, patient_id, unregistered_patient_id')
			.eq('id', original_consultation_id)
			.single();

		if (consultationError || !originalConsultation) {
			return NextResponse.json({ error: 'Consulta original no encontrada' }, { status: 404 });
		}

		// Determinar patient_id y unregistered_patient_id finales
		// Si no se proporcionan en el body, usar los de la consulta original
		const finalPatientId = patient_id || originalConsultation.patient_id || null;
		const finalUnregisteredPatientId = unregistered_patient_id || originalConsultation.unregistered_patient_id || null;

		// Preparar datos para insertar
		const insertData: any = {
			original_consultation_id,
			doctor_id: user.userId,
			organization_id: user.organizationId || originalConsultation.organization_id,
			consultation_date: consultation_date || new Date().toISOString(),
			lab_results: lab_results || {},
			results_description: results_description || null,
			observations: observations || null,
			additional_fields: additional_fields || {},
			images: images || [],
			xrays: xrays || [],
			documents: documents || [],
			diagnosis: diagnosis || null,
			icd11_code: icd11_code || null,
			icd11_title: icd11_title || null,
			notes: notes || null,
		};

		// Agregar patient_id o unregistered_patient_id según corresponda
		if (finalPatientId) {
			insertData.patient_id = finalPatientId;
		}
		if (finalUnregisteredPatientId) {
			insertData.unregistered_patient_id = finalUnregisteredPatientId;
		}

		// Si hay appointment_id, agregarlo
		if (appointment_id) {
			insertData.appointment_id = appointment_id;
		}

		const { data: newConsultation, error: insertError } = await supabase
			.from('successive_consultations')
			.insert([insertData])
			.select(`
				id,
				original_consultation_id,
				patient_id,
				unregistered_patient_id,
				doctor_id,
				organization_id,
				appointment_id,
				consultation_date,
				lab_results,
				results_description,
				observations,
				additional_fields,
				images,
				xrays,
				documents,
				diagnosis,
				icd11_code,
				icd11_title,
				notes,
				created_at,
				updated_at
			`)
			.single();

		if (insertError) {
			console.error('Error creando consulta sucesiva:', insertError);
			return NextResponse.json({ error: 'Error al crear consulta sucesiva', detail: insertError.message }, { status: 500 });
		}

		return NextResponse.json({ success: true, data: newConsultation }, { status: 201 });
	} catch (error: any) {
		console.error('Error en POST /api/successive-consultations:', error);
		return NextResponse.json({ error: 'Error interno del servidor', detail: error.message }, { status: 500 });
	}
}

