'use client';

import React from 'react';
import { useCurrencyRate } from '@/hooks/useCurrencyRate';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CurrencyRateWidget() {
	const { rate, loading, error, refresh } = useCurrencyRate('USD');

	if (error) return null;

	return (
		<div className="mx-2 mb-2 p-3 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden group">
			{/* Decorative background circle */}
			<div className="absolute -right-6 -top-6 w-12 h-12 bg-blue-100/50 rounded-full blur-xl group-hover:bg-blue-200/50 transition-colors"></div>

			<div className="flex items-center justify-between mb-1 relative z-10">
				<div className="flex items-center gap-1.5 text-blue-700">
					<div className="p-1 bg-blue-100 rounded-md">
						<TrendingUp className="w-3 h-3" />
					</div>
					<span className="text-xs font-bold uppercase tracking-wider">Tasa del día</span>
				</div>
				<button 
					onClick={() => refresh()} 
					disabled={loading}
					className={`text-blue-400 hover:text-blue-600 transition-colors p-1 rounded-full hover:bg-blue-100 ${loading ? 'animate-spin' : ''}`}
					title="Actualizar tasa"
				>
					<RefreshCw className="w-3 h-3" />
				</button>
			</div>

			<div className="relative z-10">
				{loading ? (
					<div className="h-6 w-24 bg-blue-200/30 animate-pulse rounded"></div>
				) : (
					<div className="flex items-baseline gap-1">
						<span className="text-base font-bold text-slate-800">
							{rate ? Number(rate.rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}
						</span>
						<span className="text-xs font-medium text-slate-500">Bs/USD</span>
					</div>
				)}
				
				{rate && (
					<div className="mt-1 text-[10px] text-slate-400">
						Act: {new Date(rate.rate_datetime).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
					</div>
				)}
			</div>
		</div>
	);
}
