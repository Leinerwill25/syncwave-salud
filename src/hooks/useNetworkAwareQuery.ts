'use client';

import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useNetworkAware } from './useNetworkAware';

/**
 * Network-aware query hook
 * Adapts query behavior based on connection speed:
 * - Slow connections: longer stale time, no refetch on focus
 * - Fast connections: normal behavior
 */
export function useNetworkAwareQuery<TData = unknown, TError = Error>(
	queryKey: unknown[],
	queryFn: () => Promise<TData>,
	options: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> = {}
): UseQueryResult<TData, TError> {
	const networkInfo = useNetworkAware();

	// Adapt options based on network
	const baseStaleTime = typeof options.staleTime === 'number' ? options.staleTime : options.staleTime ? 30 * 1000 : 30 * 1000;
	const baseGcTime = typeof options.gcTime === 'number' ? options.gcTime : options.gcTime ? 5 * 60 * 1000 : 5 * 60 * 1000;

	const adaptedOptions = {
		...options,
		// Longer stale time on slow connections
		staleTime: networkInfo.isSlow ? baseStaleTime * 2 : baseStaleTime,
		// Don't refetch on window focus if slow connection
		refetchOnWindowFocus: networkInfo.isSlow ? false : options.refetchOnWindowFocus ?? false,
		// Don't refetch on reconnect if slow (we'll handle manually)
		refetchOnReconnect: networkInfo.isSlow ? false : options.refetchOnReconnect ?? false,
		// Longer cache time on slow connections
		gcTime: networkInfo.isSlow ? baseGcTime * 2 : baseGcTime,
	};

	return useQuery<TData, TError>({
		queryKey,
		queryFn,
		...adaptedOptions,
	});
}

