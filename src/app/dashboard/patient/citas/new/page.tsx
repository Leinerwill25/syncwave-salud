'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, User, Building2, Search, ChevronLeft, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AlertModal from '@/components/ui/AlertModal';

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

	// Modal state
	const [modal, setModal] = useState<{
		isOpen: boolean;
		type: 'success' | 'error' | 'info' | 'warning';
		title: string;
		message: string;
		onConfirm?: () => void;
	}>({
		isOpen: false,
		type: 'info',
		title: '',
		message: '',
	});

	// Helper para extraer el organization_id real
	const getOrganizationId = (org: Organization | null): string | null => {
		if (!org) return null;
		// Si tiene organization_id, usarlo directamente
		if (org.organization_id) return org.organization_id;
		// Si el id es compuesto (formato: "uuid-consultorio-index"), extraer el UUID
		if (org.id && org.id.includes('-consultorio-')) {
			const idParts = org.id.split('-consultorio-');
			return idParts[0];
		}
		// Si no, usar el id directamente
		return org.id;
	};

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

			// Solo cargar consultorios privados (no clínicas, farmacias o laboratorios)
			const consultoriosRes = await fetch('/api/patient/explore?type=CONSULTORIO_PRIVADO&per_page=50', {
				credentials: 'include',
			});

			const allOrgs: Organization[] = [];

			// Procesar consultorios privados
			if (consultoriosRes.ok) {
				const consultoriosData = await consultoriosRes.json();
				// Usar un Set para evitar duplicados basados en organization_id
				const seenIds = new Set<string>();

				const consultorios = (consultoriosData.data || [])
					.filter((consultorio: any) => {
						const orgId = consultorio.organization?.id || consultorio.id;
						if (!orgId || seenIds.has(orgId)) {
							return false;
						}
						seenIds.add(orgId);
						return true;
					})
					.map((consultorio: any, index: number) => {
						const orgId = consultorio.organization?.id || consultorio.id;
						// Crear un ID único combinando organization_id con un índice para evitar duplicados
						return {
							id: `${orgId}-consultorio-${index}`,
							organization_id: orgId, // Mantener el organization_id real para usar en otras llamadas
							name: consultorio.name || consultorio.organization?.name || consultorio.trade_name || consultorio.legal_name,
							type: 'CONSULTORIO',
							clinic_profile: {
								trade_name: consultorio.trade_name || consultorio.name || consultorio.organization?.name,
								specialties: Array.isArray(consultorio.specialties) ? consultorio.specialties : consultorio.specialty ? [consultorio.specialty] : [],
								address_operational: consultorio.address_operational || consultorio.address,
							},
						};
					});
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
			// Extraer el organization_id real
			const orgId = getOrganizationId(selectedOrganization);
			if (!orgId) {
				setDoctors([]);
				return;
			}

			// Solo manejar consultorios
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
				const orgId = getOrganizationId(selectedOrganization);
				if (orgId) {
					params.set('organization_id', orgId);
				}
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
				const orgId = getOrganizationId(selectedOrganization);
				if (orgId) {
					params.set('organization_id', orgId);
				}
			}

			console.log('[New Appointment] Cargando slots disponibles:', {
				doctor_id: selectedDoctor.id,
				date: selectedDate,
				organization_id: getOrganizationId(selectedOrganization),
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

	const showModal = (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string, onConfirm?: () => void) => {
		setModal({
			isOpen: true,
			type,
			title,
			message,
			onConfirm,
		});
	};

	const closeModal = () => {
		setModal((prev) => ({ ...prev, isOpen: false }));
	};

	const handleSubmit = async () => {
		if (!selectedDate || !selectedTime || !selectedOrganization) {
			showModal('warning', 'Campos Incompletos', 'Por favor complete todos los campos requeridos para continuar.');
			return;
		}

		// Validar servicio si el doctor tiene servicios
		if (selectedDoctor?.medic_profile?.services && Array.isArray(selectedDoctor.medic_profile.services) && selectedDoctor.medic_profile.services.length > 0 && !selectedService) {
			showModal('warning', 'Servicio Requerido', 'Por favor selecciona un servicio para agendar la cita.');
			return;
		}

		try {
			setSubmitting(true);
			const scheduledAt = `${selectedDate}T${selectedTime}:00`;

			// Extraer el organization_id real
			const orgId = getOrganizationId(selectedOrganization);
			if (!orgId) {
				showModal('error', 'Error de Configuración', 'No se pudo obtener el ID de la organización. Por favor intenta nuevamente.');
				return;
			}

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
				const errorMessage = data.error || data.detail || 'Error al crear la cita';

				if (res.status === 401) {
					showModal('error', 'Sesión Expirada', 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.', () => {
						router.push('/login');
					});
				} else {
					showModal('error', 'Error al Crear Cita', errorMessage);
				}
				return;
			}

			const data = await res.json();
			showModal('success', '¡Cita Creada Exitosamente!', 'Tu cita ha sido registrada correctamente. El médico recibirá una notificación y podrá confirmarla.', () => {
				router.push('/dashboard/patient/citas');
			});
		} catch (err: any) {
			showModal('error', 'Error Inesperado', err.message || 'Ocurrió un error inesperado al crear la cita. Por favor intenta nuevamente.');
		} finally {
			setSubmitting(false);
		}
	};

	// Filtrar solo consultorios y aplicar búsqueda
	const filteredOrgs = organizations.filter((org) => {
		// Asegurar que solo sean consultorios
		if (org.type !== 'CONSULTORIO') return false;
		// Aplicar búsqueda
		const searchLower = searchOrg.toLowerCase();
		return org.name.toLowerCase().includes(searchLower) || org.clinic_profile?.trade_name?.toLowerCase().includes(searchLower);
	});

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
		<div className="space-y-4 sm:space-y-6">
			{/* Header */}
			<div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 md:p-8">
				<div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
					<Link href="/dashboard/patient/citas" className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
						<ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
					</Link>
					<div className="min-w-0 flex-1">
						<h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Nueva Cita</h1>
						<p className="text-gray-600 mt-0.5 sm:mt-1 text-sm sm:text-base">Agenda una cita médica</p>
					</div>
				</div>

				{/* Progress Steps */}
				<div className="flex items-center justify-between mb-4 sm:mb-8 overflow-x-auto pb-2 -mx-2 sm:mx-0 px-2 sm:px-0">
					{[
						{ id: 'organization', label: 'Clínica/Consultorio', shortLabel: 'Clínica', icon: Building2 },
						{ id: 'doctor', label: 'Médico', shortLabel: 'Médico', icon: User },
						{ id: 'schedule', label: 'Horario', shortLabel: 'Horario', icon: Calendar },
						{ id: 'confirm', label: 'Confirmar', shortLabel: 'Confirmar', icon: CheckCircle },
					].map((s, idx) => {
						const Icon = s.icon;
						const isActive = step === s.id;
						const isCompleted = ['organization', 'doctor', 'schedule', 'confirm'].indexOf(step) > idx;

						return (
							<div key={s.id} className="flex items-center flex-1 min-w-0">
								<div className="flex flex-col items-center flex-1 min-w-0">
									<div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${isActive ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-110' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
										<Icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
									</div>
									<span className={`mt-1 sm:mt-2 text-[10px] sm:text-xs md:text-sm font-medium text-center ${isActive ? 'text-indigo-600' : 'text-gray-500'} hidden sm:block`}>{s.label}</span>
									<span className={`mt-1 text-[9px] font-medium text-center ${isActive ? 'text-indigo-600' : 'text-gray-500'} sm:hidden`}>{s.shortLabel}</span>
								</div>
								{idx < 3 && <div className={`flex-1 h-0.5 sm:h-1 mx-1 sm:mx-2 min-w-[8px] sm:min-w-0 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'} hidden sm:block`} />}
							</div>
						);
					})}
				</div>
			</div>

			{/* Step 1: Select Organization */}
			{step === 'organization' && (
				<div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 md:p-8">
					<h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
						<Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 flex-shrink-0" />
						<span>Selecciona un Consultorio</span>
					</h2>

					<div className="relative mb-4 sm:mb-6">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
						<input 
							type="text" 
							placeholder="Buscar consultorio..." 
							value={searchOrg} 
							onChange={(e) => setSearchOrg(e.target.value)} 
							className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base" 
						/>
					</div>

					{loading ? (
						<div className="text-center py-8 sm:py-12">
							<div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-indigo-600 mx-auto"></div>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
							{filteredOrgs.map((org) => (
								<button
									key={org.id}
									onClick={() => {
										setSelectedOrganization(org);
										setStep('doctor');
									}}
									className={`p-4 sm:p-6 rounded-xl border-2 transition-all text-left ${selectedOrganization?.id === org.id ? 'border-indigo-600 bg-indigo-50 shadow-lg' : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'}`}>
									<div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
										<div className="p-1.5 sm:p-2 bg-indigo-100 rounded-lg flex-shrink-0">
											<Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
										</div>
										<h3 className="font-bold text-gray-900 text-sm sm:text-base break-words">{org.clinic_profile?.trade_name || org.name}</h3>
									</div>
									<p className="text-xs sm:text-sm text-gray-600 break-words">{org.name}</p>
								</button>
							))}
						</div>
					)}
				</div>
			)}

			{/* Step 2: Select Doctor */}
			{step === 'doctor' && (
				<div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 md:p-8">
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
						<h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
							<User className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 flex-shrink-0" />
							<span>Selecciona un Médico</span>
						</h2>
						<button onClick={() => setStep('organization')} className="text-sm sm:text-base text-indigo-600 hover:text-indigo-700 font-medium whitespace-nowrap">
							Cambiar clínica
						</button>
					</div>

					<div className="relative mb-4 sm:mb-6">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
						<input 
							type="text" 
							placeholder="Buscar médico..." 
							value={searchDoctor} 
							onChange={(e) => setSearchDoctor(e.target.value)} 
							className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base" 
						/>
					</div>

					{loading ? (
						<div className="text-center py-8 sm:py-12">
							<div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-indigo-600 mx-auto"></div>
						</div>
					) : (
						<div className="space-y-3 sm:space-y-4">
							{filteredDoctors.length === 0 ? (
								<div className="text-center py-8 sm:py-12 text-gray-500">
									<User className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 opacity-50" />
									<p className="text-sm sm:text-base">No hay médicos disponibles en esta clínica</p>
									<button
										onClick={() => {
											setSelectedDoctor(null);
											setStep('schedule');
										}}
										className="mt-3 sm:mt-4 px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors text-sm sm:text-base">
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
										className={`w-full p-4 sm:p-6 rounded-xl border-2 transition-all text-left ${selectedDoctor?.id === doctor.id ? 'border-indigo-600 bg-indigo-50 shadow-lg' : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'}`}>
										<div className="flex items-center gap-3 sm:gap-4">
											{doctor.medic_profile?.photo_url ? (
												<img src={doctor.medic_profile.photo_url} alt={doctor.name || 'Médico'} className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover flex-shrink-0" />
											) : (
												<div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
													<User className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600" />
												</div>
											)}
											<div className="flex-1 min-w-0">
												<h3 className="font-bold text-gray-900 text-base sm:text-lg break-words">Dr. {doctor.name || 'Médico'}</h3>
												<p className="text-sm sm:text-base text-gray-600 break-words">{doctor.medic_profile?.specialty || doctor.medic_profile?.private_specialty || 'Especialista'}</p>
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
				<div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 md:p-8">
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
						<h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
							<Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 flex-shrink-0" />
							<span>Selecciona Fecha y Hora</span>
						</h2>
						<button
							onClick={() => {
								setStep('doctor');
								setSelectedTime('');
								setAvailableSlots([]);
								setSlotsError(null);
							}}
							className="text-sm sm:text-base text-indigo-600 hover:text-indigo-700 font-medium whitespace-nowrap">
							Cambiar médico
						</button>
					</div>

					{/* Información del médico seleccionado */}
					{selectedDoctor && (
						<div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
							<div className="flex items-center gap-2 sm:gap-3">
								<User className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" />
								<div className="min-w-0 flex-1">
									<p className="text-xs sm:text-sm text-indigo-600 font-medium">Médico seleccionado</p>
									<p className="text-base sm:text-lg font-semibold text-gray-900 break-words">Dr. {selectedDoctor.name}</p>
									{selectedDoctor.medic_profile && <p className="text-xs sm:text-sm text-gray-600 break-words">{selectedDoctor.medic_profile.specialty || selectedDoctor.medic_profile.private_specialty || 'Especialista'}</p>}
								</div>
							</div>
						</div>
					)}

					{/* Servicios y Precios */}
					{selectedDoctor?.medic_profile?.services && Array.isArray(selectedDoctor.medic_profile.services) && selectedDoctor.medic_profile.services.length > 0 && (
						<div className="mb-4 sm:mb-6 p-4 sm:p-6 bg-white border-2 border-teal-200 rounded-xl">
							<h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
								<DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 flex-shrink-0" />
								<span>Servicios y Precios</span>
							</h3>
							<p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">Selecciona el servicio que deseas agendar:</p>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
								{selectedDoctor.medic_profile.services.map((service, idx) => {
									const isSelected = selectedService?.name === service.name;
									return (
										<button key={idx} type="button" onClick={() => setSelectedService(service)} className={`p-3 sm:p-4 rounded-xl border-2 transition-all text-left ${isSelected ? 'border-teal-600 bg-teal-50 shadow-md' : 'border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50/50'}`}>
											<div className="flex items-start justify-between mb-1 sm:mb-2 gap-2">
												<h4 className="font-semibold text-gray-900 text-sm sm:text-base break-words flex-1">{service.name}</h4>
												{isSelected && (
													<div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0">
														<CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
													</div>
												)}
											</div>
											{service.description && <p className="text-xs sm:text-sm text-gray-600 mb-2 break-words">{service.description}</p>}
											<div className="flex items-center gap-2 mt-2 sm:mt-3">
												<span className="text-lg sm:text-2xl font-bold text-teal-600">
													{service.price} {service.currency}
												</span>
											</div>
										</button>
									);
								})}
							</div>
							{selectedService && (
								<div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-teal-50 border border-teal-200 rounded-lg">
									<p className="text-xs sm:text-sm font-medium text-teal-900 break-words">
										Servicio seleccionado: <span className="font-bold">{selectedService.name}</span> - {selectedService.price} {selectedService.currency}
									</p>
								</div>
							)}
						</div>
					)}

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
						<div>
							<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
								Fecha
								{availableDays.length > 0 && <span className="ml-1 sm:ml-2 text-[10px] sm:text-xs text-gray-500 font-normal">(Solo días disponibles)</span>}
							</label>
							<input
								type="date"
								value={selectedDate}
								onChange={(e) => {
									const newDate = e.target.value;
									if (newDate && !isDateAvailable(newDate)) {
										showModal('warning', 'Día No Disponible', 'Este día no está disponible. Por favor selecciona un día en el que el médico atiende.');
										return;
									}
									setSelectedDate(newDate);
									setSelectedTime('');
									setAvailableSlots([]);
									setSlotsError(null);
								}}
								{...getDateInputProps()}
								className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
							/>
							{availableDays.length > 0 && (
								<div className="mt-2 text-[10px] sm:text-xs text-gray-600">
									<p className="font-medium mb-1">Días disponibles:</p>
									<div className="flex flex-wrap gap-1.5 sm:gap-2">
										{['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(
											(day, idx) =>
												availableDays.includes(idx) && (
													<span key={idx} className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-100 text-green-700 rounded-full text-[10px] sm:text-xs font-medium">
														{day}
													</span>
												)
										)}
									</div>
								</div>
							)}
						</div>
						<div>
							<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Hora</label>
							{!selectedDate ? (
								<div className="px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm sm:text-base">Selecciona una fecha primero</div>
							) : !selectedDoctor ? (
								<div className="px-3 sm:px-4 py-2 sm:py-3 border border-yellow-300 rounded-lg bg-yellow-50 text-yellow-700 text-sm sm:text-base">Selecciona un médico primero para ver los horarios disponibles</div>
							) : loadingSlots ? (
								<div className="px-3 sm:px-4 py-6 sm:py-8 border border-gray-300 rounded-lg bg-gray-50 text-center">
									<div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
									<p className="text-xs sm:text-sm text-gray-600">Cargando horarios disponibles...</p>
								</div>
							) : slotsError ? (
								<div className="px-3 sm:px-4 py-2 sm:py-3 border border-red-300 rounded-lg bg-red-50 text-red-700 text-xs sm:text-sm">
									<AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />
									{slotsError}
								</div>
							) : availableSlots.length === 0 ? (
								<div className="text-center py-6 sm:py-8 text-gray-500 border border-gray-300 rounded-lg bg-gray-50">
									<Clock className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
									<p className="text-sm sm:text-base">No hay horarios disponibles para esta fecha</p>
									<p className="text-xs sm:text-sm mt-1 sm:mt-2">Intenta seleccionar otra fecha</p>
								</div>
							) : (
								<div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 max-h-48 sm:max-h-64 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50">
									{availableSlots.map((slot) => (
										<button key={slot} type="button" onClick={() => setSelectedTime(slot)} className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border-2 transition-all text-xs sm:text-sm ${selectedTime === slot ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold shadow-md' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-gray-700 bg-white'}`}>
											{slot}
										</button>
									))}
								</div>
							)}
						</div>
					</div>

					<div className="mb-4 sm:mb-6">
						<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Motivo de la consulta</label>
						<textarea 
							value={reason} 
							onChange={(e) => setReason(e.target.value)} 
							placeholder="Describe el motivo de tu consulta..." 
							rows={3} 
							className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base resize-none" 
						/>
					</div>

					<div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
						<button onClick={() => setStep('doctor')} className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors text-sm sm:text-base">
							Anterior
						</button>
						<button onClick={() => setStep('confirm')} disabled={!selectedDate || !selectedTime} className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base">
							Continuar
						</button>
					</div>
				</div>
			)}

			{/* Step 4: Confirm */}
			{step === 'confirm' && (
				<div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 md:p-8">
					<h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
						<CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
						<span>Confirmar Cita</span>
					</h2>

					<div className="bg-gray-50 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 space-y-3 sm:space-y-4">
						<div className="flex items-start gap-2 sm:gap-3">
							<Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0 mt-0.5" />
							<div className="min-w-0 flex-1">
								<p className="text-xs sm:text-sm text-gray-600">Clínica</p>
								<p className="font-semibold text-gray-900 text-sm sm:text-base break-words">{selectedOrganization?.clinic_profile?.trade_name || selectedOrganization?.name}</p>
							</div>
						</div>
						{selectedDoctor && (
							<div className="flex items-start gap-2 sm:gap-3">
								<User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0 mt-0.5" />
								<div className="min-w-0 flex-1">
									<p className="text-xs sm:text-sm text-gray-600">Médico</p>
									<p className="font-semibold text-gray-900 text-sm sm:text-base break-words">Dr. {selectedDoctor.name}</p>
								</div>
							</div>
						)}
						<div className="flex items-start gap-2 sm:gap-3">
							<Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0 mt-0.5" />
							<div className="min-w-0 flex-1">
								<p className="text-xs sm:text-sm text-gray-600">Fecha y Hora</p>
								<p className="font-semibold text-gray-900 text-sm sm:text-base break-words">
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
								<p className="text-xs sm:text-sm text-gray-600 mb-1">Motivo</p>
								<p className="text-gray-900 text-sm sm:text-base break-words">{reason}</p>
							</div>
						)}
						{selectedService && (
							<div className="flex items-start gap-2 sm:gap-3">
								<DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 flex-shrink-0 mt-0.5" />
								<div className="min-w-0 flex-1">
									<p className="text-xs sm:text-sm text-gray-600">Servicio Seleccionado</p>
									<p className="font-semibold text-gray-900 text-sm sm:text-base break-words">{selectedService.name}</p>
									{selectedService.description && <p className="text-[10px] sm:text-xs text-gray-500 mt-1 break-words">{selectedService.description}</p>}
									<p className="text-base sm:text-lg font-bold text-teal-600 mt-1">
										{selectedService.price} {selectedService.currency}
									</p>
								</div>
							</div>
						)}
					</div>

					<div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 flex items-start gap-2 sm:gap-3">
						<AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
						<p className="text-xs sm:text-sm text-blue-800">El médico recibirá una notificación y podrá confirmar tu cita. Te notificaremos cuando sea confirmada.</p>
					</div>

					<div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
						<button onClick={() => setStep('schedule')} className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors text-sm sm:text-base">
							Anterior
						</button>
						<button onClick={handleSubmit} disabled={submitting || (selectedDoctor?.medic_profile?.services && Array.isArray(selectedDoctor.medic_profile.services) && selectedDoctor.medic_profile.services.length > 0 ? !selectedService : false)} className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base">
							{submitting ? 'Creando cita...' : 'Confirmar y Crear Cita'}
						</button>
					</div>
					{selectedDoctor?.medic_profile?.services && Array.isArray(selectedDoctor.medic_profile.services) && selectedDoctor.medic_profile.services.length > 0 && !selectedService && (
						<p className="text-xs sm:text-sm text-red-600 mt-2">Por favor selecciona un servicio para continuar</p>
					)}
				</div>
			)}

			{/* Alert Modal */}
			<AlertModal isOpen={modal.isOpen} onClose={closeModal} type={modal.type} title={modal.title} message={modal.message} onConfirm={modal.onConfirm} confirmText={modal.type === 'success' ? 'Continuar' : 'Entendido'} />
		</div>
	);
}
