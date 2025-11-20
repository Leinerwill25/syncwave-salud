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

		// Obtener consultas con prescripciones y archivos adjuntos
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

		// Obtener prescripciones relacionadas con las consultas
		const consultationIds = (consultations || []).map((c: any) => c.id);
		let prescriptionsMap: Record<string, any[]> = {};
		if (consultationIds.length > 0) {
			const { data: prescriptions, error: prescError } = await supabase
				.from('prescription')
				.select(`
					id,
					consultation_id,
					issued_at,
					valid_until,
					status,
					notes,
					attachments,
					prescription_item:prescription_item!fk_prescriptionitem_prescription (
						id,
						medication_name,
						dosage,
						frequency,
						duration_days,
						instructions
					)
				`)
				.in('consultation_id', consultationIds)
				.order('issued_at', { ascending: false });

			if (prescError) {
				console.error('[Patient Historial API] Error obteniendo prescripciones:', prescError);
			} else {
				(prescriptions || []).forEach((presc: any) => {
					if (presc.consultation_id) {
						if (!prescriptionsMap[presc.consultation_id]) {
							prescriptionsMap[presc.consultation_id] = [];
						}
						prescriptionsMap[presc.consultation_id].push(presc);
					}
				});
			}
		}

		// Obtener registros médicos relacionados con consultas
		// Nota: MedicalRecord puede estar relacionado con consultas a través de consultation.medical_record_id
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

		// Obtener consultas que tienen medical_record_id para mapear archivos
		const { data: consultationsWithRecords } = await supabase
			.from('consultation')
			.select('id, medical_record_id')
			.eq('patient_id', patient.patientId)
			.not('medical_record_id', 'is', null);

		// Crear mapa de medical_record_id a consultation_id
		const recordToConsultationMap: Record<string, string> = {};
		(consultationsWithRecords || []).forEach((c: any) => {
			if (c.medical_record_id) {
				recordToConsultationMap[c.medical_record_id] = c.id;
			}
		});

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

		// Mapear archivos de MedicalRecord a consultas
		const consultationAttachmentsMap: Record<string, string[]> = {};
		(medicalRecords || []).forEach((record: any) => {
			const consultationId = recordToConsultationMap[record.id];
			if (consultationId && record.attachments && record.attachments.length > 0) {
				if (!consultationAttachmentsMap[consultationId]) {
					consultationAttachmentsMap[consultationId] = [];
				}
				consultationAttachmentsMap[consultationId].push(...record.attachments);
			}
		});

		const parsedConsultations = (consultations || []).map((c: any) => ({
			...c,
			vitals: safeParseJson(c.vitals),
			prescriptions: prescriptionsMap[c.id] || [],
			attachments: consultationAttachmentsMap[c.id] || [],
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

