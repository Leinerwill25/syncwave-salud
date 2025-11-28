/**
 * Utilidades para conversión de moneda
 * Obtiene la tasa de cambio correcta según la moneda desde la base de datos rates
 */

import { getLatestRate } from './rates-client';

/**
 * Obtiene la tasa de cambio para una moneda específica
 * @param currencyCode Código de la moneda (USD, EUR, etc.)
 * @returns La tasa de cambio (cuántos Bs por 1 unidad de la moneda) o null si no se encuentra
 */
export async function getCurrencyRate(currencyCode: string): Promise<number | null> {
	try {
		if (!currencyCode || currencyCode === 'BS' || currencyCode === 'VES') {
			return null; // No hay tasa para Bolívares
		}

		const rate = await getLatestRate(currencyCode.toUpperCase());
		if (!rate) {
			console.warn(`[Currency Utils] No se encontró tasa para ${currencyCode}`);
			return null;
		}

		return Number(rate.rate);
	} catch (error) {
		console.error(`[Currency Utils] Error obteniendo tasa para ${currencyCode}:`, error);
		return null;
	}
}

/**
 * Convierte un monto de una moneda a Bolívares
 * @param amount Monto a convertir
 * @param currencyCode Código de la moneda original (USD, EUR, etc.)
 * @returns Monto en Bolívares o null si no se puede convertir
 */
export async function convertToBolivares(amount: number, currencyCode: string): Promise<number | null> {
	try {
		if (!currencyCode || currencyCode === 'BS' || currencyCode === 'VES') {
			return amount; // Ya está en Bolívares
		}

		const rate = await getCurrencyRate(currencyCode);
		if (!rate) {
			return null;
		}

		return amount * rate;
	} catch (error) {
		console.error(`[Currency Utils] Error convirtiendo ${amount} ${currencyCode} a Bs:`, error);
		return null;
	}
}

/**
 * Obtiene la tasa de cambio y la convierte a número
 * Usado en APIs del servidor
 */
export async function getExchangeRateForCurrency(currencyCode: string): Promise<number> {
	const rate = await getCurrencyRate(currencyCode || 'USD');
	return rate || 1; // Fallback a 1 si no se encuentra la tasa
}

