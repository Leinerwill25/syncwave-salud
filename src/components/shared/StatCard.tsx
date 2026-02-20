/** @refactored ASHIRA Clinic Dashboard - StatCard */
import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

type StatCardVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface TrendInfo {
	value: number;
	isPositive: boolean;
	label?: string;
}

interface StatCardProps {
	title: string;
	value: React.ReactNode;
	subtitle?: string;
	icon: LucideIcon;
	trend?: TrendInfo;
	variant?: StatCardVariant;
	className?: string;
}

const VARIANT_STYLES: Record<StatCardVariant, { border: string; iconBg: string; iconText: string; trendBg: string; trendText: string }> = {
	default: {
		border: 'border-l-sky-500',
		iconBg: 'bg-sky-50',
		iconText: 'text-sky-600',
		trendBg: 'bg-sky-50',
		trendText: 'text-sky-700',
	},
	success: {
		border: 'border-l-emerald-500',
		iconBg: 'bg-emerald-50',
		iconText: 'text-emerald-600',
		trendBg: 'bg-emerald-50',
		trendText: 'text-emerald-700',
	},
	warning: {
		border: 'border-l-amber-500',
		iconBg: 'bg-amber-50',
		iconText: 'text-amber-600',
		trendBg: 'bg-amber-50',
		trendText: 'text-amber-700',
	},
	danger: {
		border: 'border-l-rose-500',
		iconBg: 'bg-rose-50',
		iconText: 'text-rose-600',
		trendBg: 'bg-rose-50',
		trendText: 'text-rose-700',
	},
	info: {
		border: 'border-l-indigo-500',
		iconBg: 'bg-indigo-50',
		iconText: 'text-indigo-600',
		trendBg: 'bg-indigo-50',
		trendText: 'text-indigo-700',
	},
};

export function StatCard({
	title,
	value,
	subtitle,
	icon: Icon,
	trend,
	variant = 'default',
	className = '',
}: StatCardProps) {
	const styles = VARIANT_STYLES[variant];

	return (
		<div
			className={`bg-white rounded-2xl border border-slate-100 border-l-4 ${styles.border} shadow-sm p-6 flex flex-col gap-4 ${className}`}
		>
			{/* Header: ícono + label pequeño */}
			<div className="flex items-center justify-between">
				<div className={`p-2 rounded-lg ${styles.iconBg}`} aria-hidden="true">
					<Icon className={`w-4 h-4 ${styles.iconText}`} />
				</div>
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
						{trend.label && <span className="hidden sm:inline ml-0.5">{trend.label}</span>}
					</span>
				)}
			</div>

			{/* Valor + Label */}
			<div>
				<p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">
					{title}
				</p>
				<div className="text-3xl font-bold tracking-tight text-slate-900">{value}</div>
				{subtitle && (
					<p className="text-sm text-slate-500 mt-1 leading-relaxed">{subtitle}</p>
				)}
			</div>
		</div>
	);
}

export default StatCard;
