'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Loader2, Calendar, DollarSign, FileText } from 'lucide-react';

interface ReportData {
	stats: {
		totalAppointments: number;
		totalConsultations: number;
		totalInvoices: number;
		paidInvoices: number;
	};
}

export default function RoleUserReportsPage() {
	const [data, setData] = useState<ReportData | null>(null);
	const [loading, setLoading] = useState(true);
	const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
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

			if (!res.ok) throw new Error('Error al cargar reportes');

			const reportData = await res.json();
			// Solo mantener estadísticas administrativas, sin información médica sensible
			setData({
				stats: reportData.stats || {
					totalAppointments: 0,
					totalConsultations: 0,
					totalInvoices: 0,
					paidInvoices: 0,
				},
			});
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="w-8 h-8 animate-spin text-teal-600" />
					<p className="text-slate-600">Cargando reportes...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full">
			{/* Header */}
			<motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
					<div>
						<h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Reportes</h1>
						<p className="text-sm sm:text-base text-slate-600 mt-1">Estadísticas administrativas de la organización</p>
					</div>
					<div className="flex flex-col sm:flex-row gap-2">
						<input
							type="date"
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
							className="px-3 sm:px-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
						/>
						<input
							type="date"
							value={endDate}
							onChange={(e) => setEndDate(e.target.value)}
							className="px-3 sm:px-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
						/>
					</div>
				</div>
			</motion.div>

			{/* Statistics */}
			{data && (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						className="bg-white rounded-xl border border-slate-200 p-6 shadow-md"
					>
						<div className="flex items-center gap-3 mb-2">
							<div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
								<Calendar className="w-5 h-5 text-blue-600" />
							</div>
							<div>
								<p className="text-sm text-slate-600">Citas</p>
								<p className="text-2xl font-bold text-slate-900">{data.stats.totalAppointments}</p>
							</div>
						</div>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.1 }}
						className="bg-white rounded-xl border border-slate-200 p-6 shadow-md"
					>
						<div className="flex items-center gap-3 mb-2">
							<div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
								<FileText className="w-5 h-5 text-teal-600" />
							</div>
							<div>
								<p className="text-sm text-slate-600">Consultas</p>
								<p className="text-2xl font-bold text-slate-900">{data.stats.totalConsultations}</p>
							</div>
						</div>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2 }}
						className="bg-white rounded-xl border border-slate-200 p-6 shadow-md"
					>
						<div className="flex items-center gap-3 mb-2">
							<div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
								<DollarSign className="w-5 h-5 text-green-600" />
							</div>
							<div>
								<p className="text-sm text-slate-600">Facturas</p>
								<p className="text-2xl font-bold text-slate-900">{data.stats.totalInvoices}</p>
							</div>
						</div>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
						className="bg-white rounded-xl border border-slate-200 p-6 shadow-md"
					>
						<div className="flex items-center gap-3 mb-2">
							<div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
								<BarChart3 className="w-5 h-5 text-emerald-600" />
							</div>
							<div>
								<p className="text-sm text-slate-600">Pagadas</p>
								<p className="text-2xl font-bold text-slate-900">{data.stats.paidInvoices}</p>
							</div>
						</div>
					</motion.div>
				</div>
			)}

			<div className="bg-white rounded-xl border border-slate-200 p-6">
				<p className="text-sm text-slate-600 italic">
					Nota: Los reportes médicos detallados (diagnósticos, estadísticas clínicas) solo son visibles para el médico especialista.
				</p>
			</div>
		</div>
	);
}
