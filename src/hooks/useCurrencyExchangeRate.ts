/**
 * Hook para obtener la tasa de cambio de una moneda específica
 * Útil para componentes que necesitan la tasa de cambio en tiempo real
 */

'use client';

import { useState, useEffect } from 'react';
import { getLatestRate } from '@/lib/rates-client';

export function useCurrencyExchangeRate(currencyCode: string | null) {
	const [rate, setRate] = useState<number | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!currencyCode || currencyCode === 'BS' || currencyCode === 'VES') {
			setRate(null);
			setLoading(false);
			return;
		}

		const fetchRate = async () => {
			try {
				setLoading(true);
				setError(null);
				const latestRate = await getLatestRate(currencyCode);
				if (latestRate) {
					setRate(Number(latestRate.rate));
				} else {
					setError(`No se encontró tasa para ${currencyCode}`);
				}
			} catch (err) {
				console.error('[useCurrencyExchangeRate] Error:', err);
				setError(err instanceof Error ? err.message : 'Error obteniendo tasa de cambio');
			} finally {
				setLoading(false);
			}
		};

		fetchRate();
	}, [currencyCode]);

	return { rate, loading, error };
}

