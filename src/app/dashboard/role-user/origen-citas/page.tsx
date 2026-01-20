'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Globe, UserPlus, UserCheck, Loader2, Calendar, TrendingUp, Users, Clock, FileText, CalendarDays } from 'lucide-react';
import { getRoleUserSession } from '@/lib/role-user-auth-client';

interface PatientAttended {
	id: string;
	patientName: string;
	patientIdentifier: string | null;
	patientPhone: string | null;
	isUnregistered: boolean;
	scheduledAt: string;
	service: string;
	date: string | null;
	hour: string | null;
}

interface OriginStats {
	publicPage: number;
	manualAssistant: number;
	patientDashboard: number;
	total: number;
	startDate: string;
	endDate: string;
	attendedCount: number;
	patientsAttended: PatientAttended[];
	breakdownByDate: Record<string, number>;
	breakdownByService: Record<string, number>;
	breakdownByHour: Record<string, number>;
}

export default function OrigenCitasPage() {
	const [stats, setStats] = useState<OriginStats>({
		publicPage: 0,
		manualAssistant: 0,
		patientDashboard: 0,
		total: 0,
		startDate: '',
		endDate: '',
		attendedCount: 0,
		patientsAttended: [],
		breakdownByDate: {},
		breakdownByService: {},
		breakdownByHour: {},
	});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [session, setSession] = useState<any>(null);

	// Inicializar con el mes actual por defecto
	const currentDate = new Date();
	const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
	const currentYear = String(currentDate.getFullYear());
	const [startDate, setStartDate] = useState<string>(`${currentYear}-${currentMonth}-01`);
	const [endDate, setEndDate] = useState<string>(
		`${currentYear}-${currentMonth}-${String(new Date(currentYear, parseInt(currentMonth), 0).getDate()).padStart(2, '0')}`
	);

	useEffect(() => {
		loadSession();
	}, []);

	// Cargar estadísticas cuando se carga la sesión o cambian las fechas
	useEffect(() => {
		if (session?.organizationId) {
			loadStatistics();
		}
	}, [session, startDate, endDate]);

	const loadSession = async () => {
		try {
			const roleUserSession = await getRoleUserSession();
			if (roleUserSession) {
				setSession(roleUserSession);
			}
		} catch (err) {
			console.error('[OrigenCitasPage] Error cargando sesión:', err);
			setError('Error al cargar la sesión del usuario.');
		} finally {
			setLoading(false);
		}
	};

	const loadStatistics = async () => {
		if (!session?.organizationId) {
			setError('No se pudo obtener la información de sesión.');
			setLoading(false);
			return;
		}

		setLoading(true);
		setError(null);
		try {
			const queryParams = new URLSearchParams();
			queryParams.append('startDate', startDate);
			queryParams.append('endDate', endDate);

			const res = await fetch(`/api/role-users/appointments/statistics?${queryParams.toString()}`, {
				credentials: 'include',
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || 'Error al obtener estadísticas');
			}

			const data = await res.json();
			setStats(data);
		} catch (err: any) {
			console.error('[OrigenCitasPage] Error al cargar estadísticas:', err);
			setError(err.message || 'Error al cargar estadísticas.');
		} finally {
			setLoading(false);
		}
	};

	if (loading && stats.total === 0) {
		return (
			<div className="flex items-center justify-center h-64">
				<Loader2 className="w-8 h-8 animate-spin text-teal-600" />
			</div>
		);
	}

	const publicPagePercentage = stats.total > 0 ? ((stats.publicPage / stats.total) * 100).toFixed(1) : '0';
	const manualAssistantPercentage = stats.total > 0 ? ((stats.manualAssistant / stats.total) * 100).toFixed(1) : '0';
	const patientDashboardPercentage = stats.total > 0 ? ((stats.patientDashboard / stats.total) * 100).toFixed(1) : '0';

	return (
		<div className="w-full space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
					<BarChart3 className="w-8 h-8 text-teal-600" />
					Origen de las Citas
				</h1>
				<p className="text-sm text-slate-600 mt-2">Análisis de cómo se generaron las citas en el consultorio</p>
			</div>

			{/* Filtros */}
			<div className="bg-white rounded-xl shadow-md border border-slate-200 p-4">
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-2">Fecha Inicio</label>
						<input
							type="date"
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
							className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-2">Fecha Fin</label>
						<input
							type="date"
							value={endDate}
							onChange={(e) => setEndDate(e.target.value)}
							className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
						/>
					</div>
					<div className="flex items-end">
						<button
							onClick={loadStatistics}
							className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
						>
							Filtrar
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

			{/* Tarjetas de estadísticas */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{/* Página Pública */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white"
				>
					<div className="flex items-center justify-between mb-4">
						<Globe className="w-8 h-8" />
						<TrendingUp className="w-5 h-5 opacity-80" />
					</div>
					<p className="text-blue-100 text-sm font-medium mb-1">Página Pública</p>
					<p className="text-3xl font-bold mb-1">{stats.publicPage}</p>
					<p className="text-blue-100 text-xs">{publicPagePercentage}% del total</p>
					<p className="text-blue-100 text-xs mt-2">c/[id]</p>
				</motion.div>

				{/* Asistente Manual */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg p-6 text-white"
				>
					<div className="flex items-center justify-between mb-4">
						<UserPlus className="w-8 h-8" />
						<TrendingUp className="w-5 h-5 opacity-80" />
					</div>
					<p className="text-teal-100 text-sm font-medium mb-1">Asistente Manual</p>
					<p className="text-3xl font-bold mb-1">{stats.manualAssistant}</p>
					<p className="text-teal-100 text-xs">{manualAssistantPercentage}% del total</p>
					<p className="text-teal-100 text-xs mt-2">Registradas por asistente</p>
				</motion.div>

				{/* Dashboard Paciente */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
					className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg p-6 text-white"
				>
					<div className="flex items-center justify-between mb-4">
						<UserCheck className="w-8 h-8" />
						<TrendingUp className="w-5 h-5 opacity-80" />
					</div>
					<p className="text-emerald-100 text-sm font-medium mb-1">Dashboard Paciente</p>
					<p className="text-3xl font-bold mb-1">{stats.patientDashboard}</p>
					<p className="text-emerald-100 text-xs">{patientDashboardPercentage}% del total</p>
					<p className="text-emerald-100 text-xs mt-2">Pacientes registrados</p>
				</motion.div>

				{/* Total */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3 }}
					className="bg-gradient-to-br from-slate-500 to-gray-600 rounded-xl shadow-lg p-6 text-white"
				>
					<div className="flex items-center justify-between mb-4">
						<Calendar className="w-8 h-8" />
						<TrendingUp className="w-5 h-5 opacity-80" />
					</div>
					<p className="text-slate-100 text-sm font-medium mb-1">Total de Citas</p>
					<p className="text-3xl font-bold mb-1">{stats.total}</p>
					<p className="text-slate-100 text-xs">En el período</p>
				</motion.div>
			</div>

			{/* Gráfico de barras simple */}
			{stats.total > 0 && (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.4 }}
					className="bg-white rounded-xl shadow-md border border-slate-200 p-6"
				>
					<h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
						<BarChart3 className="w-5 h-5 text-teal-600" />
						Distribución por Origen
					</h3>
					<div className="space-y-4">
						{/* Barra Página Pública */}
						<div>
							<div className="flex items-center justify-between mb-2">
								<span className="text-sm font-medium text-slate-700 flex items-center gap-2">
									<Globe className="w-4 h-4 text-blue-600" />
									Página Pública
								</span>
								<span className="text-sm font-semibold text-slate-900">
									{stats.publicPage} ({publicPagePercentage}%)
								</span>
							</div>
							<div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
								<motion.div
									initial={{ width: 0 }}
									animate={{ width: `${publicPagePercentage}%` }}
									transition={{ duration: 0.8, delay: 0.5 }}
									className="bg-gradient-to-r from-blue-500 to-indigo-600 h-4 rounded-full"
								/>
							</div>
						</div>

						{/* Barra Asistente Manual */}
						<div>
							<div className="flex items-center justify-between mb-2">
								<span className="text-sm font-medium text-slate-700 flex items-center gap-2">
									<UserPlus className="w-4 h-4 text-teal-600" />
									Asistente Manual
								</span>
								<span className="text-sm font-semibold text-slate-900">
									{stats.manualAssistant} ({manualAssistantPercentage}%)
								</span>
							</div>
							<div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
								<motion.div
									initial={{ width: 0 }}
									animate={{ width: `${manualAssistantPercentage}%` }}
									transition={{ duration: 0.8, delay: 0.6 }}
									className="bg-gradient-to-r from-teal-500 to-cyan-600 h-4 rounded-full"
								/>
							</div>
						</div>

						{/* Barra Dashboard Paciente */}
						<div>
							<div className="flex items-center justify-between mb-2">
								<span className="text-sm font-medium text-slate-700 flex items-center gap-2">
									<UserCheck className="w-4 h-4 text-emerald-600" />
									Dashboard Paciente
								</span>
								<span className="text-sm font-semibold text-slate-900">
									{stats.patientDashboard} ({patientDashboardPercentage}%)
								</span>
							</div>
							<div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
								<motion.div
									initial={{ width: 0 }}
									animate={{ width: `${patientDashboardPercentage}%` }}
									transition={{ duration: 0.8, delay: 0.7 }}
									className="bg-gradient-to-r from-emerald-500 to-green-600 h-4 rounded-full"
								/>
							</div>
						</div>
					</div>
				</motion.div>
			)}

			{/* Mensaje cuando no hay datos */}
			{stats.total === 0 && !loading && (
				<div className="bg-white rounded-xl shadow-md border border-slate-200 p-8 text-center">
					<Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
					<p className="text-slate-600 font-medium">No hay citas en el período seleccionado</p>
					<p className="text-sm text-slate-500 mt-2">Intenta seleccionar un rango de fechas diferente</p>
				</div>
			)}

			{/* Sección de Pacientes que Asistieron */}
			{stats.attendedCount > 0 && (
				<>
					{/* Lista de Pacientes */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.5 }}
						className="bg-white rounded-xl shadow-md border border-slate-200 p-6"
					>
						<h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
							<Users className="w-5 h-5 text-teal-600" />
							Pacientes que Asistieron ({stats.attendedCount})
						</h3>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead className="bg-slate-50 border-b border-slate-200">
									<tr>
										<th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Paciente</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Cédula</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Teléfono</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Fecha</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Hora</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Servicio</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-200">
									{stats.patientsAttended.map((patient) => (
										<tr key={patient.id} className="hover:bg-slate-50 transition-colors">
											<td className="px-4 py-3">
												<div className="flex items-center gap-2">
													<span className="font-medium text-slate-900">{patient.patientName}</span>
													{patient.isUnregistered && (
														<span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">No registrado</span>
													)}
												</div>
											</td>
											<td className="px-4 py-3 text-slate-600">{patient.patientIdentifier || 'N/A'}</td>
											<td className="px-4 py-3 text-slate-600">{patient.patientPhone || 'N/A'}</td>
											<td className="px-4 py-3 text-slate-600">
												{patient.date
													? new Date(patient.date).toLocaleDateString('es-ES', {
															year: 'numeric',
															month: 'short',
															day: 'numeric',
													  })
													: 'N/A'}
											</td>
											<td className="px-4 py-3 text-slate-600">{patient.hour || 'N/A'}</td>
											<td className="px-4 py-3 text-slate-600">{patient.service}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</motion.div>

					{/* Desgloses */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						{/* Desglose por Fecha */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.6 }}
							className="bg-white rounded-xl shadow-md border border-slate-200 p-6"
						>
							<h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
								<CalendarDays className="w-5 h-5 text-teal-600" />
								Desglose por Fecha
							</h3>
							<div className="space-y-3 max-h-96 overflow-y-auto">
								{Object.entries(stats.breakdownByDate)
									.sort(([a], [b]) => b.localeCompare(a))
									.map(([date, count]) => (
										<div key={date} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
											<span className="text-sm font-medium text-slate-700">
												{new Date(date).toLocaleDateString('es-ES', {
													year: 'numeric',
													month: 'long',
													day: 'numeric',
												})}
											</span>
											<span className="text-sm font-bold text-teal-600 bg-teal-50 px-3 py-1 rounded-full">{count}</span>
										</div>
									))}
							</div>
						</motion.div>

						{/* Desglose por Servicios */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.7 }}
							className="bg-white rounded-xl shadow-md border border-slate-200 p-6"
						>
							<h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
								<FileText className="w-5 h-5 text-teal-600" />
								Desglose por Servicios
							</h3>
							<div className="space-y-3 max-h-96 overflow-y-auto">
								{Object.entries(stats.breakdownByService)
									.sort(([, a], [, b]) => b - a)
									.map(([service, count]) => (
										<div key={service} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
											<span className="text-sm font-medium text-slate-700 flex-1 truncate mr-2">{service}</span>
											<span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full shrink-0">{count}</span>
										</div>
									))}
							</div>
						</motion.div>

						{/* Desglose por Hora */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.8 }}
							className="bg-white rounded-xl shadow-md border border-slate-200 p-6"
						>
							<h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
								<Clock className="w-5 h-5 text-teal-600" />
								Desglose por Hora
							</h3>
							<div className="space-y-3 max-h-96 overflow-y-auto">
								{Object.entries(stats.breakdownByHour)
									.sort(([a], [b]) => a.localeCompare(b))
									.map(([hour, count]) => (
										<div key={hour} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
											<span className="text-sm font-medium text-slate-700">{hour}</span>
											<span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{count}</span>
										</div>
									))}
							</div>
						</motion.div>
					</div>
				</>
			)}
		</div>
	);
}

