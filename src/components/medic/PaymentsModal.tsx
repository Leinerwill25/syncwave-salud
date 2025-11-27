'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Receipt, Calendar, User, CreditCard, Image as ImageIcon, DollarSign, Eye, Download, CheckCircle, Clock, FileText } from 'lucide-react';
import CurrencyDisplay from '@/components/CurrencyDisplay';

type PagoEfectuado = {
	id: string;
	numero_factura: string | null;
	total: number;
	currency: string;
	metodo_pago: string | null;
	fecha_emision: string;
	fecha_pago: string | null;
	notas: string | null;
	appointment: {
		id: string;
		scheduled_at: string;
		status: string;
		reason: string | null;
		patient: {
			id: string;
			firstName: string;
			lastName: string;
			identifier: string | null;
			isUnregistered?: boolean;
		} | null;
		consultations?: Array<{
			id: string;
			chief_complaint: string | null;
			diagnosis: string | null;
			created_at: string;
		}> | null;
	} | null;
	patient: {
		id: string;
		firstName: string;
		lastName: string;
		identifier: string | null;
		isUnregistered?: boolean;
	} | null;
};

interface PaymentsModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export default function PaymentsModal({ isOpen, onClose }: PaymentsModalProps) {
	const [loading, setLoading] = useState(true);
	const [pagos, setPagos] = useState<PagoEfectuado[]>([]);
	const [selectedPago, setSelectedPago] = useState<PagoEfectuado | null>(null);
	const [selectedImage, setSelectedImage] = useState<string | null>(null);

	useEffect(() => {
		if (isOpen) {
			loadPagos();
		}
	}, [isOpen]);

