// app/api/patient/historial/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';

// Tipos para los datos de la base de datos
type ConsultationData = {
	id: string;
	patient_id: string;
	doctor_id: string;
	appointment_id: string | null;
	started_at: string | null;
	ended_at: string | null;
	chief_complaint: string | null;
	diagnosis: string | null;
	notes: string | null;
	vitals: unknown;
	created_at: string;
	updated_at: string;
	doctor: {
		id: string;
		name: string | null;
		email: string | null;
	} | null;
	appointment: {
		id: string;
		reason: string | null;
		scheduled_at: string | null;
	} | null;
};

type PrescriptionData = {
	id: string;
	consultation_id: string | null;
	issued_at: string;
	valid_until: string | null;
	status: string;
	notes: string | null;
	prescription_item: {
		id: string;
		name: string;
		dosage: string | null;
		frequency: string | null;
		duration: string | null;
		instructions: string | null;
	}[];
};

type PrescriptionFile = {
	prescription_id: string;
	url: string;
	file_name: string;
};

type MedicalRecordData = {
	id: string;
	patientId: string;
	authorId: string | null;
	content: unknown;
	attachments: string[];
	createdAt: string;
};

type ConsultationWithRecord = {
	id: string;
	medical_record_id: string | null;
};

type AuthorData = {
	id: string;
	name: string | null;
	email: string | null;
};

type ParsedConsultation = ConsultationData & {
	vitals: unknown;
	prescriptions: (PrescriptionData & { attachments: string[] })[];
	attachments: string[];
};

type ParsedMedicalRecord = MedicalRecordData & {
	content: unknown;
	author: AuthorData | null;
};

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
		const consultationIds = (consultations || []).map((c: ConsultationData) => c.id);
		const prescriptionsMap: Record<string, (PrescriptionData & { attachments: string[] })[]> = {};
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
					prescription_item:prescription_item!fk_prescriptionitem_prescription (
						id,
						name,
						dosage,
						frequency,
						duration,
						instructions
					)
				`)
				.in('consultation_id', consultationIds)
				.order('issued_at', { ascending: false });

			// Obtener archivos adjuntos de las prescripciones desde prescription_files
			const prescriptionIds = (prescriptions || []).map((p: PrescriptionData) => p.id);
			const prescriptionFilesMap: Record<string, string[]> = {};
			if (prescriptionIds.length > 0) {
				const { data: prescriptionFiles, error: filesError } = await supabase
					.from('prescription_files')
					.select('prescription_id, url, file_name')
					.in('prescription_id', prescriptionIds);

				if (filesError) {
					console.error('[Patient Historial API] Error obteniendo archivos de prescripciones:', filesError);
				} else if (prescriptionFiles) {
					prescriptionFiles.forEach((file: PrescriptionFile) => {
						if (file.prescription_id && file.url) {
							if (!prescriptionFilesMap[file.prescription_id]) {
								prescriptionFilesMap[file.prescription_id] = [];
							}
							prescriptionFilesMap[file.prescription_id].push(file.url);
						}
					});
				}
			}

			// Agregar archivos a las prescripciones
			if (prescError) {
				console.error('[Patient Historial API] Error obteniendo prescripciones:', prescError);
			} else if (prescriptions) {
				prescriptions.forEach((presc: PrescriptionData) => {
					if (presc.consultation_id) {
						if (!prescriptionsMap[presc.consultation_id]) {
							prescriptionsMap[presc.consultation_id] = [];
						}
						// Agregar archivos adjuntos de prescription_files
						const prescriptionWithAttachments: PrescriptionData & { attachments: string[] } = {
							...presc,
							attachments: prescriptionFilesMap[presc.id] || [],
						};
						prescriptionsMap[presc.consultation_id].push(prescriptionWithAttachments);
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
		(consultationsWithRecords || []).forEach((c: ConsultationWithRecord) => {
			if (c.medical_record_id) {
				recordToConsultationMap[c.medical_record_id] = c.id;
			}
		});

		// Obtener información de los autores si existen
		const authorIds = [...new Set((medicalRecords || []).map((r: MedicalRecordData) => r.authorId).filter((id): id is string => Boolean(id)))];
		const authorsMap: Record<string, AuthorData> = {};
		if (authorIds.length > 0) {
			const { data: authors } = await supabase
				.from('User')
				.select('id, name, email')
				.in('id', authorIds);
			
			if (authors) {
				authors.forEach((a: AuthorData) => {
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
		const safeParseJson = (field: unknown): unknown => {
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
		(medicalRecords || []).forEach((record: MedicalRecordData) => {
			const consultationId = recordToConsultationMap[record.id];
			if (consultationId && record.attachments && Array.isArray(record.attachments) && record.attachments.length > 0) {
				if (!consultationAttachmentsMap[consultationId]) {
					consultationAttachmentsMap[consultationId] = [];
				}
				// Asegurar que los attachments sean strings válidos
				const validAttachments = record.attachments.filter((att: unknown): att is string => typeof att === 'string' && att.length > 0);
				consultationAttachmentsMap[consultationId].push(...validAttachments);
			}
		});

		const parsedConsultations: ParsedConsultation[] = (consultations || []).map((c: ConsultationData): ParsedConsultation => ({
			...c,
			vitals: safeParseJson(c.vitals),
			prescriptions: prescriptionsMap[c.id] || [],
			attachments: consultationAttachmentsMap[c.id] || [],
		}));

		const parsedRecords: ParsedMedicalRecord[] = (medicalRecords || []).map((r: MedicalRecordData): ParsedMedicalRecord => ({
			...r,
			content: safeParseJson(r.content),
			author: r.authorId ? authorsMap[r.authorId] || null : null,
		}));

		return NextResponse.json({
			consultations: parsedConsultations,
			medicalRecords: parsedRecords,
		});
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Patient Historial API] Error:', errorMessage);
		return NextResponse.json({ error: 'Error interno', detail: errorMessage }, { status: 500 });
	}
}

