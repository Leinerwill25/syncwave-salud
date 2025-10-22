'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';

type Patient = {
	id: string;
	firstName: string;
	lastName: string;
	identifier: string;
};

const HEADER_OFFSET = 120;

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function AppointmentForm() {
	// ---------------------------
	// Sesión (usuario y organización)
	// ---------------------------
	const [userId, setUserId] = useState<string | null>(null);
	const [organizationId, setOrganizationId] = useState<string | null>(null);
	const [sessionError, setSessionError] = useState<string | null>(null);
	const [loadingSession, setLoadingSession] = useState(true);

	useEffect(() => {
		let mounted = true;

		async function fetchSession() {
			try {
				// 1) Intento preferido: llamar al servidor esperando que la cookie httpOnly exista
				try {
					const res = await axios.get('/api/auth/me', { withCredentials: true });
					if (res.status === 200 && res.data?.id) {
						if (!mounted) return;
						setUserId(res.data.id);
						setOrganizationId(res.data.organizationId ?? null);
						setSessionError(null);
						return;
					}
				} catch (err: any) {
					const status = err?.response?.status;
					if (status && status !== 401) {
						console.error('Error inesperado llamando /api/auth/me:', err);
						if (!mounted) return;
						setSessionError('Error al validar la sesión.');
						setLoadingSession(false);
						return;
					}
				}

				// 2) Recovery: intentar crear cookie server-side si tenemos tokens client-side
				try {
					const { data: sessionData, error: sessionErrorLocal } = await supabase.auth.getSession();
					if (sessionErrorLocal) {
						console.warn('No session client-side:', sessionErrorLocal);
						if (!mounted) return;
						setSessionError('No hay sesión activa en el cliente.');
						setLoadingSession(false);
						return;
					}

					const access_token = sessionData?.session?.access_token;
					const refresh_token = sessionData?.session?.refresh_token;

					if (!access_token || !refresh_token) {
						if (!mounted) return;
						setSessionError('No se encontraron tokens en la sesión del cliente.');
						setLoadingSession(false);
						return;
					}

					try {
						const attach = await axios.post('/api/auth/attach-session', { access_token, refresh_token }, { withCredentials: true });

						if (attach.status === 200) {
							const retry = await axios.get('/api/auth/me', { withCredentials: true });
							if (retry.status === 200 && retry.data?.id) {
								if (!mounted) return;
								setUserId(retry.data.id);
								setOrganizationId(retry.data.organizationId ?? null);
								setSessionError(null);
								return;
							}
						}
					} catch (attachErr) {
						console.warn('attach-session error:', attachErr);
					}

					try {
						const { data: sessionData2 } = await supabase.auth.getSession();
						const access_token2 = sessionData2?.session?.access_token;
						if (access_token2) {
							const finalTry = await axios.get('/api/auth/me', {
								withCredentials: true,
								headers: { Authorization: `Bearer ${access_token2}` },
							});
							if (finalTry.status === 200 && finalTry.data?.id) {
								if (!mounted) return;
								setUserId(finalTry.data.id);
								setOrganizationId(finalTry.data.organizationId ?? null);
								setSessionError(null);
								return;
							}
						}
					} catch (e) {
						/* ignore */
					}

					if (!mounted) return;
					setSessionError('No se pudo validar la sesión del usuario.');
				} catch (innerErr) {
					console.error('Error durante proceso de recuperación de sesión:', innerErr);
					if (!mounted) return;
					setSessionError('Error verificando sesión en el cliente.');
				}
			} finally {
				if (mounted) setLoadingSession(false);
			}
		}

		fetchSession();

		return () => {
			mounted = false;
		};
	}, []);

	// ---------------------------
	// Pacientes / búsqueda
	// ---------------------------
	const [identifier, setIdentifier] = useState('');
	const [patients, setPatients] = useState<Patient[]>([]);
	const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

	// Cita
	const [scheduledAt, setScheduledAt] = useState('');
	const [durationMinutes, setDurationMinutes] = useState<number | ''>(30);
	const [reason, setReason] = useState('');
	const [location, setLocation] = useState('');

	// Facturación
	const [subtotalStr, setSubtotalStr] = useState('0.00');
	const [impuestosStr, setImpuestosStr] = useState('0.00');
	const [totalStr, setTotalStr] = useState('0.00');

	const [taxMode, setTaxMode] = useState<'VE' | 'NONE'>('VE');
	const [autoCalcTaxes, setAutoCalcTaxes] = useState(true);
	const IVA_VE_GENERAL = 0.16;

	const [currency, setCurrency] = useState<'USD' | 'EUR'>('USD');

	const [showBilling, setShowBilling] = useState(true);
	const [submitting, setSubmitting] = useState(false);

	// ---------------------------
	// AUTOCOMPLETADO PACIENTES
	// ---------------------------
	useEffect(() => {
		if (!identifier.trim()) {
			setPatients([]);
			return;
		}

		const t = setTimeout(async () => {
			try {
				const res = await axios.get(`/api/patients/search?identifier=${encodeURIComponent(identifier)}`);
				setPatients(res.data || []);
			} catch (err) {
				console.error('Error buscando pacientes', err);
				setPatients([]);
			}
		}, 300);

		return () => clearTimeout(t);
	}, [identifier]);

	// ---------------------------
	// PARSE / FORMAT
	// ---------------------------
	const parseNumber = (s: string) => {
		if (!s) return 0;
		const raw = String(s).trim();
		if (raw === '') return 0;
		let cleaned = raw.replace(/[^\d.,-]/g, '');
		const negative = cleaned.includes('-');
		cleaned = cleaned.replace(/-+/g, '').trim();

		const hasDot = cleaned.indexOf('.') !== -1;
		const hasComma = cleaned.indexOf(',') !== -1;

		if (hasDot && hasComma) {
			if (cleaned.lastIndexOf('.') > cleaned.lastIndexOf(',')) cleaned = cleaned.replace(/,/g, '');
			else cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
		} else if (hasComma && !hasDot) cleaned = cleaned.replace(/,/g, '.');

		const parts = cleaned.split('.');
		if (parts.length > 2) {
			const last = parts.pop();
			cleaned = parts.join('') + '.' + (last ?? '');
		}

		if (negative) cleaned = '-' + cleaned;
		const n = parseFloat(cleaned);
		return Number.isFinite(n) ? n : 0;
	};

	const formatMoney = (n: number) => {
		if (!Number.isFinite(n)) return '0.00';
		return (Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2);
	};

	// ---------------------------
	// RE-CALCULAR IMPUESTOS/TOTAL
	// ---------------------------
	useEffect(() => {
		const subtotal = parseNumber(subtotalStr || '0');
		let impuestos = autoCalcTaxes ? (taxMode === 'VE' ? subtotal * IVA_VE_GENERAL : 0) : parseNumber(impuestosStr || '0');
		impuestos = Math.round((impuestos + Number.EPSILON) * 100) / 100;
		const total = Math.round((subtotal + impuestos + Number.EPSILON) * 100) / 100;
		setImpuestosStr(formatMoney(impuestos));
		setTotalStr(formatMoney(total));
	}, [subtotalStr, impuestosStr, taxMode, autoCalcTaxes]);

	// ---------------------------
	// HANDLE SUBMIT
	// ---------------------------
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (sessionError) return alert('No hay sesión activa. Por favor, inicia sesión nuevamente.');
		if (!userId || !organizationId) return alert('Datos de usuario no disponibles.');
		if (!selectedPatient) return alert('Seleccione un paciente antes de continuar.');
		if (!scheduledAt) return alert('Ingrese fecha y hora de la cita.');

		// ✅ Validación: garantizar valores numéricos válidos
		const subtotal = parseNumber(subtotalStr || '0');
		const impuestos = parseNumber(impuestosStr || '0');
		const total = parseNumber(totalStr || '0');

		if (subtotal < 0 || impuestos < 0 || total < 0) return alert('Los valores de facturación no pueden ser negativos.');

		const computedTotal = Math.round((subtotal + impuestos + Number.EPSILON) * 100) / 100;
		if (total > 0 && Math.abs(computedTotal - total) > 0.01) {
			const ok = confirm(`El total (${total.toFixed(2)}) no coincide con subtotal + impuestos (${computedTotal.toFixed(2)}). ¿Desea continuar?`);
			if (!ok) return;
		}

		setSubmitting(true);
		try {
			const res = await axios.post(
				'/api/appointments',
				{
					patientId: selectedPatient.id,
					doctorId: userId,
					organizationId,
					scheduledAt,
					durationMinutes: typeof durationMinutes === 'number' ? durationMinutes : Number(durationMinutes),
					reason,
					location,
					billing: {
						subtotal: subtotal || 0,
						impuestos: impuestos || 0,
						total: total || subtotal + impuestos,
						currency,
						taxMode,
					},
				},
				{ withCredentials: true }
			);

			if (res.data?.success) {
				alert('Cita registrada correctamente.');
				setReason('');
				setLocation('');
				setSubtotalStr('0.00');
				setImpuestosStr('0.00');
				setTotalStr('0.00');
				setSelectedPatient(null);
				setIdentifier('');
			} else {
				alert('Ocurrió un error al registrar la cita.');
			}
		} catch (err) {
			console.error(err);
			alert('Error al registrar la cita. Revisa la consola.');
		} finally {
			setSubmitting(false);
		}
	};

	// ---------------------------
	// ESTILOS
	// ---------------------------
	const inputCompact = 'w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 transition';
	const inputNeutral = `${inputCompact} border-gray-200 focus:ring-violet-300`;
	const labelClass = 'block text-xs font-medium text-gray-700 mb-1';
	const sectionTitle = 'text-sm font-semibold text-gray-800';
	const patientItemClass = 'px-3 py-2 hover:bg-violet-50 cursor-pointer rounded-md';

	// ---------------------------
	// RENDER SEGÚN ESTADO DE SESIÓN
	// ---------------------------
	if (loadingSession) {
		return (
			<div className="p-6 bg-white rounded-xl shadow-md text-center text-gray-600">
				<p>Cargando sesión...</p>
			</div>
		);
	}

	if (sessionError) {
		return (
			<div className="p-6 bg-white rounded-xl shadow-md text-center text-gray-600">
				<p>{sessionError}</p>
				<p className="text-sm text-gray-400 mt-2">Por favor, inicia sesión nuevamente para continuar.</p>
			</div>
		);
	}

	// ---------------------------
	// FORMULARIO PRINCIPAL
	// ---------------------------
	return (
		<form onSubmit={handleSubmit} style={{ maxHeight: `calc(100vh - ${HEADER_OFFSET}px)` }} className="mx-auto bg-white rounded-xl shadow-md p-4 overflow-auto min-w-0">
			<div className="flex items-start justify-between mb-3">
				<div>
					<h2 className="text-lg font-semibold text-gray-900">Registrar Cita</h2>
					<p className="text-xs text-gray-500 mt-1">Complete los datos de la cita y facturación (solo divisas).</p>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				{/* LEFT */}
				<section className="lg:col-span-2 space-y-3">
					<div className="relative">
						<label className={labelClass}>Buscar paciente</label>
						<input
							type="text"
							placeholder="Cédula o nombre"
							value={identifier}
							onChange={(e) => {
								setIdentifier(e.target.value);
								setSelectedPatient(null);
							}}
							className={inputNeutral}
							aria-label="Buscar paciente"
						/>
						{patients.length > 0 && (
							<ul className="absolute z-50 left-0 right-0 mt-1 bg-white border rounded-md max-h-48 overflow-auto shadow-lg">
								{patients.map((p) => (
									<li
										key={p.id}
										onClick={() => {
											setSelectedPatient(p);
											setIdentifier(`${p.firstName} ${p.lastName} (${p.identifier})`);
											setPatients([]);
										}}
										className={patientItemClass}>
										<div className="font-medium text-gray-800">
											{p.firstName} {p.lastName}
										</div>
										<div className="text-xs text-gray-500">{p.identifier}</div>
									</li>
								))}
							</ul>
						)}
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className={labelClass}>Fecha y hora</label>
							<input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={inputNeutral} />
						</div>
						<div>
							<label className={labelClass}>Duración (min)</label>
							<input type="number" min={1} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value === '' ? '' : Number(e.target.value))} className={inputNeutral} />
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className={labelClass}>Ubicación</label>
							<input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={inputNeutral} />
						</div>
						<div>
							<label className={labelClass}>Motivo / Razón</label>
							<input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className={inputNeutral} />
						</div>
					</div>
				</section>

				{/* RIGHT - FACTURACIÓN */}
				<aside className="space-y-3">
					<div className="p-3 border border-gray-100 rounded-md bg-gray-50 top-4">
						<div className="flex items-center justify-between mb-2">
							<h3 className={sectionTitle}>Facturación</h3>
							<button type="button" aria-expanded={showBilling} onClick={() => setShowBilling((s) => !s)} className="text-xs text-gray-600 hover:text-violet-600">
								{showBilling ? 'Ocultar' : 'Mostrar'}
							</button>
						</div>

						<AnimatePresence initial={false}>
							{showBilling && (
								<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
									<label className="flex items-center gap-2 text-xs mb-2">
										<input type="checkbox" checked={autoCalcTaxes} onChange={(e) => setAutoCalcTaxes(e.target.checked)} className="w-3 h-3" />
										<span className="text-xs text-gray-700">Calcular impuestos (VE {Math.round(IVA_VE_GENERAL * 100)}%)</span>
									</label>

									<div className="grid grid-cols-1 gap-2">
										<div>
											<label className={labelClass}>Subtotal (divisa)</label>
											<input inputMode="decimal" placeholder="0.00" value={subtotalStr} onChange={(e) => setSubtotalStr(e.target.value)} className={inputNeutral} />
										</div>

										<div>
											<label className={labelClass}>Impuestos</label>
											<input inputMode="decimal" placeholder="0.00" value={impuestosStr} onChange={(e) => setImpuestosStr(e.target.value)} className={`${inputNeutral} ${autoCalcTaxes ? 'bg-gray-100 cursor-not-allowed' : ''}`} readOnly={autoCalcTaxes} />
										</div>

										<div>
											<label className={labelClass}>Total (divisa)</label>
											<input inputMode="decimal" placeholder="0.00" value={totalStr} onChange={(e) => setTotalStr(e.target.value)} className={`${inputNeutral} ${autoCalcTaxes ? 'bg-gray-100 cursor-not-allowed' : ''}`} readOnly={autoCalcTaxes} />
										</div>

										<div className="flex gap-2">
											<select value={currency} onChange={(e) => setCurrency(e.target.value as 'USD' | 'EUR')} className={inputNeutral}>
												<option value="USD">USD</option>
												<option value="EUR">EUR</option>
											</select>

											<select value={taxMode} onChange={(e) => setTaxMode(e.target.value === 'VE' ? 'VE' : 'NONE')} className={inputNeutral}>
												<option value="VE">Venezuela</option>
												<option value="NONE">Sin impuestos</option>
											</select>
										</div>
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>

					<div className="p-3 border border-gray-100 rounded-md text-sm">
						<div className="flex justify-between text-xs text-gray-600">
							<span>Subtotal ({currency})</span>
							<strong>{subtotalStr ? formatMoney(parseNumber(subtotalStr)) : '0.00'}</strong>
						</div>
						<div className="flex justify-between text-xs text-gray-600 mt-1">
							<span>Impuestos ({currency})</span>
							<strong>{impuestosStr ? formatMoney(parseNumber(impuestosStr)) : '0.00'}</strong>
						</div>
						<div className="border-t pt-2 mt-2 flex justify-between items-center">
							<span className="font-medium">Total ({currency})</span>
							<strong className="text-sm">{totalStr ? formatMoney(parseNumber(totalStr)) : '0.00'}</strong>
						</div>
					</div>

					<div>
						<button type="submit" disabled={submitting || loadingSession || !!sessionError} className="w-full py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-md text-sm font-semibold shadow-sm disabled:opacity-60">
							{submitting ? 'Registrando...' : 'Registrar cita'}
						</button>
					</div>
				</aside>
			</div>
		</form>
	);
}
