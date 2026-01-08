'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Hook para prefetching de datos antes de navegar a una ruta
 * Esto mejora la experiencia de usuario precargando datos críticos
 */
export function usePrefetchRoute(href: string, prefetchData?: () => Promise<void>) {
	const router = useRouter();
	const prefetchedRef = useRef(false);

	useEffect(() => {
		// Prefetch la ruta cuando el componente se monta
		if (href && !prefetchedRef.current) {
			router.prefetch(href);
			prefetchedRef.current = true;

			// Si hay una función de prefetch de datos, ejecutarla
			if (prefetchData) {
				// Ejecutar en el siguiente tick para no bloquear el render
				setTimeout(() => {
					prefetchData().catch((err) => {
						console.warn('Error prefetching data:', err);
					});
				}, 0);
			}
		}
	}, [href, router, prefetchData]);
}

/**
 * Hook para prefetching de datos de API antes de navegación
 */
export function usePrefetchApiData(apiPath: string, enabled = true) {
	const prefetchedRef = useRef(false);

	useEffect(() => {
		if (!enabled || prefetchedRef.current) return;

		// Prefetch de datos de API en background
		const controller = new AbortController();
		
		// Usar requestIdleCallback si está disponible
		const prefetch = () => {
			fetch(apiPath, {
				method: 'GET',
				credentials: 'include',
				signal: controller.signal,
				// Solo prefetch, no bloquear
				priority: 'low' as any,
			}).catch(() => {
				// Ignorar errores de prefetch
			});
		};

		if ('requestIdleCallback' in window) {
			requestIdleCallback(prefetch, { timeout: 2000 });
		} else {
			setTimeout(prefetch, 100);
		}

		prefetchedRef.current = true;

		return () => {
			controller.abort();
		};
	}, [apiPath, enabled]);
}

