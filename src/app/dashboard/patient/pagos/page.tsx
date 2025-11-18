'use client';

import { useState, useEffect } from 'react';
import { Receipt, Calendar, CreditCard, Download, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react';

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

export default function PagosPage() {
	const [loading, setLoading] = useState(true);
	const [facturas, setFacturas] = useState<Factura[]>([]);
	const [filter, setFilter] = useState<'all' | 'pendiente' | 'pagada'>('pendiente');

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
		<div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-6">
			<div className="max-w-7xl mx-auto space-y-6">
				{/* Header */}
				<div className="bg-white rounded-2xl shadow-lg p-6">
					<h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
						<Receipt className="w-8 h-8 text-green-600" />
						Pagos y Facturas
					</h1>
					<p className="text-gray-600">Gestiona tus facturas y pagos médicos</p>
				</div>

				{/* Filtros */}
				<div className="bg-white rounded-2xl shadow-lg p-6">
					<div className="flex gap-2">
						<button
							onClick={() => setFilter('pendiente')}
							className={`px-4 py-2 rounded-lg font-medium transition-colors ${
								filter === 'pendiente'
									? 'bg-green-600 text-white'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							}`}
						>
							Pendientes
						</button>
						<button
							onClick={() => setFilter('pagada')}
							className={`px-4 py-2 rounded-lg font-medium transition-colors ${
								filter === 'pagada'
									? 'bg-green-600 text-white'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							}`}
						>
							Pagadas
						</button>
						<button
							onClick={() => setFilter('all')}
							className={`px-4 py-2 rounded-lg font-medium transition-colors ${
								filter === 'all'
									? 'bg-green-600 text-white'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							}`}
						>
							Todas
						</button>
					</div>
				</div>

				{/* Lista de facturas */}
				{loading ? (
					<div className="space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
								<div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
								<div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
							</div>
						))}
					</div>
				) : facturas.length === 0 ? (
					<div className="bg-white rounded-2xl shadow-lg p-12 text-center">
						<Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
						<p className="text-gray-600 text-lg">No tienes facturas {filter === 'pendiente' ? 'pendientes' : filter === 'pagada' ? 'pagadas' : ''}</p>
					</div>
				) : (
					<div className="space-y-4">
						{facturas.map((factura) => (
							<div key={factura.id} className="bg-white rounded-xl shadow-lg p-6">
								<div className="flex items-start justify-between mb-4">
									<div className="flex-1">
										<div className="flex items-center gap-3 mb-2">
											<div className="p-3 bg-green-100 rounded-lg">
												<Receipt className="w-6 h-6 text-green-600" />
											</div>
											<div>
												<h3 className="text-lg font-semibold text-gray-900">
													{factura.numero_factura || `Factura #${factura.id.slice(0, 8)}`}
												</h3>
												<p className="text-gray-600 flex items-center gap-2 mt-1">
													<Calendar className="w-4 h-4" />
													{new Date(factura.fecha_emision).toLocaleDateString('es-ES', {
														year: 'numeric',
														month: 'long',
														day: 'numeric',
													})}
												</p>
											</div>
										</div>

										{factura.appointment && (
											<div className="ml-12 mb-4 space-y-2">
												{factura.appointment.doctor && (
													<p className="text-gray-700">
														<span className="font-medium">Médico: </span>
														Dr. {factura.appointment.doctor.name || 'Médico'}
													</p>
												)}
												{factura.appointment.reason && (
													<p className="text-gray-700">
														<span className="font-medium">Motivo: </span>
														{factura.appointment.reason}
													</p>
												)}
												{factura.organization && (
													<p className="text-gray-700">
														<span className="font-medium">Organización: </span>
														{factura.organization.name}
													</p>
												)}
											</div>
										)}

										<div className="ml-12 grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
											<div>
												<p className="text-sm text-gray-600 mb-1">Subtotal</p>
												<p className="text-lg font-semibold text-gray-900">
													{formatCurrency(factura.subtotal, factura.currency)}
												</p>
											</div>
											<div>
												<p className="text-sm text-gray-600 mb-1">Impuestos</p>
												<p className="text-lg font-semibold text-gray-900">
													{formatCurrency(factura.impuestos, factura.currency)}
												</p>
											</div>
											<div>
												<p className="text-sm text-gray-600 mb-1">Total</p>
												<p className="text-2xl font-bold text-green-600 flex items-center gap-2">
													<DollarSign className="w-5 h-5" />
													{formatCurrency(factura.total, factura.currency)}
												</p>
											</div>
										</div>

										<div className="ml-12 flex items-center gap-4">
											<span
												className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${getPaymentStatusColor(
													factura.estado_pago
												)}`}
											>
												{getPaymentStatusIcon(factura.estado_pago)}
												{factura.estado_pago}
											</span>
											{factura.metodo_pago && (
												<span className="text-sm text-gray-600 flex items-center gap-2">
													<CreditCard className="w-4 h-4" />
													{factura.metodo_pago}
												</span>
											)}
											{factura.fecha_pago && (
												<span className="text-sm text-gray-600">
													Pagada el: {new Date(factura.fecha_pago).toLocaleDateString('es-ES')}
												</span>
											)}
										</div>

										{factura.notas && (
											<div className="ml-12 mt-4">
												<p className="font-semibold text-gray-900 mb-1">Notas</p>
												<p className="text-gray-700 bg-gray-50 rounded-lg p-3">{factura.notas}</p>
											</div>
										)}
									</div>

									<div className="flex flex-col gap-2">
										{factura.estado_pago === 'pendiente' && (
											<button className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2">
												<CreditCard className="w-4 h-4" />
												Pagar
											</button>
										)}
										<button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center gap-2">
											<Download className="w-4 h-4" />
											Descargar
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
