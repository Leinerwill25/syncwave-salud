'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Loader2, Stethoscope, Calendar, UserCheck, UserPlus } from 'lucide-react';

/* ------------------------- UI primitives ------------------------- */

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

/* ------------------------- Patient searcher ------------------------- */

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
		<div className="relative">
			<Label>Buscar {patientType === 'registered' ? 'Paciente Registrado' : 'Paciente No Registrado'}</Label>
			<IconInputWrapper icon={<UserCheck size={16} />}>
				<input
					type="text"
					value={term}
					onChange={(e) => setTerm(e.target.value)}
					placeholder={`Buscar por cédula o nombre...`}
					className="w-full block rounded-lg px-4 pl-12 pr-4 py-3 bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
				/>
			</IconInputWrapper>
			{loading && <p className="mt-2 text-xs text-slate-500">Buscando...</p>}
			{open && suggestions.length > 0 && (
				<ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-blue-200 rounded-lg shadow-lg max-h-60 overflow-auto">
					{suggestions.map((p) => (
						<li
							key={p.id}
							onClick={() => {
								onSelect(p);
								setTerm('');
								setOpen(false);
								setSuggestions([]);
							}}
							className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-blue-100 last:border-b-0">
							<div className="font-medium text-slate-900">
								{p.firstName} {p.lastName}
							</div>
							{p.identifier && <div className="text-xs text-slate-600 mt-0.5">Cédula: {p.identifier}</div>}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

/* ------------------------- Formulario principal ------------------------- */

export default function RoleUserConsultationForm() {
	const router = useRouter();
	const [doctorId, setDoctorId] = useState<string | null>(null);
	const [organizationId, setOrganizationId] = useState<string | null>(null);
	const [organizationName, setOrganizationName] = useState<string | null>(null);
	const [patientType, setPatientType] = useState<'registered' | 'unregistered'>('registered');
	const [patientId, setPatientId] = useState('');
	const [unregisteredPatientId, setUnregisteredPatientId] = useState('');
	const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
	const [consultationDate, setConsultationDate] = useState('');
	const [chiefComplaint, setChiefComplaint] = useState('');
	const [notes, setNotes] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [fetchingSession, setFetchingSession] = useState(true);

	// Datos del paciente no registrado
	const [unregisteredFirstName, setUnregisteredFirstName] = useState('');
	const [unregisteredLastName, setUnregisteredLastName] = useState('');
	const [unregisteredIdentification, setUnregisteredIdentification] = useState('');
	const [unregisteredPhone, setUnregisteredPhone] = useState('');
	const [unregisteredEmail, setUnregisteredEmail] = useState('');
	const [unregisteredBirthDate, setUnregisteredBirthDate] = useState('');
	const [unregisteredSex, setUnregisteredSex] = useState<'M' | 'F' | 'OTHER' | ''>('');
	const [unregisteredAddress, setUnregisteredAddress] = useState('');

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
		}
	}, [patientType]);

	// Obtener doctor_id y organization_id desde la sesión de role-user
	useEffect(() => {
		async function fetchRoleUserSession() {
			try {
				setFetchingSession(true);
				const res = await fetch('/api/role-users/login', {
					credentials: 'include',
				});

				if (!res.ok) {
					setDoctorId(null);
					setOrganizationId(null);
					setOrganizationName(null);
					return;
				}

				const data = await res.json();
				if (data.authenticated && data.user) {
					// Para usuarios de rol, usamos el organizationId pero necesitamos un doctor_id
					// Podemos usar el organizationId como referencia o buscar el doctor principal
					setOrganizationId(data.user.organizationId);
					
					// Buscar el doctor principal de la organización para asociar la consulta
					const orgRes = await fetch(`/api/organizations/${data.user.organizationId}`);
					if (orgRes.ok) {
						const orgData = await orgRes.json();
						setOrganizationName(orgData.name || null);
					}
					
					// Obtener el primer médico de la organización como referencia
					// O usar el organizationId directamente si el sistema lo permite
					setDoctorId(null); // Se asignará automáticamente por el backend basado en organizationId
				}
			} catch (err) {
				console.error('Error fetching role user session:', err);
				setDoctorId(null);
				setOrganizationId(null);
				setOrganizationName(null);
			} finally {
				setFetchingSession(false);
			}
		}
		fetchRoleUserSession();
	}, []);

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
		if (!organizationId) return setError('No se detectó la sesión del usuario de rol.');
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
				};

				const patientRes = await fetch('/api/unregistered-patients', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify(patientPayload),
				});

				const patientData = await patientRes.json().catch(() => ({}));
				if (!patientRes.ok) {
					setLoading(false);
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

			// Para usuarios de rol, no enviamos doctor_id ni diagnosis
			// El backend deberá asignar el doctor basado en la organización
			const payload: any = {
				organization_id: organizationId,
				chief_complaint: chiefComplaint,
				notes: notes || null,
				is_role_user: true, // Flag para indicar que es un usuario de rol
			};

			if (patientType === 'registered') {
				payload.patient_id = patientId;
			} else {
				payload.unregistered_patient_id = finalUnregisteredPatientId;
			}

			// Agregar fecha de consulta si está disponible
			if (consultationDate) {
				const consultationDateTime = new Date(consultationDate);
				payload.consultation_date = consultationDateTime.toISOString();
				payload.scheduled_at = consultationDateTime.toISOString();
			}

			const res = await fetch('/api/role-users/consultations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(payload),
			});
			const data = await res.json().catch(() => ({}));
			setLoading(false);
			if (!res.ok) {
				console.error('Error creando consulta', res.status, data);
				return setError(data.error || 'Error al crear consulta.');
			}
			// redirigir a la lista de consultas
			router.push('/dashboard/role-user/consultas');
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
					<h2 className="text-2xl font-semibold text-slate-900">Nueva Consulta</h2>
					<p className="text-sm text-slate-700 mt-1">Registro administrativo de consulta (sin datos médicos sensibles).</p>
				</div>
				<div className="text-right">
					<div className="text-xs text-slate-700">Estado</div>
					<div className="text-sm font-medium text-emerald-600">{fetchingSession ? 'Comprobando sesión...' : organizationId ? 'Sesión detectada' : 'Sesión no detectada'}</div>
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
							{organizationName && (
								<div className="mt-2 text-xs text-slate-700">
									Organización: <span className="font-medium text-slate-900">{organizationName}</span>
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

			{/* Campos administrativos (sin datos médicos sensibles) */}
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
					<TextareaInput id="notes" label="Notas administrativas (opcional)" value={notes} onChange={setNotes} placeholder="Observaciones generales, información administrativa..." rows={4} />
				</div>
				<p className="text-xs text-slate-500 italic">
					Nota: Esta consulta es de registro administrativo. Los datos médicos sensibles (diagnóstico, signos vitales) deben ser registrados por el médico especialista.
				</p>
			</Card>

			{/* Actions */}
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<button type="submit" disabled={loading || !organizationId} className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-2xl shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed" aria-disabled={loading || !organizationId}>
						{loading ? <Loader2 className="animate-spin" size={18} /> : <FileText size={16} />}
						<span>{loading ? 'Guardando...' : 'Crear Consulta'}</span>
					</button>

					<button type="button" onClick={() => router.push('/dashboard/role-user/consultas')} className="px-5 py-3 border border-blue-200 rounded-2xl text-slate-800 bg-white hover:bg-blue-50 transition">
						Cancelar
					</button>
				</div>

				<div className="text-sm text-slate-700">
					<div className="hidden sm:block">El registro se guardará en el sistema.</div>
				</div>
			</div>

			{error && <div className="mt-2 rounded-lg border border-rose-100 bg-rose-50 text-rose-700 px-4 py-3 text-sm">{error}</div>}
		</form>
	);
}

