'use client';

import { useState, useEffect } from 'react';
import { Clock, Calendar, CheckCircle2, AlertCircle, Save, MapPin, Users, Plus, Trash2, ChevronDown, ChevronUp, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MedicConfig } from '@/types/medic-config';
import LeafletMapPicker from '@/components/clinic/LeafletMapPicker';

type TimeSlot = {
	day: string;
	startTime: string;
	endTime: string;
	enabled: boolean;
};

interface Office {
	id: string;
	name: string;
	location: { lat: number; lng: number; address: string } | null;
	phone?: string;
	schedules: Array<{
		days: string[];
		shifts: string[];
		hours: {
			morning?: { start: string; end: string };
			afternoon?: { start: string; end: string };
			full_day?: { start: string; end: string };
		};
	}>;
}

interface ScheduleConfig {
	consultation_type: 'TURNOS' | 'ORDEN_LLEGADA';
	max_patients_per_day: number;
	shift_config: {
		enabled: boolean;
		shifts: Array<{
			id: 'morning' | 'afternoon' | 'full_day';
			name: string;
			enabled: boolean;
		}>;
	};
	offices: Office[];
}

const DAYS = [
	{ value: 'monday', label: 'Lunes' },
	{ value: 'tuesday', label: 'Martes' },
	{ value: 'wednesday', label: 'Miércoles' },
	{ value: 'thursday', label: 'Jueves' },
	{ value: 'friday', label: 'Viernes' },
	{ value: 'saturday', label: 'Sábado' },
	{ value: 'sunday', label: 'Domingo' },
];

const DAYS_OF_WEEK = DAYS;

