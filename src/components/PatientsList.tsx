/** @refactored ASHIRA Clinic Dashboard - PatientsList */
'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Users2, ChevronRight, UserPlus } from 'lucide-react';
import { AvatarInitials } from '@/components/shared/AvatarInitials';
import { EmptyState } from '@/components/shared/EmptyState';
import { SectionHeader } from '@/components/shared/SectionHeader';

type Patient = {
	id: string;
	firstName?: string | null;
	lastName?: string | null;
	dob?: string | Date | null;
	gender?: string | null;
	phone?: string | null;
	createdAt?: string | Date | null;
	organizationId?: string | null;
};

function fmtDate(d?: string | Date | null): string {
	if (!d) return '—';
	try {
		return new Date(String(d)).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' });
	} catch {
		return '—';
	}
}

function timeAgo(d?: string | Date | null): string {
	if (!d) return '—';
	try {
		const ms = Date.now() - new Date(String(d)).getTime();
		const days = Math.floor(ms / 86400000);
		if (days === 0) return 'Hoy';
		if (days === 1) return 'Ayer';
		if (days < 7) return `Hace ${days} días`;
		if (days < 30) return `Hace ${Math.floor(days / 7)} sem.`;
		return `Hace ${Math.floor(days / 30)} mes${Math.floor(days / 30) > 1 ? 'es' : ''}`;
	} catch {
		return '—';
	}
}

export default function PatientsList({
	patients,
	clinicOrganizationId,
}: {
	patients: Patient[];
	clinicOrganizationId?: string | null;
}) {
	const list = Array.isArray(patients) ? patients : [];
	const filteredList =
		typeof clinicOrganizationId === 'string' && clinicOrganizationId.trim() !== ''
			? list.filter((p) => !!p.organizationId && p.organizationId === clinicOrganizationId)
			: list;

	if (filteredList.length === 0) {
		return (
			<motion.div
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3 }}
				className="rounded-2xl border border-dashed border-slate-200 bg-white shadow-sm"
			>
				<EmptyState
					icon={Users2}
					title="Sin pacientes recientes"
					description={
						clinicOrganizationId
							? 'No hay pacientes asignados a esta clínica aún.'
							: 'No hay pacientes recientes registrados.'
					}
					iconColor="text-indigo-500"
					iconBg="bg-indigo-50"
					action={
						<Link
							href="/dashboard/patients/new"
							className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-500 text-white text-sm font-medium shadow-sm hover:shadow-md transition-shadow"
						>
							<UserPlus className="w-4 h-4" />
							Agregar paciente
						</Link>
					}
				/>
			</motion.div>
		);
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, delay: 0.15 }}
			className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden"
		>
			{/* Header */}
			<div className="p-5 border-b border-slate-100">
				<SectionHeader
					title="Pacientes recientes"
					subtitle="Últimos pacientes con actividad en la clínica"
					icon={Users2}
					action={
						<div className="flex items-center gap-3">
							<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
								{filteredList.length} {filteredList.length === 1 ? 'paciente' : 'pacientes'}
							</span>
							<Link
								href="/dashboard/patients"
								className="text-xs font-medium text-sky-600 hover:text-sky-700 transition-colors hidden sm:inline-flex"
							>
								Ver todos →
							</Link>
						</div>
					}
				/>
			</div>

			{/* Lista */}
			<ul className="divide-y divide-slate-50" role="list">
				{filteredList.map((p) => {
					const name =
						`${p.firstName ?? ''}${p.lastName ? ' ' + p.lastName : ''}`.trim() ||
						'Nombre no disponible';

					return (
						<li
							key={p.id}
							className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group"
							role="listitem"
						>
							<div className="flex items-center gap-3.5 min-w-0">
								<AvatarInitials name={name} size="sm" />
								<div className="min-w-0">
									<div className="text-sm font-medium text-slate-900 truncate">{name}</div>
									<div className="text-xs text-slate-500 truncate mt-0.5">
										Registrado: {fmtDate(p.createdAt)}
										{p.phone && <span className="text-slate-300 mx-1.5">·</span>}
										{p.phone && <span>{p.phone}</span>}
									</div>
								</div>
							</div>

							<div className="flex items-center gap-3 shrink-0">
								{/* Indicador de última actividad */}
								<div className="hidden sm:flex items-center gap-1.5">
									<span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
									<span className="text-xs text-slate-400">{timeAgo(p.createdAt)}</span>
								</div>

								<Link
									href={`/dashboard/patients/${p.id}`}
									className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
									aria-label={`Ver paciente ${name}`}
								>
									<ChevronRight className="w-4 h-4" />
								</Link>
							</div>
						</li>
					);
				})}
			</ul>

			{/* Footer */}
			<div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
				<span className="text-xs text-slate-500">
					Mostrando {filteredList.length} paciente{filteredList.length !== 1 ? 's' : ''} recientes
				</span>
				<Link
					href="/dashboard/patients"
					className="text-xs font-medium text-sky-600 hover:text-sky-700 transition-colors"
				>
					Ver lista completa →
				</Link>
			</div>
		</motion.div>
	);
}
