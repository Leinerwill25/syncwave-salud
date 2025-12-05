// lib/patient-auth.ts
// Utilidades para autenticación y autorización de pacientes

import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';

async function tryRestoreSessionFromCookies(supabase: any, cookieStore: any): Promise<boolean> {
	if (!cookieStore) return false;

	const cookieCandidates = ['sb-session', 'sb:token', 'supabase-auth-token', 'sb-access-token', 'sb-refresh-token'];

	for (const name of cookieCandidates) {
		try {
			const c = typeof cookieStore.get === 'function' ? cookieStore.get(name) : undefined;
			const raw = c?.value ?? null;
			if (!raw) continue;

			let parsed: Record<string, unknown> | null = null;
			try {
				parsed = JSON.parse(raw) as Record<string, unknown>;
			} catch {
				parsed = null;
			}

			let access_token: string | null = null;
			let refresh_token: string | null = null;

			if (parsed) {
				// Función helper para obtener valores anidados
				const getNestedValue = (obj: Record<string, unknown>, ...paths: string[]): unknown => {
					for (const path of paths) {
						const keys = path.split('.');
						let current: unknown = obj;
						for (const key of keys) {
							if (current && typeof current === 'object' && key in current) {
								current = (current as Record<string, unknown>)[key];
							} else {
								return null;
							}
						}
						if (current) return current;
					}
					return null;
				};

				if (name === 'sb-session') {
					access_token = (getNestedValue(parsed, 'access_token', 'session.access_token', 'currentSession.access_token') as string | null) ?? null;
					refresh_token = (getNestedValue(parsed, 'refresh_token', 'session.refresh_token', 'currentSession.refresh_token') as string | null) ?? null;
					if (!access_token && parsed.user) {
						access_token = (parsed.access_token as string | null) ?? null;
						refresh_token = (parsed.refresh_token as string | null) ?? null;
					}
				} else {
					access_token = (getNestedValue(parsed, 'access_token', 'currentSession.access_token', 'current_session.access_token') as string | null) ?? null;
					refresh_token = (getNestedValue(parsed, 'refresh_token', 'currentSession.refresh_token', 'current_session.refresh_token') as string | null) ?? null;
					if (!access_token && parsed.currentSession && typeof parsed.currentSession === 'object') {
						const currentSession = parsed.currentSession as Record<string, unknown>;
						access_token = (currentSession.access_token as string | null) ?? null;
						refresh_token = (currentSession.refresh_token as string | null) ?? null;
					}
				}
			} else {
				if (name === 'sb-access-token') {
					access_token = raw;
				} else if (name === 'sb-refresh-token') {
					refresh_token = raw;
				}
			}

			if (!access_token && !refresh_token) continue;

			// Solo intentar setSession si tenemos al menos access_token
			if (access_token) {
				const payload: { access_token: string; refresh_token: string } = {
					access_token,
					refresh_token: refresh_token || '',
				};

				const { data, error } = await supabase.auth.setSession(payload);
				if (error) {
					// Si falla y tenemos refresh_token, intentar refresh
					if (refresh_token) {
						try {
							const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({ refresh_token });
							if (!refreshError && refreshData?.session) {
								return true;
							}
						} catch {
							// ignore
						}
					}
					continue;
				}

				if (data?.session) return true;

				const { data: sessionAfter } = await supabase.auth.getSession();
				if (sessionAfter?.session) return true;
			} else if (refresh_token) {
				// Si solo tenemos refresh_token, intentar refresh
				try {
					const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({ refresh_token });
					if (!refreshError && refreshData?.session) {
						return true;
					}
				} catch {
					// ignore
				}
			}
		} catch {
			continue;
		}
	}

	return false;
}

/**
 * Obtiene el paciente autenticado desde la sesión
 * Retorna null si no está autenticado o no es un paciente
 */
export async function getAuthenticatedPatient(): Promise<{
	patientId: string;
	userId: string;
	patient: any;
} | null> {
	try {
		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		let accessTokenFromCookie: string | null = null;
		try {
			const sbAccessToken = cookieStore.get('sb-access-token');
			if (sbAccessToken?.value) {
				accessTokenFromCookie = sbAccessToken.value;
			}
		} catch (err) {
			console.debug('[Patient Auth] Error leyendo sb-access-token:', err);
		}

		let {
			data: { user },
			error: authError,
		} = accessTokenFromCookie 
			? await supabase.auth.getUser(accessTokenFromCookie)
			: await supabase.auth.getUser();

		if (authError) {
			console.error('[Patient Auth] Auth error:', authError);
		}

		if (!user) {
			const restored = await tryRestoreSessionFromCookies(supabase, cookieStore);
			if (restored) {
				const after = await supabase.auth.getUser();
				user = after.data?.user ?? null;
			}
		}

		if (!user) {
			return null;
		}

		// Obtener usuario de la app
		const { data: appUser, error: userError } = await supabase
			.from('User')
			.select('id, role, patientProfileId')
			.eq('authId', user.id)
			.maybeSingle();

		if (userError || !appUser) {
			console.error('[Patient Auth] Error obteniendo usuario:', userError);
			return null;
		}

		// Verificar que sea paciente
		if (appUser.role !== 'PACIENTE') {
			return null;
		}

		// Obtener datos del paciente
		if (!appUser.patientProfileId) {
			return null;
		}

		const { data: patient, error: patientError } = await supabase
			.from('Patient')
			.select('*')
			.eq('id', appUser.patientProfileId)
			.maybeSingle();

		if (patientError || !patient) {
			console.error('[Patient Auth] Error obteniendo paciente:', patientError);
			return null;
		}

		return {
			patientId: patient.id,
			userId: appUser.id,
			patient,
		};
	} catch (err: any) {
		console.error('[Patient Auth] Error:', err);
		return null;
	}
}

/**
 * Verifica si el paciente tiene plan familiar activo
 */
export async function hasFamilyPlan(patientId: string): Promise<boolean> {
	try {
		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const { data: subscription, error } = await supabase
			.from('Subscription')
			.select('planSnapshot, status')
			.eq('patientId', patientId)
			.eq('status', 'ACTIVE')
			.maybeSingle();

		if (error || !subscription) {
			return false;
		}

		// Verificar si el planSnapshot incluye "family"
		const planSnapshot = typeof subscription.planSnapshot === 'string' 
			? JSON.parse(subscription.planSnapshot) 
			: subscription.planSnapshot;

		return planSnapshot?.features?.includes?.('family') || 
		       planSnapshot?.family === true ||
		       planSnapshot?.type === 'family';
	} catch (err) {
		console.error('[Patient Auth] Error verificando plan familiar:', err);
		return false;
	}
}

