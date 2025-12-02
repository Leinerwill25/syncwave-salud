'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Loader2, AlertCircle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
	consultationId: string;
	facturacionId?: string | null;
	hasPendingPayment: boolean;
}

export default function ApproveAttendanceButton({ consultationId, facturacionId, hasPendingPayment }: Props) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const router = useRouter();

	const handleApprove = async () => {
		setLoading(true);
		setError(null);
		setSuccess(false);
		setShowConfirmModal(false);

		try {
			const res = await fetch(`/api/consultations/${consultationId}/approve-attendance`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					approved: true,
					facturacionId: facturacionId || null,
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Error al aprobar asistencia y pago');
			}

			setSuccess(true);
			// Recargar la página después de 1.5 segundos
			setTimeout(() => {
				router.refresh();
			}, 1500);
		} catch (err: any) {
			setError(err.message || 'Error desconocido');
		} finally {
			setLoading(false);
		}
	};

	if (!hasPendingPayment) {
		return null; // No mostrar el botón si no hay pago pendiente
	}

	return (
		<div className="space-y-2">
			<button
				onClick={() => setShowConfirmModal(true)}
				disabled={loading || success}
				className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md"
			>
				{loading ? (
					<>
						<Loader2 className="w-4 h-4 animate-spin" />
						<span>Procesando...</span>
					</>
				) : success ? (
					<>
						<CheckCircle className="w-4 h-4" />
						<span>¡Aprobado!</span>
					</>
				) : (
					<>
						<CheckCircle className="w-4 h-4" />
						<span>Aprobar Asistencia y Pago</span>
					</>
				)}
			</button>

			{/* Modal de confirmación personalizado sin overlay oscuro */}
			<AnimatePresence>
				{showConfirmModal && (
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
						<motion.div
							initial={{ opacity: 0, scale: 0.95, y: 20 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.95, y: 20 }}
							transition={{ duration: 0.2, ease: 'easeOut' }}
							className="relative z-50 w-full max-w-lg pointer-events-auto"
						>
							{/* Modal Card con diseño mejorado */}
							<div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
								{/* Header con gradiente */}
								<div className="bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 p-6 text-white relative">
									<button
										onClick={() => setShowConfirmModal(false)}
										disabled={loading}
										className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<X className="w-4 h-4 text-white" />
									</button>
									<div className="flex items-center gap-4 pr-10">
										<div className="flex-shrink-0 w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30 shadow-lg">
											<AlertCircle className="w-7 h-7 text-white" />
										</div>
										<div>
											<h3 className="text-xl font-bold text-white mb-1">
												Confirmar Aprobación
											</h3>
											<p className="text-sm text-white/90">Verificación de asistencia y pago</p>
										</div>
									</div>
								</div>

								{/* Contenido */}
								<div className="p-6 bg-gradient-to-b from-white to-slate-50">
									<div className="mb-6">
										<div className="flex items-start gap-4">
											<div className="flex-shrink-0 mt-1">
												<div className="w-3 h-3 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 shadow-lg"></div>
											</div>
											<div className="flex-1">
												<p className="text-lg font-semibold text-slate-900 mb-2">
													¿Confirmas que el paciente asistió a la consulta y realizó el pago?
												</p>
												<p className="text-sm text-slate-600 leading-relaxed">
													Esta acción marcará la facturación como pagada y actualizará el estado de la consulta de forma permanente.
												</p>
											</div>
										</div>
									</div>

									{/* Footer con botones */}
									<div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
										<button
											onClick={() => setShowConfirmModal(false)}
											disabled={loading}
											className="flex-1 sm:flex-none px-6 py-3 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Cancelar
										</button>
										<button
											onClick={handleApprove}
											disabled={loading}
											className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
										>
											{loading ? (
												<>
													<Loader2 className="w-4 h-4 animate-spin" />
													<span>Procesando...</span>
												</>
											) : (
												<>
													<CheckCircle className="w-4 h-4" />
													<span>Confirmar Aprobación</span>
												</>
											)}
										</button>
									</div>
								</div>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>

			{error && (
				<div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
					<XCircle className="w-4 h-4" />
					<span>{error}</span>
				</div>
			)}

			{success && (
				<div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
					<CheckCircle className="w-4 h-4" />
					<span>Asistencia y pago aprobados correctamente. La facturación ha sido marcada como pagada.</span>
				</div>
			)}
		</div>
	);
}

