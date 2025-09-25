// components/ClinicStats.tsx
'use client';

import React from 'react';

type Org = {
	id?: string;
	name?: string;
	type?: string;
	address?: string | null;
	phone?: string | null;
	specialistCount?: number | null;
	planId?: string | null;
};

type Props = {
	organization: Org | null;
	specialistsCount: number;
	recentPatientsCount: number;
};

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(n)));

function StatCard({ title, value, subtitle, accent, progress, icon }: { title: string; value: React.ReactNode; subtitle?: string; accent?: string; progress?: number; icon?: React.ReactNode }) {
	return (
		<div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-4 flex flex-col justify-between min-h-[150px]">
			<div className="flex items-start gap-4">
				<div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-white ${accent ?? 'bg-slate-700'}`} aria-hidden>
					<div className="w-6 h-6">{icon}</div>
				</div>

				<div className="flex-1 min-w-0">
					<div className="text-xs text-slate-500">{title}</div>
					<div className="mt-1 text-xl sm:text-2xl font-semibold text-slate-900 truncate">{value}</div>
					{subtitle && <div className="mt-1 text-xs text-slate-400 truncate">{subtitle}</div>}
				</div>
			</div>
		</div>
	);
}

export default function ClinicStats({ organization, specialistsCount, recentPatientsCount }: Props) {
	// defensivos / fallback
	const capacityTotal = organization?.specialistCount ?? Math.max(1, specialistsCount || 1);
	const safeCapacity = capacityTotal <= 0 ? 1 : capacityTotal;
	const specialistsPct = isFinite((specialistsCount / safeCapacity) * 100) ? Math.round((specialistsCount / safeCapacity) * 100) : 0;
	const patientsTrendScore = Math.min(100, Math.round((recentPatientsCount / Math.max(1, specialistsCount || 1)) * 20));

	return (
		<section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
				<div>
					<h3 className="text-lg sm:text-2xl font-semibold text-slate-900">Resumen de la clínica</h3>
					<p className="mt-1 text-sm text-slate-500">
						{organization?.name ?? 'Nombre no disponible'} <span className="mx-2 text-slate-300">—</span> <span className="font-medium">{organization?.type ?? 'Tipo no especificado'}</span>
					</p>
				</div>

				<div className="flex gap-3 items-center">
					<a href="/dashboard/clinic/specialists/new" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-sky-600 text-white text-sm font-medium shadow-sm hover:scale-[1.01] transition-transform">
						+ Invitar especialista
					</a>

					<a href="/dashboard/clinic/invites" className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-100 bg-white text-sm text-slate-700 hover:shadow-sm transition">
						Ver invitaciones
					</a>
				</div>
			</div>

			{/* GRID 2x2: en móvil 1 col, en sm y superiores 2 columnas => 2x2 */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				{/* Card 1: Plan activo */}
				<StatCard
					title="Plan activo"
					value={<span className="capitalize">{organization?.planId ?? 'Sin plan'}</span>}
					subtitle="Administración de suscripción y límites"
					accent="bg-gradient-to-br from-sky-600 to-indigo-600"
					icon={
						<svg className="w-full h-full" viewBox="0 0 24 24" fill="none" aria-hidden>
							<path d="M3 13h8V3H3v10zM13 21h8V11h-8v10zM13 3v6h8V3h-8zM3 21h8v-6H3v6z" fill="currentColor" />
						</svg>
					}
				/>

				{/* Card 2: Especialistas */}
				<StatCard
					title="Especialistas"
					value={<span className="text-xl sm:text-2xl">{specialistsCount}</span>}
					subtitle={`${specialistsPct}% de la capacidad (${organization?.specialistCount ?? '—'} max.)`}
					accent="bg-gradient-to-br from-emerald-500 to-emerald-600"
					icon={
						<svg className="w-full h-full" viewBox="0 0 24 24" fill="none" aria-hidden>
							<path d="M16 11a4 4 0 10-8 0 4 4 0 008 0zM2 20a6 6 0 0112 0v1H2v-1z" fill="currentColor" />
						</svg>
					}
					progress={specialistsPct}
				/>

				{/* Card 3: Pacientes recientes */}
				<StatCard
					title="Pacientes recientes"
					value={<span className="text-xl sm:text-2xl">{recentPatientsCount}</span>}
					subtitle="Interacciones recientes"
					accent="bg-gradient-to-br from-indigo-600 to-violet-600"
					icon={
						<svg className="w-full h-full" viewBox="0 0 24 24" fill="none" aria-hidden>
							<path d="M21 11.5V6a2 2 0 00-2-2H5a2 2 0 00-2 2v13l4-2 4 2 4-2 6 2v-7.5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					}
					progress={patientsTrendScore}
				/>

				{/* Card 4: Resumen / contacto */}
				<div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-4 min-h-[150px] flex flex-col justify-between">
					<div className="flex items-start justify-between gap-4">
						<div className="min-w-0">
							<div className="text-xs text-slate-500">Contacto</div>
							<div className="text-sm font-medium text-slate-800 truncate">{organization?.phone ?? 'No registrado'}</div>
						</div>

						<div className="text-right">
							<div className="text-xs text-slate-500">Especialistas</div>
							<div className="text-sm font-semibold text-slate-900">{specialistsCount}</div>
						</div>
					</div>

					<div className="mt-3 grid grid-cols-2 gap-2">
						<div className="p-2 rounded-lg bg-slate-50 text-center">
							<div className="text-xs text-slate-500">Consultorios</div>
							<div className="text-sm font-medium text-slate-800">{organization?.specialistCount ?? '—'}</div>
						</div>

						<div className="p-2 rounded-lg bg-slate-50 text-center">
							<div className="text-xs text-slate-500">Plan</div>
							<div className="text-sm font-medium text-slate-800">{organization?.planId ?? 'Sin plan'}</div>
						</div>

						<div className="p-2 rounded-lg bg-slate-50 text-center col-span-2">
							<div className="text-xs text-slate-500">Pacientes (registrado reciente)</div>
							<div className="text-sm font-medium text-slate-800">{recentPatientsCount}</div>
						</div>
					</div>
				</div>
			</div>

			{/* nota */}
			<div className="mt-5 p-4 rounded-2xl bg-slate-50 ring-1 ring-slate-100 text-sm text-slate-600">
				<strong className="text-slate-800">Consejo:</strong> Mantén actualizados los datos fiscales y bancarios para evitar retrasos en pagos y conciliaciones.
			</div>
		</section>
	);
}
