'use client';

import { useState } from 'react';
import { Clock, Calendar, Plus, X, Check } from 'lucide-react';
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

	const initialAvailability = config.config.availability || {};
	const [schedule, setSchedule] = useState<Record<string, TimeSlot[]>>(() => {
		const defaultSchedule: Record<string, TimeSlot[]> = {};
		DAYS.forEach(day => {
			const dayValue = initialAvailability[day.value];
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
	});

	const [appointmentDuration, setAppointmentDuration] = useState(() => {
		const duration = initialAvailability.appointmentDuration;
		return typeof duration === 'number' ? duration : 30;
	});
	const [breakTime, setBreakTime] = useState(() => {
		const breakVal = initialAvailability.breakTime;
		return typeof breakVal === 'number' ? breakVal : 15;
	});

	const addTimeSlot = (day: string) => {
		setSchedule(prev => ({
			...prev,
			[day]: [...(prev[day] || []), { day, startTime: '09:00', endTime: '17:00', enabled: true }],
		}));
	};

	const removeTimeSlot = (day: string, index: number) => {
		setSchedule(prev => ({
			...prev,
			[day]: prev[day].filter((_, i) => i !== index),
		}));
	};

	const updateTimeSlot = (day: string, index: number, field: keyof TimeSlot, value: string | boolean) => {
		setSchedule(prev => ({
			...prev,
			[day]: prev[day].map((slot, i) =>
				i === index ? { ...slot, [field]: value } : slot
			),
		}));
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

			setSuccess('Horarios guardados correctamente');
			onUpdate();
			setTimeout(() => setSuccess(null), 3000);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Error al guardar los horarios';
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Mensajes de estado */}
			{error && (
				<div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
					<X className="w-5 h-5 text-red-600" />
					<span className="text-red-700">{error}</span>
				</div>
			)}
			{success && (
				<div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
					<Check className="w-5 h-5 text-green-600" />
					<span className="text-green-700">{success}</span>
				</div>
			)}

			{/* Configuración general */}
			<div className="bg-gray-50 rounded-xl p-6">
				<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
					<Clock className="w-5 h-5 text-indigo-600" />
					Configuración General
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Duración de Cita (minutos)
						</label>
						<select
							value={appointmentDuration}
							onChange={(e) => setAppointmentDuration(Number(e.target.value))}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Tiempo entre Citas (minutos)
						</label>
						<select
							value={breakTime}
							onChange={(e) => setBreakTime(Number(e.target.value))}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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

			{/* Horarios por día */}
			<div className="bg-gray-50 rounded-xl p-6">
				<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
					<Calendar className="w-5 h-5 text-indigo-600" />
					Horarios de Atención
				</h3>
				<div className="space-y-4">
					{DAYS.map((day) => (
						<div key={day.value} className="bg-white rounded-lg border border-gray-200 p-4">
							<div className="flex items-center justify-between mb-3">
								<label className="flex items-center gap-2 cursor-pointer">
									<input
										type="checkbox"
										checked={schedule[day.value]?.some(s => s.enabled) || false}
										onChange={(e) => {
											if (e.target.checked && (!schedule[day.value] || schedule[day.value].length === 0)) {
												setSchedule(prev => ({
													...prev,
													[day.value]: [{ day: day.value, startTime: '09:00', endTime: '17:00', enabled: true }],
												}));
											} else if (!e.target.checked) {
												setSchedule(prev => ({
													...prev,
													[day.value]: (prev[day.value] || []).map(s => ({ ...s, enabled: false })),
												}));
											}
										}}
										className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
									/>
									<span className="font-semibold text-gray-900">{day.label}</span>
								</label>
								<button
									type="button"
									onClick={() => addTimeSlot(day.value)}
									className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
									title="Agregar horario"
								>
									<Plus className="w-4 h-4" />
								</button>
							</div>

							{schedule[day.value] && schedule[day.value].length > 0 && (
								<div className="space-y-2">
									{schedule[day.value].map((slot, idx) => (
										<div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
											<input
												type="checkbox"
												checked={slot.enabled}
												onChange={(e) => updateTimeSlot(day.value, idx, 'enabled', e.target.checked)}
												className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
											/>
											<input
												type="time"
												value={slot.startTime}
												onChange={(e) => updateTimeSlot(day.value, idx, 'startTime', e.target.value)}
												disabled={!slot.enabled}
												className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
											/>
											<span className="text-gray-500">-</span>
											<input
												type="time"
												value={slot.endTime}
												onChange={(e) => updateTimeSlot(day.value, idx, 'endTime', e.target.value)}
												disabled={!slot.enabled}
												className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
											/>
											{schedule[day.value].length > 1 && (
												<button
													type="button"
													onClick={() => removeTimeSlot(day.value, idx)}
													className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto"
												>
													<X className="w-4 h-4" />
												</button>
											)}
										</div>
									))}
								</div>
							)}
						</div>
					))}
				</div>
			</div>

			{/* Botón de guardar */}
			<div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
				<button
					type="button"
					onClick={() => window.location.reload()}
					className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
				>
					Cancelar
				</button>
				<button
					type="submit"
					disabled={loading}
					className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
				>
					{loading ? 'Guardando...' : 'Guardar Horarios'}
				</button>
			</div>
		</form>
	);
}

