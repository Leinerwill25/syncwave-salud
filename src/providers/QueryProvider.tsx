'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

/**
 * QueryClient configuration optimized for slow/unstable connections
 * - Longer stale times for better caching
 * - Intelligent retry with exponential backoff
 * - Network-aware behavior
 */
function makeQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				// OPTIMIZACIÓN: Stale time aumentado para reducir requests
				// Los datos se consideran frescos por más tiempo, aprovechando el cache del servidor
				staleTime: 60 * 1000, // 1 minuto (aumentado de 30 segundos)
				// OPTIMIZACIÓN: Cache time aumentado para mantener datos más tiempo
				gcTime: 10 * 60 * 1000, // 10 minutos (aumentado de 5 minutos)
				// Retry configuration
				retry: (failureCount, error: any) => {
					// Only retry network errors, not 4xx errors
					if (error?.status >= 400 && error?.status < 500) {
						return false;
					}
					// Max 3 retries
					return failureCount < 3;
				},
				retryDelay: (attemptIndex) => {
					// Exponential backoff: 1s, 2s, 4s
					return Math.min(1000 * 2 ** attemptIndex, 4000);
				},
				// OPTIMIZACIÓN: Desactivar refetch automático para reducir carga
				refetchOnWindowFocus: false,
				refetchOnReconnect: false,
				// OPTIMIZACIÓN: Desactivar refetch en mount si los datos están frescos
				refetchOnMount: true, // Mantener true para primera carga, pero staleTime evita refetches innecesarios
			},
			mutations: {
				// Retry mutations only for network errors
				retry: (failureCount, error: any) => {
					if (error?.status >= 400 && error?.status < 500) {
						return false;
					}
					return failureCount < 2; // Max 2 retries for mutations
				},
				retryDelay: (attemptIndex) => {
					return Math.min(1000 * 2 ** attemptIndex, 3000);
				},
			},
		},
	});
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
	if (typeof window === 'undefined') {
		// Server: always make a new query client
		return makeQueryClient();
	} else {
		// Browser: use singleton pattern to keep the same query client
		if (!browserQueryClient) browserQueryClient = makeQueryClient();
		return browserQueryClient;
	}
}

export default function QueryProvider({ children }: { children: ReactNode }) {
	const queryClient = getQueryClient();

	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

