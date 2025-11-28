// app/share/consultation/[token]/page.tsx
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import ConsultationShareView from '@/components/share/ConsultationShareView';

type Props = {
	params: Promise<{ token: string }>;
};

export default async function ConsultationSharePage({ params }: Props) {
	const { token } = await params;

	const cookieStore = await cookies();
	const { supabase } = createSupabaseServerClient(cookieStore);

	// Obtener el enlace compartido
	const { data: shareLink, error: linkError } = await supabase
		.from('consultation_share_link')
		.select('id, consultation_id, patient_id, expires_at, is_active, access_count')
		.eq('token', token)
		.eq('is_active', true)
		.single();

	if (linkError || !shareLink) {
		notFound();
	}

	// Verificar si el enlace ha expirado
	if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
		notFound();
	}

	// Actualizar contador de accesos
	await supabase
		.from('consultation_share_link')
		.update({
			access_count: (shareLink.access_count || 0) + 1,
			last_accessed_at: new Date().toISOString(),
		})
		.eq('id', shareLink.id);

	// Obtener datos completos de la consulta
	const { data: consultation, error: consultationError } = await supabase
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
			medical_record_id,
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
		.eq('id', shareLink.consultation_id)
		.single();

	if (consultationError || !consultation) {
		notFound();
	}

	// Obtener datos del paciente
	const { data: patient, error: patientError } = await supabase
		.from('Patient')
		.select('*')
		.eq('id', shareLink.patient_id)
		.single();

	if (patientError || !patient) {
		notFound();
	}

	// Verificar si hay información médica adicional en unregisteredpatients
	// (por si el paciente fue registrado como no registrado primero)
	let additionalMedicalInfo: any = null;
	const { data: unregisteredPatient } = await supabase
		.from('unregisteredpatients')
		.select('allergies, chronic_conditions, current_medication, family_history')
		.eq('identification', patient.identifier)
		.maybeSingle();

	if (unregisteredPatient) {
		additionalMedicalInfo = {
			allergies: unregisteredPatient.allergies,
			chronicConditions: unregisteredPatient.chronic_conditions,
			currentMedications: unregisteredPatient.current_medication,
			familyHistory: unregisteredPatient.family_history,
		};
	}

	// Obtener prescripciones de la consulta
	const { data: prescriptions } = await supabase
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
				form,
				frequency,
				duration,
				quantity,
				instructions
			)
		`)
		.eq('consultation_id', shareLink.consultation_id);

	// Obtener órdenes médicas relacionadas
	const { data: orders } = await supabase
		.from('lab_result')
		.select(`
			id,
			patient_id,
			consultation_id,
			result_type,
			status,
			result,
			is_critical,
			created_at
		`)
		.eq('consultation_id', shareLink.consultation_id)
		.eq('patient_id', shareLink.patient_id);

	// Obtener archivos adjuntos de la consulta desde MedicalRecord
	let consultationAttachments: string[] = [];
	if (consultation.medical_record_id) {
		const { data: medicalRecord } = await supabase
			.from('MedicalRecord')
			.select('attachments')
			.eq('id', consultation.medical_record_id)
			.single();
		
		if (medicalRecord && medicalRecord.attachments) {
			consultationAttachments = Array.isArray(medicalRecord.attachments) 
				? medicalRecord.attachments 
				: [];
		}
	}

	// Obtener archivos de prescripciones
	const prescriptionIds = (prescriptions || []).map((p: any) => p.id);
	let prescriptionFiles: any[] = [];
	if (prescriptionIds.length > 0) {
		// Buscar en prescription_files si existe
		const { data: files } = await supabase
			.from('prescription_files')
			.select('prescription_id, url, file_name')
			.in('prescription_id', prescriptionIds);
		prescriptionFiles = files || [];
	}

	return (
		<ConsultationShareView
			consultation={{
				...consultation,
				attachments: consultationAttachments,
			}}
			patient={{
				...patient,
				...additionalMedicalInfo,
			}}
			prescriptions={prescriptions || []}
			orders={orders || []}
			prescriptionFiles={prescriptionFiles}
		/>
	);
}

