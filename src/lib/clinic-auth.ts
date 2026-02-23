import { getCurrentOrganizationId as getOrgFromOldAuth } from './auth'; // Respaldo opcional si se requiere
import { getAuthenticatedUser } from './auth-guards';

const TEST_ORG_ID = process.env.TEST_ORG_ID ?? null;

/**
 * Obtiene el ID de la organización para el usuario actual.
 * Utiliza los guards de autenticación unificados para máxima robustez.
 */
export async function getCurrentOrganizationId(): Promise<string | null> {
	// Prioridad 1: Entorno de prueba
	if (TEST_ORG_ID) return TEST_ORG_ID;

	try {
		// Prioridad 2: Guard de autenticación robusto (maneja cookies dinámicas y restauración de sesión)
		const user = await getAuthenticatedUser();
		if (user?.organizationId) {
			return user.organizationId;
		}

		// Prioridad 3: Respaldo en la implementación de auth.ts
		const fallbackId = await getOrgFromOldAuth();
		return fallbackId;
	} catch (err) {
		console.error('[Clinic Auth] Error al obtener organizationId:', err);
		return null;
	}
}

// Nota: Se han eliminado las funciones auxiliares obsoletas (getAccessTokenFromRequest, decodeJwtSub, etc.)
// ya que esta lógica ahora es manejada centralizadamente por auth-guards.ts
