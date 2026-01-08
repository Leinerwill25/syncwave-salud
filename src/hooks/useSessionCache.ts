'use client';

/**
 * Hook para cachear la sesión del usuario y evitar llamadas redundantes a /api/auth/me
 */
const SESSION_CACHE_KEY = 'user_session_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

interface CachedSession {
	userId: string;
	organizationId: string;
	timestamp: number;
}

export function useSessionCache() {
	const getCachedSession = (): CachedSession | null => {
		if (typeof window === 'undefined') return null;
		
		try {
			const cached = localStorage.getItem(SESSION_CACHE_KEY);
			if (!cached) return null;
			
			const parsed: CachedSession = JSON.parse(cached);
			const now = Date.now();
			
			// Verificar si el caché es válido (menos de 5 minutos)
			if (now - parsed.timestamp < CACHE_DURATION) {
				return parsed;
			}
			
			// Caché expirado, limpiar
			localStorage.removeItem(SESSION_CACHE_KEY);
			return null;
		} catch {
			return null;
		}
	};

	const setCachedSession = (userId: string, organizationId: string) => {
		if (typeof window === 'undefined') return;
		
		try {
			const cache: CachedSession = {
				userId,
				organizationId,
				timestamp: Date.now(),
			};
			localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cache));
		} catch {
			// Ignorar errores de localStorage
		}
	};

	const clearCachedSession = () => {
		if (typeof window === 'undefined') return;
		localStorage.removeItem(SESSION_CACHE_KEY);
	};

	return { getCachedSession, setCachedSession, clearCachedSession };
}

