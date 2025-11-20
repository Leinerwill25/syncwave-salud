'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, CheckCircle, Loader2, Receipt, DollarSign, Calendar, User, Building2 } from 'lucide-react';

type Factura = {
	id: string;
	numero_factura: string | null;
	subtotal: number;
	impuestos: number;
	total: number;
	currency: string;
	estado_pago: string;
	fecha_emision: string;
	appointment: {
		scheduled_at: string;
		reason: string | null;
		doctor: {
			name: string | null;
		} | null;
	} | null;
	organization: {
		name: string | null;
	} | null;
};

interface PaymentModalProps {
	isOpen: boolean;
	onClose: () => void;
	factura: Factura | null;
	onPaymentSuccess: () => void;
}

const paymentMethods = [
	{ value: 'EFECTIVO', label: 'Efectivo', icon: DollarSign },
	{ value: 'TRANSFERENCIA', label: 'Transferencia Bancaria', icon: CreditCard },
	{ value: 'TARJETA_DEBITO', label: 'Tarjeta de Débito', icon: CreditCard },
	{ value: 'TARJETA_CREDITO', label: 'Tarjeta de Crédito', icon: CreditCard },
	{ value: 'PAYPAL', label: 'PayPal', icon: CreditCard },
	{ value: 'OTRO', label: 'Otro', icon: CreditCard },
];

