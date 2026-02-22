/** @refactored ASHIRA Clinic Dashboard - Analytics KPIs Page */
import React from 'react';
import { getCurrentOrganizationId } from '@/lib/clinic-auth';
import { getClinicGeneralStats, getFinancialReports, getDiagnosesStats } from '@/lib/actions/analytics';
import { KPICard } from '@/components/analytics/KPICard';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';
import { Activity, Users, DollarSign, Stethoscope, TrendingUp, PieChart } from 'lucide-react';

export default async function AnalyticsKPIsPage() {
	const organizationId = await getCurrentOrganizationId();

	if (!organizationId) {
		return (
			<div className="flex flex-col items-center justify-center py-16">
				<div className="p-4 rounded-2xl bg-slate-50 mb-4"><Activity className="w-8 h-8 text-slate-300" /></div>
				<p className="text-slate-500 text-sm">No se pudo identificar la organización.</p>
			</div>
		);
	}

	const [stats, financialData, diagnosesData] = await Promise.all([
		getClinicGeneralStats(organizationId, 'month'),
		getFinancialReports(organizationId, 'year'),
		getDiagnosesStats(organizationId),
	]);

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
				<div className="flex items-center gap-3 mb-1">
					<div className="p-2 rounded-lg bg-sky-50" aria-hidden="true">
						<TrendingUp className="w-5 h-5 text-sky-600" />
					</div>
					<div>
						<h1 className="text-xl font-semibold tracking-tight text-slate-900">Estadísticas y KPIs</h1>
						<p className="text-sm text-slate-500">Indicadores clave de rendimiento e inteligencia de negocio</p>
					</div>
				</div>
			</div>

			{/* KPI Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
				<KPICard
					title="Consultas (Mes)"
					value={stats.totalConsultations}
					icon={Activity}
					trend={{ value: 12, isPositive: true }}
					variant="default"
					index={0}
				/>
				<KPICard
					title="Pacientes (Mes)"
					value={stats.totalPatients}
					icon={Users}
					trend={{ value: 5, isPositive: true }}
					variant="success"
					index={1}
				/>
				<KPICard
					title="Ingresos (Mes)"
					value={`$${stats.totalIncome.toLocaleString()}`}
					icon={DollarSign}
					trend={{ value: 8, isPositive: true }}
					variant="success"
					index={2}
				/>
				<KPICard
					title="Especialistas"
					value={stats.activeSpecialists}
					icon={Stethoscope}
					variant="default"
					index={3}
				/>
			</div>

			{/* Charts */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
					<div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
						<DollarSign className="w-4 h-4 text-emerald-600" />
						<h3 className="text-base font-semibold text-slate-900">Ingresos Anuales</h3>
					</div>
					<div className="p-6">
						<AnalyticsChart type="bar" data={financialData} dataKey="value" height={300} />
					</div>
				</div>
				<div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
					<div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
						<PieChart className="w-4 h-4 text-violet-600" />
						<h3 className="text-base font-semibold text-slate-900">Top Diagnósticos</h3>
					</div>
					<div className="p-6">
						<AnalyticsChart type="pie" data={diagnosesData} dataKey="value" height={280} />
					</div>
				</div>
			</div>
		</div>
	);
}
