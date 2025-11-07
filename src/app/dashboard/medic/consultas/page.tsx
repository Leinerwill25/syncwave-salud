'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import Link from 'next/link';
import { FileText, PlusCircle, Download, Loader2, RefreshCw, Search, File, FileMinus } from 'lucide-react';

type Patient = {
	firstName: string;
	lastName: string;
};

type Consultation = {
	id: string;
	chief_complaint: string | null;
	diagnosis: string | null;
	created_at: string;
	patient?: Patient | null;
};

const SearchInput = ({ value, onChange, placeholder = 'Buscar por motivo, diagnóstico o paciente...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) => {
	return (
		<label className="relative block w-full" aria-label="Buscar consultas">
			<span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
				<Search size={16} />
			</span>

			<input
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 shadow-sm
                   focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-600 transition"
				aria-label="Buscar"
			/>
		</label>
	);
};

const ActionButton = ({ children, onClick, title, variant = 'solid', leading, disabled = false }: { children: React.ReactNode; onClick?: () => void; title?: string; variant?: 'solid' | 'ghost' | 'outline'; leading?: React.ReactNode; disabled?: boolean }) => {
	const base = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-1 text-sm';
	if (variant === 'solid') {
		return (
			<button title={title} onClick={onClick} disabled={disabled} className={`${base} bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow hover:from-teal-700 hover:to-cyan-700 focus:ring-cyan-200 disabled:opacity-60`}>
				{leading}
				{children}
			</button>
		);
	}
	if (variant === 'ghost') {
		return (
			<button title={title} onClick={onClick} disabled={disabled} className={`${base} bg-white/60 text-slate-700 border border-transparent shadow-sm hover:bg-slate-50 disabled:opacity-60`}>
				{leading}
				{children}
			</button>
		);
	}
	// outline
	return (
		<button title={title} onClick={onClick} disabled={disabled} className={`${base} bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 disabled:opacity-60`}>
			{leading}
			{children}
		</button>
	);
};

export default function ConsultationsPage() {
	const [consultations, setConsultations] = useState<Consultation[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// paging + search
	const [page, setPage] = useState(1);
	const pageSize = 10;
	const [hasMore, setHasMore] = useState(false);
	const [query, setQuery] = useState('');
	const debounceRef = useRef<number | null>(null);
	const [refreshing, setRefreshing] = useState(false);
	const [exporting, setExporting] = useState(false);

	// fetcher (supports page + q)
	async function loadConsultations({ reset = false } = {}) {
		try {
			setError(null);
			setRefreshing(!reset && true);
			if (reset) {
				setLoading(true);
				setPage(1);
			}

			const currentPage = reset ? 1 : page;
			const url = new URL('/api/consultations', location.origin);
			url.searchParams.set('page', String(currentPage));
			url.searchParams.set('pageSize', String(pageSize));
			if (query.trim()) url.searchParams.set('q', query.trim());

			const res = await fetch(url.toString(), { cache: 'no-store' });
			const data = await res.json();

			if (!res.ok) throw new Error(data?.error || 'Error cargando consultas');

			const items: Consultation[] = data.items || [];
			const total: number = typeof data.total === 'number' ? data.total : reset ? items.length : (undefined as any);

			if (reset) {
				setConsultations(items);
			} else {
				setConsultations((prev) => [...prev, ...items]);
			}

			// decide si hay más
			const loadedCount = reset ? items.length : typeof data.total === 'number' ? consultations.length + items.length : consultations.length + items.length;
			if (typeof total === 'number') {
				setHasMore((reset ? items.length : consultations.length + items.length) < total);
			} else {
				setHasMore(items.length === pageSize);
			}
		} catch (err: any) {
			console.error('Error cargando consultas:', err);
			setError(err.message || String(err));
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}

	// primera carga
	useEffect(() => {
		loadConsultations({ reset: true });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// search debounce
	useEffect(() => {
		if (debounceRef.current) window.clearTimeout(debounceRef.current);
		debounceRef.current = window.setTimeout(() => {
			loadConsultations({ reset: true });
		}, 450);
		return () => {
			if (debounceRef.current) window.clearTimeout(debounceRef.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query]);

	async function loadMore() {
		const nextPage = page + 1;
		setPage(nextPage);
		try {
			setRefreshing(true);
			const url = new URL('/api/consultations', location.origin);
			url.searchParams.set('page', String(nextPage));
			url.searchParams.set('pageSize', String(pageSize));
			if (query.trim()) url.searchParams.set('q', query.trim());

			const res = await fetch(url.toString(), { cache: 'no-store' });
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || 'Error cargando más consultas');

			const items: Consultation[] = data.items || [];
			const totalFromServer = typeof data.total === 'number' ? data.total : undefined;

			setConsultations((prev) => {
				const newArr = [...prev, ...items];
				if (typeof totalFromServer === 'number') {
					setHasMore(newArr.length < totalFromServer);
				} else {
					setHasMore(items.length === pageSize);
				}
				return newArr;
			});
		} catch (err: any) {
			console.error('Error loadMore:', err);
			setError(err?.message || String(err));
		} finally {
			setRefreshing(false);
		}
	}

	function exportCSV() {
		if (!consultations.length) return;
		setExporting(true);
		try {
			const header = ['Fecha', 'Paciente', 'Motivo', 'Diagnóstico'];
			const rows = consultations.map((c) => [format(new Date(c.created_at), 'dd/MM/yyyy HH:mm'), c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : '', c.chief_complaint || '', c.diagnosis || '']);
			const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
			const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `consultas_${new Date().toISOString()}.csv`;
			a.click();
			URL.revokeObjectURL(url);
		} finally {
			setExporting(false);
		}
	}

	/**
	 * Simple "Excel" export without external libs:
	 * Generates an HTML table and downloads with MIME type application/vnd.ms-excel
	 * This approach is widely compatible with Excel and avoids adding SheetJS for small exports.
	 * Note: If necesitas un .xlsx real, puedo integrar SheetJS en el proyecto.
	 */
	function exportExcel() {
		if (!consultations.length) return;
		setExporting(true);
		try {
			const headers = ['Fecha', 'Paciente', 'Motivo', 'Diagnóstico'];
			const rows = consultations.map((c) => [format(new Date(c.created_at), 'dd/MM/yyyy HH:mm'), c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : '', c.chief_complaint || '', c.diagnosis || '']);

			let table = '<table>';
			table += '<thead><tr>' + headers.map((h) => `<th style="background:#f4f6f8;padding:6px;border:1px solid #ddd">${h}</th>`).join('') + '</tr></thead>';
			table += '<tbody>';
			for (const r of rows) {
				table += '<tr>' + r.map((c) => `<td style="padding:6px;border:1px solid #ddd">${String(c ?? '')}</td>`).join('') + '</tr>';
			}
			table += '</tbody></table>';

			const blob = new Blob([table], { type: 'application/vnd.ms-excel' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `consultas_${new Date().toISOString()}.xls`;
			a.click();
			URL.revokeObjectURL(url);
		} finally {
			setExporting(false);
		}
	}

	return (
		<main className="min-h-screen bg-slate-50 dark:bg-[#071027] p-8">
			<div className="max-w-6xl mx-auto">
				{/* Header */}
				<div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
					<div>
						<h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Consultas Médicas</h1>
						<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Historial de consultas del centro — filtra, exporta o crea una nueva consulta.</p>
						<div className="mt-3 text-xs text-slate-500">Datos mostrados: {consultations.length} consulta(s)</div>
					</div>

					<div className="flex items-center justify-end gap-3">
						<ActionButton
							onClick={() => {
								setQuery('');
								loadConsultations({ reset: true });
							}}
							variant="outline"
							title="Refrescar"
							leading={<RefreshCw size={16} />}>
							Refrescar
						</ActionButton>

						<Link href="/dashboard/medic/consultas/new" className="inline-flex">
							<ActionButton variant="solid" title="Nueva consulta" leading={<PlusCircle size={16} />}>
								Nueva Consulta
							</ActionButton>
						</Link>
					</div>
				</div>

				{/* Toolbar */}
				<div className="mb-4 flex flex-col md:flex-row gap-3 items-center">
					<div className="flex-1">
						<SearchInput value={query} onChange={setQuery} />
					</div>

					<div className="flex gap-2 items-center">
						<ActionButton onClick={exportCSV} variant="ghost" title="Exportar CSV" leading={<Download size={14} />} disabled={!consultations.length || exporting}>
							{exporting ? 'Exportando...' : 'CSV'}
						</ActionButton>

						<ActionButton onClick={exportExcel} variant="ghost" title="Exportar Excel" leading={<File size={14} />} disabled={!consultations.length || exporting}>
							XLS
						</ActionButton>

						<ActionButton
							onClick={() => {
								// ejemplo: limpiar filtros
								setQuery('');
								loadConsultations({ reset: true });
							}}
							variant="outline"
							title="Limpiar filtros"
							leading={<FileMinus size={14} />}>
							Limpiar
						</ActionButton>
					</div>
				</div>

				<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/95 dark:bg-[#071828] rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
					{loading ? (
						<div className="p-6">
							<div className="flex items-center gap-3 text-slate-500">
								<Loader2 className="animate-spin" />
								Cargando consultas...
							</div>

							{/* skeleton rows */}
							<div className="mt-4 space-y-3">
								{Array.from({ length: 5 }).map((_, i) => (
									<div key={i} className="flex flex-col gap-2 animate-pulse">
										<div className="h-4 w-1/4 bg-slate-100 rounded" />
										<div className="h-4 w-3/4 bg-slate-100 rounded" />
										<div className="h-4 w-full bg-slate-100 rounded" />
									</div>
								))}
							</div>
						</div>
					) : error ? (
						<p className="p-6 text-rose-600">Error: {error}</p>
					) : consultations.length === 0 ? (
						<div className="p-8 text-center">
							<div className="mx-auto mb-4 w-20 h-20 rounded-full bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center text-teal-600">
								<FileText size={28} />
							</div>
							<p className="text-lg font-medium text-slate-800 dark:text-slate-100">No hay consultas registradas</p>
							<p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
								Crea la primera consulta usando el botón <strong>“Nueva Consulta”</strong>.
							</p>
						</div>
					) : (
						<>
							<div className="overflow-x-auto">
								<table className="min-w-full text-sm divide-y divide-slate-100">
									<thead className="bg-gradient-to-r from-teal-50 to-cyan-50 text-slate-700">
										<tr>
											<th className="text-left p-3">Fecha</th>
											<th className="text-left p-3">Paciente</th>
											<th className="text-left p-3">Motivo</th>
											<th className="text-left p-3">Diagnóstico</th>
											<th className="text-center p-3">Acciones</th>
										</tr>
									</thead>

									<tbody className="bg-white">
										{consultations.map((c) => (
											<tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900 transition">
												<td className="p-3 align-middle text-slate-700 dark:text-slate-200">{format(new Date(c.created_at), 'dd/MM/yyyy HH:mm')}</td>
												<td className="p-3 font-medium text-slate-800 dark:text-slate-100">
													{c.patient ? (
														<div className="inline-flex items-center gap-2">
															<div className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 text-xs">{c.patient.firstName}</div>
															<div className="text-sm text-slate-600 dark:text-slate-300">{c.patient.lastName}</div>
														</div>
													) : (
														'—'
													)}
												</td>
												<td className="p-3 text-slate-700 dark:text-slate-300">{c.chief_complaint || '—'}</td>
												<td className="p-3 text-slate-700 dark:text-slate-300">{c.diagnosis || '—'}</td>
												<td className="text-center p-3">
													<Link href={`/dashboard/medic/consultas/${c.id}`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-teal-700 bg-teal-50 hover:bg-teal-100 transition">
														<FileText size={16} />
														Ver
													</Link>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							<div className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
								<div className="text-xs text-slate-500">Mostrando {consultations.length} resultado(s)</div>
								<div>
									{hasMore ? (
										<ActionButton onClick={loadMore} variant="ghost" leading={refreshing ? <Loader2 className="animate-spin" /> : undefined} disabled={refreshing}>
											{refreshing ? 'Cargando...' : 'Cargar más'}
										</ActionButton>
									) : (
										<button disabled className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border text-slate-400">
											No hay más
										</button>
									)}
								</div>
							</div>
						</>
					)}
				</motion.div>
			</div>
		</main>
	);
}
