'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import Link from 'next/link';
import { FileText, PlusCircle, Download, Loader2, RefreshCw, Search, File, FileMinus, Calendar, User, Stethoscope, Eye, Filter, X, ChevronRight, Clock } from 'lucide-react';

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
		<main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/20 p-6 md:p-8">
			<div className="max-w-7xl mx-auto space-y-6">
				{/* Header Section - Enhanced */}
				<motion.div
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4 }}
					className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-600 p-8 md:p-10 shadow-2xl"
				>
					{/* Decorative elements */}
					<div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
					<div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24 blur-3xl" />

					<div className="relative z-10">
						<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
							<div className="space-y-2">
								<div className="flex items-center gap-3">
									<div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
										<FileText className="w-8 h-8 text-white" />
									</div>
									<div>
										<h1 className="text-3xl md:text-4xl font-bold text-white">Consultas Médicas</h1>
										<p className="text-teal-50 text-sm md:text-base mt-1">Gestión completa del historial clínico</p>
									</div>
								</div>
								<div className="flex items-center gap-4 pt-2">
									<div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl">
										<div className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse" />
										<span className="text-white text-sm font-medium">{consultations.length} consulta(s) registrada(s)</span>
									</div>
								</div>
							</div>

							<div className="flex items-center gap-3">
								<ActionButton
									onClick={() => {
										setQuery('');
										loadConsultations({ reset: true });
									}}
									variant="outline"
									title="Refrescar"
									leading={<RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />}
									disabled={refreshing}
								>
									Refrescar
								</ActionButton>

								<Link href="/dashboard/medic/consultas/new" className="inline-flex">
									<ActionButton variant="solid" title="Nueva consulta" leading={<PlusCircle size={18} />}>
										Nueva Consulta
									</ActionButton>
								</Link>
							</div>
						</div>
					</div>
				</motion.div>

				{/* Toolbar Section - Enhanced */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, delay: 0.1 }}
					className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-lg p-4 md:p-5"
				>
					<div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
						<div className="flex-1">
							<SearchInput value={query} onChange={setQuery} />
						</div>

						<div className="flex gap-2 items-center flex-wrap">
							<ActionButton
								onClick={exportCSV}
								variant="ghost"
								title="Exportar CSV"
								leading={exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
								disabled={!consultations.length || exporting}
							>
								{exporting ? 'Exportando...' : 'CSV'}
							</ActionButton>

							<ActionButton
								onClick={exportExcel}
								variant="ghost"
								title="Exportar Excel"
								leading={exporting ? <Loader2 size={14} className="animate-spin" /> : <File size={14} />}
								disabled={!consultations.length || exporting}
							>
								XLS
							</ActionButton>

							{query && (
								<ActionButton
									onClick={() => {
										setQuery('');
										loadConsultations({ reset: true });
									}}
									variant="outline"
									title="Limpiar filtros"
									leading={<X size={14} />}
								>
									Limpiar
								</ActionButton>
							)}
						</div>
					</div>
				</motion.div>

				{/* Consultations List - Enhanced Card Layout */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, delay: 0.2 }}
					className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-lg overflow-hidden"
				>
					{loading ? (
						<div className="p-8 md:p-12">
							<div className="flex items-center gap-3 text-slate-600 mb-6">
								<Loader2 className="animate-spin text-teal-600" size={20} />
								<span className="font-medium">Cargando consultas...</span>
							</div>

							{/* Enhanced skeleton */}
							<div className="space-y-4">
								{Array.from({ length: 5 }).map((_, i) => (
									<div key={i} className="animate-pulse">
										<div className="h-24 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 rounded-xl" />
									</div>
								))}
							</div>
						</div>
					) : error ? (
						<div className="p-8 md:p-12 text-center">
							<div className="mx-auto mb-4 w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center">
								<X className="w-8 h-8 text-rose-600" />
							</div>
							<p className="text-lg font-semibold text-rose-600 mb-2">Error al cargar consultas</p>
							<p className="text-sm text-slate-600">{error}</p>
						</div>
					) : consultations.length === 0 ? (
						<div className="p-12 md:p-16 text-center">
							<motion.div
								initial={{ scale: 0.8, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								transition={{ duration: 0.3 }}
								className="mx-auto mb-6 w-24 h-24 rounded-3xl bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center shadow-lg"
							>
								<FileText className="w-12 h-12 text-teal-600" />
							</motion.div>
							<h3 className="text-xl font-bold text-slate-900 mb-2">No hay consultas registradas</h3>
							<p className="text-slate-600 mb-6 max-w-md mx-auto">
								Comienza registrando tu primera consulta médica. Toda la información quedará guardada de forma segura.
							</p>
							<Link href="/dashboard/medic/consultas/new">
								<ActionButton variant="solid" leading={<PlusCircle size={18} />}>
									Crear Primera Consulta
								</ActionButton>
							</Link>
						</div>
					) : (
						<>
							{/* Enhanced Card Grid Layout */}
							<div className="p-4 md:p-6">
								<AnimatePresence mode="popLayout">
									<div className="grid grid-cols-1 gap-4">
										{consultations.map((c, index) => (
											<motion.div
												key={c.id}
												initial={{ opacity: 0, y: 20 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0, scale: 0.95 }}
												transition={{ duration: 0.3, delay: index * 0.05 }}
												whileHover={{ y: -2 }}
												className="group relative bg-white rounded-xl border border-slate-200 hover:border-teal-300 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
											>
												{/* Gradient accent bar */}
												<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500" />

												<div className="p-5 md:p-6">
													<div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
														{/* Left: Main Info */}
														<div className="flex-1 space-y-4">
															{/* Patient & Date Row */}
															<div className="flex flex-wrap items-center gap-3">
																{c.patient ? (
																	<div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-100">
																		<User className="w-4 h-4 text-teal-600" />
																		<span className="font-semibold text-slate-900 text-sm">
																			{c.patient.firstName} {c.patient.lastName}
																		</span>
																	</div>
																) : (
																	<div className="px-3 py-1.5 bg-slate-100 rounded-lg">
																		<span className="text-sm text-slate-500">Paciente no registrado</span>
																	</div>
																)}

																<div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg">
																	<Calendar className="w-4 h-4 text-slate-500" />
																	<span className="text-sm font-medium text-slate-700">{format(new Date(c.created_at), 'dd MMM yyyy')}</span>
																</div>

																<div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg">
																	<Clock className="w-4 h-4 text-slate-500" />
																	<span className="text-sm text-slate-600">{format(new Date(c.created_at), 'HH:mm')}</span>
																</div>
															</div>

															{/* Chief Complaint */}
															{c.chief_complaint && (
																<div className="space-y-1">
																	<div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
																		<Stethoscope className="w-3.5 h-3.5" />
																		Motivo de Consulta
																	</div>
																	<p className="text-slate-900 font-medium leading-relaxed">{c.chief_complaint}</p>
																</div>
															)}

															{/* Diagnosis */}
															{c.diagnosis && (
																<div className="space-y-1">
																	<div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
																		<FileText className="w-3.5 h-3.5" />
																		Diagnóstico
																	</div>
																	<p className="text-slate-700 leading-relaxed">{c.diagnosis}</p>
																</div>
															)}
														</div>

														{/* Right: Action Button */}
														<div className="flex items-center">
															<Link
																href={`/dashboard/medic/consultas/${c.id}`}
																className="group/btn inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
															>
																<Eye className="w-4 h-4" />
																<span>Ver Detalle</span>
																<ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
															</Link>
														</div>
													</div>
												</div>
											</motion.div>
										))}
									</div>
								</AnimatePresence>
							</div>

							{/* Footer with pagination */}
							<div className="px-4 md:px-6 py-4 bg-gradient-to-r from-slate-50 to-blue-50/30 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
								<div className="flex items-center gap-2 text-sm text-slate-600">
									<div className="w-2 h-2 bg-teal-500 rounded-full" />
									<span className="font-medium">Mostrando {consultations.length} consulta(s)</span>
								</div>
								<div>
									{hasMore ? (
										<ActionButton
											onClick={loadMore}
											variant="ghost"
											leading={refreshing ? <Loader2 className="animate-spin" size={16} /> : undefined}
											disabled={refreshing}
										>
											{refreshing ? 'Cargando...' : 'Cargar más consultas'}
										</ActionButton>
									) : (
										<div className="flex items-center gap-2 px-4 py-2 text-sm text-slate-500">
											<div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
											<span>No hay más consultas para mostrar</span>
										</div>
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
