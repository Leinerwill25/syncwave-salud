'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, SortAsc, Eye, Edit2, Users } from 'lucide-react';

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
				return (
					<span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-emerald-50 text-emerald-800">
						<span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" aria-hidden />
						Activo
					</span>
				);
			case 'PENDING':
				return (
					<span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-amber-50 text-amber-800">
						<span className="w-2 h-2 rounded-full bg-amber-500 inline-block" aria-hidden />
						Pendiente
					</span>
				);
			case 'SUSPENDED':
				return (
					<span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-red-50 text-red-800">
						<span className="w-2 h-2 rounded-full bg-red-500 inline-block" aria-hidden />
						Suspendido
					</span>
				);
			default:
				return (
					<span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-slate-50 text-slate-700">
						<span className="w-2 h-2 rounded-full bg-slate-400 inline-block" aria-hidden />
						{status}
					</span>
				);
		}
	}

	/* Empty state */
	if (!users || users.length === 0) {
		return (
			<div className="rounded-2xl border border-dashed border-slate-100 bg-white p-6 text-center shadow-sm">
				<div className="mx-auto w-full max-w-md">
					<div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-sky-50 text-sky-600 mb-4 shadow-sm">
						<Users className="w-6 h-6" />
					</div>
					<div className="text-slate-900 font-semibold text-lg mb-1">Sin especialistas aún</div>
					<p className="text-sm text-slate-500">Invita a tu primer especialista para que pueda empezar a atender pacientes desde la plataforma.</p>
					<div className="mt-6 flex justify-center gap-3">
						<Link href="/dashboard/clinic/invites" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-sky-600 text-white text-sm font-medium shadow-md hover:brightness-95 transition">
							Crear invitación
						</Link>
						<Link href="/dashboard/clinic/specialists/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-100 bg-white text-sm text-slate-700 hover:shadow-sm transition">
							Invitar manualmente
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm overflow-hidden">
			{/* Header / Controls */}
			<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 border-b border-slate-100">
				{/* Left title & subtitle: aseguramos espacio y que no se trunque */}
				<div className="flex items-start md:items-center gap-3 min-w-0">
					<div className="flex flex-col leading-tight">
						<h3 className="text-base md:text-lg font-semibold text-slate-900">Especialistas</h3>
						{/* Forzamos que el texto pueda ocupar varias líneas y tenga un ancho cómodo */}
						<p className="text-xs text-slate-500 max-w-xs md:max-w-sm whitespace-normal leading-tight">Lista de profesionales registrados en la clínica</p>
					</div>
				</div>

				{/* Right controls: search + sort */}
				<div className="flex items-center gap-3 w-full md:w-auto">
					{/* Search input */}
					<div className="relative flex-1 md:flex-initial">
						<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<Search className="w-4 h-4 text-slate-400" />
						</div>
						<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o email..." className="w-full md:w-72 pl-10 pr-3 py-2 rounded-lg border border-slate-100 bg-slate-50 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 transition" aria-label="Buscar especialistas" />
					</div>

					{/* Sort button: mayor hit-area, contraste y borde más suave para que no se vea "aplastado" */}
					<button type="button" onClick={() => setSortDir((s) => (s === 'asc' ? 'desc' : 'asc'))} className="inline-flex items-center justify-center gap-2 w-12 h-10 p-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:shadow-sm transition" aria-label="Ordenar por nombre" title={`Orden: ${sortDir === 'asc' ? 'Ascendente (A → Z)' : 'Descendente (Z → A)'}`}>
						{/* icono + texto vertical para claridad */}
						<div className="flex flex-col items-center text-xs leading-none select-none">
							<SortAsc className="w-5 h-5" />
							<span className="mt-0.5 text-[11px] font-medium">{sortDir === 'asc' ? 'A → Z' : 'Z → A'}</span>
						</div>
					</button>
				</div>
			</div>

			{/* Table */}
			<div className="overflow-x-auto">
				<table className="min-w-full w-full divide-y divide-slate-100">
					<thead className="bg-gradient-to-r from-slate-50 to-white">
						<tr>
							<th className="text-left px-6 py-3 text-xs font-medium text-slate-500 tracking-wider">Especialista</th>
							<th className="text-left px-6 py-3 text-xs font-medium text-slate-500 tracking-wider">Email</th>
							<th className="text-left px-6 py-3 text-xs font-medium text-slate-500 tracking-wider">Estado</th>
							<th className="text-right px-6 py-3 text-xs font-medium text-slate-500 tracking-wider">Acciones</th>
						</tr>
					</thead>

					<tbody className="bg-white divide-y divide-slate-100">
						{filtered.map((u, idx) => (
							<tr key={u.id} className={`transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100`}>
								{/* Specialist */}
								<td className="px-6 py-4 align-middle">
									<div className="flex items-center gap-3">
										{/* Avatar / initials with soft gradient */}
										<div
											className="flex items-center justify-center w-11 h-11 rounded-xl font-semibold text-white shrink-0"
											style={{
												background: `linear-gradient(135deg, rgba(99,102,241,0.95), rgba(14,165,233,0.95))`,
											}}>
											<div className="text-sm">{initials(u.name)}</div>
										</div>

										<div className="min-w-0">
											<div className="text-sm font-medium text-slate-900 truncate">{u.name ?? 'Sin nombre'}</div>
											<div className="text-xs text-slate-400 truncate">{u.role ?? 'Especialista'}</div>
										</div>
									</div>
								</td>

								{/* Email */}
								<td className="px-6 py-4 align-middle">
									<div className="text-sm text-slate-700 truncate max-w-[22rem]">{u.email ?? '—'}</div>
								</td>

								{/* Status */}
								<td className="px-6 py-4 align-middle">{statusBadge(u.status)}</td>

								{/* Actions */}
								<td className="px-6 py-4 text-right align-middle">
									<div className="inline-flex items-center justify-end gap-2">
										<Link href={`/dashboard/clinic/specialists/${u.id}`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-100 bg-white text-sm text-slate-700 hover:shadow-sm transition">
											<Eye className="w-4 h-4" />
											<span>Ver</span>
										</Link>

										<Link href={`/dashboard/clinic/specialists/${u.id}/edit`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-sky-600 text-white text-sm hover:brightness-95 transition">
											<Edit2 className="w-4 h-4" />
											<span>Editar</span>
										</Link>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Footer: count */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-3 border-t border-slate-100 text-sm gap-2">
				<div className="text-slate-600">
					<span className="font-medium text-slate-800 mr-1">{filtered.length}</span>
					especialista{filtered.length !== 1 ? 's' : ''}
				</div>
				<div className="text-xs text-slate-400">Última actualización: —</div>
			</div>
		</div>
	);
}
