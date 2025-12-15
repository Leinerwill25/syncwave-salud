'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Calendar, CalendarRange, Flame, Loader2, ThermometerSun } from 'lucide-react';
import { getRoleUserSession, type RoleUserSession, getRoleUserDisplayName } from '@/lib/role-user-auth-client';

type ServiceAggDate = {
	date: string; // YYYY-MM-DD
	count: number;
};

type ServiceAgg = {
	name: string;
	totalCount: number;
	totalRevenue: number;
	currency: string | null;
	averagePrice: number;
	dates: ServiceAggDate[];
};

type ServiceStatsResponse = {
	period: {
		type: 'month' | 'quarter';
		year: string;
		month: string | null;
		quarter: string | null;
		startDate: string;
		endDate: string;
	};
	totals: {
		totalAppointments: number;
		attendedCount: number;
		noShowCount: number;
		attendanceRate: number;
	};
	services: ServiceAgg[];
};

const QUARTERS = [
	{ value: '1', label: 'Q1 (Ene-Mar)' },
	{ value: '2', label: 'Q2 (Abr-Jun)' },
	{ value: '3', label: 'Q3 (Jul-Sep)' },
	{ value: '4', label: 'Q4 (Oct-Dic)' },
];

const MONTH_LABELS: Record<string, string> = {
	'01': 'Enero',
	'02': 'Febrero',
	'03': 'Marzo',
	'04': 'Abril',
	'05': 'Mayo',
	'06': 'Junio',
	'07': 'Julio',
	'08': 'Agosto',
	'09': 'Septiembre',
	'10': 'Octubre',
	'11': 'Noviembre',
	'12': 'Diciembre',
};

