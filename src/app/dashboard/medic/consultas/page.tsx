'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import Link from 'next/link';
import { FileText, PlusCircle, Download, Loader2, RefreshCw, Search, File, FileMinus, User, Calendar, Stethoscope, AlertCircle } from 'lucide-react';
import { useLiteMode } from '@/contexts/LiteModeContext';
import { getLiteAnimation, getLiteCacheConfig } from '@/lib/lite-mode-utils';

type Patient = {
	firstName: string;
	lastName: string;
	identifier?: string;
	isUnregistered?: boolean;
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
			<span className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
				<Search size={18} className="text-slate-400" />
			</span>

			<input
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-slate-200 bg-white text-slate-800 placeholder-slate-400 shadow-sm
                   focus:outline-none focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200
                   hover:border-slate-300"
				aria-label="Buscar"
			/>
		</label>
	);
};

const ActionButton = ({ children, onClick, title, variant = 'solid', leading, disabled = false }: { children: React.ReactNode; onClick?: () => void; title?: string; variant?: 'solid' | 'ghost' | 'outline'; leading?: React.ReactNode; disabled?: boolean }) => {
	const base = 'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 text-sm shadow-sm';
	if (variant === 'solid') {
		return (
			<button title={title} onClick={onClick} disabled={disabled} className={`${base} bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-700 hover:to-cyan-700 hover:shadow-lg focus:ring-teal-500/30 disabled:opacity-60 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0`}>
				{leading}
				{children}
			</button>
		);
	}
	if (variant === 'ghost') {
		return (
			<button title={title} onClick={onClick} disabled={disabled} className={`${base} bg-white/80 backdrop-blur-sm text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-500/20 disabled:opacity-60 disabled:cursor-not-allowed`}>
				{leading}
				{children}
			</button>
		);
	}
	// outline
	return (
		<button title={title} onClick={onClick} disabled={disabled} className={`${base} bg-white text-slate-700 border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-500/20 disabled:opacity-60 disabled:cursor-not-allowed`}>
			{leading}
			{children}
		</button>
	);
};

