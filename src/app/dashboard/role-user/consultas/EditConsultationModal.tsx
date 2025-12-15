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
	notas?: string | null;
};

type Props = {
	isOpen: boolean;
	onClose: () => void;
	consultationId: string;
	facturacion: Facturacion | null;
	selectedService?: any;
	onSave: () => void;
};

type SelectedServiceItem = {
	name: string;
	price?: number;
	currency?: string;
};

export default function EditConsultationModal({
	isOpen,
	onClose,
	consultationId,
	facturacion,
	selectedService,
	onSave,
}: Props) {
	const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
	const [loading, setLoading] = useState(false);
	const [loadingMethods, setLoadingMethods] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Form states
	const [metodoPago, setMetodoPago] = useState('');
	const [descuentoMonto, setDescuentoMonto] = useState('');
	const [extraMonto, setExtraMonto] = useState('');
	const [razonAjuste, setRazonAjuste] = useState('');
	const [montoFinal, setMontoFinal] = useState<number>(0);

	// Servicios seleccionados (para combos / múltiples servicios)
	const [selectedItems, setSelectedItems] = useState<SelectedServiceItem[]>([]);
	const [activeIndexes, setActiveIndexes] = useState<number[]>([]);
	const [nuevoMontoServicios, setNuevoMontoServicios] = useState('');
	const [tieneAutorizacionDoctora, setTieneAutorizacionDoctora] = useState(false);

	const parseSelectedService = (raw: any): SelectedServiceItem[] => {
		if (!raw) return [];
		let data = raw;
		try {
			if (typeof data === 'string') {
				data = JSON.parse(data);
			}
		} catch {
			// si no es JSON válido, no intentamos parsear
			return [];
		}

		// Si es un array, considerar que son múltiples servicios
		if (Array.isArray(data)) {
			return data
				.map((item): SelectedServiceItem | null => {
					if (item && typeof item === 'object') {
						const name = (item.name || item.nombre || 'Servicio').toString();
						const price =
							item.price != null
								? Number(
										typeof item.price === 'string'
											? item.price.replace(',', '.')
											: item.price,
								  )
								: undefined;
						const currency = item.currency ? String(item.currency) : undefined;
						return { name, price, currency };
					}
					return null;
				})
				.filter((i): i is SelectedServiceItem => i !== null);
		}

		// Si es un objeto único que contiene un array de servicios internos (posible combo)
		if (typeof data === 'object' && data !== null) {
			const maybeServices = (data as any).services || (data as any).services_included;
			if (Array.isArray(maybeServices)) {
				return maybeServices
					.map((item: any): SelectedServiceItem | null => {
						if (item && typeof item === 'object') {
							const name = (item.name || item.nombre || 'Servicio').toString();
							const price =
								item.price != null
									? Number(
											typeof item.price === 'string'
												? item.price.replace(',', '.')
												: item.price,
									  )
									: undefined;
							const currency = item.currency ? String(item.currency) : undefined;
							return { name, price, currency };
						}
						return null;
					})
					.filter((i: any): i is SelectedServiceItem => i !== null);
			}
		}

		return [];
	};

	useEffect(() => {
		if (isOpen) {
			loadPaymentMethods();
			if (facturacion) {
				setMetodoPago(facturacion.metodoPago || '');
				setMontoFinal(facturacion.total || 0);
				setDescuentoMonto('');
				setExtraMonto('');
				setRazonAjuste('');
			}

			// Parsear servicios seleccionados (para detectar combos o múltiples servicios)
			const items = parseSelectedService(selectedService);
			setSelectedItems(items || []);
			setActiveIndexes(items.map((_, idx) => idx));
			setNuevoMontoServicios('');
			setTieneAutorizacionDoctora(false);
		}
	}, [isOpen, facturacion, selectedService]);

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

		const descuentoNum = parseFloat(descuentoMonto.replace(',', '.')) || 0;
		const extraNum = parseFloat(extraMonto.replace(',', '.')) || 0;

		const hasServiceBreakdown = selectedItems.length > 1;
		const allServicesSelected = !hasServiceBreakdown || activeIndexes.length === selectedItems.length;
		const someDeselected = hasServiceBreakdown && activeIndexes.length < selectedItems.length;

		// Validaciones para combos / múltiples servicios
		if (someDeselected) {
			// No permitir combinar con otros descuentos/cargos adicionales para evitar confusión
			if (descuentoNum > 0 || extraNum > 0) {
				setError(
					'Cuando modificas los servicios del combo, usa solo el campo de "Nuevo monto por servicios seleccionados", sin descuentos ni cargos extra adicionales.'
				);
				return;
			}

			if (!nuevoMontoServicios.trim()) {
				setError('Debe indicar el nuevo monto a cobrar por los servicios seleccionados.');
				return;
			}

			const nuevoMontoNum = parseFloat(nuevoMontoServicios.replace(',', '.'));
			if (Number.isNaN(nuevoMontoNum) || nuevoMontoNum < 0) {
				setError('El nuevo monto por servicios seleccionados debe ser un número válido mayor o igual a 0.');
				return;
			}

			if (!razonAjuste.trim()) {
				setError('Debe indicar el motivo por el cual se desactivaron algunos servicios del combo.');
				return;
			}
		} else if (descuentoNum > 0 || extraNum > 0) {
			// Caso ajuste sin desactivar servicios (ej. descuento o cargo adicional)
			if (!razonAjuste.trim()) {
				setError('Debe proporcionar un comentario para el ajuste de monto');
				return;
			}

			// Si hay descuento pero no se desactivan servicios, pedir confirmación de autorización
			if (descuentoNum > 0 && !tieneAutorizacionDoctora) {
				setError('Debe confirmar que cuenta con la autorización de la doctora para aplicar el descuento.');
				return;
			}
		}

		try {
			setLoading(true);
			setError(null);

			const totalBase = facturacion?.total || 0;

			let ajuste = 0;
			let totalFinal = totalBase;

			if (someDeselected) {
				const nuevoMontoNum = parseFloat(nuevoMontoServicios.replace(',', '.')) || 0;
				totalFinal = Math.max(0, nuevoMontoNum);
				ajuste = totalFinal - totalBase;
			} else {
				// Cálculo del ajuste total: extra - descuento
				ajuste = extraNum - descuentoNum;
				totalFinal = Math.max(0, totalBase + ajuste);
			}

			// Actualizar facturación
			const updatePayload: any = {
				metodo_pago: metodoPago,
			};

			// Si hay ajuste de monto (descuento o recargo), agregarlo
			if (ajuste !== 0) {
				updatePayload.ajuste_monto = ajuste;
				updatePayload.razon_ajuste = razonAjuste.trim();
				updatePayload.total = totalFinal;

				// Construir una nota legible para médico y asistente
				const partes: string[] = [];

				if (someDeselected) {
					const removed = selectedItems.filter((_, idx) => !activeIndexes.includes(idx));
					if (removed.length > 0) {
						const nombresRemovidos = removed.map((i) => i.name).join(', ');
						partes.push(`Servicios no realizados del combo: ${nombresRemovidos}`);
					}
					partes.push(
						`Nuevo monto por servicios efectivamente realizados: ${totalFinal.toFixed(2)} ${
							facturacion?.currency || 'USD'
						}`,
					);
				} else {
					if (descuentoNum > 0) {
						partes.push(
							`Descuento aplicado: -${descuentoNum.toFixed(2)} ${facturacion?.currency || 'USD'}`,
						);
						partes.push(
							`Autorización de la doctora para el descuento: ${tieneAutorizacionDoctora ? 'SÍ' : 'NO'}`,
						);
					}
					if (extraNum > 0) {
						partes.push(
							`Cargos adicionales: +${extraNum.toFixed(2)} ${facturacion?.currency || 'USD'}`,
						);
					}
				}

				const resumenAjuste =
					`[AJUSTE FACTURACIÓN - ${new Date().toLocaleString('es-ES')}] ` +
					`Monto original: ${totalBase.toFixed(2)} ${facturacion?.currency || 'USD'}, ` +
					`Monto final: ${totalFinal.toFixed(2)} ${facturacion?.currency || 'USD'}. ` +
					(partes.length ? partes.join(' | ') + '. ' : '') +
					`Comentario: ${razonAjuste.trim()}`;

				updatePayload.notas = `${(facturacion as any).notas || ''}${
					(facturacion as any).notas ? '\n\n' : ''
				}${resumenAjuste}`;
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

						{/* Servicios del combo / múltiples servicios */}
						{selectedItems.length > 1 && (
							<div className="border border-slate-200 rounded-lg p-4 space-y-3">
								<p className="text-sm font-medium text-slate-800">
									Servicios del combo / paquete realizado
								</p>
								<p className="text-xs text-slate-500">
									Marca solo los servicios que se realizaron en la consulta. Si desmarcas alguno, podrás
									definir un nuevo monto total para los servicios realmente prestados.
								</p>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
									{selectedItems.map((item, idx) => (
										<label
											key={idx}
											className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 rounded-md p-2 cursor-pointer hover:bg-slate-100"
										>
											<input
												type="checkbox"
												className="mt-0.5"
												checked={activeIndexes.includes(idx)}
												onChange={(e) => {
													setActiveIndexes((prev) =>
														e.target.checked
															? [...prev, idx]
															: prev.filter((i) => i !== idx),
													);
												}}
											/>
											<span className="flex-1">
												<span className="font-semibold block">{item.name}</span>
												{item.price != null && (
													<span className="text-[11px] text-slate-500">
														{Number(item.price).toFixed(2)}{' '}
														{item.currency || facturacion?.currency || 'USD'}
													</span>
												)}
											</span>
										</label>
									))}
								</div>

								{/* Nuevo monto cuando se desactivan servicios */}
								{selectedItems.length > 1 && activeIndexes.length < selectedItems.length && (
									<div className="mt-3 space-y-2 border-t border-dashed border-slate-200 pt-3">
										<label className="block text-sm font-medium text-slate-700 mb-1">
											Nuevo monto por servicios seleccionados <span className="text-red-500">*</span>
										</label>
										<p className="text-xs text-slate-500 mb-1">
											Indica el monto total a cobrar solo por los servicios que quedaron marcados.
										</p>
										<input
											type="number"
											min="0"
											step="0.01"
											value={nuevoMontoServicios}
											onChange={(e) => {
												const value = e.target.value;
												setNuevoMontoServicios(value);
												const nuevo = parseFloat(value.replace(',', '.')) || 0;
												setMontoFinal(Math.max(0, nuevo));
											}}
											placeholder="0.00"
											className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
										/>
										<p className="text-xs text-amber-600 mt-1">
											Este nuevo monto reemplazará el total original del combo para reflejar solo los
											servicios efectivamente realizados.
										</p>
									</div>
								)}
							</div>
						)}

						{/* Descuento y cargos adicionales (solo cuando no se modifican servicios del combo) */}
						{!(selectedItems.length > 1 && activeIndexes.length < selectedItems.length) && (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-slate-700 mb-1">
										Descuento / Cobro menor
									</label>
									<p className="text-xs text-slate-500 mb-2">
										Monto a restar del total original (ej: descuentos, cortesías, ajustes a la baja).
									</p>
									<input
										type="number"
										min="0"
										step="0.01"
										value={descuentoMonto}
										onChange={(e) => {
											const value = e.target.value;
											setDescuentoMonto(value);
											const base = facturacion?.total || 0;
											const desc = parseFloat(value.replace(',', '.')) || 0;
											const extra = parseFloat(extraMonto.replace(',', '.')) || 0;
											const final = Math.max(0, base - desc + extra);
											setMontoFinal(final);
										}}
										placeholder="0.00"
										className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-slate-700 mb-1">
										Cargos adicionales
									</label>
									<p className="text-xs text-slate-500 mb-2">
										Monto a sumar por servicios extra realizados durante la consulta.
									</p>
									<input
										type="number"
										min="0"
										step="0.01"
										value={extraMonto}
										onChange={(e) => {
											const value = e.target.value;
											setExtraMonto(value);
											const base = facturacion?.total || 0;
											const desc = parseFloat(descuentoMonto.replace(',', '.')) || 0;
											const extra = parseFloat(value.replace(',', '.')) || 0;
											const final = Math.max(0, base - desc + extra);
											setMontoFinal(final);
										}}
										placeholder="0.00"
										className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
									/>
								</div>
							</div>
						)}

						{/* Monto final calculado */}
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-2">
								Monto final a cobrar
							</label>
							<input
								type="number"
								step="0.01"
								value={montoFinal.toFixed(2)}
								readOnly
								className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 font-semibold"
							/>
							{facturacion?.tipoCambio && facturacion.currency !== 'VES' && (
								<p className="text-xs text-slate-500 mt-1">
									≈ {(montoFinal * Number(facturacion.tipoCambio)).toLocaleString('es-VE', {
										minimumFractionDigits: 2,
									})}{' '}
									Bs.
								</p>
							)}
						</div>

						{/* Comentario del ajuste */}
						{descuentoMonto ||
						extraMonto ||
						(selectedItems.length > 1 && activeIndexes.length < selectedItems.length) ? (
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-2">
									Comentario del ajuste <span className="text-red-500">*</span>
								</label>
								<textarea
									value={razonAjuste}
									onChange={(e) => setRazonAjuste(e.target.value)}
									placeholder="Explique por qué se aplicó el descuento y/o los cargos adicionales (ej: promoción, servicio extra, ajuste administrativo, etc.)"
									rows={3}
									className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
								/>
							</div>
						) : null}

						{/* Confirmación de autorización de la doctora cuando hay descuento sin modificar servicios */}
						{descuentoMonto && !(selectedItems.length > 1 && activeIndexes.length < selectedItems.length) && (
							<div className="flex items-start gap-2 bg-teal-50 border border-teal-200 rounded-lg p-3">
								<input
									id="autorizacion-doctora"
									type="checkbox"
									checked={tieneAutorizacionDoctora}
									onChange={(e) => setTieneAutorizacionDoctora(e.target.checked)}
									className="mt-1"
								/>
								<label htmlFor="autorizacion-doctora" className="text-xs text-slate-700">
									Confirmo que este descuento fue autorizado por la doctora responsable de la consulta.
								</label>
							</div>
						)}
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

