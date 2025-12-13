'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, FileText, Loader2, Calendar } from 'lucide-react';
import { getRoleUserSession } from '@/lib/role-user-auth-client';

interface Stat {
	source: string;
	label: string;
	count: number;
	percentage: string;
}

interface ReportData {
	month: string;
	year: string;
	totalAppointments: number;
	stats: Stat[];
}

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

export default function ReportesCitasPage() {
	const [reportData, setReportData] = useState<ReportData | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [session, setSession] = useState<any>(null);

	// Obtener mes y año actual por defecto
	const currentDate = new Date();
	const [selectedMonth, setSelectedMonth] = useState<string>(String(currentDate.getMonth() + 1).padStart(2, '0'));
	const [selectedYear, setSelectedYear] = useState<string>(String(currentDate.getFullYear()));

	useEffect(() => {
		loadSession();
	}, []);

	useEffect(() => {
		if (session && selectedMonth && selectedYear) {
			loadReport();
		}
	}, [session, selectedMonth, selectedYear]);

	const loadSession = async () => {
		try {
			const roleUserSession = await getRoleUserSession();
			if (roleUserSession) {
				setSession(roleUserSession);
			}
		} catch (err) {
			console.error('[Reportes] Error cargando sesión:', err);
			setError('Error al cargar la sesión');
		}
	};

	const loadReport = async () => {
		try {
			setLoading(true);
			setError(null);

			const res = await fetch(`/api/role-users/appointments/reports?month=${selectedMonth}&year=${selectedYear}`, {
				credentials: 'include',
			});

			if (!res.ok) {
				throw new Error('Error al cargar el reporte');
			}

			const data = await res.json();
			setReportData(data);
		} catch (err: any) {
			console.error('[Reportes] Error:', err);
			setError(err.message || 'Error al cargar el reporte');
		} finally {
			setLoading(false);
		}
	};

	const getMaxCount = () => {
		if (!reportData || reportData.stats.length === 0) return 100;
		return Math.max(...reportData.stats.map((s) => s.count), 1);
	};

	if (!session) {
		return (
			<div className="flex items-center justify-center h-64">
				<Loader2 className="w-8 h-8 animate-spin text-teal-600" />
			</div>
		);
	}

	return (
		<div className="w-full space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
					<BarChart3 className="w-8 h-8 text-teal-600" />
					Reportes Mensuales de Citas
				</h1>
				<p className="text-sm text-slate-600 mt-2">
					Análisis estadístico de origen de clientes para optimizar estrategias de marketing
				</p>
			</div>

			{/* Filtros */}
			<div className="bg-white rounded-xl shadow-md border border-slate-200 p-4">
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-2">Año</label>
						<input
							type="number"
							value={selectedYear}
							onChange={(e) => setSelectedYear(e.target.value)}
							min="2020"
							max={new Date().getFullYear()}
							className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-2">Mes</label>
						<select
							value={selectedMonth}
							onChange={(e) => setSelectedMonth(e.target.value)}
							className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
						>
							<option value="01">Enero</option>
							<option value="02">Febrero</option>
							<option value="03">Marzo</option>
							<option value="04">Abril</option>
							<option value="05">Mayo</option>
							<option value="06">Junio</option>
							<option value="07">Julio</option>
							<option value="08">Agosto</option>
							<option value="09">Septiembre</option>
							<option value="10">Octubre</option>
							<option value="11">Noviembre</option>
							<option value="12">Diciembre</option>
						</select>
					</div>
					<div className="flex items-end">
						<button
							onClick={loadReport}
							disabled={loading}
							className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
						>
							{loading ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin" />
									Cargando...
								</>
							) : (
								<>
									<Calendar className="w-4 h-4" />
									Generar Reporte
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

			{/* Reporte */}
			{loading && !reportData ? (
				<div className="flex items-center justify-center h-64">
					<Loader2 className="w-8 h-8 animate-spin text-teal-600" />
				</div>
			) : reportData ? (
				<div className="space-y-6">
					{/* Resumen */}
					<div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-xl shadow-lg p-6 text-white">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-teal-100 text-sm mb-1">Período de Análisis</p>
								<h2 className="text-2xl font-bold">
									{MONTH_LABELS[reportData.month]} {reportData.year}
								</h2>
							</div>
							<div className="text-right">
								<p className="text-teal-100 text-sm mb-1">Total de Citas</p>
								<p className="text-4xl font-bold">{reportData.totalAppointments}</p>
							</div>
						</div>
					</div>

					{/* Gráfico de barras */}
					<div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
						<h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
							<TrendingUp className="w-5 h-5 text-teal-600" />
							Distribución por Origen de Clientes
						</h3>

						{reportData.totalAppointments === 0 ? (
							<div className="text-center py-12 text-slate-500">
								<BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
								<p>No hay datos disponibles para este período</p>
							</div>
						) : (
							<div className="space-y-4">
								{reportData.stats.map((stat, index) => {
									const maxCount = getMaxCount();
									const widthPercentage = maxCount > 0 ? (stat.count / maxCount) * 100 : 0;

									return (
										<motion.div
											key={stat.source}
											initial={{ opacity: 0, x: -20 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: index * 0.1 }}
											className="space-y-2"
										>
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-3 flex-1">
													<span className="text-sm font-medium text-slate-700 min-w-[200px]">
														{stat.label}
													</span>
													<div className="flex-1 bg-slate-100 rounded-full h-8 relative overflow-hidden">
														<motion.div
															initial={{ width: 0 }}
															animate={{ width: `${widthPercentage}%` }}
															transition={{ duration: 0.8, delay: index * 0.1 }}
															className={`h-full rounded-full flex items-center justify-end pr-3 ${
																index === 0
																	? 'bg-gradient-to-r from-teal-500 to-cyan-500'
																	: index === 1
																	? 'bg-gradient-to-r from-blue-500 to-indigo-500'
																	: index === 2
																	? 'bg-gradient-to-r from-purple-500 to-pink-500'
																	: 'bg-gradient-to-r from-slate-400 to-slate-500'
															}`}
														>
															{stat.count > 0 && (
																<span className="text-white text-xs font-semibold">{stat.count}</span>
															)}
														</motion.div>
													</div>
												</div>
												<div className="ml-4 text-right min-w-[80px]">
													<span className="text-sm font-bold text-slate-900">{stat.percentage}%</span>
												</div>
											</div>
										</motion.div>
									);
								})}
							</div>
						)}
					</div>

					{/* Tabla de datos */}
					<div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
						<h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
							<FileText className="w-5 h-5 text-teal-600" />
							Resumen Detallado
						</h3>
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead>
									<tr className="border-b border-slate-200">
										<th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Origen</th>
										<th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Cantidad</th>
										<th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Porcentaje</th>
									</tr>
								</thead>
								<tbody>
									{reportData.stats.map((stat, index) => (
										<tr key={stat.source} className={index % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
											<td className="py-3 px-4 text-sm text-slate-900 font-medium">{stat.label}</td>
											<td className="py-3 px-4 text-sm text-slate-700 text-center">{stat.count}</td>
											<td className="py-3 px-4 text-sm text-slate-700 text-center font-semibold">
												{stat.percentage}%
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-md border border-slate-200 p-12 text-center">
					<BarChart3 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
					<p className="text-slate-600">Selecciona un mes y año para generar el reporte</p>
				</div>
			)}
		</div>
	);
}

