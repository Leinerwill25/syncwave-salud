/** @refactored ASHIRA Clinic Dashboard - SectionHeader */
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
	title: string;
	subtitle?: string;
	action?: React.ReactNode;
	icon?: LucideIcon;
}

export function SectionHeader({ title, subtitle, action, icon: Icon }: SectionHeaderProps) {
	return (
		<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
			<div className="flex items-center gap-3">
				{Icon && (
					<div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sky-50" aria-hidden="true">
						<Icon className="w-5 h-5 text-sky-600" />
					</div>
				)}
				<div>
					<h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
					{subtitle && (
						<p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
					)}
				</div>
			</div>
			{action && <div className="shrink-0">{action}</div>}
		</div>
	);
}

export default SectionHeader;
