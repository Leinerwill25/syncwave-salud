/** @refactored ASHIRA Clinic Dashboard - Analytics Data Page */
import React from 'react';
import { getCurrentOrganizationId } from '@/lib/clinic-auth';
import { getSpecialistsPerformance } from '@/lib/actions/analytics';
import { Users, Calendar, DollarSign, Activity, Database } from 'lucide-react';
import { AvatarInitials } from '@/components/shared/AvatarInitials';

export const dynamic = 'force-dynamic';

export default async function AnalyticsDataPage() {
	try {
		const organizationId = await getCurrentOrganizationId();

		if (!organizationId) {
			return (
				<div className="flex flex-col items-center justify-center py-16">
					<div className="p-4 rounded-2xl bg-slate-50 mb-4"><Database className="w-8 h-8 text-slate-300" /></div>
					<p className="text-slate-500 text-sm">No se pudo identificar la organización.</p>
				</div>
			);
		}

		const specialists = await getSpecialistsPerformance(organizationId, 'month');

		return (
			<div className="space-y-8">
				{/* Header */}
				<div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-lg bg-indigo-50" aria-hidden="true">
							<Database className="w-5 h-5 text-indigo-600" />
						</div>
						<div>
							<h1 className="text-xl font-semibold tracking-tight text-slate-900">Analítica de Datos</h1>
							<p className="text-sm text-slate-500">Rendimiento detallado por especialista (mes actual)</p>
						</div>
					</div>
				</div>

				{/* Table */}
				<div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-slate-100">
							<thead>
								<tr className="bg-slate-50">
									<th className="px-6 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Especialista</th>
									<th className="px-6 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Consultas</th>
									<th className="px-6 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pacientes</th>
									<th className="px-6 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Ingresos</th>
									<th className="px-6 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Días de Atención</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-slate-50">
								{(specialists || []).map((specialist: any) => (
									<tr key={specialist.id} className="hover:bg-slate-50 transition-colors">
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="flex items-center gap-3">
												<AvatarInitials name={specialist.name ?? 'N/A'} size="sm" />
												<div className="min-w-0">
													<div className="text-sm font-medium text-slate-900 truncate">{specialist.name}</div>
													<div className="text-xs text-slate-500 truncate">{specialist.email}</div>
												</div>
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="flex items-center text-sm text-slate-700 gap-2">
												<Activity className="w-4 h-4 text-slate-400 shrink-0" />
												{specialist.consultations}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="flex items-center text-sm text-slate-700 gap-2">
												<Users className="w-4 h-4 text-slate-400 shrink-0" />
												{specialist.patients}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="flex items-center text-sm font-medium text-emerald-600 gap-1.5">
												<DollarSign className="w-4 h-4 shrink-0" />
												{(specialist.income || 0).toLocaleString()}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
											<div className="flex items-center gap-2">
												<Calendar className="w-4 h-4 text-slate-400 shrink-0" />
												Lunes – Viernes
											</div>
										</td>
									</tr>
								))}
								{(!specialists || specialists.length === 0) && (
									<tr>
										<td colSpan={5} className="px-6 py-12 text-center">
											<Database className="w-8 h-8 text-slate-300 mx-auto mb-2" />
											<p className="text-sm text-slate-400">No hay datos disponibles para este periodo.</p>
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		);
	} catch (error) {
		console.error('[Data Page] Critical crash:', error);
		return (
			<div className="p-8 bg-white rounded-2xl border border-rose-100 shadow-sm text-center">
				<h2 className="text-lg font-bold text-rose-600 mb-2">Error cargando datos</h2>
				<p className="text-slate-500 text-sm">No se pudieron recuperar los registros detallados. Por favor, intente más tarde.</p>
			</div>
		);
	}
}
