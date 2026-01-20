'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, User, Phone, Mail, Package, CheckCircle2, Loader2 } from 'lucide-react';

type Service = {
	id?: string;
	name: string;
	description?: string;
	price: string | number;
	currency?: string;
};

type ServiceCombo = {
	id?: string;
	name: string;
	description?: string;
	price: string | number;
	currency?: string;
	serviceIds?: string[];
	services_included?: any[];
};

type Doctor = {
	id: string;
	name: string | null;
	medic_profile: {
		services: Service[];
		serviceCombos?: ServiceCombo[];
		availability: any;
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

	// Datos del paciente
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [phone, setPhone] = useState('');
	const [email, setEmail] = useState('');
	const [birthDate, setBirthDate] = useState('');

	// Selección de doctor
	const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
	const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

	// Selección de fecha y horario
	const [selectedDate, setSelectedDate] = useState('');
	const [selectedTime, setSelectedTime] = useState('');
	const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

	// Selección de servicio
	const [selectedService, setSelectedService] = useState<Service | ServiceCombo | null>(null);
	const [serviceType, setServiceType] = useState<'individual' | 'combo' | null>(null);

	// Obtener todos los servicios y combos disponibles
	const allServices: Service[] = doctors.flatMap((d) => d.medic_profile?.services || []);
	const allCombos: ServiceCombo[] = doctors.flatMap((d) => d.medic_profile?.serviceCombos || []);

	// Generar slots de tiempo basados en disponibilidad del doctor
	useEffect(() => {
		if (!selectedDoctor || !selectedDate || !selectedDoctor.medic_profile?.availability) {
			setAvailableTimeSlots([]);
			return;
		}

		const availability = selectedDoctor.medic_profile.availability;
		const schedule = availability.schedule || {};
		const selectedDay = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

		// Mapeo de días en español a inglés
		const dayMap: Record<string, string> = {
			lunes: 'monday',
			martes: 'tuesday',
			miércoles: 'wednesday',
			jueves: 'thursday',
			viernes: 'friday',
			sábado: 'saturday',
			domingo: 'sunday',
		};

		const dayKey = dayMap[selectedDay] || selectedDay;
		const daySlots = schedule[dayKey] || [];

		if (Array.isArray(daySlots) && daySlots.length > 0) {
			const slots: string[] = [];
			daySlots.forEach((slot: any) => {
				if (slot.enabled && slot.startTime && slot.endTime) {
					// Generar slots cada 30 minutos
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

						currentMin += 30;
						if (currentMin >= 60) {
							currentMin = 0;
							currentHour += 1;
						}
					}
				}
			});
			setAvailableTimeSlots(slots);
		} else {
			setAvailableTimeSlots([]);
		}
	}, [selectedDoctor, selectedDate]);

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

			if (!selectedDate || !selectedTime) {
				setError('Por favor selecciona una fecha y horario');
				setLoading(false);
				return;
			}

			if (!selectedService) {
				setError('Por favor selecciona un servicio');
				setLoading(false);
				return;
			}

			// Crear fecha/hora combinada
			const scheduledAt = new Date(`${selectedDate}T${selectedTime}:00`);

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
					scheduledAt: scheduledAt.toISOString(),
					durationMinutes: 30,
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

	const canProceedToStep2 = firstName && lastName && phone && selectedDoctorId;
	const canProceedToStep3 = selectedDate && selectedTime;
	const canSubmit = selectedService !== null;

	return (
		<AnimatePresence>
			{isOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
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

											{doctors.length > 1 && (
												<div>
													<label className="block text-sm font-semibold text-slate-700 mb-2">
														Seleccionar Doctor *
													</label>
													<select
														value={selectedDoctorId || ''}
														onChange={(e) => setSelectedDoctorId(e.target.value)}
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
														Horario Disponible *
													</label>
													<div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
														{availableTimeSlots.map((time) => (
															<button
																key={time}
																type="button"
																onClick={() => setSelectedTime(time)}
																className={`px-4 py-2 rounded-lg border-2 transition ${
																	selectedTime === time
																		? 'border-teal-600 bg-teal-50 text-teal-700 font-bold'
																		: 'border-slate-200 hover:border-teal-300 text-slate-700'
																}`}
															>
																{time}
															</button>
														))}
													</div>
												</div>
											)}

											{selectedDate && availableTimeSlots.length === 0 && (
												<div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700">
													No hay horarios disponibles para esta fecha. Por favor selecciona otra fecha.
												</div>
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
											disabled={
												(step === 1 && !canProceedToStep2) || (step === 2 && !canProceedToStep3)
											}
											className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Siguiente
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
		</AnimatePresence>
	);
}

