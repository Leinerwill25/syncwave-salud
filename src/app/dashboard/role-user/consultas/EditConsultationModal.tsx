'use client';

import React, { useEffect, useState } from 'react';
import { X, Save, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type PaymentMethod = {
	id: string;
	name: string;
	description: string | null;
};

type Facturacion = {
	id: string;
	total: number;
	currency: string;
	tipoCambio?: number;
	metodoPago?: string;
	estadoPago?: string;
};

type Props = {
	isOpen: boolean;
	onClose: () => void;
	consultationId: string;
	facturacion: Facturacion | null;
	onSave: () => void;
};

export default function EditConsultationModal({ isOpen, onClose, consultationId, facturacion, onSave }: Props) {
	const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
	const [loading, setLoading] = useState(false);
	const [loadingMethods, setLoadingMethods] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Form states
	const [metodoPago, setMetodoPago] = useState('');
	const [ajusteMonto, setAjusteMonto] = useState('');
	const [razonAjuste, setRazonAjuste] = useState('');
	const [nuevoTotal, setNuevoTotal] = useState('');

	useEffect(() => {
		if (isOpen) {
			loadPaymentMethods();
			if (facturacion) {
				setMetodoPago(facturacion.metodoPago || '');
				setNuevoTotal(String(facturacion.total || 0));
				setAjusteMonto('');
				setRazonAjuste('');
			}
		}
	}, [isOpen, facturacion]);

	const loadPaymentMethods = async () => {
		try {
			setLoadingMethods(true);
			const res = await fetch('/api/role-users/payment-methods', {
				credentials: 'include',
			});

			const data = await res.json();

			if (res.ok) {
				setPaymentMethods(data.paymentMethods || []);
			}
		} catch (err) {
			console.error('Error cargando métodos de pago:', err);
		} finally {
			setLoadingMethods(false);
		}
	};

	const handleSave = async () => {
		if (!metodoPago) {
			setError('Debe seleccionar un método de pago');
			return;
		}

		if (ajusteMonto && !razonAjuste.trim()) {
			setError('Debe proporcionar una razón para el ajuste de monto');
			return;
		}

		try {
			setLoading(true);
			setError(null);

			// Calcular el nuevo total si hay ajuste
			let totalFinal = facturacion?.total || 0;
			const ajuste = parseFloat(ajusteMonto) || 0;
			if (ajuste !== 0) {
				totalFinal = (facturacion?.total || 0) + ajuste;
			} else if (nuevoTotal) {
				totalFinal = parseFloat(nuevoTotal);
			}

			// Actualizar facturación
			const updatePayload: any = {
				metodo_pago: metodoPago,
			};

			// Si hay ajuste de monto, agregarlo
			if (ajuste !== 0) {
				updatePayload.ajuste_monto = ajuste;
				updatePayload.razon_ajuste = razonAjuste.trim();
				updatePayload.total = totalFinal;
			} else if (nuevoTotal && parseFloat(nuevoTotal) !== facturacion?.total) {
				// Si se cambió el total manualmente, calcular el ajuste
				const diferencia = parseFloat(nuevoTotal) - (facturacion?.total || 0);
				if (diferencia !== 0) {
					updatePayload.ajuste_monto = diferencia;
					updatePayload.razon_ajuste = razonAjuste.trim() || 'Ajuste manual de monto';
					updatePayload.total = totalFinal;
				}
			}

			// Si se cambió el método de pago a pagado y no está pagado, actualizar estado
			if (facturacion?.estadoPago !== 'pagada' && facturacion?.estadoPago !== 'pagado') {
				updatePayload.estado_pago = 'pagada';
				updatePayload.fecha_pago = new Date().toISOString();
			}

			const res = await fetch(`/api/facturacion/${facturacion?.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(updatePayload),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Error al actualizar facturación');
			}

			onSave();
			onClose();
		} catch (err: any) {
			console.error('Error guardando facturación:', err);
			setError(err.message || 'Error al guardar cambios');
		} finally {
			setLoading(false);
		}
	};

	if (!isOpen) return null;

	return (
		<AnimatePresence>
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					exit={{ opacity: 0, scale: 0.95 }}
					className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
				>
					{/* Header */}
					<div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
						<h2 className="text-xl font-bold text-slate-900">Editar Facturación de Consulta</h2>
						<button
							onClick={onClose}
							className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
							disabled={loading}
						>
							<X className="w-5 h-5 text-slate-600" />
						</button>
					</div>

					{/* Content */}
					<div className="p-6 space-y-6">
						{error && (
							<div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-center gap-3">
								<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
								<p className="text-sm text-red-800">{error}</p>
							</div>
						)}

						{/* Información actual */}
						{facturacion && (
							<div className="bg-slate-50 rounded-lg p-4 space-y-2">
								<p className="text-sm font-medium text-slate-700">Monto actual:</p>
								<p className="text-lg font-bold text-slate-900">
									{Number(facturacion.total).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {facturacion.currency}
								</p>
								{facturacion.tipoCambio && facturacion.currency !== 'VES' && (
									<p className="text-sm text-slate-600">
										≈ {(Number(facturacion.total) * Number(facturacion.tipoCambio)).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
									</p>
								)}
							</div>
						)}

						{/* Método de pago */}
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-2">
								Método de Pago <span className="text-red-500">*</span>
							</label>
							{loadingMethods ? (
								<div className="flex items-center gap-2 text-slate-500">
									<Loader2 className="w-4 h-4 animate-spin" />
									<span className="text-sm">Cargando métodos...</span>
								</div>
							) : (
								<select
									value={metodoPago}
									onChange={(e) => setMetodoPago(e.target.value)}
									className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
								>
									<option value="">Seleccionar método de pago</option>
									{paymentMethods.map((method) => (
										<option key={method.id} value={method.name}>
											{method.name}
										</option>
									))}
								</select>
							)}
						</div>

						{/* Ajuste de monto */}
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-2">
								Ajuste de Monto (opcional)
							</label>
							<p className="text-xs text-slate-500 mb-2">
								Ingrese un valor positivo para agregar un cargo adicional, o negativo para aplicar un descuento.
							</p>
							<input
								type="number"
								step="0.01"
								value={ajusteMonto}
								onChange={(e) => {
									setAjusteMonto(e.target.value);
									if (facturacion && e.target.value) {
										const ajuste = parseFloat(e.target.value) || 0;
										setNuevoTotal(String((facturacion.total || 0) + ajuste));
									}
								}}
								placeholder="0.00"
								className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
							/>
						</div>

						{/* Nuevo total (editable directamente) */}
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-2">
								Monto Final a Cobrar
							</label>
							<input
								type="number"
								step="0.01"
								value={nuevoTotal}
								onChange={(e) => {
									setNuevoTotal(e.target.value);
									if (facturacion && e.target.value) {
										const nuevo = parseFloat(e.target.value) || 0;
										const ajusteCalc = nuevo - (facturacion.total || 0);
										setAjusteMonto(String(ajusteCalc));
									}
								}}
								className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
							/>
							{facturacion?.tipoCambio && facturacion.currency !== 'VES' && nuevoTotal && (
								<p className="text-xs text-slate-500 mt-1">
									≈ {(parseFloat(nuevoTotal) * Number(facturacion.tipoCambio)).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
								</p>
							)}
						</div>

						{/* Razón del ajuste */}
						{(ajusteMonto && parseFloat(ajusteMonto) !== 0) || (nuevoTotal && parseFloat(nuevoTotal) !== facturacion?.total) ? (
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-2">
									Razón del Ajuste <span className="text-red-500">*</span>
								</label>
								<textarea
									value={razonAjuste}
									onChange={(e) => setRazonAjuste(e.target.value)}
									placeholder="Explique la razón del ajuste de monto (descuento, cargo adicional, servicios adicionales, etc.)"
									rows={3}
									className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
								/>
							</div>
						) : null}
					</div>

					{/* Footer */}
					<div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3">
						<button
							onClick={onClose}
							disabled={loading}
							className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
						>
							Cancelar
						</button>
						<button
							onClick={handleSave}
							disabled={loading || !metodoPago}
							className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								<Save className="w-4 h-4" />
							)}
							Guardar Cambios
						</button>
					</div>
				</motion.div>
			</div>
		</AnimatePresence>
	);
}