export default function EstadisticasServiciosPage() {
	const [session, setSession] = useState<RoleUserSession | null>(null);
	const [stats, setStats] = useState<ServiceStatsResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const now = new Date();
	const [periodType, setPeriodType] = useState<'month' | 'quarter'>('month');
	const [selectedMonth, setSelectedMonth] = useState<string>(String(now.getMonth() + 1).padStart(2, '0'));
	const [selectedQuarter, setSelectedQuarter] = useState<string>('1');
	const [selectedYear, setSelectedYear] = useState<string>(String(now.getFullYear()));

	useEffect(() => {
		const load = async () => {
			try {
				const s = await getRoleUserSession();
				setSession(s);
			} catch (err) {
				console.error('[EstadisticasServicios] Error cargando sesión:', err);
				setError('Error al cargar la sesión.');
			} finally {
				setLoading(false);
			}
		};
		load();
	}, []);

	useEffect(() => {
		if (!session) return;
		loadStats();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session, periodType, selectedMonth, selectedQuarter, selectedYear]);

	const loadStats = async () => {
		if (!session) return;

		setLoading(true);
		setError(null);
		try {
			const params = new URLSearchParams();
			params.append('periodType', periodType);
			params.append('year', selectedYear);
			if (periodType === 'month') {
				params.append('month', selectedMonth);
			} else {
				params.append('quarter', selectedQuarter);
			}

			const res = await fetch(`/api/role-users/appointments/service-stats?${params.toString()}`, {
				credentials: 'include',
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Error al cargar estadísticas');
			}

			setStats(data as ServiceStatsResponse);
		} catch (err: any) {
			console.error('[EstadisticasServicios] Error:', err);
			setError(err.message || 'Error al cargar estadísticas');
		} finally {
			setLoading(false);
		}
	};

	const formatPeriodLabel = () => {
		if (!stats) return '';
		if (stats.period.type === 'quarter' && stats.period.quarter) {
			const q = QUARTERS.find((q) => q.value === stats.period.quarter);
			return `${q?.label || `Q${stats.period.quarter}`} ${stats.period.year}`;
		}
		if (stats.period.type === 'month' && stats.period.month) {
			return `${MONTH_LABELS[stats.period.month] || stats.period.month} ${stats.period.year}`;
		}
		return `${stats.period.year}`;
	};

	const formatDate = (dateStr: string) => {
		const d = new Date(dateStr);
		return d.toLocaleDateString('es-VE', {
			month: 'short',
			day: 'numeric',
		});
	};

	if (!session) {
		return (
			<div className="flex items-center justify-center min-h-[300px]">
				<Loader2 className="w-8 h-8 animate-spin text-teal-600" />
			</div>
		);
	}

	const isRecepcion = getRoleUserDisplayName(session) === 'Recepción';

	return (
		<div className="w-full space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
					<BarChart3 className="w-8 h-8 text-teal-600" />
					Panel Inteligente de Servicios
				</h1>
				<p className="text-sm text-slate-600 mt-2">
					{isRecepcion
						? 'Analiza asistencia, servicios más vendidos y patrones de fechas para optimizar precios y promociones desde recepción.'
						: 'Análisis de servicios agendados en el consultorio.'}
				</p>
			</div>

			{/* Filtros */}
			<div className="bg-white rounded-xl shadow-md border border-slate-200 p-4">
				<div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-2">Tipo de período</label>
						<select
							value={periodType}
							onChange={(e) => setPeriodType(e.target.value as 'month' | 'quarter')}
							className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
						>
							<option value="month">Mensual</option>
							<option value="quarter">Trimestral</option>
						</select>
					</div>
					{periodType === 'month' ? (
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-2">Mes</label>
							<select
								value={selectedMonth}
								onChange={(e) => setSelectedMonth(e.target.value)}
								className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
							>
								{Object.entries(MONTH_LABELS).map(([value, label]) => (
									<option key={value} value={value}>
										{label}
									</option>
								))}
							</select>
						</div>
					) : (
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-2">Trimestre</label>
							<select
								value={selectedQuarter}
								onChange={(e) => setSelectedQuarter(e.target.value)}
								className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
							>
								{QUARTERS.map((q) => (
									<option key={q.value} value={q.value}>
										{q.label}
									</option>
								))}
							</select>
						</div>
					)}
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-2">Año</label>
						<input
							type="number"
							value={selectedYear}
							onChange={(e) => setSelectedYear(e.target.value)}
							min="2020"
							max={String(new Date().getFullYear())}
							className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
						/>
					</div>
					<div className="flex items-end">
						<button
							onClick={loadStats}
							disabled={loading}
							className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
						>
							{loading ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin" />
									Cargando...
								</>
							) : (
								<>
									<CalendarRange className="w-4 h-4" />
									Aplicar
								</>
							)}
						</button>
					</div>
				</div>
			</div>

			{/* Error */}
			{error && (
				<div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
					<p className="text-sm text-red-800">{error}</p>
				</div>
			)}

			{/* Resumen de asistencia */}
			{stats && (
				<>
					<div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-xl shadow-lg p-6 text-white">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
							<div>
								<p className="text-teal-100 text-sm mb-1">Período analizado</p>
								<h2 className="text-2xl font-bold">{formatPeriodLabel()}</h2>
								<p className="text-teal-100 text-xs mt-1">
									Desde {stats.period.startDate} hasta {stats.period.endDate}
								</p>
							</div>
							<div className="flex flex-wrap gap-4">
								<div className="text-right">
									<p className="text-teal-100 text-xs">Total citas</p>
									<p className="text-3xl font-bold">{stats.totals.totalAppointments}</p>
								</div>
								<div className="text-right">
									<p className="text-teal-100 text-xs">Asistieron</p>
									<p className="text-xl font-semibold">{stats.totals.attendedCount}</p>
								</div>
								<div className="text-right">
									<p className="text-teal-100 text-xs">No asistieron</p>
									<p className="text-xl font-semibold">{stats.totals.noShowCount}</p>
								</div>
								<div className="text-right">
									<p className="text-teal-100 text-xs">Tasa de asistencia</p>
									<p className="text-xl font-semibold">
										{(stats.totals.attendanceRate * 100).toFixed(1)}%
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* Servicios más frecuentes e ingresos */}
					<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
						{/* Ranking de servicios */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							className="bg-white rounded-xl shadow-md border border-slate-200 p-6"
						>
							<h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
								<Flame className="w-5 h-5 text-orange-500" />
								Servicios más frecuentes (solo citas atendidas)
							</h3>
							{stats.services.length === 0 ? (
								<p className="text-sm text-slate-500 text-center py-4">
									No hay servicios registrados para el período seleccionado
								</p>
							) : (
								<div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
									{stats.services.map((service, index) => {
										const maxCount = stats.services[0]?.totalCount || 1;
										const widthPercentage = maxCount > 0 ? (service.totalCount / maxCount) * 100 : 0;

										return (
											<motion.div
												key={service.name}
												initial={{ opacity: 0, x: -20 }}
												animate={{ opacity: 1, x: 0 }}
												transition={{ delay: index * 0.05 }}
												className="space-y-1"
											>
												<div className="flex items-center justify-between gap-3">
													<div className="flex-1">
														<p className="text-sm font-semibold text-slate-900">
															{index + 1}. {service.name}
														</p>
														<p className="text-xs text-slate-500">
															{service.totalCount} cita
															{service.totalCount !== 1 ? 's' : ''} atendida
														</p>
													</div>
													<div className="text-right text-xs text-slate-600 min-w-[110px]">
														<p>
															<strong>
																{service.currency || 'USD'}{' '}
																{service.totalRevenue.toFixed(2)}
															</strong>
														</p>
														<p>Prom: {service.averagePrice.toFixed(2)}</p>
													</div>
												</div>
												<div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
													<motion.div
														initial={{ width: 0 }}
														animate={{ width: `${widthPercentage}%` }}
														transition={{ duration: 0.6 }}
														className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"
													/>
												</div>
											</motion.div>
										);
									})}
								</div>
							)}
						</motion.div>

						{/* "Mapa de calor" simple por fechas para el servicio más vendido */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							className="bg-white rounded-xl shadow-md border border-slate-200 p-6"
						>
							<h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
								<ThermometerSun className="w-5 h-5 text-rose-500" />
								Fechas más frecuentes del servicio líder
							</h3>
							{stats.services.length === 0 ? (
								<p className="text-sm text-slate-500 text-center py-4">
									No hay datos suficientes para generar el mapa de calor.
								</p>
							) : (
								(() => {
									const topService = stats.services[0];
									const sortedDates = [...topService.dates].sort(
										(a, b) => (b.count || 0) - (a.count || 0),
									);
									const maxCount = sortedDates[0]?.count || 1;

									return (
										<div className="space-y-3">
											<p className="text-sm text-slate-700 mb-2">
												Servicio líder:{' '}
												<span className="font-semibold">{topService.name}</span>
											</p>
											{sortedDates.length === 0 ? (
												<p className="text-sm text-slate-500">
													No hay citas atendidas para este servicio en el período.
												</p>
											) : (
												<div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
													{sortedDates.map((d, idx) => {
														const intensity = maxCount > 0 ? d.count / maxCount : 0;
														// Escala simple de color basada en intensidad
														const bgClass =
															intensity > 0.75
																? 'from-orange-500 to-red-500'
																: intensity > 0.5
																? 'from-amber-400 to-orange-500'
																: intensity > 0.25
																? 'from-yellow-300 to-amber-400'
																: 'from-slate-200 to-slate-300';

														return (
															<motion.div
																key={d.date}
																initial={{ opacity: 0, x: -15 }}
																animate={{ opacity: 1, x: 0 }}
																transition={{ delay: idx * 0.03 }}
																className="flex items-center gap-3"
															>
																<div className="w-24 text-xs font-medium text-slate-700">
																	{formatDate(d.date)}
																</div>
																<div className="flex-1 h-6 rounded-full bg-slate-100 overflow-hidden">
																	<div
																		className={`h-full bg-gradient-to-r ${bgClass} flex items-center justify-end pr-2 text-[11px] text-white font-semibold`}
																		style={{
																			width: `${Math.max(
																				20,
																				(intensity || 0.05) * 100,
																			)}%`,
																		}}
																	>
																		{d.count}
																	</div>
																</div>
															</motion.div>
														);
													})}
												</div>
											)}
											<p className="text-[11px] text-slate-500 mt-2">
												Este bloque funciona como un “mapa de calor” simplificado: los bloques más
												intensos representan fechas con mayor concentración de ese servicio. Puedes
												usarlo para definir promociones inteligentes en días/semana específicos.
											</p>
										</div>
									);
								})()
							)}
						</motion.div>
					</div>
				</>
			)}

			{!loading && !stats && !error && (
				<p className="text-sm text-slate-500">No hay datos para el período seleccionado.</p>
			)}
		</div>
	);
}


