'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, CheckCircle2, CalendarX, CalendarClock, Loader2, TrendingUp, Users } from 'lucide-react';
import { getRoleUserSession } from '@/lib/role-user-auth-client';

interface AppointmentStats {
	effectiveCount: number;
	rescheduledCount: number;
	noShowCount: number;
	totalCreated: number;
}

interface AppointmentDetail {
	id: string;
	patient: string;
	scheduled_at: string;
	status: string;
}

export default function EstadisticasCitasPage() {
	const [stats, setStats] = useState<AppointmentStats>({
		effectiveCount: 0,
		rescheduledCount: 0,
		noShowCount: 0,
		totalCreated: 0,
	});
	const [effectiveAppointments, setEffectiveAppointments] = useState<AppointmentDetail[]>([]);
	const [rescheduledAppointments, setRescheduledAppointments] = useState<AppointmentDetail[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [session, setSession] = useState<any>(null);
	// Inicializar con el año actual por defecto
	const currentDate = new Date();
	const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
	const currentYear = String(currentDate.getFullYear());
	const [filterMonth, setFilterMonth] = useState<string>(currentMonth);
	const [filterYear, setFilterYear] = useState<string>(currentYear);

	useEffect(() => {
		loadSession();
	}, []);

	// Cargar estadísticas cuando se carga la sesión o cambian los filtros
	useEffect(() => {
		if (session?.roleUserId && session?.organizationId && filterYear) {
			loadStatistics();
		}
	}, [session, filterMonth, filterYear]);

	const loadSession = async () => {
		try {
			const roleUserSession = await getRoleUserSession();
			if (roleUserSession) {
				setSession(roleUserSession);
			}
		} catch (err) {
			console.error('[EstadisticasCitasPage] Error cargando sesión:', err);
			setError('Error al cargar la sesión del usuario.');
		} finally {
			setLoading(false);
		}
	};

	const loadStatistics = async () => {
		if (!session?.roleUserId || !session?.organizationId) {
			setError('No se pudo obtener la información de sesión.');
			setLoading(false);
			return;
		}

		if (!filterYear) {
			// No cargar si no hay año establecido
			return;
		}

		setLoading(true);
		setError(null);
		try {
			const queryParams = new URLSearchParams();
			if (filterMonth) queryParams.append('month', filterMonth);
			queryParams.append('year', filterYear);

			const res = await fetch(`/api/role-users/appointments/statistics?${queryParams.toString()}`, {
				credentials: 'include',
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || 'Error al obtener estadísticas');
			}

			const data = await res.json();
			setStats(data.stats || { effectiveCount: 0, rescheduledCount: 0, noShowCount: 0, totalCreated: 0 });
			setEffectiveAppointments(data.effectiveAppointments || []);
			setRescheduledAppointments(data.rescheduledAppointments || []);
		} catch (err: any) {
			console.error('[EstadisticasCitasPage] Error al cargar estadísticas:', err);
			setError(err.message || 'Error al cargar estadísticas.');
		} finally {
			setLoading(false);
		}
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString('es-ES', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	if (loading && stats.totalCreated === 0) {
		return (
			<div className="flex items-center justify-center h-64">
				<Loader2 className="w-8 h-8 animate-spin text-teal-600" />
			</div>
		);
	}

	const effectivenessRate = stats.totalCreated > 0 ? ((stats.effectiveCount / stats.totalCreated) * 100).toFixed(1) : '0';
	const rescheduleRate = stats.totalCreated > 0 ? ((stats.rescheduledCount / stats.totalCreated) * 100).toFixed(1) : '0';
	const noShowRate = stats.totalCreated > 0 ? ((stats.noShowCount / stats.totalCreated) * 100).toFixed(1) : '0';

	return (
		<div className="w-full space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
					<BarChart3 className="w-8 h-8 text-teal-600" />
					Estadísticas de Citas
				</h1>
				<p className="text-sm text-slate-600 mt-2">Análisis de citas efectivas, reagendadas y no asistidas</p>
			</div>

			{/* Filtros */}
			<div className="bg-white rounded-xl shadow-md border border-slate-200 p-4">
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-2">Año</label>
						<input type="number" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} min="2020" max={String(new Date().getFullYear())} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500" placeholder={String(new Date().getFullYear())} />
					</div>
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-2">Mes</label>
						<select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500">
							<option value="">Todos los meses</option>
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
						<button onClick={loadStatistics} className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition">
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
				<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg p-6 text-white">
					<div className="flex items-center justify-between mb-4">
						<CheckCircle2 className="w-8 h-8" />
						<TrendingUp className="w-5 h-5 opacity-80" />
					</div>
					<p className="text-emerald-100 text-sm font-medium mb-1">Citas Efectivas</p>
					<p className="text-3xl font-bold mb-1">{stats.effectiveCount}</p>
					<p className="text-emerald-100 text-xs">{effectivenessRate}% del total</p>
				</motion.div>

				<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
					<div className="flex items-center justify-between mb-4">
						<CalendarClock className="w-8 h-8" />
						<TrendingUp className="w-5 h-5 opacity-80" />
					</div>
					<p className="text-orange-100 text-sm font-medium mb-1">Citas Reagendadas</p>
					<p className="text-3xl font-bold mb-1">{stats.rescheduledCount}</p>
					<p className="text-orange-100 text-xs">{rescheduleRate}% del total</p>
				</motion.div>

				<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg p-6 text-white">
					<div className="flex items-center justify-between mb-4">
						<CalendarX className="w-8 h-8" />
						<TrendingUp className="w-5 h-5 opacity-80" />
					</div>
					<p className="text-red-100 text-sm font-medium mb-1">No Asistieron</p>
					<p className="text-3xl font-bold mb-1">{stats.noShowCount}</p>
					<p className="text-red-100 text-xs">{noShowRate}% del total</p>
				</motion.div>

				<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
					<div className="flex items-center justify-between mb-4">
						<Users className="w-8 h-8" />
						<TrendingUp className="w-5 h-5 opacity-80" />
					</div>
					<p className="text-blue-100 text-sm font-medium mb-1">Total Creadas</p>
					<p className="text-3xl font-bold mb-1">{stats.totalCreated}</p>
					<p className="text-blue-100 text-xs">En el período</p>
				</motion.div>
			</div>

			{/* Lista de citas efectivas */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
					<h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
						<CheckCircle2 className="w-5 h-5 text-emerald-600" />
						Citas Efectivas ({stats.effectiveCount})
					</h3>
					{effectiveAppointments.length === 0 ? (
						<p className="text-sm text-slate-500 text-center py-4">No hay citas efectivas para el período seleccionado</p>
					) : (
						<div className="space-y-2 max-h-96 overflow-y-auto">
							{effectiveAppointments.map((apt) => (
								<div key={apt.id} className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
									<p className="font-medium text-emerald-900 text-sm">{apt.patient}</p>
									<p className="text-xs text-emerald-700 mt-1">{formatDate(apt.scheduled_at)}</p>
								</div>
							))}
						</div>
					)}
				</motion.div>

				{/* Lista de citas reagendadas */}
				<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
					<h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
						<CalendarClock className="w-5 h-5 text-orange-600" />
						Citas Reagendadas ({stats.rescheduledCount})
					</h3>
					{rescheduledAppointments.length === 0 ? (
						<p className="text-sm text-slate-500 text-center py-4">No hay citas reagendadas para el período seleccionado</p>
					) : (
						<div className="space-y-2 max-h-96 overflow-y-auto">
							{rescheduledAppointments.map((apt) => (
								<div key={apt.id} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
									<p className="font-medium text-orange-900 text-sm">{apt.patient}</p>
									<p className="text-xs text-orange-700 mt-1">{formatDate(apt.scheduled_at)}</p>
								</div>
							))}
						</div>
					)}
				</motion.div>
			</div>
		</div>
	);
}
