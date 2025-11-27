/**
 * Componente para mostrar montos en USD y Bolívares
 */

'use client';

import React from 'react';
import { useCurrencyConversion } from '@/hooks/useCurrencyRate';
import { Loader2 } from 'lucide-react';

interface CurrencyDisplayProps {
	amount: number;
	currency?: 'USD' | 'EUR';
	showBoth?: boolean; // Si true, muestra ambas monedas
	primaryCurrency?: 'USD' | 'BS'; // Moneda principal a mostrar
	className?: string;
	size?: 'sm' | 'md' | 'lg';
}

export default function CurrencyDisplay({
	amount,
	currency = 'USD',
	showBoth = true,
	primaryCurrency = 'USD',
	className = '',
	size = 'md',
}: CurrencyDisplayProps) {
	const { rate, loading, convertUSDToBs, rateDate } = useCurrencyConversion();

	const bsAmount = currency === 'USD' ? convertUSDToBs(amount) : amount * (rate || 0);
	const usdAmount = currency === 'BS' ? amount / (rate || 1) : amount;

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

	if (!rate) {
		return (
			<div className={`flex items-center gap-2 ${className}`}>
				<span className={`text-slate-400 ${sizeClasses[size]}`}>
					{currency === 'USD' ? `$${amount.toFixed(2)}` : `${amount.toFixed(2)} Bs`}
				</span>
			</div>
		);
	}

	if (!showBoth) {
		return (
			<span className={className}>
				{primaryCurrency === 'USD'
					? `$${usdAmount.toFixed(2)}`
					: `${bsAmount.toFixed(2)} Bs`}
			</span>
		);
	}

	return (
		<div className={`flex flex-col gap-1 ${className}`}>
			{primaryCurrency === 'USD' ? (
				<>
					<span className={`font-semibold text-slate-900 ${sizeClasses[size]}`}>
						${usdAmount.toFixed(2)} USD
					</span>
					<span className={`text-slate-600 ${sizeClasses[size === 'lg' ? 'md' : 'sm']}`}>
						≈ {bsAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
					</span>
				</>
			) : (
				<>
					<span className={`font-semibold text-slate-900 ${sizeClasses[size]}`}>
						{bsAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
					</span>
					<span className={`text-slate-600 ${sizeClasses[size === 'lg' ? 'md' : 'sm']}`}>
						≈ ${usdAmount.toFixed(2)} USD
					</span>
				</>
			)}
			{rateDate && (
				<span className="text-xs text-slate-400">
					Tasa actualizada: {rateDate.toLocaleDateString('es-VE')} {rateDate.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
				</span>
			)}
		</div>
	);
}

