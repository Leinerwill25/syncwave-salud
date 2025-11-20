'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, User, Building2, Search, ChevronLeft, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type MedicService = {
	name: string;
	description: string;
	price: string;
	currency: 'USD' | 'VES' | 'EUR';
};

type Doctor = {
	id: string;
	name: string | null;
	email: string | null;
	medic_profile: {
		specialty: string | null;
		private_specialty: string | null;
		photo_url: string | null;
		services: MedicService[] | null;
	} | null;
};

type Organization = {
	id: string;
	name: string;
	type: string;
	organization_id?: string;
	clinic_profile: {
		trade_name: string | null;
		specialties: any[];
		address_operational?: string | null;
	} | null;
};

export default function NewAppointmentPage() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [step, setStep] = useState<'organization' | 'doctor' | 'schedule' | 'confirm'>('organization');

	// Form data
	const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
	const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
	const [selectedDate, setSelectedDate] = useState<string>('');
	const [selectedTime, setSelectedTime] = useState<string>('');
	const [reason, setReason] = useState<string>('');
	const [location, setLocation] = useState<string>('');
	const [selectedService, setSelectedService] = useState<MedicService | null>(null);

	// Data
	const [organizations, setOrganizations] = useState<Organization[]>([]);
	const [doctors, setDoctors] = useState<Doctor[]>([]);
	const [availableSlots, setAvailableSlots] = useState<string[]>([]);
	const [availableDays, setAvailableDays] = useState<number[]>([]); // 0 = Sunday, 1 = Monday, etc.
	const [loadingSlots, setLoadingSlots] = useState(false);
	const [loadingDays, setLoadingDays] = useState(false);
	const [slotsError, setSlotsError] = useState<string | null>(null);
	const [searchOrg, setSearchOrg] = useState('');
	const [searchDoctor, setSearchDoctor] = useState('');

	useEffect(() => {
		loadOrganizations();
	}, []);

	useEffect(() => {
		if (selectedOrganization) {
			loadDoctors();
		}
	}, [selectedOrganization]);

	useEffect(() => {
		if (selectedDoctor) {
			loadAvailableDays();
		} else {
			setAvailableDays([]);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedDoctor]);

	useEffect(() => {
		if (selectedDoctor && selectedDate) {
			loadAvailableSlots();
		} else {
			// Limpiar slots si no hay doctor o fecha
			setAvailableSlots([]);
			setSlotsError(null);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedDoctor, selectedDate]);

	const loadOrganizations = async () => {
		try {
			setLoading(true);

			// Cargar clínicas
			const clinicsRes = await fetch('/api/patient/clinics?per_page=50', {
				credentials: 'include',
			});

			// Cargar consultorios privados
			const consultoriosRes = await fetch('/api/patient/explore?type=CONSULTORIO_PRIVADO&per_page=50', {
				credentials: 'include',
			});

			const allOrgs: Organization[] = [];

			// Procesar clínicas
			if (clinicsRes.ok) {
				const clinicsData = await clinicsRes.json();
				const clinics = (clinicsData.data || []).map((clinic: any) => ({
					id: clinic.organization_id || clinic.organization?.id || clinic.id,
					name: clinic.organization?.name || clinic.legal_name || clinic.trade_name,
					type: clinic.organization?.type || 'CLINICA',
					organization_id: clinic.organization_id || clinic.organization?.id,
					clinic_profile: {
						trade_name: clinic.trade_name,
						specialties: clinic.specialties || [],
						address_operational: clinic.address_operational,
					},
				}));
				allOrgs.push(...clinics);
			}

			// Procesar consultorios privados
			if (consultoriosRes.ok) {
				const consultoriosData = await consultoriosRes.json();
				const consultorios = (consultoriosData.data || []).map((consultorio: any) => ({
					id: consultorio.organization?.id || consultorio.id,
					name: consultorio.name || consultorio.organization?.name,
					type: consultorio.organization?.type || 'CONSULTORIO',
					organization_id: consultorio.organization?.id || consultorio.id,
					clinic_profile: {
						trade_name: consultorio.name,
						specialties: consultorio.specialties || consultorio.specialty ? [consultorio.specialty] : [],
						address_operational: consultorio.address,
					},
				}));
				allOrgs.push(...consultorios);
			}

			setOrganizations(allOrgs);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const loadDoctors = async () => {
		if (!selectedOrganization) return;

		try {
			setLoading(true);
			// Usar organization_id si está disponible, sino usar id
			const orgId = selectedOrganization.organization_id || selectedOrganization.id;

			// Si es un consultorio, usar la API de explore para obtener el médico
			if (selectedOrganization.type === 'CONSULTORIO') {
				const res = await fetch(`/api/patient/explore?type=CONSULTORIO_PRIVADO&per_page=50`, {
					credentials: 'include',
				});

				if (res.ok) {
					const data = await res.json();
					const consultorio = (data.data || []).find((c: any) => (c.organization?.id || c.id) === orgId);

					if (consultorio && consultorio.doctor) {
						// Parsear services si viene como string JSON o array
						let services = consultorio.services || null;
						if (services && typeof services === 'string') {
							try {
								services = JSON.parse(services);
							} catch {
								services = null;
							}
						}

						// Mapear el doctor del consultorio al formato esperado
						setDoctors([
							{
								id: consultorio.doctor.id,
								name: consultorio.doctor.name,
								email: consultorio.doctor.email,
								medic_profile: {
									specialty: consultorio.specialty || null,
									private_specialty: consultorio.specialty || null,
									photo_url: consultorio.photo || null,
									services: services,
								},
							},
						]);
					} else {
						setDoctors([]);
					}
				} else {
					setDoctors([]);
				}
			} else {
				// Para clínicas, usar la API normal
				const res = await fetch(`/api/patient/clinics/${orgId}`, {
					credentials: 'include',
				});

				if (!res.ok) throw new Error('Error al cargar médicos');

				const clinicData = await res.json();
				if (clinicData.doctors) {
					// Mapear los doctores al formato esperado
					const mappedDoctors = (clinicData.doctors || []).map((doc: any) => {
						// Parsear services si viene como string JSON
						let services = doc.medic_profile?.services || null;
						if (services && typeof services === 'string') {
							try {
								services = JSON.parse(services);
							} catch {
								services = null;
							}
						}

						return {
							id: doc.id,
							name: doc.name,
							email: doc.email,
							medic_profile: {
								specialty: doc.medic_profile?.specialty || null,
								private_specialty: doc.medic_profile?.private_specialty || null,
								photo_url: doc.medic_profile?.photo_url || null,
								services: services,
							},
						};
					});
					setDoctors(mappedDoctors);
				} else {
					setDoctors([]);
				}
			}
		} catch (err) {
			console.error('Error:', err);
			setDoctors([]);
		} finally {
			setLoading(false);
		}
	};

	const loadAvailableDays = async () => {
		if (!selectedDoctor) {
			setAvailableDays([]);
			return;
		}

		try {
			setLoadingDays(true);
			const params = new URLSearchParams({
				doctor_id: selectedDoctor.id,
			});
			if (selectedOrganization) {
				const orgId = selectedOrganization.organization_id || selectedOrganization.id;
				params.set('organization_id', orgId);
			}

			const res = await fetch(`/api/patient/appointments/available-days?${params.toString()}`, {
				credentials: 'include',
			});

			if (!res.ok) {
				console.error('[New Appointment] Error cargando días disponibles');
				return;
			}

			const data = await res.json();
			console.log('[New Appointment] Días disponibles:', data.availableDays);
			setAvailableDays(data.availableDays || []);
		} catch (err) {
			console.error('[New Appointment] Error cargando días disponibles:', err);
		} finally {
			setLoadingDays(false);
		}
	};

	const loadAvailableSlots = async () => {
		if (!selectedDate) {
			setAvailableSlots([]);
			setSlotsError(null);
			return;
		}

		// Si no hay doctor seleccionado, no cargar slots
		if (!selectedDoctor) {
			setAvailableSlots([]);
			setSlotsError('Selecciona un médico para ver los horarios disponibles');
			return;
		}

		try {
			setLoadingSlots(true);
			setSlotsError(null);

			const params = new URLSearchParams({
				doctor_id: selectedDoctor.id,
				date: selectedDate,
			});
			if (selectedOrganization) {
				const orgId = selectedOrganization.organization_id || selectedOrganization.id;
				params.set('organization_id', orgId);
			}

			console.log('[New Appointment] Cargando slots disponibles:', {
				doctor_id: selectedDoctor.id,
				date: selectedDate,
				organization_id: selectedOrganization?.organization_id || selectedOrganization?.id,
			});

			const res = await fetch(`/api/patient/appointments/available?${params.toString()}`, {
				credentials: 'include',
			});

			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				throw new Error(errorData.error || 'Error al cargar horarios disponibles');
			}

			const data = await res.json();
			console.log('[New Appointment] Slots recibidos:', data);

			setAvailableSlots(data.availableSlots || []);

			if (!data.availableSlots || data.availableSlots.length === 0) {
				setSlotsError('No hay horarios disponibles para esta fecha. Intenta con otra fecha.');
			}
		} catch (err) {
			console.error('[New Appointment] Error cargando slots:', err);
			const errorMessage = err instanceof Error ? err.message : 'Error al cargar horarios disponibles';
			setSlotsError(errorMessage);
			setAvailableSlots([]);
		} finally {
			setLoadingSlots(false);
		}
	};

	const handleSubmit = async () => {
		if (!selectedDate || !selectedTime || !selectedOrganization) {
			alert('Por favor complete todos los campos requeridos');
			return;
		}

		try {
			setSubmitting(true);
			const scheduledAt = `${selectedDate}T${selectedTime}:00`;

			// Usar organization_id si está disponible, sino usar id
			const orgId = selectedOrganization.organization_id || selectedOrganization.id;

			const res = await fetch('/api/patient/appointments/new', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					doctor_id: selectedDoctor?.id || null,
					organization_id: orgId,
					scheduled_at: scheduledAt,
					duration_minutes: 30,
					reason: reason || null,
					location: location || selectedOrganization.clinic_profile?.address_operational || null,
					selected_service: selectedService
						? {
								name: selectedService.name,
								description: selectedService.description,
								price: selectedService.price,
								currency: selectedService.currency,
						  }
						: null,
				}),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Error al crear la cita');
			}

			const data = await res.json();
			alert('Cita creada correctamente. El médico recibirá una notificación.');
			router.push('/dashboard/patient/citas');
		} catch (err: any) {
			alert(err.message || 'Error al crear la cita');
		} finally {
			setSubmitting(false);
		}
	};

	const filteredOrgs = organizations.filter((org) => org.name.toLowerCase().includes(searchOrg.toLowerCase()) || org.clinic_profile?.trade_name?.toLowerCase().includes(searchOrg.toLowerCase()));

	const filteredDoctors = doctors.filter((doctor) => doctor.name?.toLowerCase().includes(searchDoctor.toLowerCase()));

	// Obtener fecha mínima (hoy)
	const today = new Date().toISOString().split('T')[0];
	const maxDate = new Date();
	maxDate.setMonth(maxDate.getMonth() + 3);
	const maxDateStr = maxDate.toISOString().split('T')[0];

	// Función para verificar si una fecha es disponible (basado en el día de la semana)
	const isDateAvailable = (dateString: string): boolean => {
		if (availableDays.length === 0) return true; // Si no hay días configurados, permitir todos

		const date = new Date(dateString + 'T00:00:00');
		const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
		return availableDays.includes(dayOfWeek);
	};

	// Función para deshabilitar fechas en el input date
	const getDateInputProps = () => {
		return {
			min: today,
			max: maxDateStr,
			// No podemos usar directamente el atributo disabled en input type="date"
			// pero podemos validar al cambiar
		};
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
				<div className="flex items-center gap-4 mb-6">
					<Link href="/dashboard/patient/citas" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
						<ChevronLeft className="w-5 h-5 text-gray-600" />
					</Link>
					<div>
						<h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Nueva Cita</h1>
						<p className="text-gray-600 mt-1">Agenda una cita médica</p>
					</div>
				</div>

				{/* Progress Steps */}
				<div className="flex items-center justify-between mb-8">
					{[
						{ id: 'organization', label: 'Clínica/Consultorio', icon: Building2 },
						{ id: 'doctor', label: 'Médico', icon: User },
						{ id: 'schedule', label: 'Horario', icon: Calendar },
						{ id: 'confirm', label: 'Confirmar', icon: CheckCircle },
					].map((s, idx) => {
						const Icon = s.icon;
						const isActive = step === s.id;
						const isCompleted = ['organization', 'doctor', 'schedule', 'confirm'].indexOf(step) > idx;

						return (
							<div key={s.id} className="flex items-center flex-1">
								<div className="flex flex-col items-center flex-1">
									<div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-110' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
										<Icon className="w-6 h-6" />
									</div>
									<span className={`mt-2 text-sm font-medium ${isActive ? 'text-indigo-600' : 'text-gray-500'}`}>{s.label}</span>
								</div>
								{idx < 3 && <div className={`flex-1 h-1 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />}
							</div>
						);
					})}
				</div>
			</div>

			{/* Step 1: Select Organization */}
			{step === 'organization' && (
				<div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
					<h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
						<Building2 className="w-6 h-6 text-indigo-600" />
						Selecciona una Clínica o Consultorio
					</h2>

					<div className="relative mb-6">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
						<input type="text" placeholder="Buscar clínica o consultorio..." value={searchOrg} onChange={(e) => setSearchOrg(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
					</div>

					{loading ? (
						<div className="text-center py-12">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{filteredOrgs.map((org) => (
								<button
									key={org.id}
									onClick={() => {
										setSelectedOrganization(org);
										setStep('doctor');
									}}
									className={`p-6 rounded-xl border-2 transition-all text-left ${selectedOrganization?.id === org.id ? 'border-indigo-600 bg-indigo-50 shadow-lg' : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'}`}>
									<div className="flex items-center gap-3 mb-2">
										<div className="p-2 bg-indigo-100 rounded-lg">
											<Building2 className="w-5 h-5 text-indigo-600" />
										</div>
										<h3 className="font-bold text-gray-900">{org.clinic_profile?.trade_name || org.name}</h3>
									</div>
									<p className="text-sm text-gray-600">{org.name}</p>
								</button>
							))}
						</div>
					)}
				</div>
			)}

			{/* Step 2: Select Doctor */}
			{step === 'doctor' && (
				<div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
							<User className="w-6 h-6 text-indigo-600" />
							Selecciona un Médico
						</h2>
						<button onClick={() => setStep('organization')} className="text-indigo-600 hover:text-indigo-700 font-medium">
							Cambiar clínica
						</button>
					</div>

					<div className="relative mb-6">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
						<input type="text" placeholder="Buscar médico..." value={searchDoctor} onChange={(e) => setSearchDoctor(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
					</div>

					{loading ? (
						<div className="text-center py-12">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
						</div>
					) : (
						<div className="space-y-4">
							{filteredDoctors.length === 0 ? (
								<div className="text-center py-12 text-gray-500">
									<User className="w-16 h-16 mx-auto mb-4 opacity-50" />
									<p>No hay médicos disponibles en esta clínica</p>
									<button
										onClick={() => {
											setSelectedDoctor(null);
											setStep('schedule');
										}}
										className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
										Continuar sin seleccionar médico
									</button>
								</div>
							) : (
								filteredDoctors.map((doctor) => (
									<button
										key={doctor.id}
										onClick={() => {
											setSelectedDoctor(doctor);
											setStep('schedule');
										}}
										className={`w-full p-6 rounded-xl border-2 transition-all text-left ${selectedDoctor?.id === doctor.id ? 'border-indigo-600 bg-indigo-50 shadow-lg' : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'}`}>
										<div className="flex items-center gap-4">
											{doctor.medic_profile?.photo_url ? (
												<img src={doctor.medic_profile.photo_url} alt={doctor.name || 'Médico'} className="w-16 h-16 rounded-full object-cover" />
											) : (
												<div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
													<User className="w-8 h-8 text-indigo-600" />
												</div>
											)}
											<div className="flex-1">
												<h3 className="font-bold text-gray-900 text-lg">Dr. {doctor.name || 'Médico'}</h3>
												<p className="text-gray-600">{doctor.medic_profile?.specialty || doctor.medic_profile?.private_specialty || 'Especialista'}</p>
											</div>
										</div>
									</button>
								))
							)}
						</div>
					)}
				</div>
			)}

			{/* Step 3: Select Schedule */}
			{step === 'schedule' && (
				<div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
							<Calendar className="w-6 h-6 text-indigo-600" />
							Selecciona Fecha y Hora
						</h2>
						<button
							onClick={() => {
								setStep('doctor');
								setSelectedTime('');
								setAvailableSlots([]);
								setSlotsError(null);
							}}
							className="text-indigo-600 hover:text-indigo-700 font-medium">
							Cambiar médico
						</button>
					</div>

					{/* Información del médico seleccionado */}
					{selectedDoctor && (
						<div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
							<div className="flex items-center gap-3">
								<User className="w-5 h-5 text-indigo-600" />
								<div>
									<p className="text-sm text-indigo-600 font-medium">Médico seleccionado</p>
									<p className="text-lg font-semibold text-gray-900">Dr. {selectedDoctor.name}</p>
									{selectedDoctor.medic_profile && <p className="text-sm text-gray-600">{selectedDoctor.medic_profile.specialty || selectedDoctor.medic_profile.private_specialty || 'Especialista'}</p>}
								</div>
							</div>
						</div>
					)}

					{/* Servicios y Precios */}
					{selectedDoctor?.medic_profile?.services && Array.isArray(selectedDoctor.medic_profile.services) && selectedDoctor.medic_profile.services.length > 0 && (
						<div className="mb-6 p-6 bg-white border-2 border-teal-200 rounded-xl">
							<h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
								<DollarSign className="w-5 h-5 text-teal-600" />
								Servicios y Precios
							</h3>
							<p className="text-sm text-gray-600 mb-4">Selecciona el servicio que deseas agendar:</p>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{selectedDoctor.medic_profile.services.map((service, idx) => {
									const isSelected = selectedService?.name === service.name;
									return (
										<button key={idx} type="button" onClick={() => setSelectedService(service)} className={`p-4 rounded-xl border-2 transition-all text-left ${isSelected ? 'border-teal-600 bg-teal-50 shadow-md' : 'border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50/50'}`}>
											<div className="flex items-start justify-between mb-2">
												<h4 className="font-semibold text-gray-900">{service.name}</h4>
												{isSelected && (
													<div className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center">
														<CheckCircle className="w-3 h-3 text-white" />
													</div>
												)}
											</div>
											{service.description && <p className="text-sm text-gray-600 mb-2">{service.description}</p>}
											<div className="flex items-center gap-2 mt-3">
												<span className="text-2xl font-bold text-teal-600">
													{service.price} {service.currency}
												</span>
											</div>
										</button>
									);
								})}
							</div>
							{selectedService && (
								<div className="mt-4 p-4 bg-teal-50 border border-teal-200 rounded-lg">
									<p className="text-sm font-medium text-teal-900">
										Servicio seleccionado: <span className="font-bold">{selectedService.name}</span> - {selectedService.price} {selectedService.currency}
									</p>
								</div>
							)}
						</div>
					)}

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Fecha
								{availableDays.length > 0 && <span className="ml-2 text-xs text-gray-500 font-normal">(Solo días disponibles)</span>}
							</label>
							<input
								type="date"
								value={selectedDate}
								onChange={(e) => {
									const newDate = e.target.value;
									if (newDate && !isDateAvailable(newDate)) {
										alert('Este día no está disponible. Por favor selecciona un día en el que el médico atiende.');
										return;
									}
									setSelectedDate(newDate);
									setSelectedTime('');
									setAvailableSlots([]);
									setSlotsError(null);
								}}
								{...getDateInputProps()}
								className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							/>
							{availableDays.length > 0 && (
								<div className="mt-2 text-xs text-gray-600">
									<p className="font-medium mb-1">Días disponibles:</p>
									<div className="flex flex-wrap gap-2">
										{['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(
											(day, idx) =>
												availableDays.includes(idx) && (
													<span key={idx} className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
														{day}
													</span>
												)
										)}
									</div>
								</div>
							)}
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Hora</label>
							{!selectedDate ? (
								<div className="px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">Selecciona una fecha primero</div>
							) : !selectedDoctor ? (
								<div className="px-4 py-3 border border-yellow-300 rounded-lg bg-yellow-50 text-yellow-700">Selecciona un médico primero para ver los horarios disponibles</div>
							) : loadingSlots ? (
								<div className="px-4 py-8 border border-gray-300 rounded-lg bg-gray-50 text-center">
									<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
									<p className="text-sm text-gray-600">Cargando horarios disponibles...</p>
								</div>
							) : slotsError ? (
								<div className="px-4 py-3 border border-red-300 rounded-lg bg-red-50 text-red-700">
									<AlertCircle className="w-4 h-4 inline mr-2" />
									{slotsError}
								</div>
							) : availableSlots.length === 0 ? (
								<div className="col-span-3 text-center py-8 text-gray-500 border border-gray-300 rounded-lg bg-gray-50">
									<Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
									<p>No hay horarios disponibles para esta fecha</p>
									<p className="text-sm mt-2">Intenta seleccionar otra fecha</p>
								</div>
							) : (
								<div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50">
									{availableSlots.map((slot) => (
										<button key={slot} type="button" onClick={() => setSelectedTime(slot)} className={`px-4 py-2 rounded-lg border-2 transition-all ${selectedTime === slot ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold shadow-md' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-gray-700 bg-white'}`}>
											{slot}
										</button>
									))}
								</div>
							)}
						</div>
					</div>

					<div className="mb-6">
						<label className="block text-sm font-medium text-gray-700 mb-2">Motivo de la consulta</label>
						<textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe el motivo de tu consulta..." rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
					</div>

					<div className="flex gap-4">
						<button onClick={() => setStep('doctor')} className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
							Anterior
						</button>
						<button onClick={() => setStep('confirm')} disabled={!selectedDate || !selectedTime} className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
							Continuar
						</button>
					</div>
				</div>
			)}

			{/* Step 4: Confirm */}
			{step === 'confirm' && (
				<div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
					<h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
						<CheckCircle className="w-6 h-6 text-green-600" />
						Confirmar Cita
					</h2>

					<div className="bg-gray-50 rounded-xl p-6 mb-6 space-y-4">
						<div className="flex items-center gap-3">
							<Building2 className="w-5 h-5 text-gray-400" />
							<div>
								<p className="text-sm text-gray-600">Clínica</p>
								<p className="font-semibold text-gray-900">{selectedOrganization?.clinic_profile?.trade_name || selectedOrganization?.name}</p>
							</div>
						</div>
						{selectedDoctor && (
							<div className="flex items-center gap-3">
								<User className="w-5 h-5 text-gray-400" />
								<div>
									<p className="text-sm text-gray-600">Médico</p>
									<p className="font-semibold text-gray-900">Dr. {selectedDoctor.name}</p>
								</div>
							</div>
						)}
						<div className="flex items-center gap-3">
							<Calendar className="w-5 h-5 text-gray-400" />
							<div>
								<p className="text-sm text-gray-600">Fecha y Hora</p>
								<p className="font-semibold text-gray-900">
									{new Date(`${selectedDate}T${selectedTime}`).toLocaleDateString('es-ES', {
										weekday: 'long',
										year: 'numeric',
										month: 'long',
										day: 'numeric',
									})}{' '}
									a las {selectedTime}
								</p>
							</div>
						</div>
						{reason && (
							<div>
								<p className="text-sm text-gray-600 mb-1">Motivo</p>
								<p className="text-gray-900">{reason}</p>
							</div>
						)}
						{selectedService && (
							<div className="flex items-center gap-3">
								<DollarSign className="w-5 h-5 text-teal-600" />
								<div>
									<p className="text-sm text-gray-600">Servicio Seleccionado</p>
									<p className="font-semibold text-gray-900">{selectedService.name}</p>
									{selectedService.description && <p className="text-xs text-gray-500 mt-1">{selectedService.description}</p>}
									<p className="text-lg font-bold text-teal-600 mt-1">
										{selectedService.price} {selectedService.currency}
									</p>
								</div>
							</div>
						)}
					</div>

					<div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
						<AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
						<p className="text-sm text-blue-800">El médico recibirá una notificación y podrá confirmar tu cita. Te notificaremos cuando sea confirmada.</p>
					</div>

					<div className="flex gap-4">
						<button onClick={() => setStep('schedule')} className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
							Anterior
						</button>
						<button onClick={handleSubmit} disabled={submitting} className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
							{submitting ? 'Creando cita...' : 'Confirmar y Crear Cita'}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
