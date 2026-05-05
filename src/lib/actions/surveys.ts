'use server';

import { createSupabaseServerClient } from '@/app/adapters/server';
import { awardPoints } from '@/lib/actions/points';

export async function getPendingSurvey() {
	const supabase = await createSupabaseServerClient();
	const { data: userData, error: userError } = await supabase.auth.getUser();

	if (userError || !userData?.user) {
		return { error: 'No autorizado' };
	}

	// Get recent uncompleted and non-dismissed survey responses for the patient
	const { data, error } = await supabase
		.from('consultation_survey_responses')
		.select(`
			*,
			consultation!inner (
				started_at,
				chief_complaint,
				doctor:doctor_id ( name )
			),
			survey:survey_id (
				id,
				questions
			)
		`)
		.eq('patient_id', userData.user.id)
		.eq('dismissed', false)
		.is('completed_at', null)
		.gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
		.order('created_at', { ascending: false });

	if (error) {
		console.error('[getPendingSurvey] Error:', error);
		return { error: 'Error al obtener encuestas pendientes.' };
	}

	return { data: data && data.length > 0 ? data[0] : null, count: data?.length || 0 };
}

export async function dismissSurvey(responseId: string) {
	const supabase = await createSupabaseServerClient();
	const { data: userData, error: userError } = await supabase.auth.getUser();

	if (userError || !userData?.user) {
		return { error: 'No autorizado' };
	}

	const { error } = await supabase
		.from('consultation_survey_responses')
		.update({ dismissed: true })
		.eq('id', responseId)
		.eq('patient_id', userData.user.id);

	if (error) {
		console.error('[dismissSurvey] Error:', error);
		return { error: 'Error al descartar la encuesta.' };
	}

	return { success: true };
}

export async function submitSurveyResponse(responseId: string, answers: Record<string, any>) {
	const supabase = await createSupabaseServerClient();
	const { data: userData, error: userError } = await supabase.auth.getUser();

	if (userError || !userData?.user) {
		return { error: 'No autorizado' };
	}

	const { data, error } = await supabase
		.from('consultation_survey_responses')
		.update({
			answers,
			completed_at: new Date().toISOString()
		})
		.eq('id', responseId)
		.eq('patient_id', userData.user.id)
		.select()
		.single();

	if (error) {
		console.error('[submitSurveyResponse] Error:', error);
		return { error: 'Error al enviar la encuesta.' };
	}

	// Ashira Salud+: Award points
	try {
		await awardPoints(userData.user.id, 'survey_completed', data.id, 'consultation_survey_responses');
	} catch (pointsError) {
		console.error('[Points] Failed to award:', pointsError);
	}

	return { data };
}
