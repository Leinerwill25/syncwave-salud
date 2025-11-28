'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, DollarSign, Calendar, FileText, Receipt, CreditCard, Image as ImageIcon, X, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CurrencyDisplay from '@/components/CurrencyDisplay';
import { useCurrencyExchangeRate } from '@/hooks/useCurrencyExchangeRate';

type InitialData = {
	id: string;
	subtotal: string;
	impuestos: string;
	total: string;
	currency: string;
	tipoCambio: string;
	billingSeries: string;
	numeroFactura: string;
	estadoFactura: string;
	estadoPago: string;
	metodoPago: string;
	fechaPago: string;
	notas: string;
};

type Props = {
	consultationId: string;
	appointmentId?: string | null;
	patientId: string;
	doctorId?: string | null;
	organizationId?: string | null;
	initialData?: InitialData;
};

// Constantes de impuestos
const IVA_RATE = 0.16; // 16% IVA fijo
const IGTF_RATE = 0.03; // 3% IGTF solo para pagos en efectivo (divisa)

// Helper para extraer referencia y captura de las notas
const extractReferenceAndScreenshot = (notas: string | null): { referencia: string | null; capturaUrl: string | null; cleanNotas: string } => {
	if (!notas) return { referencia: null, capturaUrl: null, cleanNotas: '' };

	let referencia: string | null = null;
	let capturaUrl: string | null = null;
	let cleanNotas = notas;

	// Extraer referencia: [REFERENCIA] 021321312
	const refMatch = notas.match(/\[REFERENCIA\]\s*(\S+)/);
	if (refMatch) {
		referencia = refMatch[1];
		cleanNotas = cleanNotas.replace(/\[REFERENCIA\]\s*\S+/g, '').trim();
	}

	// Extraer captura: [CAPTURA] https://...
	const capturaMatch = notas.match(/\[CAPTURA\]\s*(.+?)(?=\n|$|\[)/);
	if (capturaMatch) {
		capturaUrl = capturaMatch[1].trim();
		cleanNotas = cleanNotas.replace(/\[CAPTURA\]\s*.+?(?=\n|$|\[)/g, '').trim();
	}

	// Limpiar líneas vacías adicionales
	cleanNotas = cleanNotas.replace(/\n\s*\n/g, '\n').trim();

	return { referencia, capturaUrl, cleanNotas };
};

export default function PaymentForm({ consultationId, appointmentId, patientId, doctorId, organizationId, initialData }: Props) {
	const [facturacionId, setFacturacionId] = useState<string | null>(initialData?.id || null);
	const [subtotal, setSubtotal] = useState<string>(initialData?.subtotal || '');
	const [iva, setIva] = useState<string>('0');
	const [igtf, setIgtf] = useState<string>('0');
	const [total, setTotal] = useState<string>(initialData?.total || '');
	const [currency, setCurrency] = useState<string>(initialData?.currency || 'USD');
	
	// Obtener la tasa de cambio automáticamente cuando cambia la moneda
	const { rate: exchangeRate, loading: rateLoading } = useCurrencyExchangeRate(currency);
	
	// Estado para tipoCambio - se actualizará automáticamente con la tasa obtenida
	const [tipoCambio, setTipoCambio] = useState<string>(initialData?.tipoCambio || '1');
	
	// Actualizar tipoCambio automáticamente cuando se obtiene la tasa de cambio
	useEffect(() => {
		if (exchangeRate !== null && exchangeRate !== undefined && exchangeRate > 0) {
			setTipoCambio(exchangeRate.toString());
		}
	}, [exchangeRate]);
	
	const [billingSeries, setBillingSeries] = useState<string>(initialData?.billingSeries || '');
	const [numeroFactura, setNumeroFactura] = useState<string>(initialData?.numeroFactura || '');
	const [estadoFactura, setEstadoFactura] = useState<string>(initialData?.estadoFactura || 'emitida');
	const [estadoPago, setEstadoPago] = useState<string>(initialData?.estadoPago || 'pendiente');
	const [metodoPago, setMetodoPago] = useState<string>(initialData?.metodoPago || '');
	const [fechaPago, setFechaPago] = useState<string>(initialData?.fechaPago || '');
	
	// Extraer referencia y captura de las notas iniciales
	const { referencia: initialRef, capturaUrl: initialCaptura, cleanNotas: initialCleanNotas } = extractReferenceAndScreenshot(initialData?.notas || null);
	const [numeroReferencia, setNumeroReferencia] = useState<string>(initialRef || '');
	const [capturaUrl, setCapturaUrl] = useState<string | null>(initialCaptura);
	const [notas, setNotas] = useState<string>(initialCleanNotas);
	
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [showImageModal, setShowImageModal] = useState(false);
	const router = useRouter();

	const isEditing = !!facturacionId;

	// Calcular IVA automáticamente (16% sobre subtotal)
	useEffect(() => {
		const sub = parseFloat(subtotal) || 0;
		const calculatedIva = sub * IVA_RATE;
		setIva(calculatedIva.toFixed(2));
	}, [subtotal]);

	// Calcular IGTF automáticamente (3% sobre subtotal + IVA, solo si método de pago es efectivo)
	useEffect(() => {
		const sub = parseFloat(subtotal) || 0;
		const ivaAmount = parseFloat(iva) || 0;
		const baseForIgtf = sub + ivaAmount;
		
		// IGTF solo aplica si el método de pago es "efectivo" (pago en divisa)
		if (metodoPago === 'efectivo') {
			const calculatedIgtf = baseForIgtf * IGTF_RATE;
			setIgtf(calculatedIgtf.toFixed(2));
		} else {
			setIgtf('0');
		}
	}, [subtotal, iva, metodoPago]);

	// Calcular total automáticamente (subtotal + IVA + IGTF)
	useEffect(() => {
		const sub = parseFloat(subtotal) || 0;
		const ivaAmount = parseFloat(iva) || 0;
		const igtfAmount = parseFloat(igtf) || 0;
		const calculatedTotal = sub + ivaAmount + igtfAmount;
		setTotal(calculatedTotal.toFixed(2));
	}, [subtotal, iva, igtf]);

	// Si estado_pago es 'pagado', establecer fecha_pago automáticamente si no está establecida
	useEffect(() => {
		if (estadoPago === 'pagado' && !fechaPago) {
			setFechaPago(new Date().toISOString().split('T')[0]);
		}
	}, [estadoPago, fechaPago]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setSuccess(null);

		// Validaciones
		if (!subtotal || parseFloat(subtotal) <= 0) {
			setError('El subtotal debe ser mayor a 0.');
			return;
		}

		if (!total || parseFloat(total) <= 0) {
			setError('El total debe ser mayor a 0.');
			return;
		}

		if (!metodoPago) {
			setError('El método de pago es obligatorio.');
			return;
		}

		if (!patientId) {
			setError('Falta patient_id.');
			return;
		}

		setLoading(true);

		try {
			// Construir notas: incluir referencia y captura si existen, más las notas limpias
			const notasParts: string[] = [];
			if (numeroReferencia.trim()) {
				notasParts.push(`[REFERENCIA] ${numeroReferencia.trim()}`);
			}
			if (capturaUrl) {
				notasParts.push(`[CAPTURA] ${capturaUrl}`);
			}
			if (notas.trim()) {
				notasParts.push(notas.trim());
			}
			const finalNotas = notasParts.join('\n');

			const impuestosTotal = parseFloat(iva) + parseFloat(igtf);

			const payload: any = {
				consultation_id: consultationId,
				appointment_id: appointmentId || null,
				patient_id: patientId,
				doctor_id: doctorId || null,
				organization_id: organizationId || null,
				subtotal: parseFloat(subtotal),
				impuestos: impuestosTotal,
				total: parseFloat(total),
				currency: currency || 'USD',
				tipo_cambio: parseFloat(tipoCambio) || 1,
				billing_series: billingSeries || null,
				numero_factura: numeroFactura || null,
				estado_factura: estadoFactura || 'emitida',
				estado_pago: estadoPago || 'pendiente',
				metodo_pago: metodoPago,
				fecha_pago: fechaPago ? new Date(fechaPago).toISOString() : null,
				notas: finalNotas || null,
			};

			// Si estamos editando, agregar el ID y usar PUT
			if (isEditing && facturacionId) {
				payload.id = facturacionId;
			}

			const url = isEditing ? `/api/facturacion/${facturacionId}` : '/api/facturacion';
			const method = isEditing ? 'PUT' : 'POST';

			const res = await fetch(url, {
				method,
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || `Error ${isEditing ? 'actualizando' : 'registrando'} pago`);

			setSuccess(isEditing ? 'Pago actualizado correctamente.' : 'Pago registrado correctamente.');
			setLoading(false);

			// Redirigir a la consulta después de un breve delay
			setTimeout(() => {
				router.push(`/dashboard/medic/consultas/${consultationId}`);
			}, 1500);
		} catch (err: any) {
			setError(err?.message ?? String(err));
			setLoading(false);
		}
	}

	const subtotalNum = parseFloat(subtotal) || 0;
	const ivaNum = parseFloat(iva) || 0;
	const igtfNum = parseFloat(igtf) || 0;
	const totalNum = parseFloat(total) || 0;

	return (
		<div className="space-y-6">
			{/* Header card */}
			<div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/50 p-6 shadow-sm">
				<div className="flex items-start justify-between gap-4">
					<div className="flex-1">
						<h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3 mb-2">
							<div className="p-2 bg-blue-600 rounded-lg text-white">
								<DollarSign size={28} />
							</div>
							{isEditing ? 'Editar Pago de Consulta' : 'Registrar Pago de Consulta'}
						</h2>
						<p className="text-sm md:text-base text-slate-600 dark:text-slate-300 ml-14">
							{isEditing ? 'Edita los datos del pago o cambia el estado del pago.' : 'Registra el pago realizado por el paciente para esta consulta.'}
						</p>
					</div>
					<div className="text-right bg-white/60 dark:bg-slate-800/60 rounded-lg px-4 py-2 border border-blue-200 dark:border-blue-800">
						<div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Consulta ID</div>
						<div className="font-mono font-semibold text-slate-800 dark:text-slate-100 text-sm">{consultationId.slice(0, 8)}...</div>
					</div>
				</div>
			</div>

			<form onSubmit={handleSubmit} className="space-y-6">
				{/* Información de facturación */}
				<div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
					<div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
						<div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
							<Receipt className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
						</div>
						<h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Información de Facturación</h3>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="md:col-span-2">
							<label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
								Subtotal <span className="text-red-500">*</span>
							</label>
							<div className="relative">
								<input
									type="number"
									step="0.01"
									min="0"
									value={subtotal}
									onChange={(e) => setSubtotal(e.target.value)}
									className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-lg font-semibold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 transition-all"
									placeholder="0.00"
									required
								/>
								<div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">{currency}</div>
							</div>
							{subtotalNum > 0 && (
								<div className="mt-2">
									<CurrencyDisplay amount={subtotalNum} currency={currency as 'USD' | 'EUR'} showBoth={true} size="sm" />
								</div>
							)}
						</div>

						<div>
							<label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
								IVA (16%) <span className="text-xs font-normal text-slate-500">Automático</span>
							</label>
							<div className="relative">
								<input
									type="number"
									step="0.01"
									value={iva}
									readOnly
									className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-lg font-semibold"
								/>
								<div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">{currency}</div>
							</div>
							{ivaNum > 0 && (
								<div className="mt-2">
									<CurrencyDisplay amount={ivaNum} currency={currency as 'USD' | 'EUR'} showBoth={true} size="sm" />
								</div>
							)}
						</div>

						<div>
							<label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
								IGTF (3%) <span className="text-xs font-normal text-slate-500">
									{metodoPago === 'efectivo' ? 'Aplicado (Efectivo)' : 'No aplica'}
								</span>
							</label>
							<div className="relative">
								<input
									type="number"
									step="0.01"
									value={igtf}
									readOnly
									className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-lg font-semibold"
								/>
								<div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">{currency}</div>
							</div>
							{igtfNum > 0 && (
								<div className="mt-2">
									<CurrencyDisplay amount={igtfNum} currency={currency as 'USD' | 'EUR'} showBoth={true} size="sm" />
								</div>
							)}
						</div>

						<div className="md:col-span-2">
							<label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
								Total <span className="text-red-500">*</span>
							</label>
							<div className="relative">
								<input
									type="number"
									step="0.01"
									value={total}
									readOnly
									className="w-full px-4 py-3 rounded-lg border-2 border-indigo-500 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-100 text-xl font-bold"
								/>
								<div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-600 dark:text-indigo-400 font-bold">{currency}</div>
							</div>
							{totalNum > 0 && (
								<div className="mt-3 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 rounded-lg border border-indigo-200 dark:border-indigo-900">
									<div className="flex items-center gap-2 mb-2">
										<span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Total en ambas monedas:</span>
									</div>
									<CurrencyDisplay amount={totalNum} currency={currency as 'USD' | 'EUR'} showBoth={true} size="lg" />
								</div>
							)}
						</div>

						<div>
							<label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Moneda</label>
							<select
								value={currency}
								onChange={(e) => setCurrency(e.target.value)}
								className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 transition-all">
								<option value="USD">USD - Dólar Estadounidense</option>
								<option value="EUR">EUR - Euro</option>
							</select>
						</div>

						<div>
							<label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Serie de Factura</label>
							<input
								type="text"
								value={billingSeries}
								onChange={(e) => setBillingSeries(e.target.value)}
								className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 transition-all"
								placeholder="A, B, C, etc."
							/>
						</div>

						<div>
							<label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Número de Factura</label>
							<input
								type="text"
								value={numeroFactura}
								onChange={(e) => setNumeroFactura(e.target.value)}
								className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 transition-all"
								placeholder="000001"
							/>
							<p className="text-xs text-slate-500 mt-1">Debe ser único</p>
						</div>
					</div>
				</div>

				{/* Información de pago */}
				<div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
					<div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
						<div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
							<CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
						</div>
						<h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Información de Pago</h3>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
								Método de Pago <span className="text-red-500">*</span>
							</label>
							<select
								value={metodoPago}
								onChange={(e) => setMetodoPago(e.target.value)}
								className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 transition-all"
								required>
								<option value="">Seleccione un método</option>
								<option value="efectivo">Efectivo</option>
								<option value="PAGO_MOVIL">Pago Móvil</option>
								<option value="tarjeta_debito">Tarjeta de Débito</option>
								<option value="tarjeta_credito">Tarjeta de Crédito</option>
								<option value="transferencia">Transferencia Bancaria</option>
								<option value="cheque">Cheque</option>
								<option value="otro">Otro</option>
							</select>
							{metodoPago === 'efectivo' && (
								<p className="text-xs text-amber-600 dark:text-amber-400 mt-1">⚠️ Se aplicará IGTF del 3% por ser pago en efectivo (divisa)</p>
							)}
						</div>

						<div>
							<label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Estado de Factura</label>
							<select
								value={estadoFactura}
								onChange={(e) => setEstadoFactura(e.target.value)}
								className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 transition-all">
								<option value="emitida">Emitida</option>
								<option value="cancelada">Cancelada</option>
								<option value="anulada">Anulada</option>
							</select>
						</div>

						<div>
							<label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Estado de Pago</label>
							<select
								value={estadoPago}
								onChange={(e) => setEstadoPago(e.target.value)}
								className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 transition-all">
								<option value="pendiente">Pendiente</option>
								<option value="pendiente_verificacion">Pendiente Verificación</option>
								<option value="pagada">Pagada</option>
								<option value="pagado">Pagado</option>
								<option value="parcial">Pago Parcial</option>
								<option value="cancelado">Cancelado</option>
							</select>
						</div>

						{(estadoPago === 'pagada' || estadoPago === 'pagado' || fechaPago) && (
							<div>
								<label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
									<Calendar className="w-4 h-4" />
									Fecha de Pago
								</label>
								<input
									type="date"
									value={fechaPago}
									onChange={(e) => setFechaPago(e.target.value)}
									className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 transition-all"
								/>
							</div>
						)}
					</div>
				</div>

				{/* Referencia y Captura de Pago */}
				{(metodoPago === 'PAGO_MOVIL' || numeroReferencia || capturaUrl) && (
					<div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
						<div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
							<div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
								<ImageIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
							</div>
							<h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Referencia y Comprobante de Pago</h3>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
									Número de Referencia
								</label>
								<input
									type="text"
									value={numeroReferencia}
									onChange={(e) => setNumeroReferencia(e.target.value)}
									className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 transition-all font-mono"
									placeholder="021321312"
								/>
								<p className="text-xs text-slate-500 mt-1">Número de referencia del pago móvil</p>
							</div>

							<div>
								<label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
									Captura de Pantalla
								</label>
								{capturaUrl ? (
									<div className="relative">
										<div className="relative group">
											<img
												src={capturaUrl}
												alt="Captura de pago"
												className="w-full h-32 object-cover rounded-lg border-2 border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-90 transition-opacity"
												onClick={() => setShowImageModal(true)}
											/>
											<button
												type="button"
												onClick={() => setCapturaUrl(null)}
												className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600">
												<X className="w-4 h-4" />
											</button>
											<div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
												<Eye className="w-6 h-6 text-white" />
											</div>
										</div>
										<p className="text-xs text-slate-500 mt-1">Haz clic en la imagen para ver en tamaño completo</p>
									</div>
								) : (
									<div className="w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex items-center justify-center bg-slate-50 dark:bg-slate-800/50">
										<p className="text-sm text-slate-500 dark:text-slate-400">No hay captura disponible</p>
									</div>
								)}
							</div>
						</div>
					</div>
				)}

				{/* Notas */}
				<div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
					<label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
						<FileText className="w-4 h-4" />
						Notas Adicionales (opcional)
					</label>
					<textarea
						value={notas}
						onChange={(e) => setNotas(e.target.value)}
						rows={4}
						className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 transition-all resize-none"
						placeholder="Notas adicionales sobre el pago (sin incluir referencia ni captura)..."
					/>
					<p className="text-xs text-slate-500 mt-1">Las notas no incluyen la referencia ni la captura de pantalla (se guardan por separado)</p>
				</div>

				{/* Messages */}
				{error && (
					<div className="rounded-lg bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 text-sm font-medium">
						{error}
					</div>
				)}
				{success && (
					<div className="rounded-lg bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 p-4 text-sm font-medium">
						{success}
					</div>
				)}

				{/* Actions */}
				<div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
					<button
						type="button"
						onClick={() => router.back()}
						className="px-6 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
						Cancelar
					</button>

					<div className="text-xs text-slate-500 dark:text-slate-400 text-center">
						{isEditing ? 'Los cambios se guardarán en la base de datos' : 'El registro se guardará en la base de datos'}
					</div>

					<button
						type="submit"
						disabled={loading}
						className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold shadow-lg hover:from-indigo-700 hover:to-blue-700 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
						{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <DollarSign className="w-5 h-5" />}
						{loading ? (isEditing ? 'Actualizando...' : 'Registrando...') : isEditing ? 'Actualizar Pago' : 'Registrar Pago'}
					</button>
				</div>
			</form>

			{/* Modal para ver imagen en tamaño completo */}
			{showImageModal && capturaUrl && (
				<div
					className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
					onClick={() => setShowImageModal(false)}>
					<div className="relative max-w-4xl max-h-[90vh]">
						<button
							type="button"
							onClick={() => setShowImageModal(false)}
							className="absolute top-4 right-4 p-2 bg-white rounded-full text-slate-900 hover:bg-slate-100 z-10">
							<X className="w-6 h-6" />
						</button>
						<img src={capturaUrl} alt="Captura de pago" className="max-w-full max-h-[90vh] rounded-lg" />
					</div>
				</div>
			)}
		</div>
	);
}
