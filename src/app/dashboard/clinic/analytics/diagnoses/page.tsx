/** @refactored ASHIRA Clinic Dashboard - Analytics Diagnoses Page */
import React from 'react';
import { getCurrentOrganizationId } from '@/lib/clinic-auth';
import { getDiagnosesStats } from '@/lib/actions/analytics';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';
import { Clipboard } from 'lucide-react';

export default async function AnalyticsDiagnosesPage() {
	const organizationId = await getCurrentOrganizationId();

	if (!organizationId) {
		return (
			<div className="flex flex-col items-center justify-center py-16">
				<div className="p-4 rounded-2xl bg-slate-50 mb-4"><Clipboard className="w-8 h-8 text-slate-300" /></div>
				<p className="text-slate-500 text-sm">No se pudo identificar la organización.</p>
			</div>
		);
	}

	const diagnoses = await getDiagnosesStats(organizationId);

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
				<div className="flex items-center gap-3">
					<div className="p-2 rounded-lg bg-amber-50" aria-hidden="true">
						<Clipboard className="w-5 h-5 text-amber-600" />
					</div>
					<div>
						<h1 className="text-xl font-semibold tracking-tight text-slate-900">Analítica de Diagnósticos</h1>
						<p className="text-sm text-slate-500">Distribución y frecuencia de diagnósticos registrados</p>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Pie Chart */}
				<div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
					<div className="px-6 py-5 border-b border-slate-100">
						<h3 className="text-base font-semibold text-slate-900">Distribución de Diagnósticos</h3>
					</div>
					<div className="p-6">
						<AnalyticsChart type="pie" data={diagnoses} dataKey="value" height={300} />
					</div>
				</div>

				{/* Ranking */}
				<div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
					<div className="px-6 py-5 border-b border-slate-100">
						<h3 className="text-base font-semibold text-slate-900">Top Diagnósticos</h3>
						<p className="text-xs text-slate-400 mt-0.5">Ordenados por frecuencia</p>
					</div>
					<ul className="divide-y divide-slate-50">
						{diagnoses.map((d: {name: string; value: number}, i: number) => (
							<li key={i} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
								<div className="flex items-center gap-3">
									<span className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center text-xs font-bold text-sky-600">{i + 1}</span>
									<span className="text-sm font-medium text-slate-700">{d.name}</span>
								</div>
								<span className="text-sm font-bold text-slate-900">{d.value}</span>
							</li>
						))}
						{diagnoses.length === 0 && (
							<li className="px-6 py-8 text-center text-sm text-slate-400">Sin datos disponibles</li>
						)}
					</ul>
				</div>
			</div>
		</div>
	);
}