export default function ConsultationsPage() {
	const [consultations, setConsultations] = useState<Consultation[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// paging + search - Optimizado para conexiones lentas
	const [page, setPage] = useState(1);
	const pageSize = 8; // Reducido de 10 a 8 para cargar más rápido
	const [hasMore, setHasMore] = useState(false);
	const [query, setQuery] = useState('');
	const debounceRef = useRef<number | null>(null);
	const [refreshing, setRefreshing] = useState(false);
	const [exporting, setExporting] = useState(false);
	const { isLiteMode } = useLiteMode();

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
			if (isLiteMode) url.searchParams.set('liteMode', 'true');

			// Usar caché optimizado según liteMode
			const cacheConfig = getLiteCacheConfig(isLiteMode);
			const res = await fetch(url.toString(), { 
				next: { revalidate: cacheConfig.revalidate },
				cache: cacheConfig.cache,
				credentials: 'include',
			});
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

	// search debounce optimizado según liteMode
	useEffect(() => {
		if (debounceRef.current) window.clearTimeout(debounceRef.current);
		const debounceTime = isLiteMode ? 800 : 600; // Más tiempo en liteMode
		debounceRef.current = window.setTimeout(() => {
			loadConsultations({ reset: true });
		}, debounceTime);
		return () => {
			if (debounceRef.current) window.clearTimeout(debounceRef.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, isLiteMode]);

	async function loadMore() {
		const nextPage = page + 1;
		setPage(nextPage);
		try {
			setRefreshing(true);
			const url = new URL('/api/consultations', location.origin);
			url.searchParams.set('page', String(nextPage));
			url.searchParams.set('pageSize', String(pageSize));
			if (query.trim()) url.searchParams.set('q', query.trim());
			if (isLiteMode) url.searchParams.set('liteMode', 'true');

			// Usar caché optimizado según liteMode
			const cacheConfig = getLiteCacheConfig(isLiteMode);
			const res = await fetch(url.toString(), { 
				next: { revalidate: cacheConfig.revalidate },
				cache: cacheConfig.cache,
				credentials: 'include',
			});
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
			const header = ['Fecha', 'Paciente', 'Tipo', 'Motivo', 'Diagnóstico'];
			const rows = consultations.map((c) => [format(new Date(c.created_at), 'dd/MM/yyyy HH:mm'), c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : 'Sin paciente', c.patient?.isUnregistered ? 'No Registrado' : c.patient ? 'Registrado' : 'N/A', c.chief_complaint || '', c.diagnosis || '']);
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
			const headers = ['Fecha', 'Paciente', 'Tipo', 'Motivo', 'Diagnóstico'];
			const rows = consultations.map((c) => [format(new Date(c.created_at), 'dd/MM/yyyy HH:mm'), c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : 'Sin paciente', c.patient?.isUnregistered ? 'No Registrado' : c.patient ? 'Registrado' : 'N/A', c.chief_complaint || '', c.diagnosis || '']);

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
		<main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-4 sm:p-6 md:p-8">
			<div className="max-w-7xl mx-auto space-y-6">
				{/* Header Section - Mejorado */}
				<motion.div {...getLiteAnimation(isLiteMode)} className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/50 p-6 sm:p-8">
					<div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
						<div className="flex-1">
							<div className="flex items-center gap-3 mb-3">
								<div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg">
									<Stethoscope className="w-6 h-6 text-white" />
								</div>
								<div>
									<h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Consultas Médicas</h1>
									<p className="text-sm sm:text-base text-slate-600 mt-1.5">Gestión integral del historial clínico de consultas</p>
								</div>
							</div>
							<div className="flex flex-wrap items-center gap-4 mt-4">
								<div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
									<FileText className="w-4 h-4 text-slate-600" />
									<span className="text-sm font-semibold text-slate-700">{consultations.length}</span>
									<span className="text-xs text-slate-500">consulta{consultations.length !== 1 ? 's' : ''}</span>
								</div>
							</div>
						</div>

						<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
							<ActionButton
								onClick={() => {
									setQuery('');
									loadConsultations({ reset: true });
								}}
								variant="outline"
								title="Refrescar"
								leading={<RefreshCw size={18} />}>
								<span className="hidden sm:inline">Refrescar</span>
								<span className="sm:hidden">Actualizar</span>
							</ActionButton>

							<Link href="/dashboard/medic/consultas/new" className="inline-flex">
								<ActionButton variant="solid" title="Nueva consulta" leading={<PlusCircle size={18} />}>
									<span className="hidden sm:inline">Nueva Consulta</span>
									<span className="sm:hidden">Nueva</span>
								</ActionButton>
							</Link>
						</div>
					</div>
				</motion.div>

				{/* Toolbar Section - Mejorado */}
				<motion.div {...getLiteAnimation(isLiteMode)} className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/50 p-4 sm:p-6">
					<div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
						<div className="flex-1 w-full">
							<SearchInput value={query} onChange={setQuery} />
						</div>

						<div className="flex flex-wrap gap-2 items-center justify-end">
							<ActionButton onClick={exportCSV} variant="ghost" title="Exportar CSV" leading={<Download size={16} />} disabled={!consultations.length || exporting}>
								<span className="hidden sm:inline">{exporting ? 'Exportando...' : 'Exportar CSV'}</span>
								<span className="sm:hidden">{exporting ? '...' : 'CSV'}</span>
							</ActionButton>

							<ActionButton onClick={exportExcel} variant="ghost" title="Exportar Excel" leading={<File size={16} />} disabled={!consultations.length || exporting}>
								<span className="hidden sm:inline">Exportar Excel</span>
								<span className="sm:hidden">XLS</span>
							</ActionButton>

							<ActionButton
								onClick={() => {
									setQuery('');
									loadConsultations({ reset: true });
								}}
								variant="outline"
								title="Limpiar filtros"
								leading={<FileMinus size={16} />}>
								<span className="hidden sm:inline">Limpiar</span>
								<span className="sm:hidden">×</span>
							</ActionButton>
						</div>
					</div>
				</motion.div>

				{/* Consultations Table - Mejorado */}
				<motion.div {...getLiteAnimation(isLiteMode)} className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden">
					{loading ? (
						<div className="p-8 sm:p-10">
							<div className="flex items-center gap-3 text-slate-600 mb-6">
								<Loader2 className="animate-spin w-5 h-5" />
								<span className="font-medium">Cargando consultas...</span>
							</div>

							{/* skeleton rows mejorados */}
							<div className="space-y-4">
								{Array.from({ length: 5 }).map((_, i) => (
									<div key={i} className="flex items-center gap-4 animate-pulse">
										<div className="h-12 w-32 bg-slate-200 rounded-lg" />
										<div className="h-12 flex-1 bg-slate-200 rounded-lg" />
										<div className="h-12 w-48 bg-slate-200 rounded-lg hidden sm:block" />
										<div className="h-12 w-40 bg-slate-200 rounded-lg hidden md:block" />
										<div className="h-12 w-24 bg-slate-200 rounded-lg" />
									</div>
								))}
							</div>
						</div>
					) : error ? (
						<div className="p-8 sm:p-10 text-center">
							<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
								<AlertCircle className="w-8 h-8 text-red-600" />
							</div>
							<p className="text-lg font-semibold text-red-600 mb-2">Error al cargar consultas</p>
							<p className="text-sm text-slate-600">{error}</p>
						</div>
					) : consultations.length === 0 ? (
						<div className="p-12 sm:p-16 text-center">
							<div className="mx-auto mb-6 w-24 h-24 rounded-full bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center text-teal-600 shadow-lg">
								<FileText size={32} />
							</div>
							<p className="text-xl font-semibold text-slate-900 mb-2">No hay consultas registradas</p>
							<p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">Comienza a crear consultas médicas para tus pacientes. Todas las consultas quedarán registradas en este historial.</p>
							<Link href="/dashboard/medic/consultas/new">
								<ActionButton variant="solid" leading={<PlusCircle size={18} />}>
									Crear Primera Consulta
								</ActionButton>
							</Link>
						</div>
					) : (
						<>
							{/* Table Header */}
							<div className="bg-gradient-to-r from-slate-50 via-teal-50/30 to-cyan-50/30 border-b border-slate-200 px-4 sm:px-6 py-4">
								<div className="flex items-center justify-between">
									<h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
										<Calendar className="w-5 h-5 text-teal-600" />
										Historial de Consultas
									</h2>
									<span className="text-xs font-medium text-slate-500 bg-white px-3 py-1.5 rounded-full border border-slate-200">
										{consultations.length} {consultations.length === 1 ? 'consulta' : 'consultas'}
									</span>
								</div>
							</div>

							{/* Table Content */}
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-slate-200">
									<thead className="bg-slate-50/80">
										<tr>
											<th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
												<div className="flex items-center gap-2">
													<Calendar className="w-4 h-4" />
													<span>Fecha y Hora</span>
												</div>
											</th>
											<th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
												<div className="flex items-center gap-2">
													<User className="w-4 h-4" />
													<span>Paciente</span>
												</div>
											</th>
											<th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider hidden sm:table-cell">Motivo de Consulta</th>
											<th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider hidden lg:table-cell">Diagnóstico</th>
											<th className="px-4 sm:px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">Acciones</th>
										</tr>
									</thead>

									<tbody className="bg-white divide-y divide-slate-100">
										{consultations.map((c, index) => (
											<motion.tr 
												key={c.id} 
												{...(isLiteMode ? {} : { initial: { opacity: 0, x: -20 }, animate: { opacity: 1, x: 0 }, transition: { delay: index * 0.05 } })} 
												className={`${isLiteMode ? '' : 'hover:bg-gradient-to-r hover:from-teal-50/50 hover:to-cyan-50/50 transition-all duration-200'} group`}
											>
												<td className="px-4 sm:px-6 py-4 whitespace-nowrap">
													<div className="flex flex-col">
														<span className="text-sm font-semibold text-slate-900">{format(new Date(c.created_at), 'dd/MM/yyyy')}</span>
														<span className="text-xs text-slate-500 mt-0.5">{format(new Date(c.created_at), 'HH:mm')}</span>
													</div>
												</td>
												<td className="px-4 sm:px-6 py-4">
													{c.patient && (c.patient.firstName || c.patient.lastName) ? (
														<div className="flex items-center gap-3">
															<div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md ${c.patient.isUnregistered ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-teal-400 to-cyan-500'}`}>{(c.patient.firstName?.[0] || '') + (c.patient.lastName?.[0] || '')}</div>
															<div className="flex-1 min-w-0">
																<div className="flex items-center gap-2 flex-wrap">
																	<span className="text-sm font-semibold text-slate-900">
																		{c.patient.firstName || ''} {c.patient.lastName || ''}
																	</span>
																	{c.patient.isUnregistered ? (
																		<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-semibold border border-amber-200">
																			<AlertCircle className="w-3 h-3" />
																			No Registrado
																		</span>
																	) : (
																		<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-[10px] font-semibold border border-green-200">
																			<User className="w-3 h-3" />
																			Registrado
																		</span>
																	)}
																</div>
																{c.patient.identifier && <p className="text-xs text-slate-500 mt-0.5">C.I: {c.patient.identifier}</p>}
															</div>
														</div>
													) : (
														<div className="flex items-center gap-2 text-slate-400">
															<User className="w-4 h-4" />
															<span className="text-sm italic">Sin información de paciente</span>
														</div>
													)}
												</td>
												<td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
													<div className="max-w-xs">
														<p className="text-sm text-slate-900 font-medium line-clamp-2">{c.chief_complaint || <span className="text-slate-400 italic">Sin motivo registrado</span>}</p>
													</div>
												</td>
												<td className="px-4 sm:px-6 py-4 hidden lg:table-cell">
													<div className="max-w-xs">
														{c.diagnosis ? (
															<span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-800 rounded-lg text-xs font-medium border border-teal-200">
																<Stethoscope className="w-3.5 h-3.5" />
																<span className="line-clamp-1">{c.diagnosis}</span>
															</span>
														) : (
															<span className="text-xs text-slate-400 italic">Sin diagnóstico</span>
														)}
													</div>
												</td>
												<td className="px-4 sm:px-6 py-4 text-center">
													<Link href={`/dashboard/medic/consultas/${c.id}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0">
														<FileText size={16} />
														<span className="hidden sm:inline">Ver Detalle</span>
														<span className="sm:hidden">Ver</span>
													</Link>
												</td>
											</motion.tr>
										))}
									</tbody>
								</table>
							</div>

							{/* Footer */}
							<div className="bg-slate-50/80 border-t border-slate-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
								<div className="text-sm text-slate-600">
									Mostrando <span className="font-semibold text-slate-900">{consultations.length}</span> {consultations.length === 1 ? 'consulta' : 'consultas'}
								</div>
								<div>
									{hasMore ? (
										<ActionButton onClick={loadMore} variant="ghost" leading={refreshing ? <Loader2 className="animate-spin w-4 h-4" /> : undefined} disabled={refreshing}>
											{refreshing ? 'Cargando...' : 'Cargar más consultas'}
										</ActionButton>
									) : (
										<div className="flex items-center gap-2 text-sm text-slate-400">
											<FileText className="w-4 h-4" />
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
