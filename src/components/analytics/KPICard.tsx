/** @refactored ASHIRA Clinic Dashboard - KPICard */
'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

type KPIVariant = 'default' | 'success' | 'warning' | 'danger';

interface KPICardProps {
	title: string;
	value: string | number;
	subtitle?: string;
	icon: LucideIcon;
	trend?: {
		value: number;
		isPositive: boolean;
	};
	variant?: KPIVariant;
	className?: string;
	index?: number;
}

const VARIANT_STYLES: Record<KPIVariant, { border: string; iconBg: string; iconText: string }> = {
	default: {
		border: 'border-l-sky-500',
		iconBg: 'bg-sky-50',
		iconText: 'text-sky-600',
	},
	success: {
		border: 'border-l-emerald-500',
		iconBg: 'bg-emerald-50',
		iconText: 'text-emerald-600',
	},
	warning: {
		border: 'border-l-amber-500',
		iconBg: 'bg-amber-50',
		iconText: 'text-amber-600',
	},
	danger: {
		border: 'border-l-rose-500',
		iconBg: 'bg-rose-50',
		iconText: 'text-rose-600',
	},
};

export function KPICard({
	title,
	value,
	subtitle,
	icon: Icon,
	trend,
	variant = 'default',
	className = '',
	index = 0,
}: KPICardProps) {
	const styles = VARIANT_STYLES[variant];

	return (
		<motion.div
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, delay: index * 0.05 }}
			className={`bg-white rounded-2xl border border-slate-100 border-l-4 ${styles.border} shadow-sm p-6 ${className}`}
		>
			<div className="flex items-start justify-between">
				{/* Ícono */}
				<div className={`p-2.5 rounded-xl ${styles.iconBg}`} aria-hidden="true">
					<Icon className={`w-5 h-5 ${styles.iconText}`} />
				</div>

				{/* Trend badge */}
				{trend && (
					<span
						className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
							trend.isPositive
								? 'bg-emerald-50 text-emerald-700'
								: 'bg-rose-50 text-rose-700'
						}`}
					>
						{trend.isPositive ? (
							<TrendingUp className="w-3 h-3" />
						) : (
							<TrendingDown className="w-3 h-3" />
						)}
						{trend.isPositive ? '+' : ''}{trend.value}%
					</span>
				)}
			</div>

			{/* Valor principal */}
			<div className="mt-4">
				<p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">{title}</p>
				<h3 className="text-3xl font-bold tracking-tight text-slate-900">{value}</h3>
			</div>

			{/* Subtítulo */}
			{subtitle && (
				<p className="mt-2 text-sm text-slate-500 leading-relaxed">{subtitle}</p>
			)}
		</motion.div>
	);
}
