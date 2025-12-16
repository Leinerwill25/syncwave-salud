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
				// Stale time: data is considered fresh for 30 seconds
				staleTime: 30 * 1000,
				// Cache time: keep unused data for 5 minutes
				gcTime: 5 * 60 * 1000,
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
				// Refetch on window focus only if data is stale
				refetchOnWindowFocus: false,
				// Don't refetch on reconnect automatically (we'll handle it manually)
				refetchOnReconnect: false,
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

