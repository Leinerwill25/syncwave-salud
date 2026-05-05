import { createSupabaseServerClient } from '@/app/adapters/server';
import { RewardType } from '@/types/points';

/**
 * Verifica si el paciente tiene activa una recompensa específica.
 * @param patientId ID del paciente (tabla auth.users / patient)
 * @param rewardType El código único de la recompensa a verificar
 * @returns true si está activa, false en caso contrario
 */
export async function checkPatientReward(patientId: string, rewardType: RewardType): Promise<boolean> {
	try {
		const supabase = await createSupabaseServerClient();
		
		const { data, error } = await supabase
			.from('patient_reward_redemptions')
			.select('id, points_rewards_catalog!inner(reward_type)')
			.eq('patient_id', patientId)
			.eq('status', 'active')
			.eq('points_rewards_catalog.reward_type', rewardType)
			.limit(1);

		if (error || !data || data.length === 0) {
			return false;
		}

		return true;
	} catch (err) {
		console.error(`Error checking reward ${rewardType} for patient ${patientId}:`, err);
		return false;
	}
}

/**
 * Wrapper específico para Recordatorios Extendidos.
 * (Usado por CRON jobs o la UI de citas para mandar notificaciones extra).
 */
export async function hasExtendedReminders(patientId: string): Promise<boolean> {
	return checkPatientReward(patientId, 'extended_reminders');
}

/**
 * Wrapper específico para Prioridad en Lista de Espera.
 * (Usado por sistemas de agendamiento para saltar colas).
 */
export async function hasWaitlistPriority(patientId: string): Promise<boolean> {
	return checkPatientReward(patientId, 'priority_waitlist');
}

/**
 * Wrapper específico para Dashboard Familiar.
 */
export async function hasFamilyDashboard(patientId: string): Promise<boolean> {
	return checkPatientReward(patientId, 'family_dashboard');
}
