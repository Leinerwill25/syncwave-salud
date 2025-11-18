// app/api/patient/historial/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		// Obtener consultas
		const { data: consultations, error: consultationsError } = await supabase
			.from('consultation')
			.select(`
				id,
				patient_id,
				doctor_id,
				appointment_id,
				started_at,
				ended_at,
				chief_complaint,
				diagnosis,
				notes,
				vitals,
				created_at,
				updated_at,
				doctor:User!fk_consultation_doctor (
					id,
					name,
					email
				),
				appointment:appointment!fk_consultation_appointment (
					id,
					reason,
					scheduled_at
				)
			`)
			.eq('patient_id', patient.patientId)
			.order('created_at', { ascending: false });

		// Obtener registros médicos
		// Nota: MedicalRecord.authorId referencia User.id pero no hay foreign key explícita en el schema
		const { data: medicalRecords, error: recordsError } = await supabase
			.from('MedicalRecord')
			.select(`
				id,
				patientId,
				authorId,
				content,
				attachments,
				createdAt
			`)
			.eq('patientId', patient.patientId)
			.order('createdAt', { ascending: false });

		// Obtener información de los autores si existen
		const authorIds = [...new Set((medicalRecords || []).map((r: any) => r.authorId).filter(Boolean))];
		let authorsMap: Record<string, any> = {};
		if (authorIds.length > 0) {
			const { data: authors } = await supabase
				.from('User')
				.select('id, name, email')
				.in('id', authorIds);
			
			if (authors) {
				authors.forEach((a: any) => {
					authorsMap[a.id] = a;
				});
			}
		}

		if (consultationsError) {
			console.error('[Patient Historial API] Error obteniendo consultas:', consultationsError);
		}

		if (recordsError) {
			console.error('[Patient Historial API] Error obteniendo registros médicos:', recordsError);
		}

		// Parsear campos JSON de forma segura
		const safeParseJson = (field: any) => {
			if (!field) return null;
			if (typeof field === 'object') return field;
			if (typeof field === 'string') {
				try {
					return JSON.parse(field);
				} catch {
					return field;
				}
			}
			return field;
		};

		const parsedConsultations = (consultations || []).map((c: any) => ({
			...c,
			vitals: safeParseJson(c.vitals),
		}));

		const parsedRecords = (medicalRecords || []).map((r: any) => ({
			...r,
			content: safeParseJson(r.content),
			author: r.authorId ? authorsMap[r.authorId] || null : null,
		}));

		return NextResponse.json({
			consultations: parsedConsultations,
			medicalRecords: parsedRecords,
		});
	} catch (err: any) {
		console.error('[Patient Historial API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

