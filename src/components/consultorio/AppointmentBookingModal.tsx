'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, User, Phone, Mail, Package, CheckCircle2, Loader2, Users, MapPin, Zap, Info } from 'lucide-react';

export type Service = {
	id?: string;
	name: string;
	description?: string;
	price: string | number;
	currency?: string;
};

export type ServiceCombo = {
	id?: string;
	name: string;
	description?: string;
	price: string | number;
	currency?: string;
	serviceIds?: string[];
	services_included?: any[];
};

export type Doctor = {
	id: string;
	name: string | null;
	email?: string | null;
	medic_profile: {
		services: Service[];
		serviceCombos?: ServiceCombo[];
		availability: any;
		private_specialty?: string | any;
		specialty?: string | any;
		photo_url?: string | null;
		doctor_schedule_config?: {
			consultation_type: 'TURNOS' | 'ORDEN_LLEGADA';
			max_patients_per_day: number;
			shift_config: any;
			offices: any[];
		} | null;
	} | null;
};

type AppointmentBookingModalProps = {
	isOpen: boolean;
	onClose: () => void;
	doctors: Doctor[];
	organizationId: string;
};

export default function AppointmentBookingModal({
	isOpen,
	onClose,
	doctors,
	organizationId,
}: AppointmentBookingModalProps) {
	const [step, setStep] = useState(1); // 1: Datos, 2: Horario, 3: Servicio
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Datos del paciente
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [phone, setPhone] = useState('');
	const [email, setEmail] = useState('');
	const [birthDate, setBirthDate] = useState('');

	// Selección de doctor y consultorio
	const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
	const [selectedOfficeId, setSelectedOfficeId] = useState<string | null>(null);
	const [alternativeOffice, setAlternativeOffice] = useState<any | null>(null);
	const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);
	const selectedOffice = selectedDoctor?.medic_profile?.doctor_schedule_config?.offices?.find(o => o.id === selectedOfficeId);

	// Selección de fecha y horario
	const [selectedDate, setSelectedDate] = useState('');
	const [selectedTime, setSelectedTime] = useState('');
	const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
	const [busySlots, setBusySlots] = useState<string[]>([]);
	const [capacityInfo, setCapacityInfo] = useState<{
		total: number;
		morning: number;
		afternoon: number;
        slots_morning?: number;
        slots_afternoon?: number;
		config: any;
	} | null>(null);

	// Selección de servicio
	const [selectedService, setSelectedService] = useState<Service | ServiceCombo | null>(null);
	const [serviceType, setServiceType] = useState<'individual' | 'combo' | null>(null);

    // Tipo de Agendamiento
    const [schedulingType, setSchedulingType] = useState<'specific_time' | 'shift'>('specific_time');
    const [selectedShift, setSelectedShift] = useState<'morning' | 'afternoon' | null>(null);

	// Obtener todos los servicios y combos disponibles
	const allServices: Service[] = doctors.flatMap((d) => d.medic_profile?.services || []);
	const allCombos: ServiceCombo[] = doctors.flatMap((d) => d.medic_profile?.serviceCombos || []);

	// Función helper para formatear fechas sin desfase de zona horaria (UTC)
	const formatDateLocal = (dateStr: string) => {
		if (!dateStr) return '';
		const [year, month, day] = dateStr.split('-').map(Number);
		const dateObj = new Date(year, month - 1, day);
		return dateObj.toLocaleDateString('es-ES', { 
			weekday: 'long', 
			day: 'numeric', 
			month: 'long' 
		});
	};

	// Generar slots de tiempo basados en disponibilidad del doctor y cargar ocupación
	useEffect(() => {
		const fetchAvailability = async () => {
			if (!selectedDoctor || !selectedDate) {
				setAvailableTimeSlots([]);
				setBusySlots([]);
				setCapacityInfo(null);
				setAlternativeOffice(null);
				return;
			}

			try {
				const response = await fetch(`/api/public/appointments/availability?doctorId=${selectedDoctor.id}&date=${selectedDate}`);
				if (response.ok) {
					const data = await response.json();
					setBusySlots(data.busySlots || []);
					setCapacityInfo({
						total: data.stats.total,
						morning: data.stats.morning,
						afternoon: data.stats.afternoon,
                        slots_morning: data.stats.slots_morning,
                        slots_afternoon: data.stats.slots_afternoon,
						config: data.config
					});
				}
			} catch (err) {
				console.error('Error fetching availability:', err);
			}

			// Obtener el horario según si hay oficina seleccionada o no
			let daySlots: any[] = [];
			const consultationType = selectedDoctor.medic_profile?.doctor_schedule_config?.consultation_type || 'TURNOS';

			if (selectedOffice && selectedOffice.id !== 'default' && selectedOffice.schedules) {
				// Prioridad 1: Horario específico del consultorio seleccionado
				// Fix: Parse date parts manually to avoid UTC conversion issues
				const [year, month, day] = selectedDate.split('-').map(Number);
				const dateObj = new Date(year, month - 1, day);
				const selectedDay = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

				const dayMap: Record<string, string> = {
					lunes: 'monday', martes: 'tuesday', miércoles: 'wednesday', jueves: 'thursday',
					viernes: 'friday', sábado: 'saturday', domingo: 'sunday'
				};
				const dayKey = dayMap[selectedDay] || selectedDay;
				
				// Buscar en los schedules del consultorio si alguno incluye el día seleccionado
				const officeScheduleForDay = selectedOffice.schedules.find((s: any) => 
					s.days && s.days.includes(dayKey)
				);

				if (officeScheduleForDay) {
					if (consultationType === 'ORDEN_LLEGADA') {
						// Si es orden de llegada, los slots son los turnos habilitados (Mañana/Tarde)
						if (officeScheduleForDay.shifts?.includes('morning')) daySlots.push({ startTime: '08:00', endTime: '08:01', enabled: true, isShift: true, name: 'Mañana' });
						if (officeScheduleForDay.shifts?.includes('afternoon')) daySlots.push({ startTime: '14:00', endTime: '14:01', enabled: true, isShift: true, name: 'Tarde' });
					} else {
						// Si es por turnos, convertir el formato de la oficina al formato de slots
						Object.entries(officeScheduleForDay.hours || {}).forEach(([shiftId, hours]: [string, any]) => {
							if (officeScheduleForDay.shifts?.includes(shiftId) && hours.start && hours.end) {
								daySlots.push({ startTime: hours.start, endTime: hours.end, enabled: true });
							}
						});
					}
				}
			} else if (selectedDoctor.medic_profile?.availability?.schedule) {
			// Prioridad 2: Horario general del médico (fallback)
				const schedule = selectedDoctor.medic_profile.availability.schedule || {};
				// Fix: Parse date parts manually to avoid UTC conversion issues
				const [year, month, day] = selectedDate.split('-').map(Number);
				const dateObj = new Date(year, month - 1, day);
				const selectedDay = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

				const dayMap: Record<string, string> = {
					lunes: 'monday', martes: 'tuesday', miércoles: 'wednesday', jueves: 'thursday',
					viernes: 'friday', sábado: 'saturday', domingo: 'sunday'
				};
				const dayKey = dayMap[selectedDay] || selectedDay;
				daySlots = schedule[dayKey] || [];
			}

			if (Array.isArray(daySlots) && daySlots.length > 0) {
				setAlternativeOffice(null);
				const slots: string[] = [];
                
                // Si es ORDEN_LLEGADA, usaremos un formato especial o flags
                const isOrdenLlegada = consultationType === 'ORDEN_LLEGADA';
                
				daySlots.forEach((slot: any) => {
					if (slot.enabled && slot.startTime && slot.endTime) {
						if (slot.isShift && isOrdenLlegada) {
							// Caso Orden de Llegada: solo el inicio del turno
                            // Mapeamos a 08:00 (Mañana) y 14:00 (Tarde) como identificadores
                            if (slot.name === 'Mañana') slots.push('08:00');
                            if (slot.name === 'Tarde') slots.push('14:00');
						} else if (!isOrdenLlegada) {
							// Caso Turnos: generar slots de 30min (o duración configurada)
							const start = slot.startTime.split(':');
							const end = slot.endTime.split(':');
							const startHour = parseInt(start[0]);
							const startMin = parseInt(start[1]);
							const endHour = parseInt(end[0]);
							const endMin = parseInt(end[1]);

							let currentHour = startHour;
							let currentMin = startMin;

							while (
								currentHour < endHour ||
								(currentHour === endHour && currentMin < endMin)
							) {
								const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
								slots.push(timeStr);

								currentMin += 30; // TODO: Usar duración configurada
								if (currentMin >= 60) {
									currentMin = 0;
									currentHour += 1;
								}
							}
						}
					}
				});
				setAvailableTimeSlots([...new Set(slots)].sort()); // Eliminar duplicados y ordenar
			} else {
				setAvailableTimeSlots([]);
				
				// Buscar en otros consultorios si el actual no tiene disponibilidad hoy
				const allOffices = selectedDoctor?.medic_profile?.doctor_schedule_config?.offices || [];
				if (allOffices.length > 1 && selectedOfficeId && selectedDate) {
					// Fix: Parse date parts manually to avoid UTC conversion issues
					const [year, month, day] = selectedDate.split('-').map(Number);
					const dateObj = new Date(year, month - 1, day);
					const selectedDay = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
					
					const dayMap: Record<string, string> = {
						lunes: 'monday', martes: 'tuesday', miércoles: 'wednesday', jueves: 'thursday',
						viernes: 'friday', sábado: 'saturday', domingo: 'sunday'
					};
					const dayKey = dayMap[selectedDay] || selectedDay;

					const foundAlternative = allOffices.find((office: any) => {
						if (office.id === selectedOfficeId) return false;
						return office.schedules?.some((s: any) => s.days && s.days.includes(dayKey));
					});

					if (foundAlternative) {
						setAlternativeOffice(foundAlternative);
					} else {
						setAlternativeOffice(null);
					}
				} else {
					setAlternativeOffice(null);
				}
			}
		};

		fetchAvailability();
	}, [selectedDoctor, selectedDate, selectedOffice]);

	// Resetear formulario al cerrar
	useEffect(() => {
		if (!isOpen) {
			setStep(1);
			setFirstName('');
			setLastName('');
			setPhone('');
			setEmail('');
			setBirthDate('');
			setSelectedDoctorId(null);
			setSelectedDate('');
			setSelectedTime('');
            setSchedulingType('specific_time');
            setSelectedShift(null);
			setSelectedService(null);
			setServiceType(null);
			setError(null);
			setSuccess(false);
		}
	}, [isOpen]);

	// Si solo hay un doctor, seleccionarlo automáticamente
	useEffect(() => {
		if (doctors.length === 1 && !selectedDoctorId) {
			setSelectedDoctorId(doctors[0].id);
		}
	}, [doctors, selectedDoctorId]);

	// Si solo hay un consultorio para el doctor seleccionado, seleccionarlo automáticamente
	useEffect(() => {
		const offices = selectedDoctor?.medic_profile?.doctor_schedule_config?.offices || [];
		if (offices.length === 1 && !selectedOfficeId) {
			setSelectedOfficeId(offices[0].id);
		} else if (offices.length === 0 && !selectedOfficeId) {
			// Si no hay consultorios definidos en la config, usar un ID genérico o nulo
			setSelectedOfficeId('default');
		}
	}, [selectedDoctor, selectedOfficeId]);

	const handleSubmit = async () => {
		setError(null);
		setLoading(true);

		try {
			// Validar datos
			if (!firstName || !lastName || !phone) {
				setError('Por favor completa todos los campos obligatorios (nombre, apellido, teléfono)');
				setLoading(false);
				return;
			}

			if (!selectedDoctorId) {
				setError('Por favor selecciona un doctor');
				setLoading(false);
				return;
			}

			if (!selectedDate || (!selectedTime && schedulingType === 'specific_time')) {
				setError('Por favor selecciona una fecha y horario');
				setLoading(false);
				return;
			}

            if (schedulingType === 'shift' && !selectedShift) {
                setError('Por favor selecciona un turno (Mañana o Tarde)');
                setLoading(false);
                return;
            }

			if (!selectedService) {
				setError('Por favor selecciona un servicio');
				setLoading(false);
				return;
			}

			// Crear fecha/hora combinada
            // Si es por turno, usamos una hora por defecto según el turno para la fecha
            let scheduledAt = '';
            let notes = '';

            if (schedulingType === 'shift') {
                // Mañana: 08:00, Tarde: 14:00 (como referencia)
                const timeStr = selectedShift === 'morning' ? '08:00:00' : '14:00:00';
                scheduledAt = `${selectedDate}T${timeStr}`;
                const shiftLabel = selectedShift === 'morning' ? 'Turno Diurno (AM)' : 'Turno Vespertino (PM)';
                notes = `Cita agendada por: ${shiftLabel}.`;
            } else {
                scheduledAt = `${selectedDate}T${selectedTime}:00`;
            }

			// Crear paciente no registrado primero
			const unregisteredPatientResponse = await fetch('/api/public/unregistered-patients', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					first_name: firstName,
					last_name: lastName,
					phone: phone,
					email: email || null,
					birth_date: birthDate || null,
					identification: null, // Opcional
					sex: null, // Opcional
				}),
			});

			if (!unregisteredPatientResponse.ok) {
				const errorData = await unregisteredPatientResponse.json();
				throw new Error(errorData.error || 'Error al crear paciente');
			}

			const { id: unregisteredPatientId } = await unregisteredPatientResponse.json();

			// Crear la cita
			const appointmentResponse = await fetch('/api/public/appointments/new', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					unregisteredPatientId,
					doctorId: selectedDoctorId,
					organizationId,
					officeId: selectedOfficeId && selectedOfficeId !== 'default' ? selectedOfficeId : null,
					scheduledAt, // Enviamos el string "YYYY-MM-DDTHH:mm:00"
					durationMinutes: 30,
                    notes, // Enviamos la nota del turno
					selectedService: {
						name: selectedService.name,
						price: String(selectedService.price),
						currency: selectedService.currency || 'USD',
						type: serviceType,
						...(serviceType === 'combo' && { serviceIds: (selectedService as ServiceCombo).serviceIds }),
					},
				}),
			});

			if (!appointmentResponse.ok) {
				const errorData = await appointmentResponse.json();
				throw new Error(errorData.error || 'Error al crear la cita');
			}

			setSuccess(true);
			setTimeout(() => {
				onClose();
			}, 2000);
		} catch (err: any) {
			setError(err.message || 'Error al procesar la solicitud');
		} finally {
			setLoading(false);
		}
	};

	const canProceedToStep2 = firstName && lastName && phone && selectedDoctorId && selectedOfficeId;
	const canProceedToStep3 = selectedDate && selectedTime;
	const canSubmit = selectedService !== null;

	if (!mounted) return null;

	return createPortal(
		<AnimatePresence>
			{isOpen && (
				<div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
					>
						{/* Header */}
						<div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-teal-600 to-cyan-600">
							<h2 className="text-2xl font-bold text-white">Agendar Cita</h2>
							<button
								onClick={onClose}
								className="p-2 text-white hover:bg-white/20 rounded-lg transition"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						{/* Content */}
						<div className="flex-1 overflow-y-auto p-6">
							{success ? (
								<div className="text-center py-8">
									<CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
									<h3 className="text-2xl font-bold text-slate-900 mb-2">¡Cita Agendada!</h3>
									<p className="text-slate-600">Tu cita ha sido registrada exitosamente. Te contactaremos pronto.</p>
								</div>
							) : (
								<>
									{/* Progress Steps */}
									<div className="flex items-center justify-center mb-8">
										{[1, 2, 3].map((s) => (
											<div key={s} className="flex items-center">
												<div
													className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
														step >= s
															? 'bg-teal-600 text-white'
															: 'bg-slate-200 text-slate-500'
													}`}
												>
													{s}
												</div>
												{s < 3 && (
													<div
														className={`w-16 h-1 mx-2 ${
															step > s ? 'bg-teal-600' : 'bg-slate-200'
														}`}
													/>
												)}
											</div>
										))}
									</div>

									{error && (
										<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
											{error}
										</div>
									)}

									{/* Step 1: Datos del Paciente */}
									{step === 1 && (
										<motion.div
											initial={{ opacity: 0, x: -20 }}
											animate={{ opacity: 1, x: 0 }}
											className="space-y-4"
										>
											<h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
												<User className="w-5 h-5" />
												Datos del Paciente
											</h3>

											{doctors.length === 0 && (
												<div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg mb-4">
													⚠️ No se encontraron médicos disponibles para este consultorio. Por favor, contacta a la clínica directamente.
												</div>
											)}
											<div className="text-xs text-slate-500 mb-4 bg-slate-50 p-2 rounded border border-slate-100">
												<strong>Validación:</strong> {firstName?.trim() ? '✅ Nombre' : '❌ Nombre'} | {lastName?.trim() ? '✅ Apellido' : '❌ Apellido'} | {phone?.trim() ? '✅ Teléfono' : '❌ Teléfono'} | {selectedDoctorId ? '✅ Médico' : '❌ Médico'} | {selectedOfficeId ? '✅ Consultorio' : '❌ Consultorio'}
											</div>

											{doctors.length > 1 && (
												<div>
													<label className="block text-sm font-semibold text-slate-700 mb-2">
														Seleccionar Doctor *
													</label>
													<select
														value={selectedDoctorId || ''}
														onChange={(e) => {
															setSelectedDoctorId(e.target.value);
															setSelectedOfficeId(null); // Reset office when doctor changes
														}}
														className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
													>
														<option value="">Selecciona un doctor</option>
														{doctors.map((doctor) => (
															<option key={doctor.id} value={doctor.id}>
																{doctor.name || 'Doctor sin nombre'}
															</option>
														))}
													</select>
												</div>
											)}

											{selectedDoctor?.medic_profile?.doctor_schedule_config?.offices && selectedDoctor.medic_profile.doctor_schedule_config.offices.length > 1 && (
												<motion.div
													initial={{ opacity: 0, y: -10 }}
													animate={{ opacity: 1, y: 0 }}
												>
													<label className="block text-sm font-semibold text-slate-700 mb-2">
														Seleccionar Sede / Consultorio *
													</label>
													<div className="grid grid-cols-1 gap-2">
														{selectedDoctor.medic_profile.doctor_schedule_config.offices.map((office: any) => (
															<button
																key={office.id}
																type="button"
																onClick={() => setSelectedOfficeId(office.id)}
																className={`p-4 border-2 rounded-xl text-left transition flex items-center justify-between ${
																	selectedOfficeId === office.id
																		? 'border-teal-600 bg-teal-50 ring-2 ring-teal-100'
																		: 'border-slate-200 hover:border-teal-300 bg-white'
																}`}
															>
																<div>
																	<p className={`font-bold ${selectedOfficeId === office.id ? 'text-teal-700' : 'text-slate-900'}`}>
																		{office.name}
																	</p>
																	<p className="text-xs text-slate-500 mt-1">
																		{typeof office.location === 'object' 
																			? (office.location.address || 'Ubicación no especificada') 
																			: (office.location || 'Ubicación no especificada')}
																	</p>
																</div>
																{selectedOfficeId === office.id && (
																	<CheckCircle2 className="w-5 h-5 text-teal-600" />
																)}
															</button>
														))}
													</div>
												</motion.div>
											)}

											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<div>
													<label className="block text-sm font-semibold text-slate-700 mb-2">
														Nombre *
													</label>
													<input
														type="text"
														value={firstName}
														onChange={(e) => setFirstName(e.target.value)}
														className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
														placeholder="Juan"
													/>
												</div>
												<div>
													<label className="block text-sm font-semibold text-slate-700 mb-2">
														Apellido *
													</label>
													<input
														type="text"
														value={lastName}
														onChange={(e) => setLastName(e.target.value)}
														className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
														placeholder="Pérez"
													/>
												</div>
											</div>

											<div>
												<label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
													<Phone className="w-4 h-4" />
													Teléfono *
												</label>
												<input
													type="tel"
													value={phone}
													onChange={(e) => setPhone(e.target.value)}
													className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
													placeholder="0412-1234567"
												/>
											</div>

											<div>
												<label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
													<Mail className="w-4 h-4" />
													Correo Electrónico
												</label>
												<input
													type="email"
													value={email}
													onChange={(e) => setEmail(e.target.value)}
													className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
													placeholder="juan@example.com"
												/>
											</div>

											<div>
												<label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
													<Calendar className="w-4 h-4" />
													Fecha de Nacimiento
												</label>
												<input
													type="date"
													value={birthDate}
													onChange={(e) => setBirthDate(e.target.value)}
													className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
													max={new Date().toISOString().split('T')[0]}
												/>
											</div>
										</motion.div>
									)}

									{/* Step 2: Horario */}
									{step === 2 && (
										<motion.div
											initial={{ opacity: 0, x: -20 }}
											animate={{ opacity: 1, x: 0 }}
											className="space-y-4"
										>
											<h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
												<Clock className="w-5 h-5" />
												Seleccionar Fecha y Horario
											</h3>

											<div>
												<label className="block text-sm font-semibold text-slate-700 mb-2">
													Fecha *
												</label>
												<input
													type="date"
													value={selectedDate}
													onChange={(e) => {
														setSelectedDate(e.target.value);
														setSelectedTime('');
													}}
													min={new Date().toISOString().split('T')[0]}
													className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
												/>
											</div>

											{selectedDate && availableTimeSlots.length > 0 && (
												<div>
													<label className="block text-sm font-semibold text-slate-700 mb-2">
                                                        Tipo de Agendamiento
                                                    </label>
                                                    <div className="flex p-1 bg-slate-100 rounded-lg mb-4">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSchedulingType('specific_time')}
                                                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${
                                                                schedulingType === 'specific_time'
                                                                    ? 'bg-white text-teal-700 shadow-sm'
                                                                    : 'text-slate-500 hover:text-slate-700'
                                                            }`}
                                                        >
                                                            Por Hora Exacta
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
                                                            Por Turno (AM/PM)
                                                        </button>
                                                    </div>

													<label className="block text-sm font-semibold text-slate-700 mb-2">
														{selectedDoctor?.medic_profile?.doctor_schedule_config?.consultation_type === 'ORDEN_LLEGADA' || schedulingType === 'shift'
															? 'Seleccionar Turno *' 
															: 'Horario Disponible *'}
													</label>
                                                    
                                                    {selectedDoctor?.medic_profile?.doctor_schedule_config?.consultation_type === 'ORDEN_LLEGADA' || schedulingType === 'shift' ? (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            {(availableTimeSlots.includes('08:00') || availableTimeSlots.some(t => t < '12:00')) && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (schedulingType === 'shift') {
                                                                            setSelectedShift('morning');
                                                                            // Reset time if needed or set dummy
                                                                        } else {
                                                                            setSelectedTime('08:00');
                                                                        }
                                                                    }}
                                                                    className={`p-4 rounded-xl border-2 transition text-left relative overflow-hidden group ${
                                                                        (schedulingType === 'shift' ? selectedShift === 'morning' : selectedTime === '08:00')
                                                                            ? 'border-yellow-500 bg-yellow-50 ring-2 ring-yellow-100' // AM Color
                                                                            : 'border-slate-200 hover:border-yellow-300 bg-white'
                                                                    }`}
                                                                >
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <span className={`font-bold text-lg ${(schedulingType === 'shift' ? selectedShift === 'morning' : selectedTime === '08:00') ? 'text-yellow-700' : 'text-slate-800'}`}>Turno Diurno (AM)</span>
                                                                        {(schedulingType === 'shift' ? selectedShift === 'morning' : selectedTime === '08:00') && <CheckCircle2 className="w-6 h-6 text-yellow-600" />}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                                                                        <Clock className="w-4 h-4" />
                                                                        <span>08:00 AM - 12:00 PM</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-sm font-medium">
                                                                        <Users className="w-4 h-4 text-yellow-500" />
                                                                        <span className="text-yellow-700">
                                                                            {capacityInfo?.slots_morning !== undefined ? `${capacityInfo.slots_morning} cupos disponibles` : 'Cupos disponibles'}
                                                                        </span>
                                                                    </div>
                                                                    {capacityInfo?.slots_morning !== undefined && capacityInfo.slots_morning <= 3 && (
                                                                         <div className="absolute top-0 right-0 bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                                                                             ¡Quedan pocos!
                                                                         </div>
                                                                    )}
                                                                </button>
                                                            )}
                                                            
                                                            {(availableTimeSlots.includes('14:00') || availableTimeSlots.some(t => t >= '12:00')) && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (schedulingType === 'shift') {
                                                                            setSelectedShift('afternoon');
                                                                        } else {
                                                                            setSelectedTime('14:00');
                                                                        }
                                                                    }}
                                                                    className={`p-4 rounded-xl border-2 transition text-left relative overflow-hidden group ${
                                                                        (schedulingType === 'shift' ? selectedShift === 'afternoon' : selectedTime === '14:00')
                                                                            ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100' // PM Color
                                                                            : 'border-slate-200 hover:border-blue-300 bg-white'
                                                                    }`}
                                                                >
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <span className={`font-bold text-lg ${(schedulingType === 'shift' ? selectedShift === 'afternoon' : selectedTime === '14:00') ? 'text-blue-700' : 'text-slate-800'}`}>Turno Vespertino (PM)</span>
                                                                        {(schedulingType === 'shift' ? selectedShift === 'afternoon' : selectedTime === '14:00') && <CheckCircle2 className="w-6 h-6 text-blue-600" />}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                                                                        <Clock className="w-4 h-4" />
                                                                        <span>02:00 PM - 06:00 PM</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-sm font-medium">
                                                                        <Users className="w-4 h-4 text-blue-500" />
                                                                        <span className="text-blue-700">
                                                                             {capacityInfo?.slots_afternoon !== undefined ? `${capacityInfo.slots_afternoon} cupos disponibles` : 'Cupos disponibles'}
                                                                        </span>
                                                                    </div>
                                                                     {capacityInfo?.slots_afternoon !== undefined && capacityInfo.slots_afternoon <= 3 && (
                                                                         <div className="absolute top-0 right-0 bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                                                                             ¡Quedan pocos!
                                                                         </div>
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                            {availableTimeSlots.map((time) => {
                                                                const isBusy = busySlots.includes(time);
                                                                return (
                                                                    <button
                                                                        key={time}
                                                                        type="button"
                                                                        disabled={isBusy}
                                                                        onClick={() => setSelectedTime(time)}
                                                                        className={`px-4 py-2 rounded-lg border-2 transition relative ${
                                                                            selectedTime === time
                                                                                ? 'border-teal-600 bg-teal-50 text-teal-700 font-bold'
                                                                                : isBusy
                                                                                ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed line-through'
                                                                                : 'border-slate-200 hover:border-teal-300 text-slate-700'
                                                                        }`}
                                                                    >
                                                                        {time}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
												</div>
											)}

											{selectedDate && capacityInfo && capacityInfo.config.consultation_type === 'ORDEN_LLEGADA' && (
												<div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                    <div className="flex gap-3">
                                                        <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-700">
                                                                Atención por Orden de Llegada
                                                            </p>
                                                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                                                El médico atiende según el orden de registro en recepción. La hora seleccionada (08:00 AM o 02:00 PM) es referencial para el inicio del turno. Te recomendamos llegar temprano.
                                                            </p>
                                                        </div>
                                                    </div>
												</div>
											)}

											{selectedDate && availableTimeSlots.length === 0 && !alternativeOffice && (
												<div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
													⚠️ No hay horarios disponibles para el {formatDateLocal(selectedDate)}. Por favor intenta con otra fecha.
												</div>
											)}

											{selectedDate && availableTimeSlots.length === 0 && alternativeOffice && (
												<motion.div 
													initial={{ opacity: 0, y: 10 }}
													animate={{ opacity: 1, y: 0 }}
													className="p-6 bg-teal-50 border-2 border-teal-200 rounded-2xl text-teal-800 shadow-sm mt-4"
												>
													<div className="flex items-start gap-4 mb-4">
														<div className="p-3 bg-white rounded-xl shadow-sm border border-teal-100">
															<MapPin className="w-6 h-6 text-teal-600" />
														</div>
														<div className="flex-1">
															<h4 className="font-bold text-teal-900 text-lg leading-tight">
																¡Sede Alternativa!
															</h4>
															<p className="text-sm text-teal-700 mt-2 leading-relaxed">
																Upss, el doctor no atiende en <strong>{selectedOffice?.name}</strong> este día, pero podemos agendarte la cita para su otro consultorio en <strong>{alternativeOffice.name}</strong>, ubicado en {typeof alternativeOffice.location === 'object' ? alternativeOffice.location.address : (alternativeOffice.location || 'la misma zona')}.
															</p>
														</div>
													</div>
													<div className="flex flex-col gap-2">
														<button
															type="button"
															onClick={() => {
																setSelectedOfficeId(alternativeOffice.id);
																setAlternativeOffice(null);
															}}
															className="w-full py-3.5 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition shadow-lg flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-95"
														>
															<Zap className="w-5 h-5" />
															Agendar en {alternativeOffice.name}
														</button>
														<p className="text-[10px] text-teal-500 text-center uppercase tracking-wider font-bold">
															Disponible para el {formatDateLocal(selectedDate)}
														</p>
													</div>
												</motion.div>
											)}
										</motion.div>
									)}

									{/* Step 3: Servicio */}
									{step === 3 && (
										<motion.div
											initial={{ opacity: 0, x: -20 }}
											animate={{ opacity: 1, x: 0 }}
											className="space-y-4"
										>
											<h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
												<Package className="w-5 h-5" />
												Seleccionar Servicio
											</h3>

											{/* Servicios Individuales */}
											{allServices.length > 0 && (
												<div>
													<h4 className="text-lg font-semibold text-slate-800 mb-3">Servicios Individuales</h4>
													<div className="grid grid-cols-1 gap-3">
														{allServices.map((service, idx) => (
															<button
																key={idx}
																type="button"
																onClick={() => {
																	setSelectedService(service);
																	setServiceType('individual');
																}}
																className={`p-4 rounded-lg border-2 text-left transition ${
																	selectedService === service && serviceType === 'individual'
																		? 'border-teal-600 bg-teal-50'
																		: 'border-slate-200 hover:border-teal-300'
																}`}
															>
																<div className="flex items-start justify-between">
																	<div className="flex-1">
																		<h5 className="font-bold text-slate-900">{service.name}</h5>
																		{service.description && (
																			<p className="text-sm text-slate-600 mt-1">{service.description}</p>
																		)}
																	</div>
																	<div className="ml-4 text-right">
																		<p className="font-bold text-teal-600">
																			{service.currency === 'USD' ? '$' : service.currency === 'VES' ? 'Bs.' : '€'}{' '}
																			{typeof service.price === 'string' ? parseFloat(service.price) : service.price}
																		</p>
																	</div>
																</div>
															</button>
														))}
													</div>
												</div>
											)}

											{/* Combos */}
											{allCombos.length > 0 && (
												<div className="mt-6">
													<h4 className="text-lg font-semibold text-slate-800 mb-3">Combos Promocionales</h4>
													<div className="grid grid-cols-1 gap-3">
														{allCombos.map((combo, idx) => (
															<button
																key={idx}
																type="button"
																onClick={() => {
																	setSelectedService(combo);
																	setServiceType('combo');
																}}
																className={`p-4 rounded-lg border-2 text-left transition ${
																	selectedService === combo && serviceType === 'combo'
																		? 'border-orange-500 bg-orange-50'
																		: 'border-slate-200 hover:border-orange-300'
																}`}
															>
																<div className="flex items-start justify-between">
																	<div className="flex-1">
																		<div className="flex items-center gap-2 mb-1">
																			<h5 className="font-bold text-slate-900">{combo.name}</h5>
																			<span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded">
																				COMBO
																			</span>
																		</div>
																		{combo.description && (
																			<p className="text-sm text-slate-600 mt-1">{combo.description}</p>
																		)}
																	</div>
																	<div className="ml-4 text-right">
																		<p className="font-bold text-orange-600">
																			{combo.currency === 'USD' ? '$' : combo.currency === 'VES' ? 'Bs.' : '€'}{' '}
																			{typeof combo.price === 'string' ? parseFloat(combo.price) : combo.price}
																		</p>
																	</div>
																</div>
															</button>
														))}
													</div>
												</div>
											)}

											{allServices.length === 0 && allCombos.length === 0 && (
												<div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
													No hay servicios disponibles en este momento.
												</div>
											)}
										</motion.div>
									)}
								</>
							)}
						</div>

						{/* Footer */}
						{!success && (
							<div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
								<button
									onClick={() => {
										if (step > 1) setStep(step - 1);
										else onClose();
									}}
									className="px-6 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition"
								>
									{step === 1 ? 'Cancelar' : 'Atrás'}
								</button>
								<div className="flex gap-3">
									{step < 3 ? (
										<button
											onClick={() => {
												if (step === 1 && canProceedToStep2) setStep(2);
												else if (step === 2 && canProceedToStep3) setStep(3);
											}}
											title={
												step === 1 && !canProceedToStep2 
													? `Faltan: ${[!firstName && 'Nombre', !lastName && 'Apellido', !phone && 'Teléfono', !selectedDoctorId && 'Médico'].filter(Boolean).join(', ')}`
													: step === 2 && !canProceedToStep3
													? `Faltan: ${[!selectedDate && 'Fecha', !selectedTime && 'Hora'].filter(Boolean).join(', ')}`
													: ''
											}
											disabled={
												(step === 1 && !canProceedToStep2) || (step === 2 && !canProceedToStep3)
											}
											className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed group relative"
										>
											Siguiente
											{((step === 1 && !canProceedToStep2) || (step === 2 && !canProceedToStep3)) && (
												<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-[100001] pointer-events-none">
													Completa todos los campos obligatorios (*)
												</div>
											)}
										</button>
									) : (
										<button
											onClick={handleSubmit}
											disabled={!canSubmit || loading}
											className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
										>
											{loading ? (
												<>
													<Loader2 className="w-4 h-4 animate-spin" />
													Procesando...
												</>
											) : (
												'Confirmar Cita'
											)}
										</button>
									)}
								</div>
							</div>
						)}
					</motion.div>
				</div>
			)}
		</AnimatePresence>,
		document.body
	);
}

