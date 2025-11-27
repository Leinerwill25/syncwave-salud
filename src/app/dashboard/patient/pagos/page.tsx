'use client';

import { useState, useEffect } from 'react';
import { Receipt, Calendar, CreditCard, Download, CheckCircle, XCircle, Clock, DollarSign, User } from 'lucide-react';
import PaymentModal from '@/components/patient/PaymentModal';
import CurrencyDisplay from '@/components/CurrencyDisplay';

type Factura = {
	id: string;
	numero_factura: string | null;
	subtotal: number;
	impuestos: number;
	total: number;
	currency: string;
	estado_factura: string;
	estado_pago: string;
	metodo_pago: string | null;
	fecha_emision: string;
	fecha_pago: string | null;
	notas: string | null;
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

export default function PagosPage() {
	const [loading, setLoading] = useState(true);
	const [facturas, setFacturas] = useState<Factura[]>([]);
	const [filter, setFilter] = useState<'all' | 'pendiente' | 'pagada'>('pendiente');
	const [processingPayment, setProcessingPayment] = useState<string | null>(null);
	const [paymentModalOpen, setPaymentModalOpen] = useState(false);
	const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);

	useEffect(() => {
		loadFacturas();
	}, [filter]);

	const loadFacturas = async () => {
		try {
			setLoading(true);
			const status = filter === 'all' ? 'all' : filter;
			const res = await fetch(`/api/patient/pagos?status=${status}`, {
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al cargar facturas');

			const data = await res.json();
			setFacturas(data.data || []);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const handlePayment = (factura: Factura) => {
		setSelectedFactura(factura);
		setPaymentModalOpen(true);
	};

	const handlePaymentSuccess = () => {
		loadFacturas();
	};

	const formatCurrency = (amount: number, currency: string) => {
		return new Intl.NumberFormat('es-VE', {
			style: 'currency',
			currency: currency || 'USD',
		}).format(amount);
	};

	const getPaymentStatusColor = (status: string) => {
		switch (status.toLowerCase()) {
			case 'pagada':
				return 'bg-green-100 text-green-700';
			case 'pendiente':
				return 'bg-yellow-100 text-yellow-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	};

	const getPaymentStatusIcon = (status: string) => {
		switch (status.toLowerCase()) {
			case 'pagada':
				return <CheckCircle className="w-4 h-4" />;
			case 'pendiente':
				return <Clock className="w-4 h-4" />;
			default:
				return <XCircle className="w-4 h-4" />;
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-3 sm:p-4 md:p-6">
			<div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
				{/* Header */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-5 lg:p-6">
					<h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 flex items-center gap-2 sm:gap-3">
						<Receipt className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-green-600 flex-shrink-0" />
						<span>Pagos y Facturas</span>
					</h1>
					<p className="text-xs sm:text-sm md:text-base text-gray-600">Gestiona tus facturas y pagos médicos</p>
				</div>

				{/* Filtros */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-5 lg:p-6">
					<div className="flex flex-wrap gap-2">
						<button
							onClick={() => setFilter('pendiente')}
							className={`px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm md:text-base ${
								filter === 'pendiente'
									? 'bg-green-600 text-white shadow-md'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							}`}
						>
							Pendientes
						</button>
						<button
							onClick={() => setFilter('pagada')}
							className={`px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm md:text-base ${
								filter === 'pagada'
									? 'bg-green-600 text-white shadow-md'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							}`}
						>
							Pagadas
						</button>
						<button
							onClick={() => setFilter('all')}
							className={`px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm md:text-base ${
								filter === 'all'
									? 'bg-green-600 text-white shadow-md'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							}`}
						>
							Todas
						</button>
					</div>
				</div>

				{/* Lista de facturas */}
				{loading ? (
					<div className="space-y-3 sm:space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="bg-white rounded-xl shadow-lg p-4 sm:p-6 animate-pulse">
								<div className="h-5 sm:h-6 bg-gray-200 rounded w-1/2 sm:w-1/3 mb-3 sm:mb-4"></div>
								<div className="h-3 sm:h-4 bg-gray-200 rounded w-full mb-2"></div>
							</div>
						))}
					</div>
				) : facturas.length === 0 ? (
					<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-6 sm:p-8 md:p-12 text-center">
						<Receipt className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-2 sm:mb-3 md:mb-4" />
						<p className="text-gray-600 text-sm sm:text-base md:text-lg">No tienes facturas {filter === 'pendiente' ? 'pendientes' : filter === 'pagada' ? 'pagadas' : ''}</p>
					</div>
				) : (
					<div className="space-y-3 sm:space-y-4">
						{facturas.map((factura) => (
							<div key={factura.id} className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-5 lg:p-6 hover:shadow-xl transition-shadow">
								<div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 sm:gap-4">
									<div className="flex-1 min-w-0 w-full">
										{/* Header con icono y número de factura */}
										<div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
											<div className="p-1.5 sm:p-2 md:p-3 bg-green-100 rounded-lg flex-shrink-0">
												<Receipt className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-green-600" />
											</div>
											<div className="flex-1 min-w-0">
												<h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 break-words">
													{factura.numero_factura || `Factura #${factura.id.slice(0, 8)}`}
												</h3>
												<p className="text-gray-600 flex items-center gap-1.5 sm:gap-2 mt-1 text-[10px] sm:text-xs md:text-sm flex-wrap">
													<Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 flex-shrink-0" />
													<span>
														Emitida: <span className="hidden sm:inline">
															{new Date(factura.fecha_emision).toLocaleDateString('es-ES', {
																year: 'numeric',
																month: 'long',
																day: 'numeric',
															})}
														</span>
														<span className="sm:hidden">
															{new Date(factura.fecha_emision).toLocaleDateString('es-ES', {
																day: 'numeric',
																month: 'short',
																year: 'numeric',
															})}
														</span>
													</span>
												</p>
											</div>
										</div>

										{/* Información de la cita */}
										{factura.appointment && (
											<div className="bg-blue-50 rounded-lg p-2.5 sm:p-3 md:p-4 mb-3 sm:mb-4 border border-blue-100">
												<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
													{factura.appointment.scheduled_at && (
														<div className="flex items-start gap-1.5 sm:gap-2">
															<Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-blue-600 flex-shrink-0 mt-0.5" />
															<div className="min-w-0 flex-1">
																<p className="text-[9px] sm:text-[10px] md:text-xs text-gray-600">Fecha de la Cita</p>
																<p className="text-[10px] sm:text-xs md:text-sm font-semibold text-gray-900 break-words leading-tight">
																	<span className="hidden sm:inline">
																		{new Date(factura.appointment.scheduled_at).toLocaleDateString('es-ES', {
																			weekday: 'long',
																			year: 'numeric',
																			month: 'long',
																			day: 'numeric',
																			hour: '2-digit',
																			minute: '2-digit',
																		})}
																	</span>
																	<span className="sm:hidden">
																		{new Date(factura.appointment.scheduled_at).toLocaleDateString('es-ES', {
																			day: 'numeric',
																			month: 'short',
																			year: 'numeric',
																			hour: '2-digit',
																			minute: '2-digit',
																		})}
																	</span>
																</p>
															</div>
														</div>
													)}
													{factura.appointment.doctor && (
														<div className="flex items-start gap-1.5 sm:gap-2">
															<User className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-blue-600 flex-shrink-0 mt-0.5" />
															<div className="min-w-0 flex-1">
																<p className="text-[9px] sm:text-[10px] md:text-xs text-gray-600">Médico</p>
																<p className="text-[10px] sm:text-xs md:text-sm font-semibold text-gray-900 break-words">
																	Dr. {factura.appointment.doctor.name || 'Médico'}
																</p>
															</div>
														</div>
													)}
												</div>
												{factura.appointment.reason && (
													<div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-blue-200">
														<p className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 mb-0.5 sm:mb-1">Motivo</p>
														<p className="text-[10px] sm:text-xs md:text-sm text-gray-900 break-words">{factura.appointment.reason}</p>
													</div>
												)}
												{factura.organization && (
													<div className="mt-2">
														<p className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 break-words">
															<span className="font-medium">Organización: </span>
															{factura.organization.name}
														</p>
													</div>
												)}
											</div>
										)}

										{/* Montos */}
										<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4">
											<div className="bg-gray-50 rounded-lg p-2 sm:p-2.5 md:p-3">
												<p className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 mb-0.5 sm:mb-1">Subtotal</p>
												<div className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">
													<CurrencyDisplay
														amount={factura.subtotal}
														currency={factura.currency as 'USD' | 'EUR'}
														showBoth={true}
														primaryCurrency="USD"
														size="md"
													/>
												</div>
											</div>
											<div className="bg-gray-50 rounded-lg p-2 sm:p-2.5 md:p-3">
												<p className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 mb-0.5 sm:mb-1">Impuestos</p>
												<div className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">
													<CurrencyDisplay
														amount={factura.impuestos}
														currency={factura.currency as 'USD' | 'EUR'}
														showBoth={true}
														primaryCurrency="USD"
														size="md"
													/>
												</div>
											</div>
											<div className="bg-green-50 rounded-lg p-2 sm:p-2.5 md:p-3 border-2 border-green-200">
												<p className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 mb-0.5 sm:mb-1">Total</p>
												<div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">
													<CurrencyDisplay
														amount={factura.total}
														currency={factura.currency as 'USD' | 'EUR'}
														showBoth={true}
														primaryCurrency="USD"
														size="lg"
													/>
												</div>
											</div>
										</div>

										{/* Estado y método de pago */}
										<div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
											<span
												className={`inline-flex items-center gap-1 px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] md:text-xs font-semibold ${getPaymentStatusColor(
													factura.estado_pago
												)}`}
											>
												{getPaymentStatusIcon(factura.estado_pago)}
												<span className="hidden sm:inline">{factura.estado_pago}</span>
												<span className="sm:hidden">{factura.estado_pago.substring(0, 3)}</span>
											</span>
											{factura.metodo_pago && (
												<span className="text-[10px] sm:text-xs md:text-sm text-gray-600 flex items-center gap-1 sm:gap-1.5 md:gap-2">
													<CreditCard className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 flex-shrink-0" />
													<span className="break-words">{factura.metodo_pago}</span>
												</span>
											)}
											{factura.fecha_pago && (
												<span className="text-[10px] sm:text-xs md:text-sm text-gray-600">
													Pagada el: {new Date(factura.fecha_pago).toLocaleDateString('es-ES')}
												</span>
											)}
										</div>

										{/* Mensaje de espera o botón de pago */}
										{factura.estado_pago === 'pendiente' && (
											<div className="mb-3 sm:mb-4">
												{factura.appointment && factura.appointment.status !== 'CONFIRMADA' && factura.appointment.status !== 'CONFIRMED' ? (
													<div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg p-2.5 sm:p-3 md:p-4">
														<div className="flex items-start gap-2 sm:gap-3">
															<Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
															<div className="min-w-0 flex-1">
																<p className="font-semibold text-yellow-900 mb-0.5 sm:mb-1 text-xs sm:text-sm md:text-base">Esperando Confirmación</p>
																<p className="text-[10px] sm:text-xs md:text-sm text-yellow-800 break-words leading-relaxed">
																	El pago estará disponible una vez que el especialista confirme tu cita.
																</p>
															</div>
														</div>
													</div>
												) : null}
											</div>
										)}
									</div>

									{/* Botones de acción */}
									<div className="flex flex-row sm:flex-col gap-2 md:min-w-[160px] lg:min-w-[200px] w-full sm:w-auto">
										{factura.estado_pago === 'pendiente' && (
											<>
												{factura.appointment && (factura.appointment.status === 'CONFIRMADA' || factura.appointment.status === 'CONFIRMED') ? (
													<button
														onClick={() => handlePayment(factura)}
														disabled={processingPayment === factura.id}
														className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg font-medium hover:from-teal-700 hover:to-cyan-700 transition-all shadow-md flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm md:text-base"
													>
														<CreditCard className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
														<span>{processingPayment === factura.id ? 'Procesando...' : 'Pagar'}</span>
													</button>
												) : null}
											</>
										)}
										<button className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base shadow-sm hover:shadow-md">
											<Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
											<span>Descargar</span>
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Payment Modal */}
			<PaymentModal
				isOpen={paymentModalOpen}
				onClose={() => {
					setPaymentModalOpen(false);
					setSelectedFactura(null);
				}}
				factura={selectedFactura}
				onPaymentSuccess={handlePaymentSuccess}
			/>
		</div>
	);
}
