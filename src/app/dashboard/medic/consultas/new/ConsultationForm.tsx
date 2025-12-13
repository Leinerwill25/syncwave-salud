'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, Loader2, Stethoscope, Calendar, UserCheck, UserPlus, CheckCircle } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/app/adapters/client'; // lo dejé por si lo necesitas en otras partes
import CurrencyDisplay from '@/components/CurrencyDisplay';
import axios from 'axios';

/* ------------------------- UI primitives (estilizados) ------------------------- */

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
	return (
		<label htmlFor={htmlFor} className="block text-sm font-medium text-slate-800 mb-2">
			{children}
		</label>
	);
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
	return <div className={`rounded-2xl bg-white border border-blue-100 shadow-sm p-5 ${className}`}>{children}</div>;
}

function FieldShell({ children }: { children: React.ReactNode }) {
	return <div className="w-full">{children}</div>;
}

function IconInputWrapper({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
	return (
		<div className="relative rounded-lg bg-white shadow-sm border border-blue-200">
			{icon ? <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{icon}</div> : null}
			{children}
		</div>
	);
}

function TextInput({ id, label, value, onChange, placeholder, icon, error, type = 'text', hint }: any) {
	return (
		<FieldShell>
			<Label htmlFor={id}>{label}</Label>
			<IconInputWrapper icon={icon}>
				<input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`w-full block rounded-lg px-4 py-3 ${icon ? 'pl-12' : 'pl-4'} pr-4 bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 transition`} />
			</IconInputWrapper>
			{hint && !error && <p className="mt-2 text-xs text-slate-700">{hint}</p>}
			{error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
		</FieldShell>
	);
}

function TextareaInput({ id, label, value, onChange, placeholder, rows = 4, error, hint }: any) {
	return (
		<FieldShell>
			<Label htmlFor={id}>{label}</Label>
			<div className="rounded-lg border border-blue-200 bg-white shadow-sm">
				<textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="w-full rounded-lg px-4 py-3 bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 transition" />
			</div>
			{hint && !error && <p className="mt-2 text-xs text-slate-700">{hint}</p>}
			{error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
		</FieldShell>
	);
}

/* ------------------------- Patient searcher — actualizado para mostrar tipo ------------------------- */

type Patient = { id: string; firstName: string; lastName: string; identifier?: string; is_unregistered?: boolean; type?: string };

function PatientSearcher({ onSelect, patientType }: { onSelect: (p: Patient) => void; patientType: 'registered' | 'unregistered' }) {
	const [term, setTerm] = useState('');
	const [suggestions, setSuggestions] = useState<Patient[]>([]);
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const debounceRef = useRef<number | null>(null);

	useEffect(() => {
		if (!term) {
			setSuggestions([]);
			setOpen(false);
			return;
		}
		if (debounceRef.current) window.clearTimeout(debounceRef.current);
		debounceRef.current = window.setTimeout(async () => {
			try {
				setLoading(true);
				const res = await fetch(`/api/patients/search?identifier=${encodeURIComponent(term)}`);
				const data = await res.json();
				// Filtrar según el tipo de paciente seleccionado
				const filtered = (data || []).filter((p: Patient) => {
					const isUnregistered = p.is_unregistered === true || p.type === 'unregistered';
					return patientType === 'unregistered' ? isUnregistered : !isUnregistered;
				});
				setSuggestions(filtered);
				setOpen(true);
			} catch (err) {
				console.error('search error', err);
				setSuggestions([]);
				setOpen(false);
			} finally {
				setLoading(false);
			}
		}, 300);
	}, [term, patientType]);

	return (
		<div className="w-full">
			<Label>Buscar paciente {patientType === 'registered' ? 'registrado' : 'no registrado'}</Label>
			<div className="relative">
				<div className="flex items-center gap-2">
					<div className="flex-1">
						<input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Cédula, nombre o apellido..." aria-label="Buscar paciente" className="w-full rounded-lg border border-blue-200 px-4 py-3 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 transition" />
					</div>
					<div className="w-10 h-10 flex items-center justify-center rounded-lg bg-teal-50">{loading ? <Loader2 className="animate-spin text-teal-600" size={18} /> : <Stethoscope size={16} className="text-teal-600" />}</div>
				</div>

				{open && suggestions.length > 0 && (
					<div className="absolute z-40 left-0 right-0 mt-2 rounded-xl border border-blue-200 bg-white shadow-xl overflow-hidden">
						<ul className="divide-y divide-blue-100">
							{suggestions.map((p) => {
								const isUnregistered = p.is_unregistered === true || p.type === 'unregistered';
								return (
									<li
										key={p.id}
										role="option"
										tabIndex={0}
										onClick={() => {
											onSelect(p);
											setTerm('');
											setOpen(false);
										}}
										onKeyDown={(e) => {
											if (e.key === 'Enter') {
												onSelect(p);
												setTerm('');
												setOpen(false);
											}
										}}
										className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className={`p-1.5 rounded-md ${isUnregistered ? 'bg-orange-100' : 'bg-green-100'}`}>
												{isUnregistered ? <UserPlus size={14} className={isUnregistered ? 'text-orange-600' : 'text-green-600'} /> : <UserCheck size={14} className="text-green-600" />}
											</div>
											<div>
												<div className="font-medium text-slate-900">
													{p.firstName} {p.lastName}
												</div>
												{p.identifier && <div className="text-xs text-slate-700 mt-0.5">{p.identifier}</div>}
												<div className={`text-xs mt-0.5 ${isUnregistered ? 'text-orange-600' : 'text-green-600'}`}>
													{isUnregistered ? 'No registrado' : 'Registrado'}
												</div>
											</div>
										</div>
										<div className="text-xs text-slate-600">Seleccionar</div>
									</li>
								);
							})}
						</ul>
					</div>
				)}
			</div>
		</div>
	);
}

/* ------------------------- Formulario principal — ahora usa /api/auth/met ------------------------- */

export default function ConsultationForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [doctorId, setDoctorId] = useState<string | null>(null);
	const [organizationId, setOrganizationId] = useState<string | null>(null);
	const [organizationName, setOrganizationName] = useState<string | null>(null);
	const [patientType, setPatientType] = useState<'registered' | 'unregistered'>('registered');
	const [patientId, setPatientId] = useState('');
	const [unregisteredPatientId, setUnregisteredPatientId] = useState('');
	const [appointmentId, setAppointmentId] = useState<string | null>(searchParams.get('appointmentId'));
	const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
	const [consultationDate, setConsultationDate] = useState('');
	const [chiefComplaint, setChiefComplaint] = useState('');
	const [diagnosis, setDiagnosis] = useState('');
	const [notes, setNotes] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [fetchingSession, setFetchingSession] = useState(true);

	// Signos vitales generales
	const [weight, setWeight] = useState('');
	const [height, setHeight] = useState('');
	const [temperature, setTemperature] = useState('');
	const [bpSystolic, setBpSystolic] = useState('');
	const [bpDiastolic, setBpDiastolic] = useState('');
	const [heartRate, setHeartRate] = useState('');
	const [respiratoryRate, setRespiratoryRate] = useState('');
	const [spo2, setSpo2] = useState('');
	const [glucose, setGlucose] = useState('');

	// Especialidad seleccionada
	const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');

	// Campos por especialidad (simplificados)
	const [specialtyFields, setSpecialtyFields] = useState<Record<string, any>>({});

	// Datos del paciente no registrado
	const [unregisteredFirstName, setUnregisteredFirstName] = useState('');
	const [unregisteredLastName, setUnregisteredLastName] = useState('');
	const [unregisteredIdentification, setUnregisteredIdentification] = useState('');
	const [unregisteredPhone, setUnregisteredPhone] = useState('');
	const [unregisteredEmail, setUnregisteredEmail] = useState('');
	const [unregisteredBirthDate, setUnregisteredBirthDate] = useState('');
	const [unregisteredSex, setUnregisteredSex] = useState<'M' | 'F' | 'OTHER' | ''>('');
	const [unregisteredAddress, setUnregisteredAddress] = useState('');
	const [unregisteredAllergies, setUnregisteredAllergies] = useState('');
	const [unregisteredChronicConditions, setUnregisteredChronicConditions] = useState('');
	const [unregisteredCurrentMedication, setUnregisteredCurrentMedication] = useState('');
	const [unregisteredFamilyHistory, setUnregisteredFamilyHistory] = useState('');

	// Servicios del consultorio
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
	// No se aplican impuestos (IVA) en el área de salud

	// Inicializar fecha con la fecha actual
	useEffect(() => {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		const hours = String(now.getHours()).padStart(2, '0');
		const minutes = String(now.getMinutes()).padStart(2, '0');
		setConsultationDate(`${year}-${month}-${day}T${hours}:${minutes}`);
	}, []);

	// Resetear selección de paciente cuando cambia el tipo
	useEffect(() => {
		setPatientId('');
		setUnregisteredPatientId('');
		setSelectedPatient(null);
		// Limpiar formulario de paciente no registrado
		if (patientType === 'unregistered') {
			setUnregisteredFirstName('');
			setUnregisteredLastName('');
			setUnregisteredIdentification('');
			setUnregisteredPhone('');
			setUnregisteredEmail('');
			setUnregisteredBirthDate('');
			setUnregisteredSex('');
			setUnregisteredAddress('');
			setUnregisteredAllergies('');
			setUnregisteredChronicConditions('');
			setUnregisteredCurrentMedication('');
			setUnregisteredFamilyHistory('');
		}
	}, [patientType]);

	useEffect(() => {
		async function fetchDoctorAndOrg() {
			try {
				setFetchingSession(true);
				// Llamada al endpoint server-side que implementaste
				const res = await fetch('/api/auth/met', { method: 'GET', credentials: 'include', cache: 'no-store' });
				if (!res.ok) {
					// manejar 401 / 404 / 500
					const body = await res.json().catch(() => ({}));
					console.warn('/api/auth/met error', res.status, body);
					setDoctorId(null);
					setOrganizationId(null);
					setOrganizationName(null);
					return;
				}
				const body = await res.json();
				const id = body?.id ?? null;
				const orgId = body?.organizationId ?? null;
				const orgName = body?.organizationName ?? null;

				setDoctorId(id);
				setOrganizationId(orgId);
				// Usamos el nombre de la organización que devuelva tu endpoint (si lo hace)
				if (orgName) setOrganizationName(orgName);
			} catch (err) {
				console.error('Error fetching doctor & org from /api/auth/met:', err);
				setDoctorId(null);
				setOrganizationId(null);
				setOrganizationName(null);
			} finally {
				setFetchingSession(false);
			}
		}
		fetchDoctorAndOrg();
	}, []);

	// Cargar datos del appointment si se proporciona appointmentId
	useEffect(() => {
		if (!appointmentId) return;

		async function loadAppointmentData() {
			try {
				const supabase = createSupabaseBrowserClient();
				const { data: appointmentData, error } = await supabase
					.from('appointment')
					.select('patient_id, unregistered_patient_id, reason')
					.eq('id', appointmentId)
					.single();

				if (error || !appointmentData) {
					console.warn('No se pudo cargar datos del appointment:', appointmentId, error);
					return;
				}
				
				// Si el appointment tiene unregistered_patient_id, cargar esos datos
				if (appointmentData.unregistered_patient_id) {
					setPatientType('unregistered');
					setUnregisteredPatientId(appointmentData.unregistered_patient_id);
				} else if (appointmentData.patient_id) {
					setPatientType('registered');
					setPatientId(appointmentData.patient_id);
				}

				// Pre-llenar motivo de consulta si existe
				if (appointmentData.reason) {
					setChiefComplaint(appointmentData.reason);
				}
			} catch (err) {
				console.error('Error cargando datos del appointment:', err);
			}
		}

		loadAppointmentData();
	}, [appointmentId]);

	// Cargar servicios del consultorio
	useEffect(() => {
		if (!doctorId) return;

		async function loadServices() {
			try {
				setLoadingServices(true);
				const res = await axios.get('/api/medic/services?active=true', { withCredentials: true });
				if (res.data?.success && Array.isArray(res.data.services)) {
					setServices(res.data.services);
				}
			} catch (err) {
				console.error('Error cargando servicios:', err);
				setServices([]);
			} finally {
				setLoadingServices(false);
			}
		}

		loadServices();
	}, [doctorId]);

	const handlePatientSelect = (patient: Patient) => {
		setSelectedPatient(patient);
		const isUnregistered = patient.is_unregistered === true || patient.type === 'unregistered';
		if (isUnregistered) {
			setUnregisteredPatientId(patient.id);
			setPatientId('');
		} else {
			setPatientId(patient.id);
			setUnregisteredPatientId('');
		}
	};

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		if (!doctorId) return setError('No se detectó la sesión del médico.');
		if (!chiefComplaint) return setError('El motivo de consulta es obligatorio.');
		if (!consultationDate) return setError('La fecha de la consulta es obligatoria.');

		// Validar datos del paciente no registrado si es necesario
		if (patientType === 'unregistered') {
			if (!unregisteredPatientId && (!unregisteredFirstName || !unregisteredLastName || !unregisteredPhone)) {
				return setError('Debe completar al menos nombre, apellido y teléfono del paciente, o seleccionar un paciente existente.');
			}
		} else {
			if (!patientId) return setError('Debe seleccionar un paciente registrado.');
		}

		// Validar que la cédula no esté duplicada (solo si se proporciona y es paciente nuevo)
		if (patientType === 'unregistered' && !unregisteredPatientId && unregisteredIdentification) {
			try {
				const checkRes = await fetch(`/api/patients/search?identifier=${encodeURIComponent(unregisteredIdentification.trim())}`);
				const existingPatients = await checkRes.json();
				if (Array.isArray(existingPatients) && existingPatients.length > 0) {
					const exists = existingPatients.some((p: any) => 
						(p.identifier && p.identifier.trim().toLowerCase() === unregisteredIdentification.trim().toLowerCase()) ||
						(p.identification && p.identification.trim().toLowerCase() === unregisteredIdentification.trim().toLowerCase())
					);
					if (exists) {
						return setError(`La cédula "${unregisteredIdentification}" ya está registrada. Por favor, busca al paciente en la lista.`);
					}
				}
			} catch (checkErr) {
				console.warn('Error verificando cédula antes de crear:', checkErr);
				// Continuar aunque falle la verificación previa, el servidor lo validará
			}
		}

		setLoading(true);
		try {
			let finalUnregisteredPatientId = unregisteredPatientId;

			// Si es paciente no registrado y no hay ID, crear el paciente primero
			if (patientType === 'unregistered' && !unregisteredPatientId) {
				const patientPayload: any = {
					first_name: unregisteredFirstName,
					last_name: unregisteredLastName,
					phone: unregisteredPhone,
					identification: unregisteredIdentification || null,
					birth_date: unregisteredBirthDate || null,
					sex: unregisteredSex || null,
					email: unregisteredEmail || null,
					address: unregisteredAddress || null,
					allergies: unregisteredAllergies || null,
					chronic_conditions: unregisteredChronicConditions || null,
					current_medication: unregisteredCurrentMedication || null,
					family_history: unregisteredFamilyHistory || null,
				};

				const patientRes = await fetch('/api/unregistered-patients', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(patientPayload),
				});

				const patientData = await patientRes.json().catch(() => ({}));
				if (!patientRes.ok) {
					setLoading(false);
					// Si el error es 409 (conflicto), mostrar el mensaje del servidor que incluye información sobre la cédula duplicada
					if (patientRes.status === 409) {
						return setError(patientData.error || 'Esta cédula de identidad ya está registrada en el sistema.');
					}
					return setError(patientData.error || 'Error al crear el paciente no registrado.');
				}

				finalUnregisteredPatientId = patientData.id || patientData.data?.id;
				if (!finalUnregisteredPatientId) {
					setLoading(false);
					return setError('Error: no se obtuvo el ID del paciente creado.');
				}
			}

			const payload: any = {
				doctor_id: doctorId,
				organization_id: organizationId,
				chief_complaint: chiefComplaint,
				diagnosis: diagnosis || null,
				notes: notes || null,
			};

			// Si hay appointment_id, incluirlo para que el API pueda obtener el unregistered_patient_id automáticamente
			if (appointmentId) {
				payload.appointment_id = appointmentId;
			}

			if (patientType === 'registered') {
				payload.patient_id = patientId;
			} else {
				payload.unregistered_patient_id = finalUnregisteredPatientId;
			}

			// Construir objeto de signos vitales
			const vitalsObj: Record<string, any> = {};

			// Signos vitales generales
			const generalVitals: Record<string, any> = {};
			if (weight) generalVitals.weight = weight;
			if (height) generalVitals.height = height;
			if (temperature) generalVitals.temperature = temperature;
			if (bpSystolic) generalVitals.bp_systolic = bpSystolic;
			if (bpDiastolic) generalVitals.bp_diastolic = bpDiastolic;
			if (heartRate) generalVitals.heart_rate = heartRate;
			if (respiratoryRate) generalVitals.respiratory_rate = respiratoryRate;
			if (spo2) generalVitals.spo2 = spo2;
			if (glucose) generalVitals.glucose = glucose;

			// Calcular BMI si hay peso y altura
			if (weight && height) {
				const w = Number(String(weight).replace(',', '.'));
				const h = Number(String(height).replace(',', '.'));
				if (isFinite(w) && isFinite(h) && w > 0 && h > 0) {
					const meters = h / 100;
					const bmi = w / (meters * meters);
					generalVitals.bmi = bmi.toFixed(1);
				}
			}

			if (Object.keys(generalVitals).length > 0) {
				vitalsObj.general = generalVitals;
			}

			// Agregar campos de especialidad si hay alguno
			if (selectedSpecialty && Object.keys(specialtyFields).length > 0) {
				const specialtyKey = selectedSpecialty.toLowerCase();
				vitalsObj[specialtyKey] = specialtyFields;
			}

			// Agregar fecha de consulta si está disponible (guardar en vitals para consultas programadas)
			if (consultationDate) {
				const consultationDateTime = new Date(consultationDate);
				const now = new Date();
				if (consultationDateTime.getTime() !== now.getTime()) {
					vitalsObj.scheduled_date = consultationDate;
					vitalsObj.consultation_date = consultationDateTime.toISOString();
				}
			}

			// Agregar vitals al payload solo si hay datos
			if (Object.keys(vitalsObj).length > 0) {
				payload.vitals = vitalsObj;
			}

			const res = await fetch('/api/consultations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				setLoading(false);
				console.error('Error creando consulta', res.status, data);
				return setError(data.error || 'Error al crear consulta.');
			}

			const consultationId = data?.data?.id || data?.id;
			if (!consultationId) {
				setLoading(false);
				return setError('Error: no se obtuvo el ID de la consulta creada.');
			}

			// Crear facturación si hay servicios seleccionados
			if (selectedServices.length > 0) {
				try {
					const selectedServicesData = services.filter((s) => selectedServices.includes(s.id));
					const subtotal = selectedServicesData.reduce((sum, s) => sum + Number(s.price), 0);
					const impuestos = 0; // No se aplican impuestos en el área de salud
					const total = subtotal; // Total igual al subtotal sin impuestos
					const currency = selectedServicesData[0]?.currency || 'USD';

					const billingPayload: any = {
						consultation_id: consultationId,
						patient_id: patientType === 'registered' ? patientId : null,
						unregistered_patient_id: patientType === 'unregistered' ? finalUnregisteredPatientId : null,
						doctor_id: doctorId,
						organization_id: organizationId,
						subtotal: subtotal,
						impuestos: impuestos,
						total: total,
						currency: currency,
						estado_pago: 'pendiente',
					};

					const billingRes = await fetch('/api/facturacion', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(billingPayload),
					});

					if (!billingRes.ok) {
						console.warn('Error creando facturación:', await billingRes.json().catch(() => ({})));
						// No bloqueamos la creación de la consulta si falla la facturación
					}
				} catch (billingErr) {
					console.error('Error al crear facturación:', billingErr);
					// No bloqueamos la creación de la consulta si falla la facturación
				}
			}

			setLoading(false);
			// redirigir a la consulta creada
			router.push(`/dashboard/medic/consultas/${consultationId}`);
		} catch (err: any) {
			console.error(err);
			setError(err?.message ?? 'Error al crear consulta.');
			setLoading(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto grid gap-6 p-8 rounded-3xl bg-gradient-to-b from-white to-blue-50/50 border border-blue-100 shadow-2xl">
			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<div>
					<h2 className="text-2xl font-semibold text-slate-900">Nueva Consulta Médica</h2>
					<p className="text-sm text-slate-700 mt-1">Registra la atención clínica del paciente de forma segura y rápida.</p>
				</div>
				<div className="text-right">
					<div className="text-xs text-slate-700">Estado</div>
					<div className="text-sm font-medium text-emerald-600">{fetchingSession ? 'Comprobando sesión...' : doctorId ? 'Sesión detectada' : 'Sesión no detectada'}</div>
				</div>
			</div>

			{/* Selector de tipo de paciente */}
			<Card>
				<div className="space-y-4">
					<Label>Tipo de Paciente</Label>
					<div className="grid grid-cols-2 gap-3">
						<button
							type="button"
							onClick={() => setPatientType('registered')}
							className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
								patientType === 'registered'
									? 'border-teal-500 bg-teal-50 text-teal-700 shadow-md'
									: 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
							}`}>
							<UserCheck size={20} />
							<span className="font-semibold">Paciente Registrado</span>
						</button>
						<button
							type="button"
							onClick={() => setPatientType('unregistered')}
							className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
								patientType === 'unregistered'
									? 'border-orange-500 bg-orange-50 text-orange-700 shadow-md'
									: 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
							}`}>
							<UserPlus size={20} />
							<span className="font-semibold">Paciente No Registrado</span>
						</button>
					</div>
				</div>
			</Card>

			{/* Session / patient picker o formulario de paciente no registrado */}
			{patientType === 'registered' ? (
				<Card>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
						<div className="md:col-span-2">
							<PatientSearcher onSelect={handlePatientSelect} patientType={patientType} />
						</div>

						<div className="flex flex-col gap-2">
							<Label>Paciente seleccionado</Label>
							<div className="min-h-[56px] flex flex-col items-start justify-center px-3 py-2 rounded-lg border border-dashed border-blue-200 bg-blue-50/50 text-sm text-slate-800">
								{selectedPatient ? (
									<>
										<span className="font-medium text-slate-900">
											{selectedPatient.firstName} {selectedPatient.lastName}
										</span>
										{selectedPatient.identifier && <span className="text-xs text-slate-600 mt-0.5">{selectedPatient.identifier}</span>}
										<span className="text-xs mt-1 text-green-600">Registrado</span>
									</>
								) : (
									<span className="text-xs text-slate-600">Ninguno</span>
								)}
							</div>
							{doctorId && (
								<div className="mt-2 text-xs text-slate-700">
									Médico: <span className="font-medium text-slate-900">{doctorId}</span>
									{organizationName && (
										<span className="block text-xs text-slate-700 mt-1">
											Clínica: <span className="font-medium">{organizationName}</span>
										</span>
									)}
								</div>
							)}
						</div>
					</div>
				</Card>
			) : (
				<>
					{/* Buscador opcional para pacientes no registrados existentes */}
					<Card>
						<PatientSearcher onSelect={handlePatientSelect} patientType={patientType} />
					</Card>

					{/* Formulario de datos del paciente no registrado */}
					{!unregisteredPatientId && (
						<Card>
							<div className="space-y-4">
								<div className="flex items-center gap-2 mb-4">
									<UserPlus className="w-5 h-5 text-orange-600" />
									<h3 className="text-lg font-semibold text-slate-900">Datos del Paciente</h3>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<TextInput
										id="unregisteredFirstName"
										label="Nombre *"
										value={unregisteredFirstName}
										onChange={setUnregisteredFirstName}
										placeholder="Nombre del paciente"
										icon={<UserCheck size={16} />}
									/>
									<TextInput
										id="unregisteredLastName"
										label="Apellido *"
										value={unregisteredLastName}
										onChange={setUnregisteredLastName}
										placeholder="Apellido del paciente"
										icon={<UserCheck size={16} />}
									/>
									<TextInput
										id="unregisteredIdentification"
										label="Cédula / Identificación"
										value={unregisteredIdentification}
										onChange={setUnregisteredIdentification}
										placeholder="Número de identificación"
									/>
									<TextInput
										id="unregisteredPhone"
										label="Teléfono *"
										type="tel"
										value={unregisteredPhone}
										onChange={setUnregisteredPhone}
										placeholder="Ej: +58 412 1234567"
									/>
									<TextInput
										id="unregisteredEmail"
										label="Correo Electrónico"
										type="email"
										value={unregisteredEmail}
										onChange={setUnregisteredEmail}
										placeholder="email@ejemplo.com"
									/>
									<TextInput
										id="unregisteredBirthDate"
										label="Fecha de Nacimiento"
										type="date"
										value={unregisteredBirthDate}
										onChange={setUnregisteredBirthDate}
									/>
									<div className="flex flex-col gap-2">
										<Label htmlFor="unregisteredSex">Sexo</Label>
										<select
											id="unregisteredSex"
											value={unregisteredSex}
											onChange={(e) => setUnregisteredSex(e.target.value as 'M' | 'F' | 'OTHER' | '')}
											className="w-full rounded-lg border border-blue-200 px-4 py-3 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
										>
											<option value="">Seleccionar...</option>
											<option value="M">Masculino</option>
											<option value="F">Femenino</option>
											<option value="OTHER">Otro</option>
										</select>
									</div>
									<TextareaInput
										id="unregisteredAddress"
										label="Dirección"
										value={unregisteredAddress}
										onChange={setUnregisteredAddress}
										placeholder="Dirección completa"
										rows={2}
									/>
								</div>

								<div className="border-t border-gray-200 pt-4 mt-4">
									<h4 className="text-sm font-semibold text-slate-900 mb-3">Información Médica Relevante</h4>
									<div className="grid grid-cols-1 gap-4">
										<TextareaInput
											id="unregisteredAllergies"
											label="Alergias"
											value={unregisteredAllergies}
											onChange={setUnregisteredAllergies}
											placeholder="Liste las alergias conocidas del paciente"
											rows={3}
										/>
										<TextareaInput
											id="unregisteredChronicConditions"
											label="Condiciones Crónicas"
											value={unregisteredChronicConditions}
											onChange={setUnregisteredChronicConditions}
											placeholder="Enfermedades crónicas, condiciones previas..."
											rows={3}
										/>
										<TextareaInput
											id="unregisteredCurrentMedication"
											label="Medicamentos Actuales"
											value={unregisteredCurrentMedication}
											onChange={setUnregisteredCurrentMedication}
											placeholder="Medicamentos que el paciente está tomando actualmente"
											rows={3}
										/>
										<TextareaInput
											id="unregisteredFamilyHistory"
											label="Historial Familiar"
											value={unregisteredFamilyHistory}
											onChange={setUnregisteredFamilyHistory}
											placeholder="Enfermedades o condiciones en la familia"
											rows={3}
										/>
									</div>
								</div>
							</div>
						</Card>
					)}

					{/* Mostrar paciente seleccionado si existe */}
					{unregisteredPatientId && selectedPatient && (
						<Card>
							<div className="flex items-center justify-between">
								<div>
									<Label>Paciente Seleccionado</Label>
									<div className="mt-2">
										<span className="font-medium text-slate-900">
											{selectedPatient.firstName} {selectedPatient.lastName}
										</span>
										{selectedPatient.identifier && <div className="text-xs text-slate-600 mt-0.5">{selectedPatient.identifier}</div>}
										<span className="text-xs text-orange-600 mt-1 block">No registrado</span>
									</div>
								</div>
								<button
									type="button"
									onClick={() => {
										setUnregisteredPatientId('');
										setSelectedPatient(null);
									}}
									className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded border border-slate-300"
								>
									Cambiar
								</button>
							</div>
						</Card>
					)}
				</>
			)}

			{/* Clinical fields */}
			<Card className="space-y-4">
				<div className="grid grid-cols-1 gap-4">
					<TextInput
						id="consultationDate"
						label="Fecha de la consulta"
						type="datetime-local"
						value={consultationDate}
						onChange={setConsultationDate}
						placeholder="Fecha y hora de la consulta"
						icon={<Calendar size={16} />}
					/>
					<TextInput id="chiefComplaint" label="Motivo de consulta *" value={chiefComplaint} onChange={setChiefComplaint} placeholder="Ej: dolor abdominal, cefalea..." icon={<Stethoscope size={16} />} />
					<TextareaInput id="diagnosis" label="Diagnóstico (opcional)" value={diagnosis} onChange={setDiagnosis} placeholder="Diagnóstico..." rows={3} />
					<TextareaInput id="notes" label="Notas clínicas (opcional)" value={notes} onChange={setNotes} placeholder="Observaciones, recomendaciones, plan" rows={4} />
				</div>
			</Card>

			{/* Signos Vitales */}
			<Card className="space-y-4">
				<div className="flex items-center gap-2 mb-4">
					<Stethoscope className="w-5 h-5 text-teal-600" />
					<h3 className="text-lg font-semibold text-slate-900">Signos Vitales</h3>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
					<TextInput id="weight" label="Peso (kg)" type="number" step="0.1" value={weight} onChange={setWeight} placeholder="Ej: 70.5" />
					<TextInput id="height" label="Altura (cm)" type="number" step="0.1" value={height} onChange={setHeight} placeholder="Ej: 175" />
					<TextInput id="temperature" label="Temperatura (°C)" type="number" step="0.1" value={temperature} onChange={setTemperature} placeholder="Ej: 36.5" />
					<TextInput id="bpSystolic" label="PA Sistólica (mmHg)" type="number" value={bpSystolic} onChange={setBpSystolic} placeholder="Ej: 120" />
					<TextInput id="bpDiastolic" label="PA Diastólica (mmHg)" type="number" value={bpDiastolic} onChange={setBpDiastolic} placeholder="Ej: 80" />
					<TextInput id="heartRate" label="Frecuencia Cardíaca (lpm)" type="number" value={heartRate} onChange={setHeartRate} placeholder="Ej: 72" />
					<TextInput id="respiratoryRate" label="Frecuencia Respiratoria (rpm)" type="number" value={respiratoryRate} onChange={setRespiratoryRate} placeholder="Ej: 16" />
					<TextInput id="spo2" label="SpO₂ (%)" type="number" value={spo2} onChange={setSpo2} placeholder="Ej: 98" />
					<TextInput id="glucose" label="Glucosa (mg/dL)" type="number" value={glucose} onChange={setGlucose} placeholder="Ej: 95" />
				</div>
			</Card>

			{/* Especialidad y Campos Específicos */}
			<Card className="space-y-4">
				<div className="flex items-center gap-2 mb-4">
					<Stethoscope className="w-5 h-5 text-indigo-600" />
					<h3 className="text-lg font-semibold text-slate-900">Especialidad (Opcional)</h3>
				</div>
				<div>
					<Label htmlFor="specialty">Seleccionar Especialidad</Label>
					<select
						id="specialty"
						value={selectedSpecialty}
						onChange={(e) => {
							setSelectedSpecialty(e.target.value);
							setSpecialtyFields({}); // Limpiar campos al cambiar especialidad
						}}
						className="w-full rounded-lg border border-blue-200 px-4 py-3 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
					>
						<option value="">Ninguna (Consulta General)</option>
						<option value="cardiology">Cardiología</option>
						<option value="pulmonology">Neumología</option>
						<option value="neurology">Neurología</option>
						<option value="obstetrics">Obstetricia</option>
						<option value="nutrition">Nutrición</option>
						<option value="dermatology">Dermatología</option>
						<option value="psychiatry">Psiquiatría</option>
						<option value="orthopedics">Ortopedia</option>
						<option value="ent">Otorrinolaringología (ENT)</option>
						<option value="gynecology">Ginecología</option>
						<option value="endocrinology">Endocrinología</option>
						<option value="ophthalmology">Oftalmología</option>
					</select>
				</div>

				{/* Campos específicos por especialidad - versión simplificada */}
				{selectedSpecialty === 'cardiology' && (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-red-50 rounded-lg border border-red-200">
						<TextInput
							id="ekgRhythm"
							label="Ritmo ECG"
							value={specialtyFields.ekg_rhythm || ''}
							onChange={(val: string) => setSpecialtyFields({ ...specialtyFields, ekg_rhythm: val })}
							placeholder="Ej: Ritmo sinusal"
						/>
						<TextInput
							id="bnp"
							label="BNP (pg/mL)"
							type="number"
							value={specialtyFields.bnp || ''}
							onChange={(val: string) => setSpecialtyFields({ ...specialtyFields, bnp: val })}
							placeholder="Ej: 100"
						/>
						<div className="flex items-center gap-2">
							<input
								type="checkbox"
								id="edema"
								checked={specialtyFields.edema || false}
								onChange={(e) => setSpecialtyFields({ ...specialtyFields, edema: e.target.checked })}
								className="rounded"
							/>
							<Label htmlFor="edema">Edema presente</Label>
						</div>
					</div>
				)}

				{selectedSpecialty === 'pulmonology' && (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
						<TextInput
							id="fev1"
							label="FEV1 (L)"
							type="number"
							step="0.1"
							value={specialtyFields.fev1 || ''}
							onChange={(val: string) => setSpecialtyFields({ ...specialtyFields, fev1: val })}
							placeholder="Ej: 2.5"
						/>
						<TextInput
							id="fvc"
							label="FVC (L)"
							type="number"
							step="0.1"
							value={specialtyFields.fvc || ''}
							onChange={(val: string) => setSpecialtyFields({ ...specialtyFields, fvc: val })}
							placeholder="Ej: 3.2"
						/>
					</div>
				)}

				{selectedSpecialty === 'neurology' && (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
						<TextInput
							id="gcsTotal"
							label="GCS Total"
							type="number"
							value={specialtyFields.gcs_total || ''}
							onChange={(val: string) => setSpecialtyFields({ ...specialtyFields, gcs_total: val })}
							placeholder="Ej: 15"
						/>
						<TextInput
							id="pupillaryReactivity"
							label="Reactividad Pupilar"
							value={specialtyFields.pupillary_reactivity || ''}
							onChange={(val: string) => setSpecialtyFields({ ...specialtyFields, pupillary_reactivity: val })}
							placeholder="Ej: Reactivas"
						/>
					</div>
				)}

				{selectedSpecialty === 'obstetrics' && (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-pink-50 rounded-lg border border-pink-200">
						<TextInput
							id="fundalHeight"
							label="Altura Uterina (cm)"
							type="number"
							value={specialtyFields.fundal_height_cm || ''}
							onChange={(val: string) => setSpecialtyFields({ ...specialtyFields, fundal_height_cm: val })}
							placeholder="Ej: 32"
						/>
						<TextInput
							id="fetalHr"
							label="FCF (lpm)"
							type="number"
							value={specialtyFields.fetal_heart_rate || ''}
							onChange={(val: string) => setSpecialtyFields({ ...specialtyFields, fetal_heart_rate: val })}
							placeholder="Ej: 140"
						/>
					</div>
				)}

				{selectedSpecialty === 'gynecology' && (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-rose-50 rounded-lg border border-rose-200">
						<TextInput
							id="lmp"
							label="Última Menstruación (FUM)"
							type="date"
							value={specialtyFields.last_menstrual_period || ''}
							onChange={(val: string) => setSpecialtyFields({ ...specialtyFields, last_menstrual_period: val })}
						/>
						<TextInput
							id="contraceptive"
							label="Anticonceptivo"
							value={specialtyFields.contraceptive || ''}
							onChange={(val: string) => setSpecialtyFields({ ...specialtyFields, contraceptive: val })}
							placeholder="Ej: Ninguno, Píldora, DIU"
						/>
					</div>
				)}

				{selectedSpecialty === 'endocrinology' && (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
						<TextInput
							id="tsh"
							label="TSH (mUI/L)"
							type="number"
							step="0.01"
							value={specialtyFields.tsh || ''}
							onChange={(val: string) => setSpecialtyFields({ ...specialtyFields, tsh: val })}
							placeholder="Ej: 2.5"
						/>
						<TextInput
							id="hba1c"
							label="HbA1c (%)"
							type="number"
							step="0.1"
							value={specialtyFields.hba1c || ''}
							onChange={(val: string) => setSpecialtyFields({ ...specialtyFields, hba1c: val })}
							placeholder="Ej: 5.8"
						/>
					</div>
				)}

				{selectedSpecialty === 'ophthalmology' && (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-cyan-50 rounded-lg border border-cyan-200">
						<TextInput
							id="visualAcuity"
							label="Agudeza Visual"
							value={specialtyFields.visual_acuity || ''}
							onChange={(val: string) => setSpecialtyFields({ ...specialtyFields, visual_acuity: val })}
							placeholder="Ej: 20/20"
						/>
						<TextInput
							id="iop"
							label="PIO (mmHg)"
							type="number"
							value={specialtyFields.iop || ''}
							onChange={(val: string) => setSpecialtyFields({ ...specialtyFields, iop: val })}
							placeholder="Ej: 15"
						/>
					</div>
				)}

				{/* Otras especialidades pueden agregarse aquí siguiendo el mismo patrón */}
			</Card>

			{/* SERVICIOS DEL CONSULTORIO */}
			<Card>
				<div className="space-y-4">
					<div>
						<Label>Servicios del Consultorio</Label>
						<p className="text-xs text-slate-600 mt-1">Selecciona los servicios para esta consulta (opcional)</p>
					</div>

					{loadingServices ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="w-5 h-5 animate-spin text-slate-400" />
							<span className="text-xs text-slate-500 ml-2">Cargando servicios...</span>
						</div>
					) : services.length === 0 ? (
						<div className="text-center py-6 text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
							<p>No hay servicios disponibles.</p>
							<p className="mt-1">Configura los servicios en Configuración → Perfil Profesional</p>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
							{services.map((service) => {
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
												: 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
										}`}>
										<div className="flex items-start justify-between gap-2">
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 mb-2">
													{isSelected && <CheckCircle className="w-5 h-5 text-teal-600 shrink-0" />}
													<h4 className={`text-sm font-semibold ${isSelected ? 'text-teal-900' : 'text-slate-900'}`}>
														{service.name}
													</h4>
												</div>
												{service.description && (
													<p className="text-xs text-slate-600 mb-3 line-clamp-2">{service.description}</p>
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

					{/* Resumen de facturación */}
					{selectedServices.length > 0 && (
						<div className="p-4 border border-slate-200 rounded-lg bg-white">
							<h4 className="text-sm font-semibold text-slate-900 mb-3">Resumen de Facturación</h4>
							<div className="space-y-2">
								<div className="flex justify-between text-xs text-slate-600">
									<span>Servicios seleccionados:</span>
									<strong>{selectedServices.length}</strong>
								</div>
								{(() => {
									const selectedServicesData = services.filter((s) => selectedServices.includes(s.id));
									const subtotal = selectedServicesData.reduce((sum, s) => sum + Number(s.price), 0);
									const total = subtotal; // Sin impuestos en área de salud
									const currency = selectedServicesData[0]?.currency || 'USD';

									return (
										<>
											<div className="flex justify-between items-center pt-2 border-t border-slate-200">
												<span className="font-semibold text-base">Total ({currency})</span>
												<strong className="text-lg text-teal-700 font-bold">{total.toFixed(2)}</strong>
											</div>
											<div className="mt-3 pt-3 border-t border-slate-200">
												<CurrencyDisplay
													amount={total}
													currency={currency as 'USD' | 'EUR'}
													showBoth={true}
													size="md"
												/>
											</div>
											<p className="text-xs text-slate-500 mt-3 italic bg-blue-50 p-2 rounded border border-blue-100">
												💡 Esta factura se creará automáticamente como pendiente de pago para el paciente
											</p>
										</>
									);
								})()}
							</div>
						</div>
					)}
				</div>
			</Card>

			{/* Actions */}
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<button type="submit" disabled={loading || !doctorId} className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-2xl shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed" aria-disabled={loading || !doctorId}>
						{loading ? <Loader2 className="animate-spin" size={18} /> : <FileText size={16} />}
						<span>{loading ? 'Guardando...' : 'Crear Consulta'}</span>
					</button>

					<button type="button" onClick={() => router.push('/dashboard/medic/consultas')} className="px-5 py-3 border border-blue-200 rounded-2xl text-slate-800 bg-white hover:bg-blue-50 transition">
						Cancelar
					</button>
				</div>

				<div className="text-sm text-slate-700">
					<div className="hidden sm:block">Tu información se guarda en el historial del paciente.</div>
				</div>
			</div>

			{error && <div className="mt-2 rounded-lg border border-rose-100 bg-rose-50 text-rose-700 px-4 py-3 text-sm">{error}</div>}
		</form>
	);
}
