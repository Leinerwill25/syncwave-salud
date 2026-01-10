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
	updated_at?: string;
	doctor: {
		id: string;
		name: string | null;
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
	file_name?: string;
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
	email?: string | null;
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
		const supabase = await createSupabaseServerClient();

		const url = new URL(request.url);
		const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50); // Límite por defecto 20, máximo 50

		// Obtener consultas con datos básicos y límite
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
				doctor:doctor_id (
					id,
					name
				),
				appointment:appointment_id (
					id,
					reason,
					scheduled_at
				)
			`)
			.eq('patient_id', patient.patientId)
			.order('created_at', { ascending: false })
			.limit(limit);

		// Obtener prescripciones relacionadas con las consultas (optimizado)
		interface ConsultationWithRelations {
			id: string;
			doctor?: { id: string; name: string | null } | { id: string; name: string | null }[];
			appointment?: unknown | unknown[];
			[key: string]: unknown;
		}
		const consultationIds = (consultations || []).map((c: ConsultationWithRelations) => c.id);
		const prescriptionsMap: Record<string, (PrescriptionData & { attachments: string[] })[]> = {};
		
		if (consultationIds.length > 0) {
			// Obtener prescripciones y archivos en paralelo
			const [prescriptionsResult, prescriptionFilesResult] = await Promise.all([
				supabase
					.from('prescription')
					.select(`
						id,
						consultation_id,
						issued_at,
						valid_until,
						status,
						notes,
						prescription_item (
							id,
							name,
							dosage,
							frequency,
							duration,
							instructions
						)
					`)
					.in('consultation_id', consultationIds)
					.order('issued_at', { ascending: false })
					.limit(limit * 2), // Límite razonable por consulta
				
				// Obtener archivos solo para prescripciones encontradas (después de la primera query)
				Promise.resolve({ data: null, error: null })
			]);

			const { data: prescriptions, error: prescError } = prescriptionsResult;

			// Obtener archivos adjuntos si hay prescripciones
			let prescriptionFilesMap: Record<string, string[]> = {};
			if (prescriptions && prescriptions.length > 0) {
				const prescriptionIds = prescriptions.map((p: PrescriptionData) => p.id);
				const { data: prescriptionFiles } = await supabase
					.from('prescription_files')
					.select('prescription_id, url')
					.in('prescription_id', prescriptionIds)
					.limit(100); // Límite razonable

				if (prescriptionFiles) {
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
			if (!prescError && prescriptions) {
				prescriptions.forEach((presc: PrescriptionData) => {
					if (presc.consultation_id) {
						if (!prescriptionsMap[presc.consultation_id]) {
							prescriptionsMap[presc.consultation_id] = [];
						}
						prescriptionsMap[presc.consultation_id].push({
							...presc,
							attachments: prescriptionFilesMap[presc.id] || [],
						});
					}
				});
			}
		}

		// Obtener registros médicos y mapeo de consultas en paralelo
		const [medicalRecordsResult, consultationsWithRecordsResult] = await Promise.all([
			supabase
				.from('medicalrecord')
				.select(`
					id,
					patientId,
					authorId,
					content,
					attachments,
					createdAt
				`)
				.eq('patientId', patient.patientId)
				.order('createdAt', { ascending: false })
				.limit(limit), // Límite de registros médicos
			
			supabase
				.from('consultation')
				.select('id, medical_record_id')
				.eq('patient_id', patient.patientId)
				.not('medical_record_id', 'is', null)
				.limit(limit)
		]);

		const { data: medicalRecords, error: recordsError } = medicalRecordsResult;
		const { data: consultationsWithRecords } = consultationsWithRecordsResult;

		// Crear mapa de medical_record_id a consultation_id
		const recordToConsultationMap: Record<string, string> = {};
		(consultationsWithRecords || []).forEach((c: ConsultationWithRecord) => {
			if (c.medical_record_id) {
				recordToConsultationMap[c.medical_record_id] = c.id;
			}
		});

		// Obtener información de los autores (solo si hay registros)
		const authorIds = [...new Set((medicalRecords || []).map((r: MedicalRecordData) => r.authorId).filter((id): id is string => Boolean(id)))];
		const authorsMap: Record<string, AuthorData> = {};
		if (authorIds.length > 0) {
			const { data: authors } = await supabase
				.from('user')
				.select('id, name')
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

		const parsedConsultations: ParsedConsultation[] = (consultations || []).map((c: ConsultationWithRelations): ParsedConsultation => {
			const doctor = Array.isArray(c.doctor) ? c.doctor[0] : c.doctor;
			const appointment = Array.isArray(c.appointment) ? c.appointment[0] : c.appointment;
			return {
				id: c.id as string,
				patient_id: c.patient_id as string,
				doctor_id: c.doctor_id as string,
				appointment_id: (c.appointment_id as string) || null,
				started_at: (c.started_at as string) || null,
				ended_at: (c.ended_at as string) || null,
				chief_complaint: (c.chief_complaint as string) || null,
				diagnosis: (c.diagnosis as string) || null,
				notes: (c.notes as string) || null,
				vitals: safeParseJson(c.vitals),
				created_at: c.created_at as string,
				updated_at: (c.updated_at as string) || c.created_at as string,
				doctor: doctor ? { id: doctor.id, name: doctor.name } : null,
				appointment: appointment as { id: string; reason: string | null; scheduled_at: string | null } | null,
				prescriptions: prescriptionsMap[c.id as string] || [],
				attachments: consultationAttachmentsMap[c.id as string] || [],
			};
		});

		const parsedRecords: ParsedMedicalRecord[] = (medicalRecords || []).map((r: MedicalRecordData): ParsedMedicalRecord => ({
			...r,
			content: safeParseJson(r.content),
			author: r.authorId ? authorsMap[r.authorId] || null : null,
		}));

		return NextResponse.json({
			consultations: parsedConsultations,
			medicalRecords: parsedRecords,
		}, {
			headers: {
				'Cache-Control': 'private, max-age=60', // Cache por 60 segundos
			},
		});
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Patient Historial API] Error:', errorMessage);
		return NextResponse.json({ error: 'Error interno', detail: errorMessage }, { status: 500 });
	}
}

