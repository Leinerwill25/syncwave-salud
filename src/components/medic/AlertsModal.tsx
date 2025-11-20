// components/medic/AlertsModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
	X, 
	AlertCircle, 
	AlertTriangle, 
	Info, 
	Clock, 
	Calendar,
	FileText,
	FlaskConical,
	CheckSquare,
	MessageSquare,
	Bell,
	CreditCard,
	RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import type { Alert, AlertLevel } from '@/app/api/medic/alerts/route';

interface AlertsModalProps {
	isOpen: boolean;
	onClose: () => void;
}

const getAlertIcon = (type: Alert['type']) => {
	switch (type) {
		case 'APPOINTMENT_IMMINENT':
		case 'APPOINTMENT_SOON':
			return Calendar;
		case 'PRESCRIPTION_EXPIRING':
		case 'PRESCRIPTION_EXPIRED':
			return FileText;
		case 'LAB_RESULT_CRITICAL':
			return FlaskConical;
		case 'TASK_DUE_SOON':
		case 'TASK_OVERDUE':
			return CheckSquare;
		case 'CONSULTATION_UNFINISHED':
			return AlertCircle;
		case 'INVOICE_PENDING':
			return CreditCard;
		case 'MESSAGE_UNREAD':
			return MessageSquare;
		case 'NOTIFICATION_UNREAD':
			return Bell;
		default:
			return Info;
	}
};

const getLevelIcon = (level: AlertLevel) => {
	switch (level) {
		case 'CRITICAL':
			return AlertCircle;
		case 'WARNING':
			return AlertTriangle;
		case 'INFO':
			return Info;
	}
};

const getLevelStyles = (level: AlertLevel) => {
	switch (level) {
		case 'CRITICAL':
			return {
				bg: 'bg-red-50',
				border: 'border-red-300',
				text: 'text-red-900',
				icon: 'text-red-600',
				badge: 'bg-red-600 text-white',
			};
		case 'WARNING':
			return {
				bg: 'bg-yellow-50',
				border: 'border-yellow-300',
				text: 'text-yellow-900',
				icon: 'text-yellow-600',
				badge: 'bg-yellow-600 text-white',
			};
		case 'INFO':
			return {
				bg: 'bg-blue-50',
				border: 'border-blue-300',
				text: 'text-blue-900',
				icon: 'text-blue-600',
				badge: 'bg-blue-600 text-white',
			};
	}
};

const formatTimeUntil = (dueAt: string) => {
	const now = new Date();
	const due = new Date(dueAt);
	const diffMs = due.getTime() - now.getTime();
	const diffMins = Math.floor(diffMs / (1000 * 60));
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffMins < 0) return 'Vencido';
	if (diffMins < 60) return `En ${diffMins} min`;
	if (diffHours < 24) return `En ${diffHours} h`;
	return `En ${diffDays} días`;
};

