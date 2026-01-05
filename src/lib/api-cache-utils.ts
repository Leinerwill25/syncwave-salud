/**
 * Utilidades de cache optimizadas para APIs
 * Diseñadas para tiempos de respuesta < 1 segundo
 */

/**
 * Tipos de datos según su frecuencia de cambio
 */
export type CacheType = 
	| 'static'        // Datos que raramente cambian (configuración, planos)
	| 'semi-static'   // Datos que cambian ocasionalmente (perfiles, servicios)
	| 'dynamic'       // Datos que cambian frecuentemente (citas, consultas)
	| 'realtime';     // Datos que cambian en tiempo real (notificaciones, mensajes)

/**
 * Configuración de cache por tipo de dato
 */
const CACHE_CONFIG: Record<CacheType, {
	sMaxAge: number;          // Tiempo en caché del CDN (segundos)
	staleWhileRevalidate: number; // Tiempo que puede servir datos stale mientras revalida (segundos)
	revalidate: number;       // Tiempo de revalidación en Next.js (segundos)
}> = {
	static: {
		sMaxAge: 3600,              // 1 hora
		staleWhileRevalidate: 86400, // 24 horas
		revalidate: 3600,           // 1 hora
	},
	'semi-static': {
		sMaxAge: 300,               // 5 minutos
		staleWhileRevalidate: 1800,  // 30 minutos
		revalidate: 300,            // 5 minutos
	},
	dynamic: {
		sMaxAge: 60,                // 1 minuto
		staleWhileRevalidate: 300,   // 5 minutos
		revalidate: 60,             // 1 minuto
	},
	realtime: {
		sMaxAge: 10,                // 10 segundos
		staleWhileRevalidate: 60,    // 1 minuto
		revalidate: 10,             // 10 segundos
	},
};

/**
 * Genera headers de Cache-Control optimizados
 */
export function getCacheHeaders(
	type: CacheType = 'dynamic',
	options?: {
		private?: boolean; // Si es true, solo cachea en el navegador, no en CDN
		noStore?: boolean; // Si es true, no cachea en absoluto
	}
): Record<string, string> {
	if (options?.noStore) {
		return {
			'Cache-Control': 'no-store, no-cache, must-revalidate',
		};
	}

	const config = CACHE_CONFIG[type];
	const cacheControl = options?.private
		? `private, max-age=${config.sMaxAge}, stale-while-revalidate=${config.staleWhileRevalidate}`
		: `public, s-maxage=${config.sMaxAge}, stale-while-revalidate=${config.staleWhileRevalidate}, max-age=${Math.floor(config.sMaxAge * 0.8)}`;

	return {
		'Cache-Control': cacheControl,
	};
}

/**
 * Configuración de revalidate para Next.js route handlers
 */
export function getRevalidateConfig(type: CacheType = 'dynamic'): {
	revalidate: number;
	dynamic: 'force-dynamic' | 'auto';
} {
	const config = CACHE_CONFIG[type];
	
	// Para datos estáticos, podemos usar 'auto' para mejor cache
	// Para datos dinámicos, mantenemos 'force-dynamic' por seguridad
	return {
		revalidate: config.revalidate,
		dynamic: type === 'static' ? 'auto' : 'force-dynamic',
	};
}

/**
 * Headers optimizados para respuestas JSON de APIs
 */
export function getApiResponseHeaders(
	type: CacheType = 'dynamic',
	options?: {
		private?: boolean;
		noStore?: boolean;
	}
): Record<string, string> {
	return {
		...getCacheHeaders(type, options),
		'Content-Type': 'application/json',
		'X-Content-Type-Options': 'nosniff',
	};
}

/**
 * Helper para crear NextResponse con cache optimizado
 * NOTA: Este helper requiere importación dinámica, preferir usar NextResponse.json directamente
 * con getApiResponseHeaders para mejor compatibilidad con TypeScript
 */
export function createCachedResponse<T>(
	data: T,
	type: CacheType = 'dynamic',
	status: number = 200,
	options?: {
		private?: boolean;
		noStore?: boolean;
	}
) {
	// Usar importación dinámica para evitar problemas de circular dependencies
	const { NextResponse } = require('next/server');
	return NextResponse.json(data, {
		status,
		headers: getApiResponseHeaders(type, options),
	});
}

