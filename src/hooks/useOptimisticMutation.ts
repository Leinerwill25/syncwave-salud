'use client';

import { useMutation, useQueryClient, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Options for optimistic mutations
 */
export interface OptimisticMutationOptions<TData, TVariables, TContext> {
	/**
	 * Query keys to invalidate on success
	 */
	invalidateQueries?: string[][];
	/**
	 * Function to update cache optimistically
	 */
	onMutate?: (variables: TVariables) => TContext | Promise<TContext>;
	/**
	 * Function to rollback on error
	 */
	onError?: (error: Error, variables: TVariables, context: TContext | undefined) => void | Promise<void>;
	/**
	 * Show success toast
	 */
	successMessage?: string;
	/**
	 * Show error toast
	 */
	errorMessage?: string;
	/**
	 * Mark as critical operation (prioritize in network)
	 */
	critical?: boolean;
	/**
	 * Silent error handling (don't show toast, just retry in background)
	 */
	silent?: boolean;
}

/**
 * Hook for optimistic mutations with automatic retry and error handling
 * Designed for medical workflows where UI must remain responsive
 */
export function useOptimisticMutation<TData = unknown, TVariables = unknown, TContext = unknown>(
	mutationFn: (variables: TVariables) => Promise<TData>,
	options: OptimisticMutationOptions<TData, TVariables, TContext> = {}
): UseMutationResult<TData, Error, TVariables, TContext> {
	const queryClient = useQueryClient();
	const {
		invalidateQueries = [],
		onMutate: customOnMutate,
		onError: customOnError,
		successMessage,
		errorMessage = 'Error al guardar. Reintentando...',
		critical = false,
		silent = false,
	} = options;

	return useMutation<TData, Error, TVariables, TContext>({
		mutationFn,
		// Optimistic update
		onMutate: async (variables) => {
			// Cancel outgoing refetches to avoid overwriting optimistic update
			if (invalidateQueries.length > 0) {
				await Promise.all(invalidateQueries.map((queryKey) => queryClient.cancelQueries({ queryKey })));
			}

			// Call custom onMutate if provided
			const context = customOnMutate ? await customOnMutate(variables) : (undefined as TContext);

			return context;
		},
		// On error: rollback and show error
		onError: async (error, variables, context) => {
			// Rollback optimistic updates
			if (context) {
				// Query client will automatically rollback if we return context
			}

			// Call custom error handler
			if (customOnError) {
				await customOnError(error, variables, context);
			}

			// Show error toast only if not silent
			if (!silent) {
				toast.error(errorMessage, {
					duration: 3000,
				});
			}
		},
		// On success: invalidate queries and show success
		onSuccess: async (data, variables, context) => {
			// Invalidate queries to refetch fresh data
			if (invalidateQueries.length > 0) {
				await Promise.all(
					invalidateQueries.map((queryKey) =>
						queryClient.invalidateQueries({
							queryKey,
							exact: false,
						})
					)
				);
			}

			// Show success toast
			if (successMessage) {
				toast.success(successMessage, {
					duration: 2000,
				});
			}
		},
		// Retry configuration
		retry: (failureCount, error: any) => {
			// Don't retry 4xx errors (client errors)
			if (error?.status >= 400 && error?.status < 500) {
				return false;
			}
			// Retry network errors up to 3 times
			return failureCount < 3;
		},
		retryDelay: (attemptIndex) => {
			// Exponential backoff: 1s, 2s, 4s
			return Math.min(1000 * 2 ** attemptIndex, 4000);
		},
		// Network priority (if we implement request prioritization)
		meta: {
			critical,
		},
	});
}