export default function AlertsModal({ isOpen, onClose }: AlertsModalProps) {
	const [alerts, setAlerts] = useState<Alert[]>([]);
	const [counts, setCounts] = useState({ critical: 0, warning: 0, info: 0, total: 0 });
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<AlertLevel | 'ALL'>('ALL');

	useEffect(() => {
		if (isOpen) {
			fetchAlerts();
			// Actualizar cada 30 segundos mientras está abierto
			const interval = setInterval(fetchAlerts, 30000);
			return () => clearInterval(interval);
		}
	}, [isOpen]);

	const fetchAlerts = async () => {
		try {
			setLoading(true);
			const res = await fetch('/api/medic/alerts', {
				credentials: 'include',
			});

			if (res.ok) {
				const data = await res.json();
				setAlerts(data.alerts || []);
				setCounts(data.counts || { critical: 0, warning: 0, info: 0, total: 0 });
			}
		} catch (err) {
			console.error('Error cargando alertas:', err);
		} finally {
			setLoading(false);
		}
	};

	const filteredAlerts = filter === 'ALL' 
		? alerts 
		: alerts.filter(a => a.level === filter);

	const handleAlertClick = (alert: Alert) => {
		if (alert.actionUrl) {
			onClose();
			// Navegar a la URL de acción
			window.location.href = alert.actionUrl;
		}
	};

	if (!isOpen) return null;

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm"
				onClick={onClose}
			>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 20 }}
					onClick={(e) => e.stopPropagation()}
					className="fixed inset-0 bg-white flex flex-col"
				>
					{/* Header */}
					<div className="flex items-center justify-between p-6 border-b-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white">
						<div className="flex items-center gap-4">
							<div className="p-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl shadow-lg">
								<AlertTriangle className="w-7 h-7 text-white" />
							</div>
							<div>
								<h2 className="text-3xl font-bold text-slate-900">Alertas y Recordatorios</h2>
								<p className="text-base text-slate-600 mt-1">
									{counts.total} alerta{counts.total !== 1 ? 's' : ''} pendiente{counts.total !== 1 ? 's' : ''}
									{counts.critical > 0 && (
										<span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
											{counts.critical} crítica{counts.critical !== 1 ? 's' : ''}
										</span>
									)}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<button
								onClick={fetchAlerts}
								disabled={loading}
								className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium text-slate-700"
								title="Actualizar alertas"
							>
								<RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
								<span className="hidden sm:inline">Actualizar</span>
							</button>
							<button
								onClick={onClose}
								className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
								title="Cerrar"
							>
								<X className="w-6 h-6 text-slate-600" />
							</button>
						</div>
					</div>

					{/* Filtros */}
					<div className="flex items-center gap-3 p-6 border-b-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white">
						<span className="text-sm font-semibold text-slate-700 mr-2">Filtrar:</span>
						<button
							onClick={() => setFilter('ALL')}
							className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
								filter === 'ALL'
									? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md'
									: 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
							}`}
						>
							Todas ({counts.total})
						</button>
						<button
							onClick={() => setFilter('CRITICAL')}
							className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 ${
								filter === 'CRITICAL'
									? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md'
									: 'bg-white text-slate-700 hover:bg-red-50 border border-slate-200'
							}`}
						>
							<AlertCircle className="w-4 h-4" />
							Críticas ({counts.critical})
						</button>
						<button
							onClick={() => setFilter('WARNING')}
							className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 ${
								filter === 'WARNING'
									? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-md'
									: 'bg-white text-slate-700 hover:bg-yellow-50 border border-slate-200'
							}`}
						>
							<AlertTriangle className="w-4 h-4" />
							Advertencias ({counts.warning})
						</button>
						<button
							onClick={() => setFilter('INFO')}
							className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 ${
								filter === 'INFO'
									? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
									: 'bg-white text-slate-700 hover:bg-blue-50 border border-slate-200'
							}`}
						>
							<Info className="w-4 h-4" />
							Informativas ({counts.info})
						</button>
					</div>

					{/* Lista de alertas */}
					<div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
						{loading ? (
							<div className="flex items-center justify-center py-12">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
							</div>
						) : filteredAlerts.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-center">
								<div className="p-4 bg-green-100 rounded-full mb-4">
									<CheckSquare className="w-8 h-8 text-green-600" />
								</div>
								<h3 className="text-lg font-semibold text-slate-900 mb-2">
									{filter === 'ALL' ? 'No hay alertas' : `No hay alertas ${filter.toLowerCase()}`}
								</h3>
								<p className="text-sm text-slate-600">
									{filter === 'ALL' 
										? 'Todo está al día. ¡Excelente trabajo!' 
										: 'No hay alertas de este tipo en este momento.'}
								</p>
							</div>
						) : (
							filteredAlerts.map((alert) => {
								const styles = getLevelStyles(alert.level);
								const Icon = getAlertIcon(alert.type);
								const LevelIcon = getLevelIcon(alert.level);

								return (
									<motion.div
										key={alert.id}
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										className={`${styles.bg} ${styles.border} border-2 rounded-xl p-5 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]`}
										onClick={() => handleAlertClick(alert)}
									>
										<div className="flex items-start gap-4">
											<div className={`p-3 ${styles.bg} rounded-xl shadow-sm flex-shrink-0`}>
												<Icon className={`w-6 h-6 ${styles.icon}`} />
											</div>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-3 mb-2 flex-wrap">
													<LevelIcon className={`w-5 h-5 ${styles.icon} flex-shrink-0`} />
													<h4 className={`text-lg font-bold ${styles.text}`}>{alert.title}</h4>
													<span className={`px-3 py-1 rounded-full text-xs font-bold ${styles.badge} shadow-sm`}>
														{alert.level}
													</span>
												</div>
												<p className="text-base text-slate-700 mb-3 leading-relaxed">{alert.message}</p>
												{alert.dueAt && (
													<div className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-white/50 px-3 py-1.5 rounded-lg inline-flex">
														<Clock className="w-4 h-4" />
														{formatTimeUntil(alert.dueAt)}
													</div>
												)}
											</div>
										</div>
									</motion.div>
								);
							})
						)}
					</div>

					{/* Footer */}
					<div className="p-6 border-t-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white">
						<div className="flex items-center justify-between">
							<span className="text-sm text-slate-600">
								Las alertas se actualizan automáticamente cada 30 segundos
							</span>
							<button
								onClick={onClose}
								className="px-6 py-2.5 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 rounded-xl transition-all text-white font-semibold shadow-md hover:shadow-lg"
							>
								Cerrar
							</button>
						</div>
					</div>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
}

