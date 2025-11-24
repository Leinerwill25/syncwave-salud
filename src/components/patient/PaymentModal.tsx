'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, CheckCircle, Loader2, Receipt, DollarSign, Calendar, User, Building2, Smartphone, Upload, FileImage, Clock } from 'lucide-react';

type Factura = {
	id: string;
	numero_factura: string | null;
	subtotal: number;
	impuestos: number;
	total: number;
	currency: string;
	estado_pago: string;
	fecha_emision: string;
	doctor_id?: string | null;
	appointment: {
		id: string;
		scheduled_at: string;
		status: string;
		reason: string | null;
		doctor: {
			id: string;
			name: string | null;
		} | null;
	} | null;
	organization: {
		name: string | null;
	} | null;
};

type PaymentMethod = {
	type: string;
	enabled: boolean;
	data?: {
		cedula?: string;
		rif?: string;
		banco?: string;
		telefono?: string;
	};
};

interface PaymentModalProps {
	isOpen: boolean;
	onClose: () => void;
	factura: Factura | null;
	onPaymentSuccess: () => void;
}

const paymentMethods = [
	{ value: 'PAGO_MOVIL', label: 'Pago Móvil', icon: Smartphone },
	{ value: 'EFECTIVO', label: 'Efectivo', icon: DollarSign },
];

