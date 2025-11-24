'use client';

import { useState, useEffect } from 'react';
import { Receipt, CheckCircle, XCircle, Clock, Eye, Download, Calendar, User, DollarSign, CreditCard, Image as ImageIcon, X } from 'lucide-react';

type PagoPendiente = {
	id: string;
	numero_factura: string | null;
	total: number;
	currency: string;
	metodo_pago: string | null;
	fecha_emision: string;
	notas: string | null;
	appointment: {
		id: string;
		scheduled_at: string;
		reason: string | null;
		patient: {
			id: string;
			firstName: string;
			lastName: string;
		} | null;
	} | null;
	patient: {
		id: string;
		firstName: string;
		lastName: string;
	} | null;
};

export default function VerificarPagosPage() {
	const [loading, setLoading] = useState(true);
	const [pagos, setPagos] = useState<PagoPendiente[]>([]);
	const [selectedPago, setSelectedPago] = useState<PagoPendiente | null>(null);
	const [processing, setProcessing] = useState<string | null>(null);

	useEffect(() => {
		loadPagosPendientes();
	}, []);

	const loadPagosPendientes = async () => {
		try {
			setLoading(true);
			const res = await fetch('/api/medic/pagos/pendientes', {
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

	const handleVerificar = async (pagoId: string, aprobar: boolean) => {
		try {
			setProcessing(pagoId);
			const res = await fetch(`/api/medic/pagos/${pagoId}/verificar`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ aprobar }),
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.error || 'Error al verificar pago');
			}

			await loadPagosPendientes();
			setSelectedPago(null);
		} catch (err) {
			console.error('Error:', err);
			alert(err instanceof Error ? err.message : 'Error al verificar el pago');
		} finally {
			setProcessing(null);
		}
	};

	const formatCurrency = (amount: number, currency: string) => {
		return new Intl.NumberFormat('es-VE', {
			style: 'currency',
			currency: currency || 'USD',
		}).format(amount);
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6">
			<div className="max-w-7xl mx-auto space-y-6">
				{/* Header */}
				<div className="bg-white rounded-2xl shadow-lg p-6">
					<h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
						<Receipt className="w-8 h-8 text-blue-600" />
						Verificar Pagos
					</h1>
					<p className="text-gray-600">Revisa y verifica los pagos pendientes de tus pacientes</p>
				</div>

				{/* Lista de pagos */}
				{loading ? (
					<div className="space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
								<div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
								<div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
							</div>
						))}
					</div>
				) : pagos.length === 0 ? (
					<div className="bg-white rounded-2xl shadow-lg p-12 text-center">
						<CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
						<p className="text-gray-600 text-lg">No hay pagos pendientes de verificación</p>
					</div>
				) : (
					<div className="space-y-4">
						{pagos.map((pago) => {
							const referencia = extractReferencia(pago.notas);
							const capturaUrl = extractCapturaUrl(pago.notas);
							const paciente = pago.patient || pago.appointment?.patient;

							return (
								<div key={pago.id} className="bg-white rounded-xl shadow-lg p-6">
									<div className="flex items-start justify-between mb-4">
										<div className="flex-1">
											<div className="flex items-center gap-3 mb-2">
												<div className="p-3 bg-yellow-100 rounded-lg">
													<Clock className="w-6 h-6 text-yellow-600" />
												</div>
												<div>
													<h3 className="text-lg font-semibold text-gray-900">
														{pago.numero_factura || `Factura #${pago.id.slice(0, 8)}`}
													</h3>
													<p className="text-gray-600 flex items-center gap-2 mt-1">
														<Calendar className="w-4 h-4" />
														{new Date(pago.fecha_emision).toLocaleDateString('es-ES', {
															year: 'numeric',
															month: 'long',
															day: 'numeric',
														})}
													</p>
												</div>
											</div>

											{paciente && (
												<div className="ml-12 mb-4">
													<p className="text-gray-700 flex items-center gap-2">
														<User className="w-4 h-4" />
														<span className="font-medium">Paciente: </span>
														{paciente.firstName} {paciente.lastName}
													</p>
												</div>
											)}

											{pago.appointment && (
												<div className="ml-12 mb-4">
													<p className="text-gray-700">
														<span className="font-medium">Cita: </span>
														{new Date(pago.appointment.scheduled_at).toLocaleDateString('es-ES', {
															year: 'numeric',
															month: 'long',
															day: 'numeric',
															hour: '2-digit',
															minute: '2-digit',
														})}
													</p>
													{pago.appointment.reason && (
														<p className="text-gray-700 mt-1">
															<span className="font-medium">Motivo: </span>
															{pago.appointment.reason}
														</p>
													)}
												</div>
											)}

											<div className="ml-12 grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
												<div>
													<p className="text-sm text-gray-600 mb-1">Total</p>
													<p className="text-2xl font-bold text-blue-600 flex items-center gap-2">
														<DollarSign className="w-5 h-5" />
														{formatCurrency(pago.total, pago.currency)}
													</p>
												</div>
												<div>
													<p className="text-sm text-gray-600 mb-1">Método de Pago</p>
													<p className="text-lg font-semibold text-gray-900 flex items-center gap-2">
														<CreditCard className="w-4 h-4" />
														{pago.metodo_pago === 'PAGO_MOVIL' ? 'Pago Móvil' : pago.metodo_pago || 'N/A'}
													</p>
												</div>
											</div>

											{referencia && (
												<div className="ml-12 mb-4">
													<p className="text-sm text-gray-600 mb-1">Número de Referencia</p>
													<p className="text-lg font-mono font-semibold text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-200">
														{referencia}
													</p>
												</div>
											)}

											{capturaUrl && (
												<div className="ml-12 mb-4">
													<p className="text-sm text-gray-600 mb-2 flex items-center gap-2">
														<ImageIcon className="w-4 h-4" />
														Captura de Pantalla del Pago
													</p>
													<div className="relative">
														<img
															src={capturaUrl}
															alt="Captura de pago"
															className="w-full max-w-md rounded-lg border-2 border-gray-200 bg-gray-50 cursor-pointer hover:border-blue-300 transition-colors"
															onClick={() => setSelectedPago(pago)}
														/>
														<button
															onClick={() => setSelectedPago(pago)}
															className="absolute top-2 right-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
														>
															<Eye className="w-4 h-4" />
															Ver
														</button>
													</div>
												</div>
											)}
										</div>

										<div className="flex flex-col gap-2">
											<button
												onClick={() => handleVerificar(pago.id, true)}
												disabled={processing === pago.id}
												className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
											>
												<CheckCircle className="w-4 h-4" />
												{processing === pago.id ? 'Procesando...' : 'Aprobar Pago'}
											</button>
											<button
												onClick={() => handleVerificar(pago.id, false)}
												disabled={processing === pago.id}
												className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg font-medium hover:from-red-700 hover:to-rose-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
											>
												<XCircle className="w-4 h-4" />
												{processing === pago.id ? 'Procesando...' : 'Rechazar Pago'}
											</button>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* Modal para ver captura en grande */}
			{selectedPago && (
				<div
					className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
					onClick={() => setSelectedPago(null)}
				>
					<div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
						<div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
							<h2 className="text-2xl font-bold">Captura de Pago</h2>
							<button
								onClick={() => setSelectedPago(null)}
								className="p-2 hover:bg-white/20 rounded-lg transition-colors"
							>
								<X className="w-5 h-5" />
							</button>
						</div>
						<div className="p-6">
							{extractCapturaUrl(selectedPago.notas) && (
								<img
									src={extractCapturaUrl(selectedPago.notas)!}
									alt="Captura de pago"
									className="w-full rounded-lg border-2 border-gray-200"
								/>
							)}
							<div className="mt-4 flex gap-3">
								<a
									href={extractCapturaUrl(selectedPago.notas) || '#'}
									download
									className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
								>
									<Download className="w-4 h-4" />
									Descargar
								</a>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

