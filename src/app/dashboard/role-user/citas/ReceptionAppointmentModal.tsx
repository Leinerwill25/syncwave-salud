'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, FileText, Edit2, Trash2, Save, AlertCircle, Loader2 } from 'lucide-react';
import CurrencyDisplay from '@/components/CurrencyDisplay';

interface Props {
	isOpen: boolean;
	onClose: () => void;
	appointment: any;
	organizationId: string;
}

interface Service {
	id?: string;
	name: string;
	description?: string;
	price: number;
	currency: string;
}

interface FacturacionData {
	id: string;
	total: number;
	subtotal: number;
	impuestos: number;
	currency: string;
	notas?: string;
	servicios?: Service[];
}

export default function ReceptionAppointmentModal({ isOpen, onClose, appointment, organizationId }: Props) {
	const [facturacion, setFacturacion] = useState<FacturacionData | null>(null);
	const [loading, setLoading] = useState(false);
	const [editingTotal, setEditingTotal] = useState(false);
	const [newTotal, setNewTotal] = useState('');
	const [editReason, setEditReason] = useState('');
	const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
	const [deleteReason, setDeleteReason] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	useEffect(() => {
		if (isOpen && appointment?.id) {
			loadAppointmentAndFacturacion();
		}
	}, [isOpen, appointment?.id]);

	const loadAppointmentAndFacturacion = async () => {
		if (!appointment?.id) return;

		try {
			setLoading(true);
			setError(null);

			// Obtener datos completos del appointment (incluyendo selected_service)
			let fullAppointment = appointment;
			try {
				const apptRes = await fetch(`/api/role-users/appointments/${appointment.id}`, {
					credentials: 'include',
				});

				if (apptRes.ok) {
					const apptData = await apptRes.json();
					if (apptData.data) {
						fullAppointment = { ...appointment, ...apptData.data };
					}
				}
			} catch (err) {
				console.warn('Error obteniendo appointment completo, usando datos básicos:', err);
			}

			await loadFacturacionData(fullAppointment);
		} catch (err) {
			console.error('Error cargando datos:', err);
			setError('Error al cargar los datos de la cita');
		} finally {
			setLoading(false);
		}
	};

	const loadFacturacionData = async (appt: any = appointment) => {
		if (!appt?.id) return;

		try {
			setError(null);

			// Obtener facturación de la cita
			const factRes = await fetch(`/api/facturacion?appointment_id=${appt.id}&organization_id=${organizationId}`, {
				credentials: 'include',
			});

			if (factRes.ok) {
				const factData = await factRes.json();
				if (factData.items && factData.items.length > 0) {
					const fact = factData.items[0];
					// Extraer servicios desde selected_service de la cita o desde facturación
					const services: Service[] = [];

					// Si hay selected_service en la cita, agregarlo
					if (appt.selected_service) {
						const selectedService = typeof appt.selected_service === 'string' ? JSON.parse(appt.selected_service) : appt.selected_service;
						services.push({
							name: selectedService.name || 'Servicio',
							description: selectedService.description,
							price: parseFloat(selectedService.price || '0'),
							currency: selectedService.currency || 'USD',
						});
					}

					setFacturacion({
						id: fact.id,
						total: fact.total || 0,
						subtotal: fact.subtotal || 0,
						impuestos: fact.impuestos || 0,
						currency: fact.currency || 'USD',
						notas: fact.notas || '',
						servicios: services,
					});
					setNewTotal(String(fact.total || 0));
				} else {
					// Si no hay facturación, crear servicios desde selected_service
					const services: Service[] = [];
					if (appt.selected_service) {
						const selectedService = typeof appt.selected_service === 'string' ? JSON.parse(appt.selected_service) : appt.selected_service;
						services.push({
							name: selectedService.name || 'Servicio',
							description: selectedService.description,
							price: parseFloat(selectedService.price || '0'),
							currency: selectedService.currency || 'USD',
						});
					}
					setFacturacion({
						id: '',
						total: services.reduce((sum, s) => sum + s.price, 0),
						subtotal: services.reduce((sum, s) => sum + s.price, 0),
						impuestos: 0,
						currency: services[0]?.currency || 'USD',
						servicios: services,
					});
					setNewTotal(String(services.reduce((sum, s) => sum + s.price, 0)));
				}
			}
		} catch (err) {
			console.error('Error cargando facturación:', err);
			setError('Error al cargar los datos de facturación');
		}
	};

	const handleSaveTotal = async () => {
		if (!facturacion || !editReason.trim()) {
			setError('Debe proporcionar un motivo para cambiar el monto');
			return;
		}

		const newTotalNum = parseFloat(newTotal);
		if (isNaN(newTotalNum) || newTotalNum < 0) {
			setError('El monto debe ser un número válido');
			return;
		}

		try {
			setLoading(true);
			setError(null);

			if (facturacion.id) {
				// Actualizar facturación existente
				const res = await fetch(`/api/facturacion/${facturacion.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({
						total: newTotalNum,
						subtotal: newTotalNum - (facturacion.impuestos || 0),
						notas: `${facturacion.notas || ''}\n\n[MODIFICACIÓN DE MONTO - ${new Date().toLocaleString('es-ES')}] Motivo: ${editReason}. Monto anterior: ${facturacion.total} ${facturacion.currency}, Monto nuevo: ${newTotalNum} ${facturacion.currency}`,
					}),
				});

				if (!res.ok) {
					const data = await res.json();
					throw new Error(data.error || 'Error al actualizar el monto');
				}

				setSuccess('Monto actualizado correctamente');
				setEditingTotal(false);
				setEditReason('');
				await loadFacturacionData();
			}
		} catch (err: any) {
			setError(err.message || 'Error al actualizar el monto');
		} finally {
			setLoading(false);
		}
	};

	const handleDeleteService = async (serviceIndex: number) => {
		if (!facturacion || !deleteReason.trim()) {
			setError('Debe proporcionar un motivo para eliminar el servicio');
			return;
		}

		const service = facturacion.servicios?.[serviceIndex];
		if (!service) return;

		try {
			setLoading(true);
			setError(null);
			setDeletingServiceId(String(serviceIndex));

			// Actualizar facturación eliminando el servicio
			const remainingServices = facturacion.servicios?.filter((_, idx) => idx !== serviceIndex) || [];
			const newTotal = remainingServices.reduce((sum, s) => sum + s.price, 0);

			if (facturacion.id) {
				const res = await fetch(`/api/facturacion/${facturacion.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({
						total: newTotal,
						subtotal: newTotal - (facturacion.impuestos || 0),
						notas: `${facturacion.notas || ''}\n\n[ELIMINACIÓN DE SERVICIO - ${new Date().toLocaleString('es-ES')}] Motivo: ${deleteReason}. Servicio eliminado: ${service.name} (${service.price} ${service.currency})`,
					}),
				});

				if (!res.ok) {
					const data = await res.json();
					throw new Error(data.error || 'Error al eliminar el servicio');
				}

				setSuccess('Servicio eliminado correctamente');
				setDeleteReason('');
				setDeletingServiceId(null);
				await loadFacturacionData();
			}
		} catch (err: any) {
			setError(err.message || 'Error al eliminar el servicio');
		} finally {
			setLoading(false);
			setDeletingServiceId(null);
		}
	};

	if (!isOpen) return null;

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
					onClick={(e) => {
						if (e.target === e.currentTarget) onClose();
					}}>
					<motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
						{/* Header */}
						<div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between z-10">
							<h2 className="text-xl font-bold text-slate-900">Gestionar Cita - Recepción</h2>
							<button onClick={onClose} className="text-slate-400 hover:text-slate-600">
								<X className="w-6 h-6" />
							</button>
						</div>

						{/* Content */}
						<div className="p-6 space-y-6">
							{/* Información de la cita */}
							<div className="bg-slate-50 rounded-lg p-4">
								<h3 className="font-semibold text-slate-900 mb-2">Información de la Cita</h3>
								<p className="text-sm text-slate-600">
									<strong>Paciente:</strong> {appointment?.patient || 'N/A'}
								</p>
								<p className="text-sm text-slate-600">
									<strong>Motivo:</strong> {appointment?.reason || 'N/A'}
								</p>
								<p className="text-sm text-slate-600">
									<strong>Fecha/Hora:</strong> {appointment?.time || 'N/A'}
								</p>
							</div>

							{/* Mensajes */}
							{error && (
								<div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3">
									<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
									<p className="text-sm text-red-800">{error}</p>
								</div>
							)}
							{success && (
								<div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg flex items-start gap-3">
									<FileText className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
									<p className="text-sm text-green-800">{success}</p>
								</div>
							)}

							{loading && !facturacion ? (
								<div className="flex items-center justify-center py-8">
									<Loader2 className="w-6 h-6 animate-spin text-teal-600" />
								</div>
							) : (
								<>
									{/* Servicios */}
									<div>
										<h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
											<FileText className="w-5 h-5" />
											Servicios Cobrados
										</h3>
										{facturacion?.servicios && facturacion.servicios.length > 0 ? (
											<div className="space-y-3">
												{facturacion.servicios.map((service, index) => (
													<div key={index} className="bg-white border border-slate-200 rounded-lg p-4 flex items-start justify-between">
														<div className="flex-1">
															<h4 className="font-medium text-slate-900">{service.name}</h4>
															{service.description && <p className="text-sm text-slate-600 mt-1">{service.description}</p>}
															<p className="text-sm font-semibold text-teal-600 mt-2">
																<CurrencyDisplay amount={service.price} currency={service.currency} />
															</p>
														</div>
														<button
															onClick={() => {
																setDeletingServiceId(String(index));
																setDeleteReason('');
															}}
															disabled={loading}
															className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
															<Trash2 className="w-5 h-5" />
														</button>
													</div>
												))}
											</div>
										) : (
											<p className="text-sm text-slate-500">No hay servicios registrados</p>
										)}
									</div>

									{/* Monto Total */}
									<div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
										<div className="flex items-center justify-between mb-4">
											<h3 className="font-semibold text-slate-900 flex items-center gap-2">
												<DollarSign className="w-5 h-5" />
												Monto Total
											</h3>
											{!editingTotal && (
												<button onClick={() => setEditingTotal(true)} className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg transition">
													<Edit2 className="w-5 h-5" />
												</button>
											)}
										</div>
										{editingTotal ? (
											<div className="space-y-4">
												<div>
													<label className="block text-sm font-medium text-slate-700 mb-2">Nuevo Monto *</label>
													<input type="number" step="0.01" min="0" value={newTotal} onChange={(e) => setNewTotal(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
												</div>
												<div>
													<label className="block text-sm font-medium text-slate-700 mb-2">Motivo del cambio *</label>
													<textarea value={editReason} onChange={(e) => setEditReason(e.target.value)} rows={3} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500" placeholder="Indique el motivo por el cual se cambia el monto..." />
												</div>
												<div className="flex gap-3">
													<button onClick={handleSaveTotal} disabled={loading} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition flex items-center gap-2">
														{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
														Guardar
													</button>
													<button
														onClick={() => {
															setEditingTotal(false);
															setEditReason('');
															setNewTotal(String(facturacion?.total || 0));
														}}
														disabled={loading}
														className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition">
														Cancelar
													</button>
												</div>
											</div>
										) : (
											<p className="text-2xl font-bold text-teal-600">{facturacion && <CurrencyDisplay amount={facturacion.total} currency={facturacion.currency} />}</p>
										)}
									</div>

									{/* Modal para eliminar servicio */}
									{deletingServiceId !== null && (
										<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
											<div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
												<h3 className="text-lg font-bold text-slate-900 mb-4">Eliminar Servicio</h3>
												<div className="mb-4">
													<label className="block text-sm font-medium text-slate-700 mb-2">Motivo de eliminación *</label>
													<textarea value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} rows={3} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500" placeholder="Indique el motivo por el cual se elimina el servicio..." />
												</div>
												<div className="flex gap-3">
													<button
														onClick={() => {
															if (deletingServiceId !== null) {
																handleDeleteService(parseInt(deletingServiceId));
															}
														}}
														disabled={loading || !deleteReason.trim()}
														className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50">
														Eliminar
													</button>
													<button
														onClick={() => {
															setDeletingServiceId(null);
															setDeleteReason('');
														}}
														disabled={loading}
														className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition">
														Cancelar
													</button>
												</div>
											</div>
										</div>
									)}
								</>
							)}
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
