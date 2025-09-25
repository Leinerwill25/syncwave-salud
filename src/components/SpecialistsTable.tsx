// components/SpecialistsTable.tsx
'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';

type User = { id: string; name?: string | null; email?: string | null; createdAt?: string | Date; role?: string | null; status?: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | string };

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

	function initials(name?: string | null) {
		if (!name) return '—';
		return name
			.split(' ')
			.map((p) => p[0])
			.slice(0, 2)
			.join('')
			.toUpperCase();
	}

	function statusBadge(status?: string) {
		switch ((status ?? 'ACTIVE').toUpperCase()) {
			case 'ACTIVE':
				return <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-md text-xs bg-emerald-50 text-emerald-700">● Activo</span>;
			case 'PENDING':
				return <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-md text-xs bg-amber-50 text-amber-700">● Pendiente</span>;
			case 'SUSPENDED':
				return <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-md text-xs bg-red-50 text-red-700">● Suspendido</span>;
			default:
				return <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-md text-xs bg-slate-50 text-slate-700">● {status}</span>;
		}
	}

	if (!users || users.length === 0) {
		return (
			<div className="rounded-2xl border border-dashed border-slate-100 bg-white p-6 text-center shadow-sm">
				<div className="text-slate-900 font-semibold text-lg mb-1">Sin especialistas aún</div>
				<p className="text-sm text-slate-500">Invita a tu primer especialista para que pueda empezar a atender pacientes desde la plataforma.</p>
				<div className="mt-5 flex justify-center gap-3">
					<Link href="/dashboard/clinic/invites" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-sky-600 text-white text-sm font-medium shadow-md hover:brightness-95 transition">
						Crear invitación
					</Link>
					<Link href="/dashboard/clinic/specialists/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-100 bg-white text-sm text-slate-700 hover:shadow-sm transition">
						Agregar especialista
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm overflow-hidden">
			{/* Header / Controls */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-slate-100">
				<div>
					<h3 className="text-sm font-semibold text-slate-900">Especialistas</h3>
					<p className="text-xs text-slate-500">Lista de profesionales registrados en la clínica</p>
				</div>

				<div className="flex items-center gap-3 w-full sm:w-auto">
					<div className="relative flex-1 sm:flex-initial">
						<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o email..." className="w-full sm:w-72 px-3 py-2 rounded-lg border border-slate-100 bg-slate-50 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 transition" aria-label="Buscar especialistas" />
						<svg className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" aria-hidden>
							<path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
							<circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.2" />
						</svg>
					</div>

					<button type="button" onClick={() => setSortDir((s) => (s === 'asc' ? 'desc' : 'asc'))} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-100 bg-white text-sm text-slate-700 hover:shadow-sm transition" aria-label="Ordenar por nombre" title={`Orden: ${sortDir === 'asc' ? 'Ascendente' : 'Descendente'}`}>
						<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
							<path d="M6 9l6-6 6 6M6 15l6 6 6-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
						<span className="sr-only">Orden</span>
						<span className="text-xs">{sortDir === 'asc' ? 'A→Z' : 'Z→A'}</span>
					</button>
				</div>
			</div>

			{/* Table */}
			<div className="overflow-x-auto">
				<table className="min-w-full w-full divide-y divide-slate-100">
					<thead className="bg-slate-50">
						<tr>
							<th className="text-left px-4 py-3 text-xs text-slate-500">Especialista</th>
							<th className="text-left px-4 py-3 text-xs text-slate-500">Email</th>
							<th className="text-left px-4 py-3 text-xs text-slate-500 hidden md:table-cell">Registrado</th>
							<th className="text-left px-4 py-3 text-xs text-slate-500">Estado</th>
							<th className="text-right px-4 py-3 text-xs text-slate-500">Acciones</th>
						</tr>
					</thead>

					<tbody className="bg-white divide-y divide-slate-100">
						{filtered.map((u) => (
							<tr key={u.id} className="hover:bg-slate-50 transition-colors">
								<td className="px-4 py-3">
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-50 text-slate-800 font-semibold">{initials(u.name)}</div>
										<div className="min-w-0">
											<div className="text-sm font-medium text-slate-900 truncate">{u.name ?? 'Sin nombre'}</div>
											<div className="text-xs text-slate-400 truncate">{u.role ?? 'Especialista'}</div>
										</div>
									</div>
								</td>

								<td className="px-4 py-3">
									<div className="text-sm text-slate-700 truncate max-w-[18rem]">{u.email ?? '—'}</div>
								</td>

								<td className="px-4 py-3 hidden md:table-cell">
									<div className="text-sm text-slate-500">{u.createdAt ? new Date(String(u.createdAt)).toLocaleDateString() : '—'}</div>
								</td>

								<td className="px-4 py-3">
									<div>{statusBadge(u.status)}</div>
								</td>

								<td className="px-4 py-3 text-right">
									<div className="flex items-center justify-end gap-2">
										<Link href={`/dashboard/clinic/specialists/${u.id}`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-100 bg-white text-sm text-slate-700 hover:shadow-sm transition">
											Ver
										</Link>

										<Link href={`/dashboard/clinic/specialists/${u.id}/edit`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-sky-600 text-white text-sm hover:brightness-95 transition">
											Editar
										</Link>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Footer: count */}
			<div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm">
				<div className="text-slate-600">
					{filtered.length} especialista{filtered.length !== 1 ? 's' : ''}
				</div>
				<div className="text-xs text-slate-400">Última actualización: —</div>
			</div>
		</div>
	);
}
