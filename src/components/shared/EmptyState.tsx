/** @refactored ASHIRA Clinic Dashboard - EmptyState */
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
	icon: LucideIcon;
	title: string;
	description: string;
	action?: React.ReactNode;
	iconColor?: string;
	iconBg?: string;
}

export function EmptyState({
	icon: Icon,
	title,
	description,
	action,
	iconColor = 'text-slate-400',
	iconBg = 'bg-slate-50',
}: EmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center py-12 px-6 text-center">
			<div
				className={`flex items-center justify-center w-16 h-16 rounded-2xl ${iconBg} mb-5`}
				aria-hidden="true"
			>
				<Icon className={`w-8 h-8 ${iconColor}`} />
			</div>
			<h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
			<p className="text-sm text-slate-500 max-w-sm leading-relaxed">{description}</p>
			{action && <div className="mt-5">{action}</div>}
		</div>
	);
}

export default EmptyState;
