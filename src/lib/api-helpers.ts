/**
 * API helper utilities for optimized requests
 * Focus on minimal payloads and efficient communication
 */

/**
 * Create a minimal PATCH payload containing only changed fields
 * Removes null/undefined values and compares with original data
 */
export function createMinimalPatch<T extends Record<string, any>>(
	original: T,
	updated: Partial<T>
): Partial<T> {
	const patch: Partial<T> = {};

	for (const key in updated) {
		if (updated.hasOwnProperty(key)) {
			const newValue = updated[key];
			const oldValue = original[key];

			// Only include if value changed and is not null/undefined
			if (newValue !== oldValue && newValue !== null && newValue !== undefined) {
				// Deep comparison for objects
				if (typeof newValue === 'object' && typeof oldValue === 'object') {
					if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
						patch[key] = newValue;
					}
				} else {
					patch[key] = newValue;
				}
			}
		}
	}

	return patch;
}

/**
 * Mark request as critical (for network prioritization)
 */
export function markCritical(headers: HeadersInit = {}): HeadersInit {
	return {
		...headers,
		'X-Priority': 'critical',
	};
}

/**
 * Mark request as non-critical (background operations)
 */
export function markNonCritical(headers: HeadersInit = {}): HeadersInit {
	return {
		...headers,
		'X-Priority': 'low',
	};
}

/**
 * Create fetch options with proper headers for medical app
 */
export function createFetchOptions(options: RequestInit = {}): RequestInit {
	return {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...options.headers,
		},
		credentials: 'include',
	};
}

/**
 * Batch multiple operations into a single request
 */
export async function batchOperations(operations: Array<{ type: string; method: string; endpoint: string; data: any }>) {
	const res = await fetch('/api/batch', {
		method: 'POST',
		...createFetchOptions({
			headers: markCritical(),
			body: JSON.stringify({ operations }),
		}),
	});

	if (!res.ok) {
		const error = await res.json();
		throw new Error(error.error || 'Batch operation failed');
	}

	return res.json();
}

