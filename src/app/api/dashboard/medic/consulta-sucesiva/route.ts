import { NextRequest, NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

// GET: Obtener consultas sucesivas
export async function GET(req: NextRequest) {
	try {
		const authResult = await apiRequireRole(['MEDICO', 'ADMIN']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user || !user.userId) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const supabase = await createSupabaseServerClient();
		const { searchParams } = new URL(req.url);
		const consultationId = searchParams.get('consultationId');
		const patientId = searchParams.get('patientId');

		let query = supabase
			.from('successive_consultation')
			.select(
				`id, original_consultation_id, patient_id, doctor_id, organization_id, consultation_date, 
				lab_results, results_description, doctor_observations, diagnosis, icd11_code, icd11_title, 
				notes, attachments, additional_fields, created_at, updated_at,
				patient:patient_id(id, firstName, lastName, identifier),
				doctor:doctor_id(id, name),
				original_consultation:original_consultation_id(id, chief_complaint, diagnosis, started_at)`
			)
			.eq('doctor_id', user.userId)
			.order('consultation_date', { ascending: false });

		if (consultationId) {
			query = query.eq('original_consultation_id', consultationId);
		}
		if (patientId) {
			query = query.eq('patient_id', patientId);
		}

		const { data, error } = await query;

		if (error) {
			console.error('Error obteniendo consultas sucesivas:', error);
			return NextResponse.json({ error: 'Error al obtener consultas sucesivas' }, { status: 500 });
		}

		return NextResponse.json({ items: data || [] }, { status: 200 });
	} catch (error: any) {
		console.error('Error en GET /api/dashboard/medic/consulta-sucesiva:', error);
		return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
	}
}

// POST: Crear nueva consulta sucesiva
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
			consultation_date,
			lab_results,
			results_description,
			doctor_observations,
			diagnosis,
			icd11_code,
			icd11_title,
			notes,
			attachments,
			additional_fields,
		} = body;

		// Validaciones
		if (!original_consultation_id) {
			return NextResponse.json({ error: 'Se requiere el ID de la consulta original' }, { status: 400 });
		}

		const supabase = await createSupabaseServerClient();

		// Verificar que la consulta original existe y pertenece al doctor
		const { data: originalConsultation, error: consultationError } = await supabase
			.from('consultation')
			.select('id, patient_id, doctor_id, organization_id')
			.eq('id', original_consultation_id)
			.single();

		if (consultationError || !originalConsultation) {
			return NextResponse.json({ error: 'Consulta original no encontrada' }, { status: 404 });
		}

		// Verificar que el doctor tiene acceso a esta consulta
		if (originalConsultation.doctor_id !== user.userId) {
			return NextResponse.json({ error: 'No tiene acceso a esta consulta' }, { status: 403 });
		}

		// Crear la consulta sucesiva
		const { data: successiveConsultation, error: insertError } = await supabase
			.from('successive_consultation')
			.insert({
				original_consultation_id,
				patient_id: originalConsultation.patient_id,
				doctor_id: user.userId,
				organization_id: originalConsultation.organization_id,
				consultation_date: consultation_date || new Date().toISOString(),
				lab_results: lab_results || {},
				results_description: results_description || null,
				doctor_observations: doctor_observations || null,
				diagnosis: diagnosis || null,
				icd11_code: icd11_code || null,
				icd11_title: icd11_title || null,
				notes: notes || null,
				attachments: attachments || [],
				additional_fields: additional_fields || {},
				created_by: user.userId,
			})
			.select()
			.single();

		if (insertError) {
			console.error('Error creando consulta sucesiva:', insertError);
			return NextResponse.json({ error: 'Error al crear la consulta sucesiva', detail: insertError.message }, { status: 500 });
		}

		return NextResponse.json({ successive_consultation: successiveConsultation }, { status: 201 });
	} catch (error: any) {
		console.error('Error en POST /api/dashboard/medic/consulta-sucesiva:', error);
		return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
	}
}

