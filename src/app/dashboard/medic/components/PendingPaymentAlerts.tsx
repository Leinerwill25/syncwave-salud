'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Clock, DollarSign, CheckCircle, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { format } from 'date-fns';
import CurrencyDisplay from '@/components/CurrencyDisplay';

interface Alert {
	type: 'appointment' | 'consultation';
	id: string;
	patientName: string;
	scheduledAt?: string;
	startedAt?: string;
	status?: string;
	reason?: string;
	location?: string;
	chiefComplaint?: string;
	facturacion: {
		id: string;
		total: number;
		currency: string;
		estado_pago: string;
	};
	url: string;
}

export default function PendingPaymentAlerts() {
	const [alerts, setAlerts] = useState<Alert[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [dismissed, setDismissed] = useState<Set<string>>(new Set());

	useEffect(() => {
		fetchAlerts();
		
		// Refrescar automáticamente cada 5 minutos cuando el usuario está activo
		// Esto reemplaza el cron job y funciona en el plan gratuito de Vercel
		const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
		
		// También refrescar cuando la ventana vuelve a estar visible (usuario regresa a la pestaña)
		const handleVisibilityChange = () => {
			if (!document.hidden) {
				fetchAlerts();
			}
		};
		
		document.addEventListener('visibilitychange', handleVisibilityChange);
		
		return () => {
			clearInterval(interval);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	}, []);

	const fetchAlerts = async () => {
		try {
			setLoading(true);
			setError(null);
			const res = await fetch('/api/medic/pending-payment-alerts', {
				credentials: 'include',
				cache: 'no-store',
			});

			if (!res.ok) {
				throw new Error('Error al obtener alertas');
			}

			const data = await res.json();
			if (data.success && Array.isArray(data.alerts)) {
				setAlerts(data.alerts.filter((alert: Alert) => !dismissed.has(alert.id)));
			}
		} catch (err: any) {
			setError(err.message || 'Error al cargar alertas');
		} finally {
			setLoading(false);
		}
	};

	const handleDismiss = (alertId: string) => {
		setDismissed((prev) => new Set(prev).add(alertId));
		setAlerts((prev) => prev.filter((a) => a.id !== alertId));
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-4">
				<Loader2 className="w-5 h-5 animate-spin text-slate-400" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
				{error}
			</div>
		);
	}

	if (alerts.length === 0) {
		return null;
	}

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
					<AlertCircle className="w-5 h-5 text-amber-500" />
					Pagos Pendientes de Validación ({alerts.length})
				</h3>
			</div>

			<AnimatePresence>
				{alerts.map((alert) => (
					<motion.div
						key={alert.id}
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 shadow-sm"
					>
						<div className="flex items-start justify-between gap-3">
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2 mb-2">
									{alert.type === 'appointment' ? (
										<Clock className="w-4 h-4 text-amber-600 shrink-0" />
									) : (
										<CheckCircle className="w-4 h-4 text-amber-600 shrink-0" />
									)}
									<span className="text-sm font-semibold text-slate-900 truncate">
										{alert.patientName}
									</span>
									<span className="text-xs px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full">
										{alert.type === 'appointment' ? 'Cita' : 'Consulta'}
									</span>
								</div>

								<div className="space-y-1 text-xs text-slate-600">
									{alert.scheduledAt && (
										<div className="flex items-center gap-1">
											<Clock className="w-3 h-3" />
											<span>
												{format(new Date(alert.scheduledAt), 'dd/MM/yyyy HH:mm')}
											</span>
										</div>
									)}
									{alert.startedAt && (
										<div className="flex items-center gap-1">
											<Clock className="w-3 h-3" />
											<span>
												{format(new Date(alert.startedAt), 'dd/MM/yyyy HH:mm')}
											</span>
										</div>
									)}
									{alert.reason && (
										<div className="truncate">
											<span className="font-medium">Motivo:</span> {alert.reason}
										</div>
									)}
									{alert.chiefComplaint && (
										<div className="truncate">
											<span className="font-medium">Motivo:</span> {alert.chiefComplaint}
										</div>
									)}
								</div>

								<div className="mt-3 flex items-center gap-2">
									<DollarSign className="w-4 h-4 text-amber-600" />
									<CurrencyDisplay
										amount={alert.facturacion.total}
										currency={alert.facturacion.currency as 'USD' | 'EUR'}
										showBoth={true}
										primaryCurrency="USD"
										size="sm"
										className="font-semibold text-amber-700"
									/>
									<span className="text-xs px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full">
										{alert.facturacion.estado_pago === 'pendiente_verificacion'
											? 'Pendiente Verificación'
											: 'Pendiente'}
									</span>
								</div>
							</div>

							<div className="flex items-start gap-2 shrink-0">
								<Link
									href={alert.url}
									className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition-colors"
								>
									Validar
								</Link>
								<button
									onClick={() => handleDismiss(alert.id)}
									className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
									title="Descartar"
								>
									<X className="w-4 h-4" />
								</button>
							</div>
						</div>
					</motion.div>
				))}
			</AnimatePresence>
		</div>
	);
}

