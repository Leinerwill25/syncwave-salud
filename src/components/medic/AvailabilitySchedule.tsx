'use client';

import { useState, useEffect } from 'react';
import { Clock, Calendar, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MedicConfig } from '@/types/medic-config';

type TimeSlot = {
	day: string;
	startTime: string;
	endTime: string;
	enabled: boolean;
};

const DAYS = [
	{ value: 'monday', label: 'Lunes' },
	{ value: 'tuesday', label: 'Martes' },
	{ value: 'wednesday', label: 'Miércoles' },
	{ value: 'thursday', label: 'Jueves' },
	{ value: 'friday', label: 'Viernes' },
	{ value: 'saturday', label: 'Sábado' },
	{ value: 'sunday', label: 'Domingo' },
];

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

	// Cargar disponibilidad inicial desde la configuración
	const initialAvailability = config.config.availability || {};
	
	// Función para parsear la disponibilidad inicial
	const parseInitialSchedule = (): Record<string, TimeSlot[]> => {
		const defaultSchedule: Record<string, TimeSlot[]> = {};
		DAYS.forEach(day => {
			// Intentar obtener desde availability.schedule[day]
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
				// Validar que los elementos sean TimeSlot válidos
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

	// Sincronizar cuando cambie la configuración (después de recargar)
	useEffect(() => {
		const newSchedule = parseInitialSchedule();
		setSchedule(newSchedule);
		setSavedSchedule(newSchedule);
		setHasChanges(false);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [config.config.availability]);

	// Detectar cambios
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

	// Actualizar el horario único de un día
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

			// Guardar el estado actual como guardado
			setSavedSchedule(JSON.parse(JSON.stringify(schedule)));
			setHasChanges(false);
			
			setSuccess('✅ Horarios guardados correctamente');
			onUpdate();
			
			// Disparar evento personalizado para notificar al sidebar que debe recargar
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('medicConfigUpdated'));
			}
			
			// Mantener el mensaje visible por más tiempo
			setTimeout(() => setSuccess(null), 5000);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Error al guardar los horarios';
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	// Verificar si hay horarios guardados
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

			{/* Resumen de horarios guardados */}
			{hasSavedSchedule && (
				<div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-6">
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
			<div className="bg-white border border-blue-100 rounded-xl p-6 shadow-sm">
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
			<div className="bg-white border border-blue-100 rounded-xl p-6 shadow-sm">
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
								className={`bg-white rounded-lg border-2 p-4 transition-colors ${
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
												// Si se habilita y no hay horario configurado, usar valores por defecto
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
									<div className={`flex items-center gap-3 p-4 rounded-lg border transition-colors ${
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

			{/* Botón de guardar */}
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
		</form>
	);
}