	const loadPagos = async () => {
		try {
			setLoading(true);
			const res = await fetch('/api/medic/pagos/efectuados', {
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al cargar pagos');

			const data = await res.json();
			setPagos(data.data || []);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const extractReferencia = (notas: string | null): string | null => {
		if (!notas) return null;
		const match = notas.match(/\[REFERENCIA\]\s*(.+)/);
		return match ? match[1].trim() : null;
	};

	const extractCapturaUrl = (notas: string | null): string | null => {
		if (!notas) return null;
		const match = notas.match(/\[CAPTURA\]\s*(.+)/);
		return match ? match[1].trim() : null;
	};

	const formatCurrency = (amount: number, currency: string) => {
		return new Intl.NumberFormat('es-VE', {
			style: 'currency',
			currency: currency || 'USD',
		}).format(amount);
	};

	const getStatusColor = (status: string) => {
		switch (status?.toUpperCase()) {
			case 'CONFIRMADA':
			case 'CONFIRMED':
				return 'bg-green-100 text-green-700';
			case 'SCHEDULED':
			case 'PROGRAMADA':
				return 'bg-blue-100 text-blue-700';
			case 'COMPLETED':
			case 'COMPLETADA':
				return 'bg-purple-100 text-purple-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	};

	const getStatusLabel = (status: string) => {
		switch (status?.toUpperCase()) {
			case 'CONFIRMADA':
			case 'CONFIRMED':
				return 'Confirmada';
			case 'SCHEDULED':
			case 'PROGRAMADA':
				return 'Programada';
			case 'COMPLETED':
			case 'COMPLETADA':
				return 'Completada';
			default:
				return status || 'Sin estado';
		}
	};

	return (
		<>
			<AnimatePresence>
				{isOpen && (
					<>
						{/* Backdrop */}
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={onClose}
							className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
						>
							{/* Modal */}
							<motion.div
								initial={{ opacity: 0, scale: 0.95, y: 20 }}
								animate={{ opacity: 1, scale: 1, y: 0 }}
								exit={{ opacity: 0, scale: 0.95, y: 20 }}
								onClick={(e) => e.stopPropagation()}
								className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
							>
							{/* Header */}
							<div className="sticky top-0 bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-6 flex items-center justify-between z-10">
								<div className="flex items-center gap-3">
									<div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
										<Receipt className="w-6 h-6" />
									</div>
									<div>
										<h2 className="text-2xl font-bold">Pagos Efectuados</h2>
										<p className="text-teal-100 text-sm">Visualiza todos los pagos realizados por tus pacientes</p>
									</div>
								</div>
								<button
									onClick={onClose}
									className="p-2 hover:bg-white/20 rounded-lg transition-colors"
									aria-label="Cerrar"
								>
									<X className="w-5 h-5" />
								</button>
							</div>

							{/* Content */}
							<div className="flex-1 overflow-y-auto p-6">
								{loading ? (
									<div className="flex items-center justify-center py-12">
										<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
									</div>
								) : pagos.length === 0 ? (
									<div className="text-center py-12">
										<Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
										<p className="text-gray-600 text-lg">No hay pagos efectuados con referencia o captura</p>
									</div>
								) : (
									<div className="space-y-4">
										{pagos.map((pago) => {
											const referencia = extractReferencia(pago.notas);
											const capturaUrl = extractCapturaUrl(pago.notas);
											const paciente = pago.patient || pago.appointment?.patient;

											return (
												<div key={pago.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
													<div className="flex flex-col lg:flex-row gap-6">
														{/* Información principal */}
														<div className="flex-1 space-y-4">
															{/* Header de la factura */}
															<div className="flex items-center justify-between">
																<div className="flex items-center gap-3">
																	<div className="p-3 bg-green-100 rounded-lg">
																		<Receipt className="w-6 h-6 text-green-600" />
																	</div>
																	<div>
																		<h3 className="text-lg font-semibold text-gray-900">
																			{pago.numero_factura || `Factura #${pago.id.slice(0, 8)}`}
																		</h3>
																		<p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
																			<Calendar className="w-4 h-4" />
																			Pagada: {pago.fecha_pago 
																				? new Date(pago.fecha_pago).toLocaleDateString('es-ES', {
																					year: 'numeric',
																					month: 'long',
																					day: 'numeric',
																					hour: '2-digit',
																					minute: '2-digit',
																				})
																				: new Date(pago.fecha_emision).toLocaleDateString('es-ES', {
																					year: 'numeric',
																					month: 'long',
																					day: 'numeric',
																				})
																			}
																		</p>
																	</div>
																</div>
																<div className="flex items-center gap-2">
																	<span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1">
																		<CheckCircle className="w-3 h-3" />
																		Pagada
																	</span>
																</div>
															</div>

															{/* Información del paciente */}
															<div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
																<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
																	<div className="flex items-center gap-3">
																		<User className="w-5 h-5 text-blue-600" />
																		<div>
																			<p className="text-xs text-gray-600">Paciente</p>
																			<p className="text-sm font-semibold text-gray-900">
																				{paciente ? `${paciente.firstName} ${paciente.lastName}` : 'N/A'}
																			</p>
																			{paciente?.identifier && (
																				<p className="text-xs text-gray-500">C.I.: {paciente.identifier}</p>
																			)}
																		</div>
																	</div>
																	{pago.appointment && (
																		<div className="flex items-center gap-3">
																			<Calendar className="w-5 h-5 text-blue-600" />
																			<div>
																				<p className="text-xs text-gray-600">Cita Programada</p>
																				<p className="text-sm font-semibold text-gray-900">
																					{new Date(pago.appointment.scheduled_at).toLocaleDateString('es-ES', {
																						weekday: 'long',
																						year: 'numeric',
																						month: 'long',
																						day: 'numeric',
																						hour: '2-digit',
																						minute: '2-digit',
																					})}
																				</p>
																				<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold mt-1 ${getStatusColor(pago.appointment.status)}`}>
																					{getStatusLabel(pago.appointment.status)}
																				</span>
																			</div>
																		</div>
																	)}
																</div>
																{pago.appointment?.reason && (
																	<div className="mt-3 pt-3 border-t border-blue-200">
																		<p className="text-xs text-gray-600 mb-1">Motivo de la Cita</p>
																		<p className="text-sm text-gray-900">{pago.appointment.reason}</p>
																	</div>
																)}
																{pago.appointment?.consultations && pago.appointment.consultations.length > 0 && (
																	<div className="mt-3 pt-3 border-t border-blue-200">
																		<p className="text-xs text-gray-600 mb-2 font-semibold">Consultas Asociadas</p>
																		<div className="space-y-2">
																			{pago.appointment.consultations.map((cons) => (
																				<div key={cons.id} className="bg-white rounded-lg p-3 border border-blue-200">
																					<div className="flex items-center justify-between mb-2">
																						<p className="text-xs text-gray-500">
																							{new Date(cons.created_at).toLocaleDateString('es-ES', {
																								year: 'numeric',
																								month: 'long',
																								day: 'numeric',
																								hour: '2-digit',
																								minute: '2-digit',
																							})}
																						</p>
																					</div>
																					{cons.chief_complaint && (
																						<p className="text-xs text-gray-600 mb-1">
																							<strong>Motivo:</strong> {cons.chief_complaint}
																						</p>
																					)}
																					{cons.diagnosis && (
																						<p className="text-xs text-gray-600">
																							<strong>Diagnóstico:</strong> {cons.diagnosis}
																						</p>
																					)}
																				</div>
																			))}
																		</div>
																	</div>
																)}
															</div>

															{/* Monto y método de pago */}
															<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
																<div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
																	<p className="text-xs text-gray-600 mb-1">Monto Pagado</p>
																	<div className="text-2xl font-bold text-green-600">
																		<CurrencyDisplay
																			amount={pago.total}
																			currency={pago.currency as 'USD' | 'EUR'}
																			showBoth={true}
																			primaryCurrency="USD"
																			size="lg"
																		/>
																	</div>
																</div>
																<div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
																	<p className="text-xs text-gray-600 mb-1">Método de Pago</p>
																	<p className="text-lg font-semibold text-gray-900 flex items-center gap-2">
																		<CreditCard className="w-4 h-4" />
																		{pago.metodo_pago === 'PAGO_MOVIL' ? 'Pago Móvil' : pago.metodo_pago || 'N/A'}
																	</p>
																</div>
															</div>

															{/* Número de referencia */}
															{referencia && (
																<div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
																	<p className="text-xs text-gray-600 mb-2 flex items-center gap-2">
																		<FileText className="w-4 h-4" />
																		Número de Referencia
																	</p>
																	<p className="text-lg font-mono font-semibold text-gray-900 bg-white p-3 rounded-lg border border-yellow-300">
																		{referencia}
																	</p>
																</div>
															)}
														</div>

														{/* Captura de pantalla */}
														{capturaUrl && (
															<div className="lg:w-80 flex-shrink-0">
																<div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
																	<p className="text-xs text-gray-600 mb-3 flex items-center gap-2">
																		<ImageIcon className="w-4 h-4" />
																		Captura de Pantalla
																	</p>
																	<div className="relative">
																		<img
																			src={capturaUrl}
																			alt="Captura de pago"
																			className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 cursor-pointer hover:border-teal-300 transition-colors"
																			onClick={() => {
																				setSelectedPago(pago);
																				setSelectedImage(capturaUrl);
																			}}
																		/>
																		<button
																			onClick={() => {
																				setSelectedPago(pago);
																				setSelectedImage(capturaUrl);
																			}}
																			className="absolute top-2 right-2 p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 shadow-lg"
																		>
																			<Eye className="w-4 h-4" />
																			Ver
																		</button>
																	</div>
																	<a
																		href={capturaUrl}
																		download
																		className="mt-3 w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
																	>
																		<Download className="w-4 h-4" />
																		Descargar
																	</a>
																</div>
															</div>
														)}
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>
						</motion.div>
					</motion.div>
				</>
			)}
			</AnimatePresence>

			{/* Modal para ver imagen en grande */}
			<AnimatePresence>
				{selectedImage && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
						onClick={() => {
							setSelectedImage(null);
							setSelectedPago(null);
						}}
					>
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							onClick={(e) => e.stopPropagation()}
							className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
						>
							<div className="sticky top-0 bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-6 flex items-center justify-between">
								<h2 className="text-2xl font-bold">Captura de Pago</h2>
								<button
									onClick={() => {
										setSelectedImage(null);
										setSelectedPago(null);
									}}
									className="p-2 hover:bg-white/20 rounded-lg transition-colors"
								>
									<X className="w-5 h-5" />
								</button>
							</div>
							<div className="p-6">
								{selectedPago && (
									<div className="mb-4 space-y-2">
										<p className="text-sm text-gray-600">
											<strong>Paciente:</strong> {selectedPago.patient ? `${selectedPago.patient.firstName} ${selectedPago.patient.lastName}` : 'N/A'}
										</p>
										<p className="text-sm text-gray-600">
											<strong>Referencia:</strong> {extractReferencia(selectedPago.notas) || 'N/A'}
										</p>
										<p className="text-sm text-gray-600">
											<strong>Monto:</strong>{' '}
											<CurrencyDisplay
												amount={selectedPago.total}
												currency={selectedPago.currency as 'USD' | 'EUR'}
												showBoth={true}
												primaryCurrency="USD"
												size="sm"
											/>
										</p>
									</div>
								)}
								<img
									src={selectedImage}
									alt="Captura de pago"
									className="w-full rounded-lg border-2 border-gray-200"
								/>
								<div className="mt-4 flex gap-3">
									<a
										href={selectedImage}
										download
										className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center gap-2"
									>
										<Download className="w-4 h-4" />
										Descargar
									</a>
								</div>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}

