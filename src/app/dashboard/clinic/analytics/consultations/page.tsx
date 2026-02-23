/** @refactored ASHIRA Clinic Dashboard - Analytics Consultations Page */
import React from 'react';
import { getCurrentOrganizationId } from '@/lib/clinic-auth';
import { getConsultationBreakdown } from '@/lib/actions/analytics';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';
import { Activity } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AnalyticsConsultationsPage() {
	try {
		const organizationId = await getCurrentOrganizationId();

		if (!organizationId) {
			return (
				<div className="flex flex-col items-center justify-center py-16">
					<div className="p-4 rounded-2xl bg-slate-50 mb-4"><Activity className="w-8 h-8 text-slate-300" /></div>
					<p className="text-slate-500 text-sm">No se pudo identificar la organización.</p>
				</div>
			);
		}

		const breakdown = await getConsultationBreakdown(organizationId);

		return (
			<div className="space-y-8">
				{/* Header */}
				<div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-lg bg-violet-50" aria-hidden="true">
							<Activity className="w-5 h-5 text-violet-600" />
						</div>
						<div>
							<h1 className="text-xl font-semibold tracking-tight text-slate-900">Analítica de Consultas</h1>
							<p className="text-sm text-slate-500">Tendencia mensual del volumen de consultas</p>
						</div>
					</div>
				</div>

				{/* Chart */}
				<div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
					<div className="px-6 py-5 border-b border-slate-100">
						<h3 className="text-base font-semibold text-slate-900">Consultas por mes</h3>
						<p className="text-xs text-slate-400 mt-0.5">Evolución temporal del total de consultas realizadas</p>
					</div>
					<div className="p-6">
						<AnalyticsChart type="area" data={breakdown || []} dataKey="value" height={400} colors={['#8b5cf6']} />
					</div>
				</div>
			</div>
		);
	} catch (error) {
		console.error('[Consultations Page] Critical crash:', error);
		return (
			<div className="p-8 bg-white rounded-2xl border border-rose-100 shadow-sm text-center">
				<h2 className="text-lg font-bold text-rose-600 mb-2">Error cargando consultas</h2>
				<p className="text-slate-500 text-sm">No se pudo generar el gráfico de evolución. Por favor, intente más tarde.</p>
			</div>
		);
	}
}
