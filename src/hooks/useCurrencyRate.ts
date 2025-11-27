/**
 * Hook para obtener y usar la tasa de cambio en componentes de React
 */

'use client';

import { useState, useEffect } from 'react';
import { getLatestRate, type Rate } from '@/lib/rates-client';

export interface CurrencyRateState {
	rate: Rate | null;
	loading: boolean;
	error: string | null;
	refresh: () => Promise<void>;
}

export function useCurrencyRate(code: string = 'USD'): CurrencyRateState {
	const [rate, setRate] = useState<Rate | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchRate = async () => {
		try {
			setLoading(true);
			setError(null);
			const latestRate = await getLatestRate(code);
			setRate(latestRate);
		} catch (err) {
			console.error('[useCurrencyRate] Error:', err);
			setError(err instanceof Error ? err.message : 'Error obteniendo tasa de cambio');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchRate();

		// Actualizar cada hora para mantener la tasa actualizada
		const interval = setInterval(fetchRate, 60 * 60 * 1000);

		return () => clearInterval(interval);
	}, [code]);

	return {
		rate,
		loading,
		error,
		refresh: fetchRate,
	};
}

/**
 * Hook para convertir montos usando la tasa actual
 */
export function useCurrencyConversion() {
	const { rate, loading } = useCurrencyRate('USD');

	const convertUSDToBs = (usdAmount: number): number => {
		if (!rate || loading) return 0;
		return usdAmount * Number(rate.rate);
	};

	const convertBsToUSD = (bsAmount: number): number => {
		if (!rate || loading) return 0;
		return bsAmount / Number(rate.rate);
	};

	return {
		rate: rate ? Number(rate.rate) : null,
		loading,
		convertUSDToBs,
		convertBsToUSD,
		rateDate: rate ? new Date(rate.rate_datetime) : null,
	};
}