export default function AvailabilitySchedule({ 
	config, 
	onUpdate 
}: { 
	config: MedicConfig; 
	onUpdate: () => void;
}) {
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [hasChanges, setHasChanges] = useState(false);

	// Estado para configuración básica de horarios (original)
	const initialAvailability = config.config.availability || {};
	
	const parseInitialSchedule = (): Record<string, TimeSlot[]> => {
		const defaultSchedule: Record<string, TimeSlot[]> = {};
		DAYS.forEach(day => {
			const scheduleObj = initialAvailability.schedule;
			let dayValue: any = null;
			
		if (scheduleObj && typeof scheduleObj === 'object' && !Array.isArray(scheduleObj)) {
			const scheduleRecord = scheduleObj as Record<string, unknown>;
			dayValue = scheduleRecord[day.value];
		} else if (typeof initialAvailability === 'object' && initialAvailability !== null && day.value in initialAvailability) {
			const availabilityRecord = initialAvailability as Record<string, unknown>;
			dayValue = availabilityRecord[day.value];
		}
			
			if (dayValue && Array.isArray(dayValue)) {
				const validSlots = dayValue.filter((slot): slot is TimeSlot => 
					typeof slot === 'object' &&
					slot !== null &&
					'day' in slot &&
					'startTime' in slot &&
					'endTime' in slot &&
					'enabled' in slot
				);
				defaultSchedule[day.value] = validSlots.length > 0 
					? validSlots 
					: [{ day: day.value, startTime: '09:00', endTime: '17:00', enabled: false }];
			} else {
				defaultSchedule[day.value] = [{ day: day.value, startTime: '09:00', endTime: '17:00', enabled: false }];
			}
		});
		return defaultSchedule;
	};

	const [schedule, setSchedule] = useState<Record<string, TimeSlot[]>>(parseInitialSchedule);
	const [savedSchedule, setSavedSchedule] = useState<Record<string, TimeSlot[]>>(parseInitialSchedule);

	// Estado para configuración avanzada (nueva funcionalidad)
	const [loadingAdvanced, setLoadingAdvanced] = useState(true);
	const [advancedConfig, setAdvancedConfig] = useState<ScheduleConfig | null>(null);
	const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);

	// Configuración general (compartida)
	const [consultationType, setConsultationType] = useState<'TURNOS' | 'ORDEN_LLEGADA'>('TURNOS');
	const [maxPatientsPerDay, setMaxPatientsPerDay] = useState(20);
	const [shiftConfig, setShiftConfig] = useState({
		enabled: true,
		shifts: [
			{ id: 'morning' as const, name: 'Turno Mañana', enabled: true },
			{ id: 'afternoon' as const, name: 'Turno Tarde', enabled: true },
		],
	});

	// Sincronizar cuando cambie la configuración
	useEffect(() => {
		const newSchedule = parseInitialSchedule();
		setSchedule(newSchedule);
		setSavedSchedule(newSchedule);
		setHasChanges(false);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [config.config.availability]);

	// Cargar configuración avanzada
	useEffect(() => {
		loadAdvancedConfig();
	}, []);

	const loadAdvancedConfig = async () => {
		try {
			setLoadingAdvanced(true);
			const res = await fetch('/api/dashboard/medic/schedule-config');
			if (res.ok) {
				const data = await res.json();
				if (data.config) {
					setAdvancedConfig(data.config);
					// Sincronizar configuración general
					setConsultationType(data.config.consultation_type);
					setMaxPatientsPerDay(data.config.max_patients_per_day);
					setShiftConfig(data.config.shift_config);
				}
			}
		} catch (err) {
			console.error('Error cargando configuración avanzada:', err);
		} finally {
			setLoadingAdvanced(false);
		}
	};

	// Detectar cambios en horarios básicos
	useEffect(() => {
		const currentStr = JSON.stringify(schedule);
		const savedStr = JSON.stringify(savedSchedule);
		setHasChanges(currentStr !== savedStr);
	}, [schedule, savedSchedule]);

	const [appointmentDuration, setAppointmentDuration] = useState(() => {
		const duration = initialAvailability.appointmentDuration;
		return typeof duration === 'number' ? duration : 30;
	});
	const [breakTime, setBreakTime] = useState(() => {
		const breakVal = initialAvailability.breakTime;
		return typeof breakVal === 'number' ? breakVal : 15;
	});

	const updateDaySchedule = (day: string, field: 'startTime' | 'endTime' | 'enabled', value: string | boolean) => {
		setSchedule(prev => {
			const currentDay = prev[day] || [{ day, startTime: '08:00', endTime: '17:00', enabled: false }];
			const currentSlot = currentDay[0] || { day, startTime: '08:00', endTime: '17:00', enabled: false };
			
			return {
				...prev,
				[day]: [{ ...currentSlot, [field]: value }],
			};
		});
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		setSuccess(null);

		try {
			const availability = {
				schedule,
				appointmentDuration,
				breakTime,
			};

			const res = await fetch('/api/medic/config', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ availability }),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Error al guardar horarios');
			}

			setSavedSchedule(JSON.parse(JSON.stringify(schedule)));
			setHasChanges(false);
			
			setSuccess('✅ Horarios guardados correctamente');
			onUpdate();
			
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('medicConfigUpdated'));
			}
			
			setTimeout(() => setSuccess(null), 5000);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Error al guardar los horarios';
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	const handleSaveGeneralConfig = async () => {
		try {
			setLoading(true);
			setError(null);

			// Guardar configuración general (sin consultorios)
			const configToSave = {
				consultation_type: consultationType,
				max_patients_per_day: maxPatientsPerDay,
				shift_config: shiftConfig,
				offices: advancedConfig?.offices || [],
			};

			const res = await fetch('/api/dashboard/medic/schedule-config', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(configToSave),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Error al guardar configuración');
			}

			setSuccess('✅ Configuración general guardada correctamente');
			setTimeout(() => setSuccess(null), 3000);
			loadAdvancedConfig();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al guardar configuración');
		} finally {
			setLoading(false);
		}
	};

	const handleSaveOffices = async () => {
		if (!advancedConfig) return;

		try {
			setLoading(true);
			setError(null);

			// Guardar solo la segmentación de consultorios
			const configToSave = {
				consultation_type: consultationType,
				max_patients_per_day: maxPatientsPerDay,
				shift_config: shiftConfig,
				offices: advancedConfig.offices,
			};

			console.log('💾 Guardando configuración de consultorios:', configToSave);

			const res = await fetch('/api/dashboard/medic/schedule-config', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(configToSave),
			});

			if (!res.ok) {
				let data;
				try {
					data = await res.json();
				} catch (jsonError) {
					console.error('❌ Error parseando respuesta JSON:', jsonError);
					console.error('Status:', res.status, res.statusText);
					
					// Intentar obtener el texto de la respuesta
					const text = await res.text();
					console.error('Respuesta del servidor (texto):', text);
					
					throw new Error(`Error del servidor (${res.status}): ${res.statusText}\n\nRespuesta: ${text.substring(0, 200)}`);
				}
				
				console.error('❌ Error del servidor:', data);
				
				// Mostrar error detallado
				const errorMsg = data.error || 'Error al guardar consultorios';
				const errorDetails = data.details ? `\n\nDetalles: ${data.details}` : '';
				throw new Error(errorMsg + errorDetails);
			}

			const result = await res.json();
			console.log('✅ Consultorios guardados exitosamente:', result);

			setSuccess('✅ Consultorios guardados correctamente');
			setTimeout(() => setSuccess(null), 3000);
		} catch (err) {
			console.error('❌ Error guardando consultorios:', err);
			const errorMessage = err instanceof Error ? err.message : 'Error al guardar consultorios';
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	const hasSavedSchedule = Object.values(savedSchedule).some(daySlots => 
		daySlots?.[0]?.enabled === true
	);

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Mensajes de estado */}
			<AnimatePresence>
				{error && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						className="p-4 bg-red-50 border-2 border-red-300 rounded-xl flex items-center gap-3 shadow-sm"
					>
						<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
						<span className="text-red-700 font-medium">{error}</span>
					</motion.div>
				)}
				{success && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						className="p-4 bg-green-50 border-2 border-green-300 rounded-xl flex items-center gap-3 shadow-sm"
					>
						<CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
						<span className="text-green-700 font-medium">{success}</span>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Indicador de cambios no guardados */}
			{hasChanges && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2"
				>
					<AlertCircle className="w-4 h-4 text-yellow-600" />
					<span className="text-sm text-yellow-800 font-medium">
						Tienes cambios sin guardar
					</span>
				</motion.div>
			)}

			{/* CONFIGURACIÓN GENERAL - Tipo de Consulta, Turnos, Capacidad */}
			<div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-4 sm:p-6">
				<h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
					<Users className="w-6 h-6 text-indigo-600" />
					Configuración General de Atención
				</h3>
				<p className="text-sm text-slate-600 mb-6">
					Esta configuración se aplica a todos tus consultorios. Define cómo organizas las citas de tus pacientes.
				</p>

				<div className="space-y-6">
					{/* Tipo de Consulta */}
					<div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm">
						<h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
							<Clock className="w-5 h-5 text-teal-600" />
							Tipo de Consulta
						</h4>

						<div className="space-y-3">
							<label className="flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
								<input
									type="radio"
									name="consultation_type"
									value="TURNOS"
									checked={consultationType === 'TURNOS'}
									onChange={(e) => setConsultationType(e.target.value as any)}
									className="mt-1"
								/>
								<div>
									<div className="font-semibold text-gray-900">Por Turnos (Horario Específico)</div>
									<div className="text-sm text-gray-600 mt-1">
										Cada paciente tiene un horario específico asignado (ej: 9:00 AM, 9:30 AM, etc.). 
										Ideal para mantener un control estricto del tiempo.
									</div>
								</div>
							</label>

							<label className="flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
								<input
									type="radio"
									name="consultation_type"
									value="ORDEN_LLEGADA"
									checked={consultationType === 'ORDEN_LLEGADA'}
									onChange={(e) => setConsultationType(e.target.value as any)}
									className="mt-1"
								/>
								<div>
									<div className="font-semibold text-gray-900">Por Orden de Llegada (Horario Flexible)</div>
									<div className="text-sm text-gray-600 mt-1">
										Los pacientes agendan cita pero son atendidos por orden de llegada dentro del horario de consulta. 
										El tiempo de consulta es solo referencial para estimar la capacidad.
									</div>
								</div>
							</label>
						</div>
					</div>

					{/* Configuración de Turnos */}
					{consultationType === 'TURNOS' && (
						<div className="bg-white rounded-xl p-5 shadow-sm">
							<h4 className="font-semibold text-gray-900 mb-3">Turnos Disponibles</h4>

							<div className="space-y-3">
								{shiftConfig.shifts.map((shift, index) => (
									<label key={shift.id} className="flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:bg-gray-50">
										<input
											type="checkbox"
											checked={shift.enabled}
											onChange={(e) => {
												console.log('🔄 Cambiando turno:', shift.name, 'a', e.target.checked);
												const newShifts = [...shiftConfig.shifts];
												newShifts[index] = { ...newShifts[index], enabled: e.target.checked };
												console.log('📊 Nuevos turnos:', newShifts);
												setShiftConfig({ ...shiftConfig, shifts: newShifts });
											}}
											className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer"
										/>
										<div className="flex-1">
											<div className="font-semibold text-gray-900">{shift.name}</div>
										</div>
									</label>
								))}
							</div>
						</div>
					)}

					{/* Capacidad Diaria */}
					<div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm">
						<h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
							<Users className="w-5 h-5 text-teal-600" />
							Capacidad Máxima Diaria
						</h4>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Máximo de pacientes por día
							</label>
							<input
								type="number"
								min="1"
								max="200"
								value={maxPatientsPerDay}
								onChange={(e) => setMaxPatientsPerDay(parseInt(e.target.value) || 1)}
								className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
							/>
							<p className="text-sm text-gray-500 mt-2">
								Número máximo de pacientes que puedes atender en un día
							</p>
						</div>
					</div>

					{/* Botón guardar configuración general */}
					<div className="flex justify-end">
						<button
							type="button"
							onClick={handleSaveGeneralConfig}
							disabled={loading}
							className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
						>
							<Save className="w-5 h-5" />
							{loading ? 'Guardando...' : 'Guardar Configuración General'}
						</button>
					</div>
				</div>
			</div>

			{/* Resumen de horarios guardados */}
			{hasSavedSchedule && (
				<div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-4 sm:p-6">
					<div className="flex items-center gap-3 mb-4">
						<CheckCircle2 className="w-6 h-6 text-teal-600" />
						<h3 className="text-lg font-semibold text-slate-900">Horarios Guardados Actualmente</h3>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
						{DAYS.map((day) => {
							const daySchedule = savedSchedule[day.value]?.[0];
							if (!daySchedule?.enabled) return null;
							
							return (
								<div key={day.value} className="bg-white rounded-lg p-3 border border-teal-200">
									<div className="font-semibold text-slate-900 mb-2">{day.label}</div>
									<div className="text-sm text-slate-600 flex items-center gap-2">
										<Clock className="w-3 h-3 text-teal-600" />
										<span>{daySchedule.startTime} - {daySchedule.endTime}</span>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}
			
			{/* Mensaje cuando no hay horarios guardados */}
			{!hasSavedSchedule && (
				<div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
					<div className="flex items-center gap-3">
						<AlertCircle className="w-5 h-5 text-blue-600" />
						<p className="text-sm text-slate-700">
							No hay horarios guardados. Configura tus horarios de atención a continuación.
						</p>
					</div>
				</div>
			)}

			{/* Configuración general */}
			<div className="bg-white border border-blue-100 rounded-xl p-4 sm:p-6 shadow-sm">
				<h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
					<Clock className="w-5 h-5 text-teal-600" />
					Configuración General
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-2">
							Duración de Cita (minutos)
						</label>
						<select
							value={appointmentDuration}
							onChange={(e) => setAppointmentDuration(Number(e.target.value))}
							className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-slate-900"
						>
							<option value={15}>15 minutos</option>
							<option value={30}>30 minutos</option>
							<option value={45}>45 minutos</option>
							<option value={60}>1 hora</option>
							<option value={90}>1.5 horas</option>
							<option value={120}>2 horas</option>
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-2">
							Tiempo entre Citas (minutos)
						</label>
						<select
							value={breakTime}
							onChange={(e) => setBreakTime(Number(e.target.value))}
							className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-slate-900"
						>
							<option value={0}>Sin pausa</option>
							<option value={5}>5 minutos</option>
							<option value={10}>10 minutos</option>
							<option value={15}>15 minutos</option>
							<option value={30}>30 minutos</option>
						</select>
					</div>
				</div>
			</div>

			{/* Resumen de días activos */}
			{hasSavedSchedule && (
				<div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-4">
					<div className="flex items-center gap-3 mb-3">
						<CheckCircle2 className="w-5 h-5 text-teal-600" />
						<h4 className="text-sm font-semibold text-slate-900">Días de Trabajo Configurados</h4>
					</div>
					<div className="flex flex-wrap gap-2">
						{DAYS.map((day) => {
							const daySchedule = savedSchedule[day.value]?.[0];
							const isActive = daySchedule?.enabled || false;
							return (
								<span
									key={day.value}
									className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
										isActive
											? 'bg-teal-600 text-white shadow-sm'
											: 'bg-slate-200 text-slate-500'
									}`}
									title={isActive && daySchedule ? `${daySchedule.startTime} - ${daySchedule.endTime}` : undefined}
								>
									{day.label}
									{isActive && daySchedule && (
										<span className="ml-2 text-xs opacity-90">
											({daySchedule.startTime} - {daySchedule.endTime})
										</span>
									)}
								</span>
							);
						})}
					</div>
					<p className="text-xs text-slate-600 mt-3">
						Los pacientes solo podrán agendar citas en los días que tengas configurados y habilitados.
					</p>
				</div>
			)}

			{/* Horario de atención por día */}
			<div className="bg-white border border-blue-100 rounded-xl p-4 sm:p-6 shadow-sm">
				<h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
					<Calendar className="w-5 h-5 text-teal-600" />
					Horario de Atención
					{hasSavedSchedule && (
						<span className="ml-2 text-sm font-normal text-slate-500">
							(Define tu jornada laboral para cada día)
						</span>
					)}
				</h3>
				<p className="text-sm text-slate-600 mb-6">
					Configura el horario de inicio y fin de tu jornada laboral para cada día. Los horarios disponibles para citas se generarán automáticamente según la duración de cita y tiempo entre citas configurados arriba.
				</p>
				<div className="space-y-4">
					{DAYS.map((day) => {
						const daySchedule = schedule[day.value]?.[0] || { day: day.value, startTime: '08:00', endTime: '17:00', enabled: false };
						const savedDaySchedule = savedSchedule[day.value]?.[0] || { day: day.value, startTime: '08:00', endTime: '17:00', enabled: false };
						const isEnabled = daySchedule.enabled;
						const isSaved = savedDaySchedule.enabled && 
							savedDaySchedule.startTime === daySchedule.startTime &&
							savedDaySchedule.endTime === daySchedule.endTime;
						
						return (
							<div 
								key={day.value} 
								className={`bg-white rounded-lg border-2 p-3 sm:p-4 transition-colors ${
									savedDaySchedule.enabled 
										? 'border-teal-200 bg-teal-50/30' 
										: 'border-blue-200 bg-blue-50/30'
								}`}
							>
								<div className="flex items-center justify-between mb-3">
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="checkbox"
											checked={isEnabled}
											onChange={(e) => {
												updateDaySchedule(day.value, 'enabled', e.target.checked);
												if (e.target.checked && (!schedule[day.value] || schedule[day.value].length === 0)) {
													setSchedule(prev => ({
														...prev,
														[day.value]: [{ day: day.value, startTime: '08:00', endTime: '17:00', enabled: true }],
													}));
												}
											}}
											className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
										/>
										<span className="font-semibold text-slate-900">{day.label}</span>
										{savedDaySchedule.enabled && (
											<span className="ml-2 px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-medium rounded-full">
												Guardado
											</span>
										)}
									</label>
								</div>

								{isEnabled && (
									<div className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 rounded-lg border transition-colors ${
										isSaved
											? 'bg-teal-50 border-teal-200'
											: 'bg-blue-50 border-blue-200'
									}`}>
										<div className="flex items-center gap-2 flex-1">
											<Clock className="w-4 h-4 text-slate-500" />
											<span className="text-sm font-medium text-slate-700">Inicio:</span>
											<input
												type="time"
												value={daySchedule.startTime}
												onChange={(e) => updateDaySchedule(day.value, 'startTime', e.target.value)}
												className="px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-slate-900 font-medium"
											/>
										</div>
										<div className="flex items-center gap-2 flex-1">
											<Clock className="w-4 h-4 text-slate-500" />
											<span className="text-sm font-medium text-slate-700">Fin:</span>
											<input
												type="time"
												value={daySchedule.endTime}
												onChange={(e) => updateDaySchedule(day.value, 'endTime', e.target.value)}
												className="px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-slate-900 font-medium"
											/>
										</div>
									{isSaved && (
										<span title="Horario guardado">
											<CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0" />
										</span>
									)}
									</div>
								)}
								
								{!isEnabled && (
									<div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500">
										Este día no está disponible para atención
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>

			{/* Botón de guardar horarios básicos */}
			<div className="flex justify-end gap-4 pt-6 border-t border-blue-100">
				{hasChanges && (
					<button
						type="button"
						onClick={() => {
							setSchedule(JSON.parse(JSON.stringify(savedSchedule)));
							setHasChanges(false);
						}}
						className="px-6 py-2 border border-blue-200 text-slate-700 rounded-lg hover:bg-blue-50 transition-colors"
					>
						Descartar Cambios
					</button>
				)}
				<button
					type="submit"
					disabled={loading || !hasChanges}
					className={`px-6 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
						hasChanges
							? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-700 hover:to-cyan-700 shadow-md'
							: 'bg-slate-300 text-slate-500 cursor-not-allowed'
					}`}
				>
					<Save className="w-4 h-4" />
					{loading ? 'Guardando...' : hasChanges ? 'Guardar Cambios' : 'Sin cambios'}
				</button>
			</div>

			{/* Sección de Segmentación por Consultorios (Avanzada) */}
			<div className="border-t-4 border-orange-200 pt-6 mt-8">
				<button
					type="button"
					onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
					className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl hover:from-orange-100 hover:to-amber-100 transition-colors"
				>
					<div className="flex items-center gap-3">
						<MapPin className="w-6 h-6 text-orange-600" />
						<div className="text-left">
							<h3 className="text-lg font-bold text-slate-900">Segmentación por Consultorios (Avanzado)</h3>
							<p className="text-sm text-slate-600">Distribuye tus horarios entre múltiples consultorios</p>
						</div>
					</div>
					{showAdvancedConfig ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
				</button>

				{showAdvancedConfig && advancedConfig && (
					<div className="mt-6 space-y-6">
						<div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
							<p className="text-sm text-amber-900">
								<strong>💡 Nota:</strong> Aquí puedes definir en qué consultorios trabajas y qué días/horarios atiendes en cada uno. 
								La configuración general (tipo de consulta, turnos, capacidad) ya está definida arriba y se aplica a todos los consultorios.
							</p>
						</div>

						<OfficeSegmentation 
							offices={advancedConfig.offices}
							shiftConfig={shiftConfig}
							consultationType={consultationType}
							onChange={(offices) => setAdvancedConfig({ ...advancedConfig, offices })}
							onSave={handleSaveOffices}
							loading={loading}
						/>
					</div>
				)}
			</div>
		</form>
	);
}

// Componente para segmentación de consultorios
function OfficeSegmentation({ offices, shiftConfig, consultationType, onChange, onSave, loading }: {
	offices: Office[];
	shiftConfig: ScheduleConfig['shift_config'];
	consultationType: 'TURNOS' | 'ORDEN_LLEGADA';
	onChange: (offices: Office[]) => void;
	onSave: () => void;
	loading: boolean;
}) {
	const addOffice = () => {
		const newOffice: Office = {
			id: `office-${Date.now()}`,
			name: '',
			location: null,
			phone: '',
			schedules: [],
		};
		onChange([...offices, newOffice]);
	};

	const updateOffice = (index: number, updatedOffice: Office) => {
		console.log('🏭 updateOffice llamado:', { index, updatedOffice });
		console.log('🏭 Offices actuales:', offices);
		const newOffices = [...offices];
		newOffices[index] = updatedOffice;
		console.log('🏭 Nuevos offices:', newOffices);
		onChange(newOffices);
		console.log('🏭 onChange llamado');
	};

	const removeOffice = (index: number) => {
		onChange(offices.filter((_, i) => i !== index));
	};

	return (
		<div className="space-y-6">
			{/* Consultorios */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
						<MapPin className="w-5 h-5 text-orange-600" />
						Mis Consultorios
					</h3>
					<button
						type="button"
						onClick={addOffice}
						className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors"
					>
						<Plus className="w-4 h-4" />
						Agregar Consultorio
					</button>
				</div>

				{offices.length === 0 ? (
					<div className="text-center py-8 text-gray-500">
						<MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
						<p>No has configurado ningún consultorio</p>
						<p className="text-sm mt-1">Si trabajas en un solo lugar, no necesitas usar esta sección</p>
					</div>
				) : (
					<div className="space-y-4">
						{offices.map((office, index) => (
							<OfficeEditor
								key={office.id}
								office={office}
								index={index}
								shiftConfig={shiftConfig}
								consultationType={consultationType}
								onUpdate={(updatedOffice) => updateOffice(index, updatedOffice)}
								onRemove={() => removeOffice(index)}
							/>
						))}
					</div>
				)}
			</div>

			{/* Botón guardar consultorios */}
			{offices.length > 0 && (
				<div className="flex justify-end">
					<button
						type="button"
						onClick={onSave}
						disabled={loading}
						className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
					>
						{loading ? (
							<>
								<Clock className="w-5 h-5 animate-spin" />
								Guardando...
							</>
						) : (
							<>
								<Save className="w-5 h-5" />
								Guardar Segmentación de Consultorios
							</>
						)}
					</button>
				</div>
			)}
		</div>
	);
}

// Office Editor Component (simplificado - solo horarios por consultorio)
function OfficeEditor({ office, index, shiftConfig, consultationType, onUpdate, onRemove }: {
	office: Office;
	index: number;
	shiftConfig: ScheduleConfig['shift_config'];
	consultationType: 'TURNOS' | 'ORDEN_LLEGADA';
	onUpdate: (office: Office) => void;
	onRemove: () => void;
}) {
	const [expanded, setExpanded] = useState(true);

	const addSchedule = () => {
		onUpdate({
			...office,
			schedules: [...office.schedules, { days: [], shifts: [], hours: {} }],
		});
	};

	const updateSchedule = (scheduleIndex: number, field: string, value: any) => {
		console.log('🔧 updateSchedule llamado:', { scheduleIndex, field, value });
		console.log('📦 Office actual:', office);
		const newSchedules = [...office.schedules];
		newSchedules[scheduleIndex] = { ...newSchedules[scheduleIndex], [field]: value };
		console.log('📦 Nuevos schedules:', newSchedules);
		const updatedOffice = { ...office, schedules: newSchedules };
		console.log('🏢 Office actualizado:', updatedOffice);
		onUpdate(updatedOffice);
		console.log('✅ onUpdate llamado');
	};

	const removeSchedule = (scheduleIndex: number) => {
		onUpdate({
			...office,
			schedules: office.schedules.filter((_, i) => i !== scheduleIndex),
		});
	};

	const toggleDay = (scheduleIndex: number, day: string) => {
		const schedule = office.schedules[scheduleIndex];
		const days = schedule.days.includes(day)
			? schedule.days.filter((d) => d !== day)
			: [...schedule.days, day];
		updateSchedule(scheduleIndex, 'days', days);
	};

	const toggleShift = (scheduleIndex: number, shift: string) => {
		console.log('📍 toggleShift llamado - scheduleIndex:', scheduleIndex, 'shift:', shift);
		const schedule = office.schedules[scheduleIndex];
		const isAdding = !schedule.shifts.includes(shift);
		
		// 1. Calcular nuevos shifts
		const shifts = isAdding
			? [...schedule.shifts, shift]
			: schedule.shifts.filter((s) => s !== shift);
		
		// 2. Calcular nuevas horas si se está agregando
		let newHours = { ...schedule.hours };
		if (isAdding) {
			if (shift === 'morning') newHours.morning = { start: '08:00', end: '12:00' };
			else if (shift === 'afternoon') newHours.afternoon = { start: '14:00', end: '18:00' };
			else if (shift === 'full_day') newHours.full_day = { start: '08:00', end: '18:00' };
		}

		// 3. Crear el nuevo array de schedules
		const newSchedules = [...office.schedules];
		newSchedules[scheduleIndex] = { 
			...newSchedules[scheduleIndex], 
			shifts: shifts,
			hours: newHours 
		};

		// 4. Notificar UN SOLO cambio al padre
		console.log('🏢 Notificando actualización única de office:', { shifts, newHours });
		onUpdate({ ...office, schedules: newSchedules });
		console.log('✅ toggleShift completado');
	};

	const updateHours = (scheduleIndex: number, shift: string, type: 'start' | 'end', value: string) => {
		const schedule = office.schedules[scheduleIndex];
		const newHours = { ...schedule.hours };
		if (!newHours[shift as keyof typeof newHours]) {
			newHours[shift as keyof typeof newHours] = { start: '08:00', end: '18:00' };
		}
		(newHours[shift as keyof typeof newHours] as any)[type] = value;
		updateSchedule(scheduleIndex, 'hours', newHours);
	};

	const enabledShifts = shiftConfig.shifts.filter((s) => s.enabled);

	return (
		<div className="border-2 border-gray-200 rounded-xl overflow-hidden">
			<div className="bg-gray-50 p-4 flex items-center justify-between">
				<div className="flex items-center gap-3 flex-1">
					<button
						type="button"
						onClick={() => setExpanded(!expanded)}
						className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
					>
						{expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
					</button>
					<div className="flex-1">
						<h4 className="font-semibold text-gray-900">
							{office.name || `Consultorio ${index + 1}`}
						</h4>
						{office.location && <p className="text-sm text-gray-600 mt-1">{office.location.address}</p>}
					</div>
				</div>
				<button
					type="button"
					onClick={onRemove}
					className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
				>
					<Trash2 className="w-5 h-5" />
				</button>
			</div>

			{expanded && (
				<div className="p-4 sm:p-6 space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								<MapPin className="w-4 h-4 inline mr-1" />
								Nombre del Consultorio *
							</label>
							<input
								type="text"
								value={office.name}
								onChange={(e) => onUpdate({ ...office, name: e.target.value })}
								placeholder="Ej: Consultorio Centro Médico"
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								<Phone className="w-4 h-4 inline mr-1" />
								Teléfono (Opcional)
							</label>
							<input
								type="tel"
								value={office.phone || ''}
								onChange={(e) => onUpdate({ ...office, phone: e.target.value })}
								placeholder="Ej: +58 412-1234567"
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
							/>
						</div>
					</div>

					<div className="md:col-span-2">
						<label className="block text-sm font-medium text-gray-700 mb-2">
							<MapPin className="w-4 h-4 inline mr-1" />
							Ubicación del Consultorio *
						</label>
						<p className="text-xs text-gray-500 mb-3">
							Selecciona la ubicación exacta del consultorio en el mapa. Los pacientes podrán ver esta ubicación y obtener direcciones.
						</p>
						<LeafletMapPicker
							onLocationSelect={(location) => onUpdate({ ...office, location })}
							initialLocation={office.location}
						/>
					</div>

					<div>
						<div className="flex items-center justify-between mb-4">
							<h5 className="font-semibold text-gray-900 flex items-center gap-2">
								<Calendar className="w-5 h-5 text-orange-600" />
								Horarios en Este Consultorio
							</h5>
							<button
								type="button"
								onClick={addSchedule}
								className="text-sm px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
							>
								+ Agregar Horario
							</button>
						</div>

						{office.schedules.length === 0 ? (
							<div className="text-center py-6 bg-gray-50 rounded-lg">
								<Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
								<p className="text-sm text-gray-500">Define qué días atiendes en este consultorio</p>
							</div>
						) : (
							<div className="space-y-4">
								{office.schedules.map((schedule, scheduleIndex) => (
									<div key={scheduleIndex} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
										<div className="flex justify-between items-start mb-4">
											<h6 className="font-medium text-gray-900">Horario {scheduleIndex + 1}</h6>
											<button
												type="button"
												onClick={() => removeSchedule(scheduleIndex)}
												className="text-red-600 hover:text-red-700 text-sm"
											>
												Eliminar
											</button>
										</div>

										<div className="mb-4">
											<label className="block text-sm font-medium text-gray-700 mb-2">Días</label>
											<div className="flex flex-wrap gap-2">
												{DAYS_OF_WEEK.map((day) => (
													<button
														key={day.value}
														type="button"
														onClick={() => toggleDay(scheduleIndex, day.value)}
														className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
															schedule.days.includes(day.value)
																? 'bg-orange-600 text-white'
																: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
														}`}
													>
														{day.label}
													</button>
												))}
											</div>
										</div>

										{consultationType === 'TURNOS' && (
											<div className="mb-4">
												<label className="block text-sm font-medium text-gray-700 mb-2">Turnos</label>
												<div className="space-y-2">
													{enabledShifts.map((shift) => (
														<div key={shift.id}>
															<label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
																<input
																	type="checkbox"
																	checked={schedule.shifts.includes(shift.id)}
																	onChange={() => {
																		console.log('🏢 Cambiando turno en consultorio:', shift.name, 'Schedule:', scheduleIndex);
																		toggleShift(scheduleIndex, shift.id);
																	}}
																	className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 cursor-pointer"
																/>
																<span className="text-sm font-medium">{shift.name}</span>
															</label>

															{schedule.shifts.includes(shift.id) && (
																<div className="ml-6 mt-2 flex flex-col sm:flex-row sm:items-center gap-3">
																	<div>
																		<label className="block text-xs text-gray-600 mb-1">Inicio</label>
																		<input
																			type="time"
																			value={schedule.hours[shift.id as keyof typeof schedule.hours]?.start || '08:00'}
																			onChange={(e) => updateHours(scheduleIndex, shift.id, 'start', e.target.value)}
																			className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
																		/>
																	</div>
																	<div>
																		<label className="block text-xs text-gray-600 mb-1">Fin</label>
																		<input
																			type="time"
																			value={schedule.hours[shift.id as keyof typeof schedule.hours]?.end || '18:00'}
																			onChange={(e) => updateHours(scheduleIndex, shift.id, 'end', e.target.value)}
																			className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
																		/>
																	</div>
																</div>
															)}
														</div>
													))}
												</div>
											</div>
										)}

										{consultationType === 'ORDEN_LLEGADA' && (
											<div className="flex items-center gap-3">
												<div>
													<label className="block text-xs text-gray-600 mb-1">Hora de Inicio</label>
													<input
														type="time"
														value={schedule.hours.full_day?.start || '08:00'}
														onChange={(e) => updateHours(scheduleIndex, 'full_day', 'start', e.target.value)}
														className="px-3 py-2 border border-gray-300 rounded-lg"
													/>
												</div>
												<div>
													<label className="block text-xs text-gray-600 mb-1">Hora de Fin</label>
													<input
														type="time"
														value={schedule.hours.full_day?.end || '18:00'}
														onChange={(e) => updateHours(scheduleIndex, 'full_day', 'end', e.target.value)}
														className="px-3 py-2 border border-gray-300 rounded-lg"
													/>
												</div>
											</div>
										)}
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
