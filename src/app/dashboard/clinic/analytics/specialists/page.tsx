/** @refactored ASHIRA Clinic Dashboard - Analytics Specialists Page */
import React from 'react';
import Link from 'next/link';
import { getCurrentOrganizationId } from '@/lib/clinic-auth';
import { getSpecialistsPerformance } from '@/lib/actions/analytics';
import { ChevronRight, Stethoscope, Activity, DollarSign, Users } from 'lucide-react';
import { AvatarInitials } from '@/components/shared/AvatarInitials';

export default async function AnalyticsSpecialistsPage() {
	const organizationId = await getCurrentOrganizationId();

	if (!organizationId) {
		return (
			<div className="flex flex-col items-center justify-center py-16">
				<div className="p-4 rounded-2xl bg-slate-50 mb-4"><Stethoscope className="w-8 h-8 text-slate-300" /></div>
				<p className="text-slate-500 text-sm">Error de organización.</p>
			</div>
		);
	}

	const specialists = await getSpecialistsPerformance(organizationId, 'all');

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
				<div className="flex items-center gap-3">
					<div className="p-2 rounded-lg bg-teal-50" aria-hidden="true">
						<Stethoscope className="w-5 h-5 text-teal-600" />
					</div>
					<div>
						<h1 className="text-xl font-semibold tracking-tight text-slate-900">Analítica por Especialista</h1>
						<p className="text-sm text-slate-500">Rendimiento individual de cada profesional</p>
					</div>
				</div>
			</div>

			{/* Grid de cards */}
			{specialists.length === 0 ? (
				<div className="bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm p-12 text-center">
					<Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
					<p className="text-sm text-slate-500">No hay especialistas con datos disponibles.</p>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
					{specialists.map((specialist: any) => (
						<Link
							key={specialist.id}
							href={`/dashboard/clinic/analytics/specialists/${specialist.id}`}
							className="block bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
						>
							<div className="p-5">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<AvatarInitials name={specialist.name ?? 'N/A'} size="md" />
										<div className="min-w-0">
											<h3 className="text-sm font-semibold text-slate-900 truncate">{specialist.name}</h3>
											<p className="text-xs text-slate-500 truncate">{specialist.email}</p>
										</div>
									</div>
									<ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
								</div>
							</div>

							<div className="grid grid-cols-2 gap-px bg-slate-100 border-t border-slate-100">
								<div className="bg-white px-5 py-3.5">
									<div className="flex items-center gap-1.5 mb-1">
										<Activity className="w-3.5 h-3.5 text-sky-500" />
										<span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Consultas</span>
									</div>
									<p className="text-lg font-bold text-slate-900">{specialist.consultations}</p>
								</div>
								<div className="bg-white px-5 py-3.5">
									<div className="flex items-center gap-1.5 mb-1">
										<DollarSign className="w-3.5 h-3.5 text-emerald-500" />
										<span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Ingresos</span>
									</div>
									<p className="text-lg font-bold text-emerald-600">${specialist.income.toLocaleString()}</p>
								</div>
							</div>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
