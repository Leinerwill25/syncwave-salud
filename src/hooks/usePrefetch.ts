'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

/**
 * Hook for prefetching critical data
 * Use for hover-based prefetching (e.g., patient data on hover)
 */
export function usePrefetch() {
	const queryClient = useQueryClient();

	const prefetch = useCallback(
		async <TData = unknown>(queryKey: unknown[], queryFn: () => Promise<TData>) => {
			// Prefetch only if data is not already in cache or is stale
			const queryData = queryClient.getQueryData<TData>(queryKey);
			if (!queryData) {
				await queryClient.prefetchQuery({
					queryKey,
					queryFn,
					staleTime: 30 * 1000, // 30 seconds
				});
			}
		},
		[queryClient]
	);

	return { prefetch };
}

/**
 * Prefetch patient data on hover
 */
export function usePrefetchPatient() {
	const { prefetch } = usePrefetch();

	const prefetchPatient = useCallback(
		(patientId: string) => {
			prefetch(
				['patient', patientId],
				async () => {
					const res = await fetch(`/api/patients/${patientId}`);
					if (!res.ok) throw new Error('Failed to fetch patient');
					return res.json();
				}
			);
		},
		[prefetch]
	);

	return { prefetchPatient };
}

/**
 * Prefetch consultation data
 */
export function usePrefetchConsultation() {
	const { prefetch } = usePrefetch();

	const prefetchConsultation = useCallback(
		(consultationId: string) => {
			prefetch(
				['consultation', consultationId],
				async () => {
					const res = await fetch(`/api/consultations/${consultationId}`);
					if (!res.ok) throw new Error('Failed to fetch consultation');
					return res.json();
				}
			);
		},
		[prefetch]
	);

	return { prefetchConsultation };
}