export default function PaymentModal({ isOpen, onClose, factura, onPaymentSuccess }: PaymentModalProps) {
	const [selectedMethod, setSelectedMethod] = useState<string>('');
	const [customMethod, setCustomMethod] = useState<string>('');
	const [processing, setProcessing] = useState(false);
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const formatCurrency = (amount: number, currency: string) => {
		return new Intl.NumberFormat('es-VE', {
			style: 'currency',
			currency: currency || 'USD',
		}).format(amount);
	};

	const handleSubmit = async () => {
		if (!factura) return;

		const metodoPago = selectedMethod === 'OTRO' ? customMethod.trim() : selectedMethod;

		if (!metodoPago) {
			setError('Por favor selecciona un método de pago');
			return;
		}

		setProcessing(true);
		setError(null);

		try {
			const res = await fetch(`/api/patient/pagos/${factura.id}/pay`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					metodo_pago: metodoPago,
				}),
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || 'Error al procesar el pago');
			}

			setSuccess(true);
			setTimeout(() => {
				onPaymentSuccess();
				handleClose();
			}, 2000);
		} catch (err) {
			console.error('Error:', err);
			setError(err instanceof Error ? err.message : 'Error al procesar el pago');
		} finally {
			setProcessing(false);
		}
	};

	const handleClose = () => {
		if (processing) return;
		setSelectedMethod('');
		setCustomMethod('');
		setError(null);
		setSuccess(false);
		onClose();
	};

	if (!factura) return null;

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={handleClose}
						className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
					>
						{/* Modal */}
						<motion.div
							initial={{ opacity: 0, scale: 0.95, y: 20 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.95, y: 20 }}
							onClick={(e) => e.stopPropagation()}
							className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
						>
							{/* Header */}
							<div className="sticky top-0 bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-6 rounded-t-2xl flex items-center justify-between z-10">
								<div className="flex items-center gap-3">
									<div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
										<Receipt className="w-6 h-6" />
									</div>
									<div>
										<h2 className="text-2xl font-bold">Procesar Pago</h2>
										<p className="text-teal-100 text-sm">Confirma los detalles y completa el pago</p>
									</div>
								</div>
								{!processing && (
									<button
										onClick={handleClose}
										className="p-2 hover:bg-white/20 rounded-lg transition-colors"
										aria-label="Cerrar"
									>
										<X className="w-5 h-5" />
									</button>
								)}
							</div>

							{/* Content */}
							<div className="p-6 space-y-6">
								{success ? (
									/* Success State */
									<motion.div
										initial={{ opacity: 0, scale: 0.9 }}
										animate={{ opacity: 1, scale: 1 }}
										className="text-center py-12"
									>
										<motion.div
											initial={{ scale: 0 }}
											animate={{ scale: 1 }}
											transition={{ type: 'spring', stiffness: 200, damping: 15 }}
											className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
										>
											<CheckCircle className="w-12 h-12 text-green-600" />
										</motion.div>
										<h3 className="text-2xl font-bold text-gray-900 mb-2">¡Pago Procesado Exitosamente!</h3>
										<p className="text-gray-600">Tu pago ha sido registrado correctamente</p>
									</motion.div>
								) : (
									<>
										{/* Invoice Summary */}
										<div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-xl p-6 border border-blue-100">
											<div className="flex items-center gap-3 mb-4">
												<div className="p-2 bg-white rounded-lg shadow-sm">
													<Receipt className="w-5 h-5 text-teal-600" />
												</div>
												<div>
													<h3 className="font-semibold text-gray-900">
														{factura.numero_factura || `Factura #${factura.id.slice(0, 8)}`}
													</h3>
													<p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
														<Calendar className="w-3 h-3" />
														{new Date(factura.fecha_emision).toLocaleDateString('es-ES', {
															year: 'numeric',
															month: 'long',
															day: 'numeric',
														})}
													</p>
												</div>
											</div>

											{factura.appointment?.doctor && (
												<div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
													<User className="w-4 h-4 text-gray-500" />
													<span>
														<strong>Médico:</strong> Dr. {factura.appointment.doctor.name}
													</span>
												</div>
											)}

											{factura.organization?.name && (
												<div className="flex items-center gap-2 text-sm text-gray-700 mb-4">
													<Building2 className="w-4 h-4 text-gray-500" />
													<span>
														<strong>Organización:</strong> {factura.organization.name}
													</span>
												</div>
											)}

											<div className="grid grid-cols-3 gap-4 pt-4 border-t border-blue-200">
												<div>
													<p className="text-xs text-gray-600 mb-1">Subtotal</p>
													<p className="text-lg font-semibold text-gray-900">
														{formatCurrency(factura.subtotal, factura.currency)}
													</p>
												</div>
												<div>
													<p className="text-xs text-gray-600 mb-1">Impuestos</p>
													<p className="text-lg font-semibold text-gray-900">
														{formatCurrency(factura.impuestos, factura.currency)}
													</p>
												</div>
												<div>
													<p className="text-xs text-gray-600 mb-1">Total a Pagar</p>
													<p className="text-2xl font-bold text-teal-600 flex items-center gap-1">
														<DollarSign className="w-5 h-5" />
														{formatCurrency(factura.total, factura.currency)}
													</p>
												</div>
											</div>
										</div>

										{/* Payment Method Selection */}
										<div>
											<label className="block text-sm font-semibold text-gray-900 mb-3">
												Método de Pago
											</label>
											<div className="grid grid-cols-2 gap-3">
												{paymentMethods.map((method) => {
													const Icon = method.icon;
													const isSelected = selectedMethod === method.value;
													return (
														<button
															key={method.value}
															type="button"
															onClick={() => setSelectedMethod(method.value)}
															disabled={processing}
															className={`p-4 rounded-xl border-2 transition-all text-left ${
																isSelected
																	? 'border-teal-600 bg-teal-50 shadow-md'
																	: 'border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50/50'
															} ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
														>
															<div className="flex items-center gap-3">
																<div
																	className={`p-2 rounded-lg ${
																		isSelected ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'
																	}`}
																>
																	<Icon className="w-4 h-4" />
																</div>
																<span className={`font-medium ${isSelected ? 'text-teal-900' : 'text-gray-700'}`}>
																	{method.label}
																</span>
																{isSelected && (
																	<motion.div
																		initial={{ scale: 0 }}
																		animate={{ scale: 1 }}
																		className="ml-auto w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center"
																	>
																		<CheckCircle className="w-3 h-3 text-white" />
																	</motion.div>
																)}
															</div>
														</button>
													);
												})}
											</div>

											{selectedMethod === 'OTRO' && (
												<motion.div
													initial={{ opacity: 0, height: 0 }}
													animate={{ opacity: 1, height: 'auto' }}
													className="mt-4"
												>
													<label className="block text-sm font-medium text-gray-700 mb-2">
														Especifica el método de pago
													</label>
													<input
														type="text"
														value={customMethod}
														onChange={(e) => setCustomMethod(e.target.value)}
														placeholder="Ej: Zelle, Binance, etc."
														disabled={processing}
														className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
													/>
												</motion.div>
											)}
										</div>

										{/* Error Message */}
										{error && (
											<motion.div
												initial={{ opacity: 0, y: -10 }}
												animate={{ opacity: 1, y: 0 }}
												className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm"
											>
												{error}
											</motion.div>
										)}

										{/* Actions */}
										<div className="flex gap-3 pt-4 border-t border-gray-200">
											<button
												onClick={handleClose}
												disabled={processing}
												className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
											>
												Cancelar
											</button>
											<button
												onClick={handleSubmit}
												disabled={processing || !selectedMethod || (selectedMethod === 'OTRO' && !customMethod.trim())}
												className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg font-semibold hover:from-teal-700 hover:to-cyan-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
											>
												{processing ? (
													<>
														<Loader2 className="w-5 h-5 animate-spin" />
														Procesando...
													</>
												) : (
													<>
														<CreditCard className="w-5 h-5" />
														Confirmar Pago
													</>
												)}
											</button>
										</div>
									</>
								)}
							</div>
						</motion.div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}

