'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, DollarSign, Calendar, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

export default function PaymentForm({ consultationId, appointmentId, patientId, doctorId, organizationId, initialData }: Props) {
	const [facturacionId, setFacturacionId] = useState<string | null>(initialData?.id || null);
	const [subtotal, setSubtotal] = useState<string>(initialData?.subtotal || '');
	const [impuestos, setImpuestos] = useState<string>(initialData?.impuestos || '0');
	const [total, setTotal] = useState<string>(initialData?.total || '');
	const [currency, setCurrency] = useState<string>(initialData?.currency || 'USD');
	const [tipoCambio, setTipoCambio] = useState<string>(initialData?.tipoCambio || '1');
	const [billingSeries, setBillingSeries] = useState<string>(initialData?.billingSeries || '');
	const [numeroFactura, setNumeroFactura] = useState<string>(initialData?.numeroFactura || '');
	const [estadoFactura, setEstadoFactura] = useState<string>(initialData?.estadoFactura || 'emitida');
	const [estadoPago, setEstadoPago] = useState<string>(initialData?.estadoPago || 'pendiente');
	const [metodoPago, setMetodoPago] = useState<string>(initialData?.metodoPago || '');
	const [fechaPago, setFechaPago] = useState<string>(initialData?.fechaPago || '');
	const [notas, setNotas] = useState<string>(initialData?.notas || '');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const router = useRouter();

	const isEditing = !!facturacionId;

	// Calcular total automáticamente cuando cambian subtotal o impuestos
	useEffect(() => {
		const sub = parseFloat(subtotal) || 0;
		const imp = parseFloat(impuestos) || 0;
		const calculatedTotal = sub + imp;
		// Actualizar el total calculado
		setTotal(calculatedTotal.toFixed(2));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [subtotal, impuestos]);

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
			const payload: any = {
				consultation_id: consultationId,
				appointment_id: appointmentId || null,
				patient_id: patientId,
				doctor_id: doctorId || null,
				organization_id: organizationId || null,
				subtotal: parseFloat(subtotal),
				impuestos: parseFloat(impuestos) || 0,
				total: parseFloat(total),
				currency: currency || 'USD',
				tipo_cambio: parseFloat(tipoCambio) || 1,
				billing_series: billingSeries || null,
				numero_factura: numeroFactura || null,
				estado_factura: estadoFactura || 'emitida',
				estado_pago: estadoPago || 'pendiente',
				metodo_pago: metodoPago,
				fecha_pago: fechaPago ? new Date(fechaPago).toISOString() : null,
				notas: notas || null,
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

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Header card */}
			<div className="rounded-2xl bg-linear-to-r from-white to-slate-50 dark:from-[#06171a] dark:to-[#031018] border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
				<div className="flex items-start justify-between gap-4">
					<div>
						<h2 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
							<DollarSign size={24} />
							{isEditing ? 'Editar pago de consulta' : 'Registrar pago de consulta'}
						</h2>
						<p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
							{isEditing ? 'Edita los datos del pago o cambia el estado del pago.' : 'Registra el pago realizado por el paciente para esta consulta.'}
						</p>
					</div>

					<div className="text-right">
						<div className="text-xs text-slate-500 dark:text-slate-400">Consulta</div>
						<div className="font-mono font-medium text-slate-800 dark:text-slate-100 text-xs">{consultationId.slice(0, 8)}...</div>
					</div>
				</div>
			</div>

			{/* Información de facturación */}
			<div className="rounded-2xl bg-white dark:bg-[#04202b] border border-slate-100 dark:border-slate-800 p-5 shadow-sm space-y-4">
				<h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
					<FileText size={18} />
					Información de facturación
				</h3>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
							Subtotal <span className="text-rose-600">*</span>
						</label>
						<input
							type="number"
							step="0.01"
							min="0"
							value={subtotal}
							onChange={(e) => setSubtotal(e.target.value)}
							className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#031820] text-slate-900 dark:text-slate-100"
							placeholder="0.00"
							required
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Impuestos</label>
						<input
							type="number"
							step="0.01"
							min="0"
							value={impuestos}
							onChange={(e) => setImpuestos(e.target.value)}
							className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#031820] text-slate-900 dark:text-slate-100"
							placeholder="0.00"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
							Total <span className="text-rose-600">*</span>
						</label>
						<input
							type="number"
							step="0.01"
							min="0"
							value={total}
							readOnly
							className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#041820] text-slate-900 dark:text-slate-100 font-semibold"
							placeholder="0.00"
						/>
						<p className="text-xs text-slate-500 mt-1">Calculado automáticamente (Subtotal + Impuestos)</p>
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Moneda</label>
						<select
							value={currency}
							onChange={(e) => setCurrency(e.target.value)}
							className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#031820] text-slate-900 dark:text-slate-100">
							<option value="USD">USD - Dólar Estadounidense</option>
							<option value="MXN">MXN - Peso Mexicano</option>
							<option value="EUR">EUR - Euro</option>
							<option value="GTQ">GTQ - Quetzal Guatemalteco</option>
						</select>
					</div>

					{currency !== 'USD' && (
						<div>
							<label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Tipo de cambio</label>
							<input
								type="number"
								step="0.0001"
								min="0"
								value={tipoCambio}
								onChange={(e) => setTipoCambio(e.target.value)}
								className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#031820] text-slate-900 dark:text-slate-100"
								placeholder="1.0000"
							/>
							<p className="text-xs text-slate-500 mt-1">Tipo de cambio respecto a USD</p>
						</div>
					)}

					<div>
						<label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Serie de factura</label>
						<input
							type="text"
							value={billingSeries}
							onChange={(e) => setBillingSeries(e.target.value)}
							className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#031820] text-slate-900 dark:text-slate-100"
							placeholder="A, B, C, etc."
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Número de factura</label>
						<input
							type="text"
							value={numeroFactura}
							onChange={(e) => setNumeroFactura(e.target.value)}
							className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#031820] text-slate-900 dark:text-slate-100"
							placeholder="000001"
						/>
						<p className="text-xs text-slate-500 mt-1">Debe ser único</p>
					</div>
				</div>
			</div>

			{/* Información de pago */}
			<div className="rounded-2xl bg-white dark:bg-[#04202b] border border-slate-100 dark:border-slate-800 p-5 shadow-sm space-y-4">
				<h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
					<DollarSign size={18} />
					Información de pago
				</h3>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
							Método de pago <span className="text-rose-600">*</span>
						</label>
						<select
							value={metodoPago}
							onChange={(e) => setMetodoPago(e.target.value)}
							className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#031820] text-slate-900 dark:text-slate-100"
							required>
							<option value="">Seleccione un método</option>
							<option value="efectivo">Efectivo</option>
							<option value="tarjeta_debito">Tarjeta de Débito</option>
							<option value="tarjeta_credito">Tarjeta de Crédito</option>
							<option value="transferencia">Transferencia Bancaria</option>
							<option value="cheque">Cheque</option>
							<option value="otro">Otro</option>
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Estado de factura</label>
						<select
							value={estadoFactura}
							onChange={(e) => setEstadoFactura(e.target.value)}
							className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#031820] text-slate-900 dark:text-slate-100">
							<option value="emitida">Emitida</option>
							<option value="cancelada">Cancelada</option>
							<option value="anulada">Anulada</option>
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Estado de pago</label>
						<select
							value={estadoPago}
							onChange={(e) => setEstadoPago(e.target.value)}
							className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#031820] text-slate-900 dark:text-slate-100">
							<option value="pendiente">Pendiente</option>
							<option value="pagado">Pagado</option>
							<option value="parcial">Pago Parcial</option>
							<option value="cancelado">Cancelado</option>
						</select>
					</div>

					{(estadoPago === 'pagado' || fechaPago) && (
						<div>
							<label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-2">
								<Calendar size={14} />
								Fecha de pago
							</label>
							<input
								type="date"
								value={fechaPago}
								onChange={(e) => setFechaPago(e.target.value)}
								className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#031820] text-slate-900 dark:text-slate-100"
							/>
							{estadoPago !== 'pagado' && fechaPago && (
								<p className="text-xs text-amber-600 dark:text-amber-400 mt-1">El estado de pago no es "pagado", pero hay una fecha registrada.</p>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Notas */}
			<div className="rounded-2xl bg-white dark:bg-[#04202b] border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
				<label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Notas (opcional)</label>
				<textarea
					value={notas}
					onChange={(e) => setNotas(e.target.value)}
					rows={3}
					className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#031820] text-slate-900 dark:text-slate-100"
					placeholder="Notas adicionales sobre el pago..."
				/>
			</div>

			{/* Messages */}
			{error && <div className="rounded-md bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 p-3 text-sm">{error}</div>}
			{success && <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 p-3 text-sm">{success}</div>}

			{/* Actions */}
			<div className="flex items-center gap-3">
				<button
					type="submit"
					disabled={loading}
					className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-linear-to-r from-green-600 to-emerald-500 text-white font-semibold shadow hover:scale-[1.01] transition disabled:opacity-50">
					{loading ? <Loader2 className="animate-spin" /> : <DollarSign size={16} />}
					{loading ? (isEditing ? 'Actualizando...' : 'Registrando...') : isEditing ? 'Actualizar pago' : 'Registrar pago'}
				</button>

				<button
					type="button"
					onClick={() => router.back()}
					className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition dark:border-slate-800 dark:bg-[#031821] dark:text-slate-200">
					Cancelar
				</button>

				<div className="ml-auto text-xs text-slate-500 dark:text-slate-400">{isEditing ? 'Los cambios se guardarán en la base de datos' : 'El registro se guardará en la base de datos'}</div>
			</div>
		</form>
	);
}

