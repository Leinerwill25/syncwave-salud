'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import { UserCheck, UserPlus, CheckCircle, Loader2, X, AlertCircle, CheckCircle2, Clock, Info } from 'lucide-react';
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
	const [location, setLocation] = useState('');
	const [reason, setReason] = useState('');
	const [referralSource, setReferralSource] = useState<string>('');

	// Servicios del consultorio (desde medic_profile.services)
	type ClinicService = {
		id: string;
		name: string;
		description?: string | null;
		price: number;
		currency: string;
		is_active?: boolean;
	};

	type ServiceCombo = {
		id: string;
		name: string;
		description?: string | null;
		price: number;
		currency: string;
		serviceIds: string[];
		is_active?: boolean;
	};

	const [services, setServices] = useState<ClinicService[]>([]);
	const [selectedServices, setSelectedServices] = useState<string[]>([]); // IDs de servicios seleccionados
	const [loadingServices, setLoadingServices] = useState(false);

	// Combos de servicios
	const [combos, setCombos] = useState<ServiceCombo[]>([]);
	const [selectedCombos, setSelectedCombos] = useState<string[]>([]); // IDs de combos seleccionados
	const [loadingCombos, setLoadingCombos] = useState(false);
	const [serviceViewMode, setServiceViewMode] = useState<'services' | 'combos'>('services'); // Modo de vista: servicios o combos

	// Facturación calculada desde servicios - En el área de salud no se aplican impuestos (IVA)
	const [scheduleConfig, setScheduleConfig] = useState<any>(null);
	const [loadingConfig, setLoadingConfig] = useState(false);
	const [selectedShift, setSelectedShift] = useState<'morning' | 'afternoon'>('morning');
	const [schedulingType, setSchedulingType] = useState<'specific_time' | 'shift'>('specific_time');

	const [submitting, setSubmitting] = useState(false);
	const searchDebounceRef = useRef<number | null>(null);

	// Estado para el modal de mensajes
	const [modalMessage, setModalMessage] = useState<{
		open: boolean;
		type: 'success' | 'error' | 'warning';
		title: string;
		message: string;
		onClose?: () => void;
	}>({
		open: false,
		type: 'success',
		title: '',
		message: '',
	});

	// Función helper para mostrar mensajes
	const showMessage = (type: 'success' | 'error' | 'warning', title: string, message: string, onClose?: () => void) => {
		setModalMessage({
			open: true,
			type,
			title,
			message,
			onClose,
		});
	};

	// Función para cerrar el modal
	const closeModal = () => {
		setModalMessage((prev) => ({ ...prev, open: false }));
		if (modalMessage.onClose) {
			modalMessage.onClose();
		}
	};

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

	// Cargar configuración de horarios del médico
	useEffect(() => {
		if (!userId) return;

		async function fetchScheduleConfig() {
			try {
				setLoadingConfig(true);
				// Usamos el userId del médico (que en este caso es el usuario logueado o el médico asignado)
				// NOTA: Como este componente se usa tanto para médicos como para asistentes, 
				// necesitamos saber de QUÉ médico estamos hablando.
				// Por ahora asumimos que si es AppointmentForm "stand-alone", es el médico logueado.
				// Si el asistente usa este formulario, debería pasar el ID del médico o la organización.
				// El endpoint /api/dashboard/medic/schedule-config usa la sesión del usuario logueado.
				// Si es un asistente, el endpoint podría no devolver la config del médico correcto
				// si no se le pasa un parámetro extra o si no se ajusta el endpoint.
				// PROVISIONAL: Intentar llamar al endpoint tal cual.
				// Si falla o devuelve vacío, asumiremos comportamiento normal (HORA EXACTA).
				
				const res = await axios.get('/api/dashboard/medic/schedule-config');
				if (res.data?.config) {
					setScheduleConfig(res.data.config);
				}
			} catch (error) {
				console.error('Error fetching schedule config:', error);
			} finally {
				setLoadingConfig(false);
			}
		}


		fetchScheduleConfig();
	}, [userId]);

    // Establecer tipo de agendamiento por defecto según configuración
    useEffect(() => {
        if (scheduleConfig?.consultation_type === 'ORDEN_LLEGADA') {
            setSchedulingType('shift');
        } else {
            setSchedulingType('specific_time');
        }
    }, [scheduleConfig]);

	// Cargar combos de servicios
	useEffect(() => {
		if (!organizationId) return;

		async function loadCombos() {
			try {
				setLoadingCombos(true);
				const res = await axios.get('/api/role-users/service-combos', { withCredentials: true });
				if (res.data?.success && Array.isArray(res.data.combos)) {
					setCombos(res.data.combos);
				}
			} catch (err) {
				console.error('Error cargando combos:', err);
			} finally {
				setLoadingCombos(false);
			}
		}

		loadCombos();
	}, [organizationId]);

	// Cargar ubicación del consultorio
	useEffect(() => {
		if (!organizationId) return;

		async function loadClinicLocation() {
			try {
				// Intentar obtener la ubicación del consultorio
				// Primero intentar con /api/role-users/clinic-location (para role-users)
				let locationRes;
				try {
					locationRes = await axios.get('/api/role-users/clinic-location', { withCredentials: true });
					if (locationRes.data?.location) {
						setLocation(locationRes.data.location);
						return;
					}
				} catch (err) {
					// Si falla, intentar con /api/clinic-profile (para médicos/usuarios normales)
					try {
						const profileRes = await axios.get('/api/clinic-profile', { withCredentials: true });
						if (profileRes.data?.ok && profileRes.data?.profile) {
							const profile = profileRes.data.profile;
							// Construir la ubicación completa
							// Priorizar addressOperational, si no existe usar addressFiscal
							const address = profile.addressOperational || profile.addressFiscal || '';

							const parts: string[] = [];
							if (address) parts.push(address);
							if (profile.cityMunicipality) parts.push(profile.cityMunicipality);
							if (profile.stateProvince) parts.push(profile.stateProvince);
							if (profile.postalCode) parts.push(profile.postalCode);

							const fullLocation = parts.join(', ');
							if (fullLocation) {
								setLocation(fullLocation);
							}
						}
					} catch (profileErr) {
						console.error('Error cargando ubicación del consultorio:', profileErr);
					}
				}
			} catch (err) {
				console.error('Error cargando ubicación del consultorio:', err);
			}
		}

		loadClinicLocation();
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

		if (sessionError) {
			return showMessage('error', 'Error de Sesión', 'No hay sesión activa. Por favor, inicia sesión nuevamente.');
		}
		if (!userId || !organizationId) {
			return showMessage('error', 'Error', 'Datos de usuario no disponibles.');
		}
		if (!scheduledAt) {
			return showMessage('warning', 'Campo Requerido', 'Ingrese fecha y hora de la cita.');
		}

		if (patientType === 'registered') {
			if (!selectedPatient) {
				return showMessage('warning', 'Campo Requerido', 'Seleccione un paciente antes de continuar.');
			}
		} else {
			if (!selectedUnregisteredPatientId && (!unregisteredFirstName || !unregisteredLastName || !unregisteredPhone)) {
				return showMessage('warning', 'Campo Requerido', 'Debe completar al menos nombre, apellido y teléfono del paciente, o seleccionar un paciente existente.');
			}
		}

		// Validar cédula no duplicada si es paciente nuevo no registrado
		if (patientType === 'unregistered' && !selectedUnregisteredPatientId && unregisteredIdentification) {
			try {
				const checkRes = await fetch(`/api/patients/search?identifier=${encodeURIComponent(unregisteredIdentification.trim())}`);
				const existingPatients = await checkRes.json();
				if (Array.isArray(existingPatients) && existingPatients.length > 0) {
					const exists = existingPatients.some((p: any) => (p.identifier && p.identifier.trim().toLowerCase() === unregisteredIdentification.trim().toLowerCase()) || (p.identification && p.identification.trim().toLowerCase() === unregisteredIdentification.trim().toLowerCase()));
					if (exists) {
						return showMessage('warning', 'Cédula Duplicada', `La cédula "${unregisteredIdentification}" ya está registrada. Por favor, busca al paciente en la lista.`);
					}
				}
			} catch (checkErr) {
				console.warn('Error verificando cédula antes de crear:', checkErr);
			}
		}

		// Validar que se haya seleccionado al menos un servicio o combo
		if (selectedServices.length === 0 && selectedCombos.length === 0) {
			return showMessage('warning', 'Campo Requerido', 'Debe seleccionar al menos un servicio o combo para la cita.');
		}

		// Calcular facturación desde servicios y combos seleccionados - Sin impuestos (IVA) en área de salud
		const selectedServicesData = services.filter((s) => selectedServices.includes(s.id));
		const selectedCombosData = combos.filter((c) => selectedCombos.includes(c.id));

		const servicesSubtotal = selectedServicesData.reduce((sum, s) => sum + Number(s.price), 0);
		const combosSubtotal = selectedCombosData.reduce((sum, c) => sum + Number(c.price), 0);
		const subtotal = servicesSubtotal + combosSubtotal;
		const impuestos = 0; // No se aplican impuestos en el área de salud
		const total = subtotal; // Total igual al subtotal sin impuestos
		const currency = selectedServicesData[0]?.currency || selectedCombosData[0]?.currency || 'USD'; // Usar la moneda del primer servicio/combo

		// Ajustar hora si es por orden de llegada o turno seleccionado
		let finalScheduledAt = scheduledAt;
        let notes = '';

        if (schedulingType === 'shift') {
			// Si el input 'scheduledAt' es datetime-local, necesitamos construir la fecha correcta
			// Vamos a asumir que 'scheduledAt' tiene la fecha del día elegido.
			const datePart = scheduledAt.split('T')[0]; // YYYY-MM-DD
			
            // Construir fecha con hora fija del turno
			finalScheduledAt = `${datePart}T${selectedShift === 'morning' ? '08:00' : '14:00'}`;
            
            // Agregar nota sobre el turno
            notes = `Cita agendada por: ${selectedShift === 'morning' ? 'Turno Diurno (AM)' : 'Turno Vespertino (PM)'}`;
        }

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
						return showMessage('error', 'Error al Crear Paciente', patientData.error || 'Esta cédula de identidad ya está registrada en el sistema.');
					}
					return showMessage('error', 'Error al Crear Paciente', patientData.error || 'Error al crear el paciente no registrado.');
				}

				finalUnregisteredPatientId = patientData.id || patientData.data?.id;
				if (!finalUnregisteredPatientId) {
					setSubmitting(false);
					return showMessage('error', 'Error', 'Error: no se obtuvo el ID del paciente creado.');
				}
			}

			// Obtener el servicio o combo seleccionado (tomar el primero si hay varios)
			const firstSelectedService = selectedServicesData.length > 0 ? selectedServicesData[0] : null;
			const firstSelectedCombo = selectedCombosData.length > 0 ? selectedCombosData[0] : null;

			// Crear la cita
			const appointmentPayload: any = {
				doctorId: userId,
				organizationId,
				scheduledAt: finalScheduledAt,
				durationMinutes: typeof durationMinutes === 'number' ? durationMinutes : Number(durationMinutes),
				reason: reason || null,
				location,
				referralSource: referralSource || null,
				selectedService: firstSelectedService
					? JSON.stringify({
							id: firstSelectedService.id,
							name: firstSelectedService.name,
							price: firstSelectedService.price,
							currency: firstSelectedService.currency,
							type: 'service',
					  })
					: firstSelectedCombo
					? JSON.stringify({
							id: firstSelectedCombo.id,
							name: firstSelectedCombo.name,
							price: firstSelectedCombo.price,
							currency: firstSelectedCombo.currency,
							type: 'combo',
							serviceIds: firstSelectedCombo.serviceIds,
					  })
					: null,
				billing: {
					subtotal: subtotal || 0,
					impuestos: 0, // No se aplican impuestos en el área de salud
					total: total || subtotal,
					currency,
				},
                notes: notes || null,
			};

			if (patientType === 'registered') {
				appointmentPayload.patientId = selectedPatient!.id;
			} else {
				appointmentPayload.unregisteredPatientId = finalUnregisteredPatientId;
			}

			const res = await axios.post('/api/appointments', appointmentPayload, { withCredentials: true });

			if (res.data?.success) {
				showMessage('success', '¡Cita Registrada!', 'Cita registrada correctamente. La facturación se ha creado como pendiente de pago.', () => {
					setLocation('');
					setSelectedPatient(null);
					setSelectedUnregisteredPatientId(null);
					setIdentifier('');
					setSelectedServices([]);
					setSelectedCombos([]);
					setServiceViewMode('services');
					// Resetear formulario de paciente no registrado
					setUnregisteredFirstName('');
					setUnregisteredLastName('');
					setUnregisteredIdentification('');
					setUnregisteredPhone('');
					setUnregisteredEmail('');
					setUnregisteredBirthDate('');
					setUnregisteredSex('');
					setUnregisteredAddress('');
					setReason('');
					setLocation('');
					setReferralSource('');
					// Recargar la página después de un breve delay
					setTimeout(() => {
						window.location.reload();
					}, 1500);
				});
			} else {
				showMessage('error', 'Error al Registrar', 'Ocurrió un error al registrar la cita.');
			}
		} catch (err: any) {
			console.error(err);
			const errorMsg = err?.response?.data?.error || err?.message || 'Error al registrar la cita. Revisa la consola.';
			showMessage('error', 'Error al Registrar', errorMsg);
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
	// COMPONENTE MODAL DE MENSAJES
	// ---------------------------
	const MessageModal = () => {
		if (!modalMessage.open) return null;

		const iconColors = {
			success: 'text-green-600',
			error: 'text-red-600',
			warning: 'text-amber-600',
		};

		const bgColors = {
			success: 'bg-green-50 border-green-200',
			error: 'bg-red-50 border-red-200',
			warning: 'bg-amber-50 border-amber-200',
		};

		const buttonColors = {
			success: 'bg-green-600 hover:bg-green-700',
			error: 'bg-red-600 hover:bg-red-700',
			warning: 'bg-amber-600 hover:bg-amber-700',
		};

		return (
			<AnimatePresence>
				{modalMessage.open && (
					<>
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeModal}>
							<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
							<motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className={`relative z-50 w-full max-w-md rounded-xl shadow-xl border-2 ${bgColors[modalMessage.type]}`}>
								<div className="p-6">
									<div className="flex items-start gap-4">
										<div className={`flex-shrink-0 ${iconColors[modalMessage.type]}`}>{modalMessage.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : modalMessage.type === 'error' ? <AlertCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}</div>
										<div className="flex-1 min-w-0">
											<h3 className="text-lg font-semibold text-gray-900 mb-2">{modalMessage.title}</h3>
											<p className="text-sm text-gray-700 whitespace-pre-wrap">{modalMessage.message}</p>
										</div>
										<button onClick={closeModal} className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
											<X className="w-5 h-5" />
										</button>
									</div>
									<div className="mt-6 flex justify-end">
										<button onClick={closeModal} className={`px-4 py-2 rounded-md text-white text-sm font-medium transition-colors ${buttonColors[modalMessage.type]}`}>
											{modalMessage.type === 'success' ? 'Aceptar' : 'Cerrar'}
										</button>
									</div>
								</div>
							</motion.div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		);
	};

	// ---------------------------
	// FORMULARIO PRINCIPAL
	// ---------------------------
	return (
		<>
			<MessageModal />
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
								<button type="button" onClick={() => setPatientType('registered')} className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md border-2 transition-all ${patientType === 'registered' ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
									<UserCheck size={16} />
									<span className="text-xs font-semibold">Registrado</span>
								</button>
								<button type="button" onClick={() => setPatientType('unregistered')} className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md border-2 transition-all ${patientType === 'unregistered' ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
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
											<div>
												<div className="font-medium text-gray-800">
													{p.firstName} {p.lastName}
												</div>
												{p.identifier && <div className="text-xs text-gray-500">{p.identifier}</div>}
												{patientType === 'unregistered' && <div className="text-xs text-orange-600 mt-0.5">No registrado</div>}
											</div>
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
										<input type="text" value={unregisteredFirstName} onChange={(e) => setUnregisteredFirstName(e.target.value)} placeholder="Nombre" className={`${inputNeutral} min-w-0`} />
									</div>
									<div className="min-w-0">
										<label className={labelClass}>Apellido *</label>
										<input type="text" value={unregisteredLastName} onChange={(e) => setUnregisteredLastName(e.target.value)} placeholder="Apellido" className={`${inputNeutral} min-w-0`} />
									</div>
									<div className="min-w-0">
										<label className={labelClass}>Cédula (Opcional)</label>
										<input type="text" value={unregisteredIdentification} onChange={(e) => setUnregisteredIdentification(e.target.value)} placeholder="V-12345678" className={`${inputNeutral} min-w-0`} />
									</div>
									<div className="min-w-0">
										<label className={labelClass}>Teléfono *</label>
										<input type="tel" value={unregisteredPhone} onChange={(e) => setUnregisteredPhone(e.target.value)} placeholder="0412-1234567" className={`${inputNeutral} min-w-0`} />
									</div>
									<div className="min-w-0">
										<label className={labelClass}>Email (Opcional)</label>
										<input type="email" value={unregisteredEmail} onChange={(e) => setUnregisteredEmail(e.target.value)} placeholder="email@ejemplo.com" className={`${inputNeutral} min-w-0`} />
									</div>
									<div className="min-w-0">
										<label className={labelClass}>Fecha de Nacimiento (Opcional)</label>
										<input type="date" value={unregisteredBirthDate} onChange={(e) => setUnregisteredBirthDate(e.target.value)} className={`${inputNeutral} min-w-0`} />
									</div>
									<div className="min-w-0">
										<label className={labelClass}>Sexo (Opcional)</label>
										<select value={unregisteredSex} onChange={(e) => setUnregisteredSex(e.target.value as 'M' | 'F' | 'OTHER' | '')} className={`${inputNeutral} min-w-0`}>
											<option value="">Seleccionar...</option>
											<option value="M">Masculino</option>
											<option value="F">Femenino</option>
											<option value="OTHER">Otro</option>
										</select>
									</div>
									<div className="min-w-0">
										<label className={labelClass}>Dirección (Opcional)</label>
										<input type="text" value={unregisteredAddress} onChange={(e) => setUnregisteredAddress(e.target.value)} placeholder="Dirección" className={`${inputNeutral} min-w-0`} />
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
										<div className="text-sm font-medium text-gray-900">{patientType === 'registered' && selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : `${unregisteredFirstName} ${unregisteredLastName}`}</div>
										{(patientType === 'registered' && selectedPatient?.identifier) || unregisteredIdentification ? <div className="text-xs text-gray-600 mt-0.5">Cédula: {patientType === 'registered' && selectedPatient ? selectedPatient.identifier : unregisteredIdentification}</div> : null}
										<div className={`text-xs mt-1 ${patientType === 'registered' ? 'text-green-600' : 'text-orange-600'}`}>{patientType === 'registered' ? 'Paciente Registrado' : 'Paciente No Registrado'}</div>
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
								<div className="space-y-4">
                                    {/* Toggle Tipo de Agendamiento */}
                                    <div>
                                        <label className={labelClass}>Tipo de Agendamiento</label>
                                        <div className="flex p-1 bg-slate-100 rounded-lg mt-1">
                                            <button
                                                type="button"
                                                onClick={() => setSchedulingType('specific_time')}
                                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${
                                                    schedulingType === 'specific_time'
                                                        ? 'bg-white text-teal-700 shadow-sm'
                                                        : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                            >
                                                Hora Exacta
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSchedulingType('shift')}
                                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${
                                                    schedulingType === 'shift'
                                                        ? 'bg-white text-teal-700 shadow-sm'
                                                        : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                            >
                                                Por Turno
                                            </button>
                                        </div>
                                    </div>

                                    {schedulingType === 'shift' ? (
                                        <div>
                                            <label className={labelClass}>Fecha y Turno</label>
                                            <div className="space-y-2">
                                                <input 
                                                    type="date" 
                                                    value={scheduledAt ? scheduledAt.split('T')[0] : ''} 
                                                    onChange={(e) => setScheduledAt(e.target.value)} 
                                                    className={`${inputNeutral} min-w-0`} 
                                                />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedShift('morning')}
                                                        className={`p-3 rounded-lg border-2 text-center transition-all flex flex-col items-center gap-1 ${
                                                            selectedShift === 'morning'
                                                                ? 'bg-yellow-50 border-yellow-500 text-yellow-700'
                                                                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                                        }`}
                                                    >
                                                        <span className="text-lg">🌞</span>
                                                        <span className="font-medium text-sm">Mañana</span>
                                                        <span className="text-[10px] opacity-80">08:00 - 12:00</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedShift('afternoon')}
                                                        className={`p-3 rounded-lg border-2 text-center transition-all flex flex-col items-center gap-1 ${
                                                            selectedShift === 'afternoon'
                                                                ? 'bg-blue-50 border-blue-600 text-blue-700'
                                                                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                                        }`}
                                                    >
                                                        <span className="text-lg">🌇</span>
                                                        <span className="font-medium text-sm">Tarde</span>
                                                        <span className="text-[10px] opacity-80">14:00 - 18:00</span>
                                                    </button>
                                                </div>
                                                <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded flex items-start gap-1">
                                                    <Info className="w-3 h-3 shrink-0 mt-0.5" />
                                                    <span>Se notificará el turno por email.</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className={labelClass}>Fecha y hora</label>
                                            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={`${inputNeutral} min-w-0`} />
                                        </div>
                                    )}
                                </div>
							</div>
							<div className="min-w-0">
								<label className={labelClass}>Duración (min)</label>
								<input type="number" min={1} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value === '' ? '' : Number(e.target.value))} className={`${inputNeutral} min-w-0`} />
							</div>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div className="min-w-0">
								<label className={labelClass}>Ubicación</label>
								<input type="text" value={location} readOnly className={`${inputNeutral} min-w-0 bg-gray-50 cursor-not-allowed`} />
								<p className="text-xs text-gray-500 mt-1">Ubicación del consultorio (tomada del perfil)</p>
							</div>

							{/* Origen del Cliente (Solo para Asistente De Citas) */}
							<div>
								<label className={labelClass}>Origen del Cliente (¿Dónde lo captaste?)</label>
								<select value={referralSource} onChange={(e) => setReferralSource(e.target.value)} className={inputNeutral}>
									<option value="">Seleccione origen...</option>
									<option value="FACEBOOK">Facebook</option>
									<option value="INSTAGRAM">Instagram</option>
									<option value="WHATSAPP">WhatsApp</option>
									<option value="REFERIDO">Boca en Boca (Referido)</option>
									<option value="OTRO">Otro</option>
								</select>
							</div>
						</div>
					</section>

					{/* SERVICIOS DEL CONSULTORIO - Ahora en la parte inferior */}
					<section className="space-y-3 border-t border-gray-200 pt-4">
						<div className="p-4 border border-gray-100 rounded-md bg-gray-50">
							<h3 className={sectionTitle}>Servicios del Consultorio</h3>
							<p className="text-xs text-gray-600 mt-1 mb-4">Selecciona los servicios o combos para esta cita</p>

							{/* Botones para cambiar entre servicios y combos */}
							<div className="flex gap-2 mb-4">
								<button type="button" onClick={() => setServiceViewMode('services')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${serviceViewMode === 'services' ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>
									Servicios Individuales
								</button>
								<button type="button" onClick={() => setServiceViewMode('combos')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${serviceViewMode === 'combos' ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>
									Combos de Servicios
								</button>
							</div>

							{/* Vista de Servicios Individuales */}
							{serviceViewMode === 'services' && (
								<>
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
																setSelectedServices((prev) => (isSelected ? prev.filter((id) => id !== service.id) : [...prev, service.id]));
															}}
															className={`w-full p-4 rounded-lg border-2 text-left transition-all ${isSelected ? 'border-teal-500 bg-teal-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}`}>
															<div className="flex items-start justify-between gap-2">
																<div className="flex-1 min-w-0">
																	<div className="flex items-center gap-2 mb-2">
																		{isSelected && <CheckCircle className="w-5 h-5 text-teal-600 shrink-0" />}
																		<h4 className={`text-sm font-semibold ${isSelected ? 'text-teal-900' : 'text-gray-900'}`}>{service.name}</h4>
																	</div>
																	{service.description && <p className="text-xs text-gray-600 mb-3 line-clamp-2">{service.description}</p>}
																	<div className="mt-2">
																		<CurrencyDisplay amount={Number(service.price)} currency={service.currency as 'USD' | 'EUR'} showBoth={true} size="sm" />
																	</div>
																</div>
															</div>
														</button>
													);
												})}
										</div>
									)}
								</>
							)}

							{/* Vista de Combos */}
							{serviceViewMode === 'combos' && (
								<>
									{loadingCombos ? (
										<div className="flex items-center justify-center py-8">
											<Loader2 className="w-5 h-5 animate-spin text-gray-400" />
											<span className="text-xs text-gray-500 ml-2">Cargando combos...</span>
										</div>
									) : combos.length === 0 ? (
										<div className="text-center py-6 text-xs text-gray-500">
											<p>No hay combos disponibles.</p>
											<p className="mt-1">Configura los combos en Servicios → Combos de Servicios</p>
										</div>
									) : (
										<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full min-w-0">
											{combos
												.filter((combo) => combo.is_active !== false) // Filtrar solo combos activos
												.map((combo) => {
													const isSelected = selectedCombos.includes(combo.id);
													const includedServices = services.filter((s) => (combo.serviceIds || []).includes(s.id));
													return (
														<button
															key={combo.id}
															type="button"
															onClick={() => {
																setSelectedCombos((prev) => (isSelected ? prev.filter((id) => id !== combo.id) : [...prev, combo.id]));
															}}
															className={`w-full p-4 rounded-lg border-2 text-left transition-all ${isSelected ? 'border-teal-500 bg-teal-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}`}>
															<div className="flex items-start justify-between gap-2">
																<div className="flex-1 min-w-0">
																	<div className="flex items-center gap-2 mb-2">
																		{isSelected && <CheckCircle className="w-5 h-5 text-teal-600 shrink-0" />}
																		<h4 className={`text-sm font-semibold ${isSelected ? 'text-teal-900' : 'text-gray-900'}`}>{combo.name}</h4>
																	</div>
																	{combo.description && <p className="text-xs text-gray-600 mb-2 line-clamp-2">{combo.description}</p>}
																	{includedServices.length > 0 && (
																		<div className="mb-2">
																			<p className="text-[10px] font-medium text-gray-700 mb-1">Incluye:</p>
																			<div className="flex flex-wrap gap-1">
																				{includedServices.slice(0, 3).map((s) => (
																					<span key={s.id} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
																						{s.name}
																					</span>
																				))}
																				{includedServices.length > 3 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">+{includedServices.length - 3} más</span>}
																			</div>
																		</div>
																	)}
																	<div className="mt-2">
																		<CurrencyDisplay amount={Number(combo.price)} currency={combo.currency as 'USD' | 'EUR'} showBoth={true} size="sm" />
																	</div>
																</div>
															</div>
														</button>
													);
												})}
										</div>
									)}
								</>
							)}
						</div>

						{/* Resumen de facturación */}
						{(selectedServices.length > 0 || selectedCombos.length > 0) && (
							<div className="p-4 border border-gray-100 rounded-md bg-white">
								<h4 className="text-sm font-semibold text-gray-900 mb-3">Resumen de Facturación</h4>
								<div className="space-y-2">
									{selectedServices.length > 0 && (
										<div className="flex justify-between text-xs text-gray-600">
											<span>Servicios seleccionados:</span>
											<strong>{selectedServices.length}</strong>
										</div>
									)}
									{selectedCombos.length > 0 && (
										<div className="flex justify-between text-xs text-gray-600">
											<span>Combos seleccionados:</span>
											<strong>{selectedCombos.length}</strong>
										</div>
									)}
									{(() => {
										const selectedServicesData = services.filter((s) => selectedServices.includes(s.id));
										const selectedCombosData = combos.filter((c) => selectedCombos.includes(c.id));
										const servicesSubtotal = selectedServicesData.reduce((sum, s) => sum + Number(s.price), 0);
										const combosSubtotal = selectedCombosData.reduce((sum, c) => sum + Number(c.price), 0);
										const subtotal = servicesSubtotal + combosSubtotal;
										const total = subtotal; // Sin impuestos en área de salud
										const currency = selectedServicesData[0]?.currency || selectedCombosData[0]?.currency || 'USD';

										return (
											<div>
												<div className="flex justify-between items-center pt-2 border-t border-gray-200">
													<span className="font-semibold text-base">Total ({currency})</span>
													<strong className="text-lg text-teal-700 font-bold">{total.toFixed(2)}</strong>
												</div>
												<div className="mt-3 pt-3 border-t border-gray-200">
													<CurrencyDisplay amount={total} currency={currency as 'USD' | 'EUR'} showBoth={true} size="md" />
												</div>
												<p className="text-xs text-gray-500 mt-3 italic bg-blue-50 p-2 rounded border border-blue-100">💡 Esta factura se creará automáticamente como pendiente de pago para el paciente</p>
											</div>
										);
									})()}
								</div>
							</div>
						)}
					</section>

					{/* Botón de envío */}
					<div className="pt-4 border-t border-gray-200">
						<button type="submit" disabled={submitting || loadingSession || !!sessionError || (selectedServices.length === 0 && selectedCombos.length === 0)} className="w-full py-3 bg-linear-to-r from-violet-600 to-indigo-600 text-white rounded-md text-sm font-semibold shadow-sm disabled:opacity-60 disabled:cursor-not-allowed hover:from-violet-700 hover:to-indigo-700 transition-all">
							{submitting ? 'Registrando...' : 'Registrar cita'}
						</button>
						{selectedServices.length === 0 && selectedCombos.length === 0 && <p className="text-xs text-amber-600 mt-2 text-center">Debe seleccionar al menos un servicio o combo para continuar</p>}
					</div>
				</div>
			</form>
		</>
	);
}
