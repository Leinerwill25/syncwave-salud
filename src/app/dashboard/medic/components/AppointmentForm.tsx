'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import { UserCheck, UserPlus, CheckCircle, Loader2 } from 'lucide-react';
import CurrencyDisplay from '@/components/CurrencyDisplay';

type Patient = {
	id: string;
	firstName: string;
	lastName: string;
	identifier?: string;
	is_unregistered?: boolean;
	type?: string;
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

	// ---------------------------
	// Tipo de paciente y selección
	// ---------------------------
	const [patientType, setPatientType] = useState<'registered' | 'unregistered'>('registered');
	const [identifier, setIdentifier] = useState('');
	const [patients, setPatients] = useState<Patient[]>([]);
	const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
	const [selectedUnregisteredPatientId, setSelectedUnregisteredPatientId] = useState<string | null>(null);

	// Datos del paciente no registrado (si se crea uno nuevo)
	const [unregisteredFirstName, setUnregisteredFirstName] = useState('');
	const [unregisteredLastName, setUnregisteredLastName] = useState('');
	const [unregisteredIdentification, setUnregisteredIdentification] = useState('');
	const [unregisteredPhone, setUnregisteredPhone] = useState('');
	const [unregisteredEmail, setUnregisteredEmail] = useState('');
	const [unregisteredBirthDate, setUnregisteredBirthDate] = useState('');
	const [unregisteredSex, setUnregisteredSex] = useState<'M' | 'F' | 'OTHER' | ''>('');
	const [unregisteredAddress, setUnregisteredAddress] = useState('');

	// Cita
	const [scheduledAt, setScheduledAt] = useState('');
	const [durationMinutes, setDurationMinutes] = useState<number | ''>(30);
	const [reason, setReason] = useState('');
	const [location, setLocation] = useState('');

	// Servicios del consultorio (desde medic_profile.services)
	type ClinicService = {
		id: string;
		name: string;
		description?: string | null;
		price: number;
		currency: string;
		is_active?: boolean;
	};

	const [services, setServices] = useState<ClinicService[]>([]);
	const [selectedServices, setSelectedServices] = useState<string[]>([]); // IDs de servicios seleccionados
	const [loadingServices, setLoadingServices] = useState(false);

	// Facturación calculada desde servicios
	const [taxMode] = useState<'VE' | 'NONE'>('VE');
	const IVA_VE_GENERAL = 0.16;

	const [submitting, setSubmitting] = useState(false);
	const searchDebounceRef = useRef<number | null>(null);

	// Cargar servicios del consultorio
	useEffect(() => {
		if (!organizationId) return;

		async function loadServices() {
			try {
				setLoadingServices(true);
				const res = await axios.get('/api/medic/services', { withCredentials: true });
				if (res.data?.success && Array.isArray(res.data.services)) {
					setServices(res.data.services);
				}
			} catch (err) {
				console.error('Error cargando servicios:', err);
			} finally {
				setLoadingServices(false);
			}
		}

		loadServices();
	}, [organizationId]);

	useEffect(() => {
		let mounted = true;

		async function fetchSession() {
			try {
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

	// Resetear selección cuando cambia el tipo de paciente
	useEffect(() => {
		setIdentifier('');
		setPatients([]);
		setSelectedPatient(null);
		setSelectedUnregisteredPatientId(null);
		if (patientType === 'unregistered') {
			setUnregisteredFirstName('');
			setUnregisteredLastName('');
			setUnregisteredIdentification('');
			setUnregisteredPhone('');
			setUnregisteredEmail('');
			setUnregisteredBirthDate('');
			setUnregisteredSex('');
			setUnregisteredAddress('');
		}
	}, [patientType]);

	// ---------------------------
	// AUTOCOMPLETADO PACIENTES
	// ---------------------------
	useEffect(() => {
		if (!identifier.trim()) {
			setPatients([]);
			return;
		}

		if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);

		searchDebounceRef.current = window.setTimeout(async () => {
			try {
				const res = await axios.get(`/api/patients/search?identifier=${encodeURIComponent(identifier)}`);
				const allPatients = res.data || [];
				// Filtrar según el tipo de paciente seleccionado
				const filtered = allPatients.filter((p: Patient) => {
					const isUnregistered = p.is_unregistered === true || p.type === 'unregistered';
					return patientType === 'unregistered' ? isUnregistered : !isUnregistered;
				});
				setPatients(filtered);
			} catch (err) {
				console.error('Error buscando pacientes', err);
				setPatients([]);
			}
		}, 300);

		return () => {
			if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
		};
	}, [identifier, patientType]);

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
	// HANDLE SUBMIT
	// ---------------------------
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (sessionError) return alert('No hay sesión activa. Por favor, inicia sesión nuevamente.');
		if (!userId || !organizationId) return alert('Datos de usuario no disponibles.');
		if (!scheduledAt) return alert('Ingrese fecha y hora de la cita.');

		if (patientType === 'registered') {
			if (!selectedPatient) return alert('Seleccione un paciente antes de continuar.');
		} else {
			if (!selectedUnregisteredPatientId && (!unregisteredFirstName || !unregisteredLastName || !unregisteredPhone)) {
				return alert('Debe completar al menos nombre, apellido y teléfono del paciente, o seleccionar un paciente existente.');
			}
		}

		// Validar cédula no duplicada si es paciente nuevo no registrado
		if (patientType === 'unregistered' && !selectedUnregisteredPatientId && unregisteredIdentification) {
			try {
				const checkRes = await fetch(`/api/patients/search?identifier=${encodeURIComponent(unregisteredIdentification.trim())}`);
				const existingPatients = await checkRes.json();
				if (Array.isArray(existingPatients) && existingPatients.length > 0) {
					const exists = existingPatients.some(
						(p: any) =>
							(p.identifier && p.identifier.trim().toLowerCase() === unregisteredIdentification.trim().toLowerCase()) ||
							(p.identification && p.identification.trim().toLowerCase() === unregisteredIdentification.trim().toLowerCase())
					);
					if (exists) {
						return alert(`La cédula "${unregisteredIdentification}" ya está registrada. Por favor, busca al paciente en la lista.`);
					}
				}
			} catch (checkErr) {
				console.warn('Error verificando cédula antes de crear:', checkErr);
			}
		}

		// Validar que se haya seleccionado al menos un servicio
		if (selectedServices.length === 0) {
			return alert('Debe seleccionar al menos un servicio para la cita.');
		}

		// Calcular facturación desde servicios seleccionados
		const selectedServicesData = services.filter((s) => selectedServices.includes(s.id));
		const subtotal = selectedServicesData.reduce((sum, s) => sum + Number(s.price), 0);
		const impuestos = taxMode === 'VE' ? subtotal * IVA_VE_GENERAL : 0;
		const total = subtotal + impuestos;
		const currency = selectedServicesData[0]?.currency || 'USD'; // Usar la moneda del primer servicio

		setSubmitting(true);
		try {
			let finalUnregisteredPatientId = selectedUnregisteredPatientId;

			// Si es paciente no registrado y no hay ID, crear el paciente primero
			if (patientType === 'unregistered' && !selectedUnregisteredPatientId) {
				const patientPayload: any = {
					first_name: unregisteredFirstName,
					last_name: unregisteredLastName,
					phone: unregisteredPhone,
					identification: unregisteredIdentification || null,
					birth_date: unregisteredBirthDate || null,
					sex: unregisteredSex || null,
					email: unregisteredEmail || null,
					address: unregisteredAddress || null,
				};

				const patientRes = await fetch('/api/unregistered-patients', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify(patientPayload),
				});

				const patientData = await patientRes.json().catch(() => ({}));
				if (!patientRes.ok) {
					setSubmitting(false);
					if (patientRes.status === 409) {
						return alert(patientData.error || 'Esta cédula de identidad ya está registrada en el sistema.');
					}
					return alert(patientData.error || 'Error al crear el paciente no registrado.');
				}

				finalUnregisteredPatientId = patientData.id || patientData.data?.id;
				if (!finalUnregisteredPatientId) {
					setSubmitting(false);
					return alert('Error: no se obtuvo el ID del paciente creado.');
				}
			}

			// Crear la cita
			const appointmentPayload: any = {
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
			};

			if (patientType === 'registered') {
				appointmentPayload.patientId = selectedPatient!.id;
			} else {
				appointmentPayload.unregisteredPatientId = finalUnregisteredPatientId;
			}

			const res = await axios.post('/api/appointments', appointmentPayload, { withCredentials: true });

			if (res.data?.success) {
				alert('Cita registrada correctamente. La facturación se ha creado como pendiente de pago.');
				setReason('');
				setLocation('');
				setSelectedPatient(null);
				setSelectedUnregisteredPatientId(null);
				setIdentifier('');
				setSelectedServices([]);
				// Resetear formulario de paciente no registrado
				setUnregisteredFirstName('');
				setUnregisteredLastName('');
				setUnregisteredIdentification('');
				setUnregisteredPhone('');
				setUnregisteredEmail('');
				setUnregisteredBirthDate('');
				setUnregisteredSex('');
				setUnregisteredAddress('');
				// Recargar la página o cerrar el modal
				window.location.reload();
			} else {
				alert('Ocurrió un error al registrar la cita.');
			}
		} catch (err: any) {
			console.error(err);
			const errorMsg = err?.response?.data?.error || err?.message || 'Error al registrar la cita. Revisa la consola.';
			alert(errorMsg);
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
		<form onSubmit={handleSubmit} style={{ maxHeight: `calc(100vh - ${HEADER_OFFSET}px)` }} className="mx-auto bg-white rounded-xl shadow-md p-4 overflow-auto min-w-0 w-full max-w-full">
			<div className="flex items-start justify-between mb-3">
				<div>
					<h2 className="text-lg font-semibold text-gray-900">Registrar Cita</h2>
					<p className="text-xs text-gray-500 mt-1">Complete los datos de la cita y facturación (solo divisas).</p>
				</div>
			</div>

			<div className="space-y-4">
				{/* FORMULARIO DE LA CITA */}
				<section className="space-y-3">
					{/* Selector de tipo de paciente */}
					<div className="p-3 border border-gray-200 rounded-md bg-gray-50">
						<label className={labelClass}>Tipo de Paciente</label>
						<div className="grid grid-cols-2 gap-2 mt-2">
							<button
								type="button"
								onClick={() => setPatientType('registered')}
								className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md border-2 transition-all ${
									patientType === 'registered'
										? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm'
										: 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
								}`}>
								<UserCheck size={16} />
								<span className="text-xs font-semibold">Registrado</span>
							</button>
							<button
								type="button"
								onClick={() => setPatientType('unregistered')}
								className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md border-2 transition-all ${
									patientType === 'unregistered'
										? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm'
										: 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
								}`}>
								<UserPlus size={16} />
								<span className="text-xs font-semibold">No Registrado</span>
							</button>
						</div>
					</div>

					{/* Buscar paciente */}
					<div className="relative">
						<label className={labelClass}>Buscar {patientType === 'registered' ? 'paciente registrado' : 'paciente no registrado'}</label>
						<input
							type="text"
							placeholder="Cédula o nombre"
							value={identifier}
							onChange={(e) => {
								setIdentifier(e.target.value);
								setSelectedPatient(null);
								setSelectedUnregisteredPatientId(null);
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
											if (patientType === 'registered') {
												setSelectedPatient(p);
												setIdentifier(`${p.firstName} ${p.lastName} ${p.identifier ? `(${p.identifier})` : ''}`);
											} else {
												setSelectedUnregisteredPatientId(p.id);
												setUnregisteredFirstName(p.firstName);
												setUnregisteredLastName(p.lastName);
												setUnregisteredIdentification(p.identifier || '');
												setIdentifier(`${p.firstName} ${p.lastName} ${p.identifier ? `(${p.identifier})` : ''}`);
											}
											setPatients([]);
										}}
										className={patientItemClass}>
										<div className="font-medium text-gray-800">
											{p.firstName} {p.lastName}
										</div>
										{p.identifier && <div className="text-xs text-gray-500">{p.identifier}</div>}
										{patientType === 'unregistered' && (
											<div className="text-xs text-orange-600 mt-0.5">No registrado</div>
										)}
									</li>
								))}
							</ul>
						)}
					</div>

					{/* Formulario de paciente no registrado (si no se seleccionó uno existente) */}
					{patientType === 'unregistered' && !selectedUnregisteredPatientId && (
						<div className="p-3 border border-orange-200 rounded-md bg-orange-50/50">
							<h3 className="text-xs font-semibold text-gray-800 mb-3 flex items-center gap-2">
								<UserPlus size={14} />
								Datos del Paciente No Registrado
							</h3>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								<div className="min-w-0">
									<label className={labelClass}>Nombre *</label>
									<input
										type="text"
										value={unregisteredFirstName}
										onChange={(e) => setUnregisteredFirstName(e.target.value)}
										placeholder="Nombre"
										className={`${inputNeutral} min-w-0`}
									/>
								</div>
								<div className="min-w-0">
									<label className={labelClass}>Apellido *</label>
									<input
										type="text"
										value={unregisteredLastName}
										onChange={(e) => setUnregisteredLastName(e.target.value)}
										placeholder="Apellido"
										className={`${inputNeutral} min-w-0`}
									/>
								</div>
								<div className="min-w-0">
									<label className={labelClass}>Cédula</label>
									<input
										type="text"
										value={unregisteredIdentification}
										onChange={(e) => setUnregisteredIdentification(e.target.value)}
										placeholder="V-12345678"
										className={`${inputNeutral} min-w-0`}
									/>
								</div>
								<div className="min-w-0">
									<label className={labelClass}>Teléfono *</label>
									<input
										type="tel"
										value={unregisteredPhone}
										onChange={(e) => setUnregisteredPhone(e.target.value)}
										placeholder="0412-1234567"
										className={`${inputNeutral} min-w-0`}
									/>
								</div>
								<div className="min-w-0">
									<label className={labelClass}>Email</label>
									<input
										type="email"
										value={unregisteredEmail}
										onChange={(e) => setUnregisteredEmail(e.target.value)}
										placeholder="email@ejemplo.com"
										className={`${inputNeutral} min-w-0`}
									/>
								</div>
								<div className="min-w-0">
									<label className={labelClass}>Fecha de Nacimiento</label>
									<input
										type="date"
										value={unregisteredBirthDate}
										onChange={(e) => setUnregisteredBirthDate(e.target.value)}
										className={`${inputNeutral} min-w-0`}
									/>
								</div>
								<div className="min-w-0">
									<label className={labelClass}>Sexo</label>
									<select
										value={unregisteredSex}
										onChange={(e) => setUnregisteredSex(e.target.value as 'M' | 'F' | 'OTHER' | '')}
										className={`${inputNeutral} min-w-0`}
									>
										<option value="">Seleccionar...</option>
										<option value="M">Masculino</option>
										<option value="F">Femenino</option>
										<option value="OTHER">Otro</option>
									</select>
								</div>
								<div className="min-w-0">
									<label className={labelClass}>Dirección</label>
									<input
										type="text"
										value={unregisteredAddress}
										onChange={(e) => setUnregisteredAddress(e.target.value)}
										placeholder="Dirección"
										className={`${inputNeutral} min-w-0`}
									/>
								</div>
							</div>
						</div>
					)}

					{/* Paciente seleccionado */}
					{((patientType === 'registered' && selectedPatient) || (patientType === 'unregistered' && selectedUnregisteredPatientId)) && (
						<div className="p-3 border border-green-200 rounded-md bg-green-50">
							<div className="flex items-center justify-between">
								<div>
									<label className={labelClass}>Paciente Seleccionado</label>
									<div className="text-sm font-medium text-gray-900">
										{patientType === 'registered' && selectedPatient
											? `${selectedPatient.firstName} ${selectedPatient.lastName}`
											: `${unregisteredFirstName} ${unregisteredLastName}`}
									</div>
									{(patientType === 'registered' && selectedPatient?.identifier) || unregisteredIdentification ? (
										<div className="text-xs text-gray-600 mt-0.5">
											Cédula: {patientType === 'registered' && selectedPatient ? selectedPatient.identifier : unregisteredIdentification}
										</div>
									) : null}
									<div className={`text-xs mt-1 ${patientType === 'registered' ? 'text-green-600' : 'text-orange-600'}`}>
										{patientType === 'registered' ? 'Paciente Registrado' : 'Paciente No Registrado'}
									</div>
								</div>
								<button
									type="button"
									onClick={() => {
										if (patientType === 'registered') {
											setSelectedPatient(null);
										} else {
											setSelectedUnregisteredPatientId(null);
											setUnregisteredFirstName('');
											setUnregisteredLastName('');
											setUnregisteredIdentification('');
										}
										setIdentifier('');
									}}
									className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1 border border-gray-300 rounded">
									Cambiar
								</button>
							</div>
						</div>
					)}

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="min-w-0">
							<label className={labelClass}>Fecha y hora</label>
							<input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={`${inputNeutral} min-w-0`} />
						</div>
						<div className="min-w-0">
							<label className={labelClass}>Duración (min)</label>
							<input type="number" min={1} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value === '' ? '' : Number(e.target.value))} className={`${inputNeutral} min-w-0`} />
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="min-w-0">
							<label className={labelClass}>Ubicación</label>
							<input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={`${inputNeutral} min-w-0`} />
						</div>
						<div className="min-w-0">
							<label className={labelClass}>Motivo / Razón</label>
							<input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputNeutral} min-w-0`} />
						</div>
					</div>
				</section>

				{/* SERVICIOS DEL CONSULTORIO - Ahora en la parte inferior */}
				<section className="space-y-3 border-t border-gray-200 pt-4">
					<div className="p-4 border border-gray-100 rounded-md bg-gray-50">
						<h3 className={sectionTitle}>Servicios del Consultorio</h3>
						<p className="text-xs text-gray-600 mt-1 mb-4">Selecciona los servicios para esta cita</p>

						{loadingServices ? (
							<div className="flex items-center justify-center py-8">
								<Loader2 className="w-5 h-5 animate-spin text-gray-400" />
								<span className="text-xs text-gray-500 ml-2">Cargando servicios...</span>
							</div>
						) : services.length === 0 ? (
							<div className="text-center py-6 text-xs text-gray-500">
								<p>No hay servicios disponibles.</p>
								<p className="mt-1">Configura los servicios en Configuración → Perfil Profesional</p>
							</div>
						) : (
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full min-w-0">
								{services
									.filter((service) => service.is_active !== false) // Filtrar solo servicios activos
									.map((service) => {
										const isSelected = selectedServices.includes(service.id);
										return (
											<button
												key={service.id}
												type="button"
												onClick={() => {
													setSelectedServices((prev) =>
														isSelected ? prev.filter((id) => id !== service.id) : [...prev, service.id]
													);
												}}
												className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
													isSelected
														? 'border-teal-500 bg-teal-50 shadow-sm'
														: 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
												}`}>
												<div className="flex items-start justify-between gap-2">
													<div className="flex-1 min-w-0">
														<div className="flex items-center gap-2 mb-2">
															{isSelected && <CheckCircle className="w-5 h-5 text-teal-600 shrink-0" />}
															<h4 className={`text-sm font-semibold ${isSelected ? 'text-teal-900' : 'text-gray-900'}`}>
																{service.name}
															</h4>
														</div>
														{service.description && (
															<p className="text-xs text-gray-600 mb-3 line-clamp-2">{service.description}</p>
														)}
														<div className="mt-2">
															<CurrencyDisplay
																amount={Number(service.price)}
																currency={service.currency as 'USD' | 'EUR'}
																showBoth={true}
																size="sm"
															/>
														</div>
													</div>
												</div>
											</button>
										);
									})}
							</div>
						)}
					</div>

					{/* Resumen de facturación */}
					{selectedServices.length > 0 && (
						<div className="p-4 border border-gray-100 rounded-md bg-white">
							<h4 className="text-sm font-semibold text-gray-900 mb-3">Resumen de Facturación</h4>
							<div className="space-y-2">
								<div className="flex justify-between text-xs text-gray-600">
									<span>Servicios seleccionados:</span>
									<strong>{selectedServices.length}</strong>
								</div>
								{(() => {
									const selectedServicesData = services.filter((s) => selectedServices.includes(s.id));
									const subtotal = selectedServicesData.reduce((sum, s) => sum + Number(s.price), 0);
									const impuestos = taxMode === 'VE' ? subtotal * IVA_VE_GENERAL : 0;
									const total = subtotal + impuestos;
									const currency = selectedServicesData[0]?.currency || 'USD';

									return (
										<>
											<div className="flex justify-between text-sm text-gray-700 pt-2 border-t border-gray-200">
												<span>Subtotal ({currency})</span>
												<strong>{subtotal.toFixed(2)}</strong>
											</div>
											{taxMode === 'VE' && (
												<div className="flex justify-between text-sm text-gray-700">
													<span>Impuestos ({currency})</span>
													<strong>{impuestos.toFixed(2)}</strong>
												</div>
											)}
											<div className="flex justify-between items-center pt-2 border-t border-gray-200">
												<span className="font-semibold text-base">Total ({currency})</span>
												<strong className="text-lg text-teal-700 font-bold">{total.toFixed(2)}</strong>
											</div>
											<div className="mt-3 pt-3 border-t border-gray-200">
												<CurrencyDisplay
													amount={total}
													currency={currency as 'USD' | 'EUR'}
													showBoth={true}
													size="md"
												/>
											</div>
											<p className="text-xs text-gray-500 mt-3 italic bg-blue-50 p-2 rounded border border-blue-100">
												💡 Esta factura se creará automáticamente como pendiente de pago para el paciente
											</p>
										</>
									);
								})()}
							</div>
						</div>
					)}
				</section>

				{/* Botón de envío */}
				<div className="pt-4 border-t border-gray-200">
					<button type="submit" disabled={submitting || loadingSession || !!sessionError || selectedServices.length === 0} className="w-full py-3 bg-linear-to-r from-violet-600 to-indigo-600 text-white rounded-md text-sm font-semibold shadow-sm disabled:opacity-60 disabled:cursor-not-allowed hover:from-violet-700 hover:to-indigo-700 transition-all">
						{submitting ? 'Registrando...' : 'Registrar cita'}
					</button>
					{selectedServices.length === 0 && (
						<p className="text-xs text-amber-600 mt-2 text-center">Debe seleccionar al menos un servicio para continuar</p>
					)}
				</div>
			</div>
		</form>
	);
}
