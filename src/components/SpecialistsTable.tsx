/** @refactored ASHIRA Clinic Dashboard - SpecialistsTable */
'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, ArrowUpDown, ChevronRight, Users } from 'lucide-react';
import { AvatarInitials } from '@/components/shared/AvatarInitials';
import { EmptyState } from '@/components/shared/EmptyState';
import { SectionHeader } from '@/components/shared/SectionHeader';

type User = {
	id: string;
	name?: string | null;
	email?: string | null;
	createdAt?: string | Date;
	role?: string | null;
	status?: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | string;
};

function statusBadge(status?: string) {
	const s = (status ?? 'ACTIVE').toUpperCase();
	const config: Record<string, { dot: string; bg: string; text: string; label: string }> = {
		ACTIVE: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Activo' },
		PENDING: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pendiente' },
		SUSPENDED: { dot: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', label: 'Suspendido' },
	};
	const c = config[s] ?? { dot: 'bg-slate-400', bg: 'bg-slate-50', text: 'text-slate-600', label: status ?? 'Desconocido' };

	return (
		<span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
			<span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} aria-hidden="true" />
			{c.label}
		</span>
	);
}

function fmtDate(d?: string | Date): string {
	if (!d) return '—';
	try {
		return new Date(String(d)).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' });
	} catch {
		return '—';
	}
}

export default function SpecialistsTable({ users }: { users: User[] }) {
	const [query, setQuery] = useState('');
	const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		let list = Array.isArray(users) ? users.slice() : [];
		if (q) {
			list = list.filter((u) => (u.name ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q));
		}
		list.sort((a, b) => {
			const an = (a.name ?? '').toLowerCase();
			const bn = (b.name ?? '').toLowerCase();
			if (an < bn) return sortDir === 'asc' ? -1 : 1;
			if (an > bn) return sortDir === 'asc' ? 1 : -1;
			return 0;
		});
		return list;
	}, [users, query, sortDir]);

	/* Empty state */
	if (!users || users.length === 0) {
		return (
			<motion.div
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3 }}
				className="rounded-2xl border border-dashed border-slate-200 bg-white shadow-sm"
			>
				<EmptyState
					icon={Users}
					title="Sin especialistas aún"
					description="Invita a tu primer especialista para que pueda empezar a atender pacientes desde la plataforma."
					iconColor="text-sky-500"
					iconBg="bg-sky-50"
					action={
						<div className="flex items-center gap-3">
							<Link
								href="/dashboard/clinic/invites"
								className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-500 text-white text-sm font-medium shadow-sm hover:shadow-md transition-shadow"
							>
								Crear invitación
							</Link>
							<Link
								href="/dashboard/clinic/specialists/new"
								className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 transition-colors"
							>
								Invitar manualmente
							</Link>
						</div>
					}
				/>
			</motion.div>
		);
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, delay: 0.1 }}
			className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
		>
			{/* Header */}
			<div className="p-5 border-b border-slate-100">
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
					<SectionHeader
						title="Especialistas"
						subtitle="Profesionales registrados en la clínica"
						icon={Users}
						action={
							<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-medium">
								{users.length} {users.length === 1 ? 'registrado' : 'registrados'}
							</span>
						}
					/>
				</div>

				{/* Barra de búsqueda + sort */}
				<div className="flex items-center gap-3 mt-4">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
						<input
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Buscar por nombre o email..."
							className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition"
							aria-label="Buscar especialistas"
						/>
					</div>
					<button
						type="button"
						onClick={() => setSortDir((s) => (s === 'asc' ? 'desc' : 'asc'))}
						className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 transition-colors"
						aria-label={`Ordenar ${sortDir === 'asc' ? 'descendente' : 'ascendente'}`}
						title={`Orden: ${sortDir === 'asc' ? 'A → Z' : 'Z → A'}`}
					>
						<ArrowUpDown className="w-4 h-4" />
						<span className="hidden sm:inline text-xs font-medium">{sortDir === 'asc' ? 'A → Z' : 'Z → A'}</span>
					</button>
				</div>
			</div>

			{/* Lista de cards */}
			<ul className="divide-y divide-slate-50" role="list">
				{filtered.map((u) => (
					<li
						key={u.id}
						className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
					>
						<div className="flex items-center gap-3.5 min-w-0">
							<AvatarInitials name={u.name ?? 'Sin nombre'} size="md" />
							<div className="min-w-0">
								<div className="text-sm font-medium text-slate-900 truncate">{u.name ?? 'Sin nombre'}</div>
								<div className="text-xs text-slate-500 truncate">{u.email ?? '—'}</div>
							</div>
						</div>

						<div className="flex items-center gap-3 shrink-0">
							<div className="hidden md:block">
								{statusBadge(u.status)}
							</div>
							<div className="hidden lg:block text-xs text-slate-400">
								{fmtDate(u.createdAt)}
							</div>
							<Link
								href={`/dashboard/clinic/specialists/${u.id}`}
								className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
								aria-label={`Ver perfil de ${u.name ?? 'especialista'}`}
							>
								<ChevronRight className="w-4 h-4" />
							</Link>
						</div>
					</li>
				))}
			</ul>

			{/* Footer */}
			<div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
				<span className="text-xs text-slate-500">
					<span className="font-medium text-slate-700">{filtered.length}</span> especialista{filtered.length !== 1 ? 's' : ''}
				</span>
				<Link
					href="/dashboard/clinic/specialists"
					className="text-xs font-medium text-sky-600 hover:text-sky-700 transition-colors"
				>
					Ver todos los especialistas →
				</Link>
			</div>
		</motion.div>
	);
}
