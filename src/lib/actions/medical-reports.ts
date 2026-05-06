'use server';

import { createSupabaseServerClient } from '@/app/adapters/server';
import { PatientMedicalReportInsert, PatientMedicalReportUpdate } from '@/types/medical-reports';
import { awardPoints } from '@/lib/actions/points';

export async function getMedicalReports() {
	const supabase = await createSupabaseServerClient();
	const { data: userData, error: userError } = await supabase.auth.getUser();

	if (userError || !userData?.user) {
		return { error: 'No autorizado' };
	}

	const { data, error } = await supabase
		.from('patient_medical_reports')
		.select(`
			*,
			consultation (
				started_at,
				doctor:doctor_id ( name )
			)
		`)
		.eq('patient_id', userData.user.id)
		.order('created_at', { ascending: false });

	if (error) {
		console.error('[getMedicalReports] Error:', error);
		return { error: 'Error al obtener los informes médicos.' };
	}

	return { data };
}

export async function createMedicalReport(payload: Omit<PatientMedicalReportInsert, 'patient_id'>) {
	const supabase = await createSupabaseServerClient();
	const { data: userData, error: userError } = await supabase.auth.getUser();

	if (userError || !userData?.user) {
		return { error: 'No autorizado' };
	}

	const { data, error } = await supabase
		.from('patient_medical_reports')
		.insert({
			...payload,
			patient_id: userData.user.id,
			uploaded_by: userData.user.id
		})
		.select()
		.single();

	if (error) {
		console.error('[createMedicalReport] Error:', error);
		return { error: 'Error al crear el informe médico.' };
	}

	// Ashira Salud+: Award points
	try {
		const eventKey = data.report_type === 'laboratorio' ? 'lab_result_uploaded' : 'medical_report_uploaded';
		await awardPoints(userData.user.id, eventKey, data.id, 'patient_medical_reports');
	} catch (pointsError) {
		console.error('[Points] Failed to award:', pointsError);
	}

	return { data };
}

export async function updateMedicalReport(id: string, payload: PatientMedicalReportUpdate) {
	const supabase = await createSupabaseServerClient();
	const { data: userData, error: userError } = await supabase.auth.getUser();

	if (userError || !userData?.user) {
		return { error: 'No autorizado' };
	}

	const { data, error } = await supabase
		.from('patient_medical_reports')
		.update(payload)
		.eq('id', id)
		.eq('patient_id', userData.user.id)
		.select()
		.single();

	if (error) {
		console.error('[updateMedicalReport] Error:', error);
		return { error: 'Error al actualizar el informe médico.' };
	}

	return { data };
}

export async function deleteMedicalReport(id: string, fileUrl: string) {
	const supabase = await createSupabaseServerClient();
	const { data: userData, error: userError } = await supabase.auth.getUser();

	if (userError || !userData?.user) {
		return { error: 'No autorizado' };
	}

	// Extraer el path relativo del bucket desde el file_url
	// Asumiendo que el url es un public url o signed url que contiene "medical-reports/path..."
	let filePath = '';
	try {
		const parts = fileUrl.split('medical-reports/');
		if (parts.length > 1) {
			filePath = parts[1].split('?')[0]; // Remove query params if any
		}
	} catch (e) {
		console.warn('No se pudo parsear filePath desde URL:', fileUrl);
	}

	// Delete from storage
	if (filePath) {
		const { error: storageError } = await supabase.storage
			.from('medical-reports')
			.remove([filePath]);
			
		if (storageError) {
			console.error('[deleteMedicalReport] Storage Error:', storageError);
		}
	}

	// Delete from db
	const { error } = await supabase
		.from('patient_medical_reports')
		.delete()
		.eq('id', id)
		.eq('patient_id', userData.user.id);

	if (error) {
		console.error('[deleteMedicalReport] DB Error:', error);
		return { error: 'Error al eliminar el informe.' };
	}

	return { success: true };
}

export async function getMedicalReportSignedUrl(filePath: string) {
	const supabase = await createSupabaseServerClient();
	
	const { data, error } = await supabase.storage
		.from('medical-reports')
		.createSignedUrl(filePath, 3600); // 1 hour

	if (error) {
		console.error('[getMedicalReportSignedUrl] Error:', error);
		return { error: 'Error al obtener URL del archivo.' };
	}

	return { signedUrl: data.signedUrl };
}
