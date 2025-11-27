/**
 * Cliente para consultar tasas de cambio desde la base de datos externa de Supabase
 */

import { createClient } from '@supabase/supabase-js';

const RATES_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_RATES;
const RATES_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_RATES;

if (!RATES_SUPABASE_URL || !RATES_SUPABASE_ANON_KEY) {
	console.warn('[Rates Client] Variables de entorno de tasas no configuradas');
}

// Cliente de Supabase para la base de datos de tasas
export const ratesSupabase = RATES_SUPABASE_URL && RATES_SUPABASE_ANON_KEY
	? createClient(RATES_SUPABASE_URL, RATES_SUPABASE_ANON_KEY)
	: null;

export interface Rate {
	id: string;
	code: string; // Ejemplo: 'USD'
	rate: number; // Tasa de cambio (ej: 36.5 Bs por 1 USD)
	curr_date: string; // Fecha de la tasa
	curr_time: string; // Hora de la tasa
	insert_datetime: string;
	rate_datetime: string;
	created_at: string;
}

/**
 * Obtiene la tasa de cambio más reciente para un código de moneda
 * @param code Código de la moneda (por defecto 'USD')
 * @returns Tasa de cambio más reciente o null si no se encuentra
 */
export async function getLatestRate(code: string = 'USD'): Promise<Rate | null> {
	if (!ratesSupabase) {
		console.error('[Rates Client] Cliente de tasas no inicializado');
		return null;
	}

	try {
		const { data, error } = await ratesSupabase
			.from('rates')
			.select('*')
			.eq('code', code.toUpperCase())
			.order('rate_datetime', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (error) {
			console.error('[Rates Client] Error obteniendo tasa:', error);
			return null;
		}

		return data as Rate | null;
	} catch (err) {
		console.error('[Rates Client] Excepción obteniendo tasa:', err);
		return null;
	}
}

/**
 * Obtiene todas las tasas de cambio disponibles
 * @returns Array de tasas de cambio
 */
export async function getAllRates(): Promise<Rate[]> {
	if (!ratesSupabase) {
		console.error('[Rates Client] Cliente de tasas no inicializado');
		return [];
	}

	try {
		const { data, error } = await ratesSupabase
			.from('rates')
			.select('*')
			.order('rate_datetime', { ascending: false });

		if (error) {
			console.error('[Rates Client] Error obteniendo tasas:', error);
			return [];
		}

		return (data || []) as Rate[];
	} catch (err) {
		console.error('[Rates Client] Excepción obteniendo tasas:', err);
		return [];
	}
}

/**
 * Convierte un monto de USD a Bolívares usando la tasa más reciente
 * @param usdAmount Monto en USD
 * @param rate Tasa de cambio (opcional, si no se proporciona se obtiene automáticamente)
 * @returns Monto en Bolívares
 */
export async function convertUSDToBs(usdAmount: number, rate?: number): Promise<number> {
	if (!rate) {
		const latestRate = await getLatestRate('USD');
		if (!latestRate) {
			console.warn('[Rates Client] No se pudo obtener tasa, usando 0');
			return 0;
		}
		rate = Number(latestRate.rate);
	}

	return usdAmount * rate;
}

/**
 * Convierte un monto de Bolívares a USD usando la tasa más reciente
 * @param bsAmount Monto en Bolívares
 * @param rate Tasa de cambio (opcional, si no se proporciona se obtiene automáticamente)
 * @returns Monto en USD
 */
export async function convertBsToUSD(bsAmount: number, rate?: number): Promise<number> {
	if (!rate) {
		const latestRate = await getLatestRate('USD');
		if (!latestRate) {
			console.warn('[Rates Client] No se pudo obtener tasa, usando 0');
			return 0;
		}
		rate = Number(latestRate.rate);
	}

	return bsAmount / rate;
}

