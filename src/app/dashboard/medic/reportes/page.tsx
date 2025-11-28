// app/dashboard/medic/reportes/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, DollarSign, FileText, AlertTriangle } from 'lucide-react';
import CurrencyDisplay from '@/components/CurrencyDisplay';

interface PaymentMethod {
	metodo: string;
	referencia: string | null;
	count: number;
}

interface IncomeBreakdown {
	date: string;
	usd: number;
	bs: number;
	count: number;
	tasa: number;
	metodos?: PaymentMethod[];
}

interface ReportData {
	appointmentsByMonth: Array<{ month: string; count: number }>;
	consultationsByMonth: Array<{ month: string; count: number }>;
	totalIncome: number; // En USD (para compatibilidad)
	totalIncomeUSD: number; // En USD
	totalIncomeBS: number; // En Bolívares usando tasas históricas guardadas
	incomeBreakdown?: IncomeBreakdown[]; // Desglose de ingresos por fecha
	topDiagnoses: Array<{ diagnosis: string; count: number }>;
	totalOrders: number;
	totalCriticalResults: number;
	stats: {
		totalAppointments: number;
		totalConsultations: number;
		totalInvoices: number;
		paidInvoices: number;
	};
}

export default function ReportesPage() {
	const [data, setData] = useState<ReportData | null>(null);
	const [loading, setLoading] = useState(true);
	const [startDate, setStartDate] = useState(
		new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
	);
	const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

	useEffect(() => {
		fetchReportes();
	}, [startDate, endDate]);

	const fetchReportes = async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams();
			params.append('startDate', startDate);
			params.append('endDate', endDate);

			const res = await fetch(`/api/medic/reportes?${params.toString()}`, {
				credentials: 'include',
			});

			if (!res.ok) {
				const errorText = await res.text();
				console.error('[Reportes] Error en la respuesta:', res.status, errorText);
				throw new Error('Error al cargar reportes');
			}

			const reportData = await res.json();
			console.log('[Reportes] Datos recibidos:', {
				totalIncome: reportData.totalIncome,
				totalIncomeUSD: reportData.totalIncomeUSD,
				totalIncomeBS: reportData.totalIncomeBS,
				totalIncomeType: typeof reportData.totalIncome,
				stats: reportData.stats,
				invoicesCount: reportData.stats?.totalInvoices,
				paidInvoicesCount: reportData.stats?.paidInvoices,
				rangoFechas: { startDate, endDate },
			});
			
			// Validar que totalIncome sea un número
			if (reportData.totalIncome === undefined || reportData.totalIncome === null) {
				console.warn('[Reportes] totalIncome es undefined o null, estableciendo a 0');
				reportData.totalIncome = 0;
			}
			
			setData(reportData);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="h-8 bg-slate-200 rounded w-1/3 animate-pulse"></div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					{[...Array(4)].map((_, i) => (
						<div key={i} className="bg-white rounded-2xl border border-blue-100 p-6 animate-pulse">
							<div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
							<div className="h-8 bg-slate-200 rounded w-1/2"></div>
						</div>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4 sm:space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Reportes</h1>
					<p className="text-sm sm:text-base text-slate-600 mt-1">Análisis y estadísticas de tu práctica médica</p>
				</div>
				<div className="flex flex-col sm:flex-row gap-2">
					<input
						type="date"
						value={startDate}
						onChange={(e) => setStartDate(e.target.value)}
						className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-blue-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
					/>
					<input
						type="date"
						value={endDate}
						onChange={(e) => setEndDate(e.target.value)}
						className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-blue-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
					/>
				</div>
			</div>

			{/* KPIs - Sin ingresos */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					className="bg-white rounded-xl sm:rounded-2xl border border-blue-100 p-4 sm:p-6"
				>
					<div className="flex items-center justify-between mb-3 sm:mb-4">
						<h3 className="text-xs sm:text-sm font-medium text-slate-600">Citas Totales</h3>
						<BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
					</div>
					<p className="text-2xl sm:text-3xl font-bold text-slate-900">{data?.stats.totalAppointments || 0}</p>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="bg-white rounded-xl sm:rounded-2xl border border-blue-100 p-4 sm:p-6"
				>
					<div className="flex items-center justify-between mb-3 sm:mb-4">
						<h3 className="text-xs sm:text-sm font-medium text-slate-600">Consultas</h3>
						<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600" />
					</div>
					<p className="text-2xl sm:text-3xl font-bold text-slate-900">{data?.stats.totalConsultations || 0}</p>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
					className="bg-white rounded-xl sm:rounded-2xl border border-blue-100 p-4 sm:p-6"
				>
					<div className="flex items-center justify-between mb-3 sm:mb-4">
						<h3 className="text-xs sm:text-sm font-medium text-slate-600">Resultados Críticos</h3>
						<AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
					</div>
					<p className="text-2xl sm:text-3xl font-bold text-slate-900">{data?.totalCriticalResults || 0}</p>
				</motion.div>
			</div>

			{/* Sección de Ingresos - Desglose detallado */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.3 }}
				className="bg-white rounded-xl sm:rounded-2xl border border-blue-100 p-4 sm:p-6"
			>
				<div className="flex items-center justify-between mb-4 sm:mb-6">
					<div className="flex items-center gap-2 sm:gap-3">
						<DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
						<h2 className="text-lg sm:text-xl font-semibold text-slate-900">Ingresos Generados</h2>
					</div>
					<div className="text-right">
						<p className="text-xs sm:text-sm text-slate-500">Total en el período</p>
						<p className="text-lg sm:text-xl font-bold text-green-600">
							${((data?.totalIncomeUSD ?? data?.totalIncome) || 0).toFixed(2)} USD
						</p>
						{data?.totalIncomeBS && data.totalIncomeBS > 0 && (
							<p className="text-sm sm:text-base text-slate-600">
								≈ {data.totalIncomeBS.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
							</p>
						)}
					</div>
				</div>

				{/* Desglose por fecha */}
				{data?.incomeBreakdown && data.incomeBreakdown.length > 0 ? (
					<div className="space-y-3 sm:space-y-4">
						<h3 className="text-sm sm:text-base font-medium text-slate-700 mb-3">Desglose por Fecha</h3>
						<div className="space-y-2">
							{data.incomeBreakdown.map((item, idx) => {
								// Parsear la fecha manualmente para evitar problemas de zona horaria
								// item.date viene en formato "YYYY-MM-DD"
								const [year, month, day] = item.date.split('-').map(Number);
								const fecha = new Date(Date.UTC(year, month - 1, day));
								
								// Formatear usando UTC para mantener la fecha correcta
								const fechaFormateada = fecha.toLocaleDateString('es-ES', {
									day: '2-digit',
									month: 'long',
									year: 'numeric',
									timeZone: 'UTC', // Usar UTC para evitar cambios de día
								});

								return (
									<div
										key={idx}
										className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg sm:rounded-xl border border-green-100"
									>
										<div className="flex-1">
											<p className="text-sm sm:text-base font-semibold text-slate-900">{fechaFormateada}</p>
											<p className="text-xs sm:text-sm text-slate-600 mt-1">
												{item.count} factura{item.count !== 1 ? 's' : ''} • Tasa: {item.tasa.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs/USD
											</p>
											
											{/* Métodos de pago */}
											{item.metodos && item.metodos.length > 0 && (
												<div className="mt-2 space-y-1">
													{item.metodos.map((metodo, metodoIdx) => {
														const metodoNombre = metodo.metodo === 'PAGO_MOVIL' 
															? 'Pago Móvil' 
															: metodo.metodo === 'EFECTIVO'
															? 'Efectivo'
															: metodo.metodo === 'TRANSFERENCIA'
															? 'Transferencia'
															: metodo.metodo === 'TARJETA'
															? 'Tarjeta'
															: metodo.metodo;

														return (
															<div key={metodoIdx} className="flex items-center gap-2 text-xs sm:text-sm">
																<span className="font-medium text-slate-700">
																	{metodoNombre}
																	{metodo.count > 1 && ` (${metodo.count})`}
																</span>
																{metodo.metodo === 'PAGO_MOVIL' && metodo.referencia && (
																	<span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono">
																		Ref: {metodo.referencia}
																	</span>
																)}
															</div>
														);
													})}
												</div>
											)}
										</div>
										<div className="flex flex-col sm:items-end gap-1">
											<p className="text-base sm:text-lg font-bold text-green-700">
												${item.usd.toFixed(2)} USD
											</p>
											<p className="text-sm sm:text-base text-slate-600">
												{item.bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
											</p>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				) : (
					<div className="text-center py-6 sm:py-8 text-slate-500">
						<p className="text-sm sm:text-base">No hay ingresos registrados en el período seleccionado</p>
					</div>
				)}
			</motion.div>

			{/* Diagnósticos más comunes */}
			{data && data.topDiagnoses.length > 0 && (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.4 }}
					className="bg-white rounded-xl sm:rounded-2xl border border-blue-100 p-4 sm:p-6"
				>
					<h2 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">Diagnósticos Más Comunes</h2>
					<div className="space-y-2 sm:space-y-3">
						{data.topDiagnoses.map((item, idx) => (
							<div key={idx} className="flex items-center justify-between p-2 sm:p-3 bg-blue-50 rounded-lg sm:rounded-xl">
								<span className="text-sm sm:text-base text-slate-900 font-medium truncate">{item.diagnosis}</span>
								<span className="text-teal-600 font-semibold text-sm sm:text-base ml-2 shrink-0">{item.count} casos</span>
							</div>
						))}
					</div>
				</motion.div>
			)}

			{/* Gráficos simples (placeholder) */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.5 }}
					className="bg-white rounded-xl sm:rounded-2xl border border-blue-100 p-4 sm:p-6"
				>
					<h2 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">Citas por Mes</h2>
					<div className="space-y-2">
						{data?.appointmentsByMonth.map((item, idx) => (
							<div key={idx} className="flex items-center gap-2">
								<span className="text-xs sm:text-sm text-slate-600 w-24 sm:w-32 shrink-0">{item.month}</span>
								<div className="flex-1 bg-blue-100 rounded-full h-5 sm:h-6 relative">
									<div
										className="bg-gradient-to-r from-teal-600 to-cyan-600 h-5 sm:h-6 rounded-full flex items-center justify-end pr-1 sm:pr-2"
										style={{
											width: `${Math.min((item.count / (data?.stats.totalAppointments || 1)) * 100, 100)}%`,
										}}
									>
										<span className="text-[10px] sm:text-xs text-white font-medium">{item.count}</span>
									</div>
								</div>
							</div>
						))}
					</div>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.6 }}
					className="bg-white rounded-xl sm:rounded-2xl border border-blue-100 p-4 sm:p-6"
				>
					<h2 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">Consultas por Mes</h2>
					<div className="space-y-2">
						{data?.consultationsByMonth.map((item, idx) => (
							<div key={idx} className="flex items-center gap-2">
								<span className="text-xs sm:text-sm text-slate-600 w-24 sm:w-32 shrink-0">{item.month}</span>
								<div className="flex-1 bg-blue-100 rounded-full h-5 sm:h-6 relative">
									<div
										className="bg-gradient-to-r from-cyan-600 to-teal-600 h-5 sm:h-6 rounded-full flex items-center justify-end pr-1 sm:pr-2"
										style={{
											width: `${Math.min((item.count / (data?.stats.totalConsultations || 1)) * 100, 100)}%`,
										}}
									>
										<span className="text-[10px] sm:text-xs text-white font-medium">{item.count}</span>
									</div>
								</div>
							</div>
						))}
					</div>
				</motion.div>
			</div>
		</div>
	);
}