export default function PaymentModal({ isOpen, onClose, factura, onPaymentSuccess }: PaymentModalProps) {
	const [selectedMethod, setSelectedMethod] = useState<string>('');
	const [processing, setProcessing] = useState(false);
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [doctorPaymentMethods, setDoctorPaymentMethods] = useState<PaymentMethod[]>([]);
	const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
	const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
	const [paymentReference, setPaymentReference] = useState<string>('');
	const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

	// Cargar métodos de pago del doctor cuando se abre el modal
	useEffect(() => {
		if (isOpen && factura) {
			const doctorId = factura.doctor_id || factura.appointment?.doctor?.id;
			if (doctorId) {
				loadDoctorPaymentMethods(doctorId);
			}
		}
	}, [isOpen, factura]);

	const loadDoctorPaymentMethods = async (doctorId: string) => {
		try {
			setLoadingPaymentMethods(true);
			const res = await fetch(`/api/patient/pagos/doctor-payment-methods?doctorId=${doctorId}`, {
				credentials: 'include',
			});

			if (res.ok) {
				const data = await res.json();
				setDoctorPaymentMethods(data.paymentMethods || []);
			}
		} catch (err) {
			console.error('Error cargando métodos de pago del doctor:', err);
		} finally {
			setLoadingPaymentMethods(false);
		}
	};

	const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Validar que sea una imagen
		if (!file.type.startsWith('image/')) {
			setError('Por favor selecciona un archivo de imagen');
			return;
		}

		// Validar tamaño (máximo 5MB)
		if (file.size > 5 * 1024 * 1024) {
			setError('La imagen no debe superar los 5MB');
			return;
		}

		setScreenshotFile(file);
		const reader = new FileReader();
		reader.onloadend = () => {
			setPaymentScreenshot(reader.result as string);
		};
		reader.readAsDataURL(file);
		setError(null);
	};

	const formatCurrency = (amount: number, currency: string) => {
		return new Intl.NumberFormat('es-VE', {
			style: 'currency',
			currency: currency || 'USD',
		}).format(amount);
	};

	const getPagoMovilInfo = () => {
		return doctorPaymentMethods.find(pm => pm.type === 'pago_movil' && pm.enabled);
	};

	const handleSubmit = async () => {
		if (!factura) return;

		if (!selectedMethod) {
			setError('Por favor selecciona un método de pago');
			return;
		}

		// Validar que si es pago móvil, se haya subido la captura y el número de referencia
		if (selectedMethod === 'PAGO_MOVIL') {
			if (!paymentScreenshot) {
				setError('Por favor sube la captura de pantalla del pago móvil');
				return;
			}
			if (!paymentReference.trim()) {
				setError('Por favor ingresa el número de referencia del pago');
				return;
			}
		}

		setProcessing(true);
		setError(null);

		try {
			// Crear FormData para enviar la captura si existe
			const formData = new FormData();
			formData.append('metodo_pago', selectedMethod);
			
			// Solo agregar referencia y captura si es pago móvil
			if (selectedMethod === 'PAGO_MOVIL') {
				formData.append('numero_referencia', paymentReference.trim());
				if (screenshotFile) {
					formData.append('captura_pago', screenshotFile);
				}
			}

			const res = await fetch(`/api/patient/pagos/${factura.id}/pay`, {
				method: 'POST',
				credentials: 'include',
				body: formData,
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
		setError(null);
		setSuccess(false);
		setPaymentScreenshot(null);
		setPaymentReference('');
		setScreenshotFile(null);
		setDoctorPaymentMethods([]);
		onClose();
	};

	if (!factura) return null;

	// Verificar si la cita está confirmada
	const isAppointmentConfirmed = factura.appointment && 
		(factura.appointment.status === 'CONFIRMADA' || factura.appointment.status === 'CONFIRMED');

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
						className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
					>
						{/* Modal */}
						<motion.div
							initial={{ opacity: 0, scale: 0.95, y: 20 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.95, y: 20 }}
							onClick={(e) => e.stopPropagation()}
							className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
						>
							{/* Header */}
							<div className="sticky top-0 bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-4 sm:p-6 rounded-t-xl sm:rounded-t-2xl flex items-center justify-between z-10">
								<div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
									<div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm flex-shrink-0">
										<Receipt className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
									</div>
									<div className="min-w-0 flex-1">
										<h2 className="text-lg sm:text-xl md:text-2xl font-bold">Procesar Pago</h2>
										<p className="text-teal-100 text-xs sm:text-sm">Confirma los detalles y completa el pago</p>
									</div>
								</div>
								{!processing && (
									<button
										onClick={handleClose}
										className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0 ml-2"
										aria-label="Cerrar"
									>
										<X className="w-4 h-4 sm:w-5 sm:h-5" />
									</button>
								)}
							</div>

							{/* Content */}
							<div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
								{/* Mensaje si la cita no está confirmada */}
								{!isAppointmentConfirmed && factura.appointment && (
									<motion.div
										initial={{ opacity: 0, y: -10 }}
										animate={{ opacity: 1, y: 0 }}
										className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-3 sm:p-4"
									>
										<div className="flex items-start gap-2 sm:gap-3">
											<Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
											<div className="min-w-0 flex-1">
												<p className="font-semibold text-yellow-900 text-sm sm:text-base">Cita no confirmada</p>
												<p className="text-xs sm:text-sm text-yellow-800 mt-0.5 sm:mt-1 break-words">
													Debes esperar a que el especialista confirme tu cita antes de poder realizar el pago.
												</p>
											</div>
										</div>
									</motion.div>
								)}
								{success ? (
									/* Success State */
									<motion.div
										initial={{ opacity: 0, scale: 0.9 }}
										animate={{ opacity: 1, scale: 1 }}
										className="text-center py-8 sm:py-12"
									>
										<motion.div
											initial={{ scale: 0 }}
											animate={{ scale: 1 }}
											transition={{ type: 'spring', stiffness: 200, damping: 15 }}
											className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4"
										>
											<CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" />
										</motion.div>
										<h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">¡Pago Procesado Exitosamente!</h3>
										<p className="text-sm sm:text-base text-gray-600">Tu pago ha sido registrado correctamente</p>
									</motion.div>
								) : (
									<>
										{/* Invoice Summary */}
										<div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-xl p-4 sm:p-6 border border-blue-100">
											<div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
												<div className="p-1.5 sm:p-2 bg-white rounded-lg shadow-sm flex-shrink-0">
													<Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
												</div>
												<div className="min-w-0 flex-1">
													<h3 className="font-semibold text-gray-900 text-sm sm:text-base break-words">
														{factura.numero_factura || `Factura #${factura.id.slice(0, 8)}`}
													</h3>
													<p className="text-xs sm:text-sm text-gray-600 flex items-center gap-1 mt-0.5 sm:mt-1 flex-wrap">
														<Calendar className="w-3 h-3 flex-shrink-0" />
														<span>{new Date(factura.fecha_emision).toLocaleDateString('es-ES', {
															year: 'numeric',
															month: 'long',
															day: 'numeric',
														})}</span>
													</p>
												</div>
											</div>

											{factura.appointment?.doctor && (
												<div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700 mb-1.5 sm:mb-2">
													<User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
													<span className="break-words">
														<strong>Médico:</strong> Dr. {factura.appointment.doctor.name}
													</span>
												</div>
											)}

											{factura.organization?.name && (
												<div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700 mb-3 sm:mb-4">
													<Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
													<span className="break-words">
														<strong>Organización:</strong> {factura.organization.name}
													</span>
												</div>
											)}

											<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-blue-200">
												<div>
													<p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">Subtotal</p>
													<p className="text-base sm:text-lg font-semibold text-gray-900">
														{formatCurrency(factura.subtotal, factura.currency)}
													</p>
												</div>
												<div>
													<p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">Impuestos</p>
													<p className="text-base sm:text-lg font-semibold text-gray-900">
														{formatCurrency(factura.impuestos, factura.currency)}
													</p>
												</div>
												<div>
													<p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">Total a Pagar</p>
													<p className="text-xl sm:text-2xl font-bold text-teal-600 flex items-center gap-1">
														<DollarSign className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
														<span className="break-words">{formatCurrency(factura.total, factura.currency)}</span>
													</p>
												</div>
											</div>
										</div>

										{/* Doctor Payment Methods Info - Pago Móvil */}
										{getPagoMovilInfo() && (
											<motion.div
												initial={{ opacity: 0, y: -10 }}
												animate={{ opacity: 1, y: 0 }}
												className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 sm:p-6 border-2 border-green-200"
											>
												<div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
													<div className="p-1.5 sm:p-2 bg-green-100 rounded-lg flex-shrink-0">
														<Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
													</div>
													<div className="min-w-0 flex-1">
														<h3 className="font-semibold text-gray-900 text-sm sm:text-base">Información de Pago Móvil</h3>
														<p className="text-xs sm:text-sm text-gray-600">Datos del especialista para realizar el pago</p>
													</div>
												</div>
												<div className="space-y-2 sm:space-y-3">
													{getPagoMovilInfo()?.data?.cedula && (
														<div className="bg-white rounded-lg p-2.5 sm:p-3 border border-green-100">
															<p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">Cédula de Identidad</p>
															<p className="font-semibold text-gray-900 text-sm sm:text-base break-words">{getPagoMovilInfo()?.data?.cedula}</p>
														</div>
													)}
													{getPagoMovilInfo()?.data?.rif && (
														<div className="bg-white rounded-lg p-2.5 sm:p-3 border border-green-100">
															<p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">RIF</p>
															<p className="font-semibold text-gray-900 text-sm sm:text-base break-words">{getPagoMovilInfo()?.data?.rif}</p>
														</div>
													)}
													{getPagoMovilInfo()?.data?.banco && (
														<div className="bg-white rounded-lg p-2.5 sm:p-3 border border-green-100">
															<p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">Banco</p>
															<p className="font-semibold text-gray-900 text-sm sm:text-base break-words">{getPagoMovilInfo()?.data?.banco}</p>
														</div>
													)}
													{getPagoMovilInfo()?.data?.telefono && (
														<div className="bg-white rounded-lg p-2.5 sm:p-3 border border-green-100">
															<p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">Teléfono Afiliado</p>
															<p className="font-semibold text-gray-900 text-sm sm:text-base break-words">{getPagoMovilInfo()?.data?.telefono}</p>
														</div>
													)}
												</div>
											</motion.div>
										)}

										{/* Payment Method Selection */}
										<div>
											<label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
												Método de Pago
											</label>
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
												{paymentMethods.map((method) => {
													const Icon = method.icon;
													const isSelected = selectedMethod === method.value;
													// Deshabilitar pago móvil si el doctor no lo tiene configurado
													const isDisabled = method.value === 'PAGO_MOVIL' && !getPagoMovilInfo();
													return (
														<button
															key={method.value}
															type="button"
															onClick={() => setSelectedMethod(method.value)}
															disabled={processing || isDisabled}
															className={`p-3 sm:p-4 rounded-xl border-2 transition-all text-left ${
																isSelected
																	? 'border-teal-600 bg-teal-50 shadow-md'
																	: 'border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50/50'
															} ${processing || isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
														>
															<div className="flex items-center gap-2 sm:gap-3">
																<div
																	className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
																		isSelected ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'
																	}`}
																>
																	<Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
																</div>
																<span className={`font-medium text-sm sm:text-base ${isSelected ? 'text-teal-900' : 'text-gray-700'} flex-1`}>
																	{method.label}
																</span>
																{isSelected && (
																	<motion.div
																		initial={{ scale: 0 }}
																		animate={{ scale: 1 }}
																		className="ml-auto w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0"
																	>
																		<CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
																	</motion.div>
																)}
															</div>
														</button>
													);
												})}
											</div>

											{/* Campos adicionales para Pago Móvil */}
											{selectedMethod === 'PAGO_MOVIL' && (
												<motion.div
													initial={{ opacity: 0, height: 0 }}
													animate={{ opacity: 1, height: 'auto' }}
													className="mt-4 sm:mt-6 space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t border-gray-200"
												>
													<div>
														<label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">
															Número de Referencia <span className="text-red-500">*</span>
														</label>
														<input
															type="text"
															value={paymentReference}
															onChange={(e) => setPaymentReference(e.target.value)}
															placeholder="Ingresa el número de referencia del pago móvil"
															disabled={processing}
															className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed text-sm sm:text-base"
															required
														/>
														<p className="mt-1 text-[10px] sm:text-xs text-gray-500">
															Ingresa el número de referencia que aparece en tu comprobante de pago móvil
														</p>
													</div>

													<div>
														<label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">
															Captura de Pantalla del Pago <span className="text-red-500">*</span>
														</label>
														<div className="space-y-2 sm:space-y-3">
															{paymentScreenshot ? (
																<div className="relative">
																	<img
																		src={paymentScreenshot}
																		alt="Captura de pago"
																		className="w-full max-h-48 sm:max-h-64 object-contain rounded-lg border-2 border-gray-200 bg-gray-50"
																	/>
																	<button
																		type="button"
																		onClick={() => {
																			setPaymentScreenshot(null);
																			setScreenshotFile(null);
																		}}
																		className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 p-1.5 sm:p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
																		disabled={processing}
																	>
																		<X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
																	</button>
																</div>
															) : (
																<label className="flex flex-col items-center justify-center w-full h-36 sm:h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
																	<div className="flex flex-col items-center justify-center pt-4 sm:pt-5 pb-4 sm:pb-6 px-4">
																		<Upload className="w-8 h-8 sm:w-10 sm:h-10 mb-2 sm:mb-3 text-gray-400" />
																		<p className="mb-1 sm:mb-2 text-xs sm:text-sm text-gray-500 text-center">
																			<span className="font-semibold">Click para subir</span> o arrastra la imagen
																		</p>
																		<p className="text-[10px] sm:text-xs text-gray-500 text-center">PNG, JPG o JPEG (MAX. 5MB)</p>
																	</div>
																	<input
																		type="file"
																		accept="image/*"
																		onChange={handleScreenshotUpload}
																		className="hidden"
																		disabled={processing}
																	/>
																</label>
															)}
														</div>
														<p className="mt-1 text-[10px] sm:text-xs text-gray-500">
															Sube una captura de pantalla del comprobante de pago móvil para verificación
														</p>
													</div>
												</motion.div>
											)}
										</div>

										{/* Error Message */}
										{error && (
											<motion.div
												initial={{ opacity: 0, y: -10 }}
												animate={{ opacity: 1, y: 0 }}
												className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 text-red-700 text-xs sm:text-sm"
											>
												{error}
											</motion.div>
										)}

										{/* Actions */}
										<div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200">
											<button
												onClick={handleClose}
												disabled={processing}
												className="w-full sm:flex-1 px-4 sm:px-6 py-2 sm:py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
											>
												Cancelar
											</button>
											<button
												onClick={handleSubmit}
												disabled={
													processing || 
													!isAppointmentConfirmed ||
													!selectedMethod || 
													(selectedMethod === 'PAGO_MOVIL' && (!paymentScreenshot || !paymentReference.trim()))
												}
												className="w-full sm:flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg font-semibold hover:from-teal-700 hover:to-cyan-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
											>
												{processing ? (
													<>
														<Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
														<span>Procesando...</span>
													</>
												) : (
													<>
														<CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
														<span>Confirmar Pago</span>
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

