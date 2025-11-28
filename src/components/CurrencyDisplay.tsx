/**
 * Componente para mostrar montos en USD y Bolívares
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useCurrencyConversion } from '@/hooks/useCurrencyRate';
import { useCurrencyPreference } from '@/hooks/useCurrencyPreference';
import { useCurrencyRate } from '@/hooks/useCurrencyRate';
import { Loader2 } from 'lucide-react';

interface CurrencyDisplayProps {
	amount: number;
	currency?: 'USD' | 'EUR' | 'BS' | string;
	showBoth?: boolean; // Si true, muestra ambas monedas
	primaryCurrency?: 'USD' | 'BS' | string; // Moneda principal a mostrar (si no se especifica, usa la preferencia del usuario)
	className?: string;
	size?: 'sm' | 'md' | 'lg';
}

export default function CurrencyDisplay({
	amount,
	currency = 'USD',
	showBoth = true,
	primaryCurrency,
	className = '',
	size = 'md',
}: CurrencyDisplayProps) {
	const { preference: userPreference, loading: loadingPreference } = useCurrencyPreference();
	
	// Usar la preferencia del usuario si no se especifica primaryCurrency
	const effectivePrimaryCurrency = primaryCurrency || (userPreference || 'USD');
	
	// Obtener la tasa de la moneda ORIGINAL (la que viene en el prop currency)
	// Esto es importante para calcular correctamente a Bs usando la tasa correcta
	const currencyToFetch = currency && currency !== 'BS' && currency !== 'VES' ? currency : 'USD';
	const { rate: originalCurrencyRate, loading: loadingOriginalRate } = useCurrencyRate(currencyToFetch);
	
	// Obtener la tasa de la moneda preferida (para mostrar en la preferencia del usuario)
	const { rate: preferredRate, loading: loadingPreferredRate } = useCurrencyRate(
		effectivePrimaryCurrency !== 'BS' && effectivePrimaryCurrency !== 'VES' 
			? effectivePrimaryCurrency 
			: 'USD'
	);
	
	// También obtener USD para conversiones de referencia
	const { rate: usdRate, loading: loadingUsdRate, convertUSDToBs, rateDate: usdRateDate } = useCurrencyConversion();
	
	// Usar la tasa de la moneda original para conversiones a Bs
	const rateForConversion = originalCurrencyRate ? Number(originalCurrencyRate.rate) : (usdRate || 0);
	const rateDateForConversion = originalCurrencyRate ? new Date(originalCurrencyRate.rate_datetime) : usdRateDate;
	
	// Usar la tasa preferida para mostrar
	const rate = preferredRate ? Number(preferredRate.rate) : usdRate;
	const rateDate = preferredRate ? new Date(preferredRate.rate_datetime) : usdRateDate;
	const loading = loadingUsdRate || loadingPreferredRate || loadingOriginalRate || loadingPreference;

	// Determinar si la moneda es USD, EUR u otra
	const isUSD = currency === 'USD';
	const isEUR = currency === 'EUR';
	const isBS = currency === 'BS' || currency === 'VES';
	
	// Determinar si la moneda preferida es USD, EUR, BS u otra (debe estar antes de usarse)
	const isPrimaryUSD = effectivePrimaryCurrency === 'USD';
	const isPrimaryEUR = effectivePrimaryCurrency === 'EUR';
	const isPrimaryBS = effectivePrimaryCurrency === 'BS' || effectivePrimaryCurrency === 'VES';
	
	// Calcular montos
	// Si la moneda original es la misma que la preferida, usar directamente
	// Si no, convertir usando las tasas correspondientes
	let bsAmount: number;
	let preferredAmount: number;
	let usdAmount: number;
	
	// Determinar la moneda original
	if (isBS || currency === 'VES') {
		// Si la moneda original es BS
		bsAmount = amount;
		// Convertir a la moneda preferida
		if (isPrimaryUSD) {
			preferredAmount = amount / (usdRate || 1);
			usdAmount = preferredAmount;
		} else if (isPrimaryEUR) {
			// Convertir BS -> USD -> EUR (usando tasa EUR/Bs si está disponible)
			if (preferredRate && effectivePrimaryCurrency === 'EUR') {
				preferredAmount = amount / Number(preferredRate.rate);
			} else {
				// Fallback: BS -> USD -> EUR
				preferredAmount = (amount / (usdRate || 1)) * 1.1; // Aproximación
			}
			usdAmount = amount / (usdRate || 1);
		} else {
			preferredAmount = amount;
			usdAmount = amount / (usdRate || 1);
		}
	} else if (isUSD) {
		// Si la moneda original es USD
		usdAmount = amount;
		// Convertir USD a Bs usando la tasa USD/Bs
		bsAmount = amount * (rateForConversion || 0);
		// Convertir a la moneda preferida
		if (isPrimaryUSD) {
			preferredAmount = amount;
		} else if (isPrimaryEUR) {
			// Convertir USD -> EUR (usando tasa EUR/Bs si está disponible)
			if (preferredRate && effectivePrimaryCurrency === 'EUR') {
				// EUR/Bs disponible, convertir USD -> BS -> EUR
				preferredAmount = bsAmount / Number(preferredRate.rate);
			} else {
				// Fallback: usar tasa aproximada
				preferredAmount = bsAmount / (originalCurrencyRate ? Number(originalCurrencyRate.rate) * 1.1 : usdRate * 1.1 || 1);
			}
		} else {
			preferredAmount = bsAmount;
		}
	} else if (isEUR) {
		// Si la moneda original es EUR - USAR TASA EUR/Bs
		preferredAmount = amount;
		// Convertir EUR a Bs usando la tasa EUR/Bs (rateForConversion ya contiene la tasa EUR/Bs)
		bsAmount = amount * (rateForConversion || 0);
		// Calcular USD para referencia
		usdAmount = bsAmount / (usdRate || 1);
	} else {
		// Otra moneda (COP, MXN, ARS, etc.), usar su tasa específica
		preferredAmount = amount;
		// rateForConversion ya contiene la tasa de la moneda original
		bsAmount = amount * (rateForConversion || 0);
		usdAmount = bsAmount / (usdRate || 1);
	}

	const sizeClasses = {
		sm: 'text-sm',
		md: 'text-base',
		lg: 'text-lg',
	};

	if (loading) {
		return (
			<div className={`flex items-center gap-2 ${className}`}>
				<Loader2 className="w-4 h-4 animate-spin text-slate-400" />
				<span className={`text-slate-400 ${sizeClasses[size]}`}>Cargando tasa...</span>
			</div>
		);
	}

	if (!rateForConversion) {
		const symbol = isUSD ? '$' : isEUR ? '€' : '';
		return (
			<div className={`flex items-center gap-2 ${className}`}>
				<span className={`text-slate-400 ${sizeClasses[size]}`}>
					{isUSD || isEUR ? `${symbol}${amount.toFixed(2)} ${currency}` : `${amount.toFixed(2)} Bs`}
				</span>
			</div>
		);
	}

	// Función para obtener el símbolo de moneda
	const getCurrencySymbol = (currencyCode: string): string => {
		const symbols: Record<string, string> = {
			USD: '$',
			EUR: '€',
			BS: 'Bs',
			VES: 'Bs',
		};
		return symbols[currencyCode] || currencyCode;
	};

	// Función para formatear el monto según la moneda
	const formatAmount = (amount: number, currencyCode: string): string => {
		if (currencyCode === 'BS' || currencyCode === 'VES') {
			return `${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`;
		}
		const symbol = getCurrencySymbol(currencyCode);
		return `${symbol}${amount.toFixed(2)} ${currencyCode}`;
	};

	if (!showBoth) {
		// Mostrar solo la moneda preferida
		if (isPrimaryBS) {
			return (
				<span className={className}>
					{bsAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
				</span>
			);
		} else {
			return (
				<span className={className}>
					{formatAmount(preferredAmount, effectivePrimaryCurrency)}
				</span>
			);
		}
	}

	// Mostrar ambas monedas: preferida y Bs
	return (
		<div className={`flex flex-col gap-1 ${className}`}>
			{isPrimaryBS ? (
				<>
					<span className={`font-semibold text-slate-900 ${sizeClasses[size]}`}>
						{bsAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
					</span>
					<span className={`text-slate-600 ${sizeClasses[size === 'lg' ? 'md' : 'sm']}`}>
						≈ ${usdAmount.toFixed(2)} USD
					</span>
				</>
			) : (
				<>
					<span className={`font-semibold text-slate-900 ${sizeClasses[size]}`}>
						{formatAmount(preferredAmount, effectivePrimaryCurrency)}
					</span>
					<span className={`text-slate-600 ${sizeClasses[size === 'lg' ? 'md' : 'sm']}`}>
						≈ {bsAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
					</span>
				</>
			)}
			{rateDateForConversion && (
				<span className="text-xs text-slate-400">
					Tasa actualizada: {rateDateForConversion.toLocaleDateString('es-VE')} {rateDateForConversion.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
				</span>
			)}
		</div>
	);
}

