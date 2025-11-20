// components/patient/RescheduleModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, AlertCircle } from 'lucide-react';

interface RescheduleModalProps {
	isOpen: boolean;
	onClose: () => void;
	appointmentId: string;
	doctorId: string | null;
	currentScheduledAt: string;
	onSuccess: () => void;
}

export default function RescheduleModal({
	isOpen,
	onClose,
	appointmentId,
	doctorId,
	currentScheduledAt,
	onSuccess,
}: RescheduleModalProps) {
	const [selectedDate, setSelectedDate] = useState<string>('');
	const [selectedTime, setSelectedTime] = useState<string>('');
	const [reason, setReason] = useState<string>('');
	const [availableSlots, setAvailableSlots] = useState<string[]>([]);
	const [availableDays, setAvailableDays] = useState<number[]>([]);
	const [loadingSlots, setLoadingSlots] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (isOpen && doctorId) {
			loadAvailableDays();
		}
	}, [isOpen, doctorId]);

	useEffect(() => {
		if (selectedDate && doctorId) {
			loadAvailableSlots();
		} else {
			setAvailableSlots([]);
		}
	}, [selectedDate, doctorId]);

	const loadAvailableDays = async () => {
		if (!doctorId) return;
		try {
			const res = await fetch(`/api/patient/appointments/available-days?doctor_id=${doctorId}`, {
				credentials: 'include',
			});
			if (res.ok) {
				const data = await res.json();
				setAvailableDays(data.availableDays || []);
			}
		} catch (err) {
			console.error('Error cargando días disponibles:', err);
		}
	};

	const loadAvailableSlots = async () => {
		if (!selectedDate || !doctorId) return;
		setLoadingSlots(true);
		setError(null);
		try {
			// Incluir appointmentId para excluir la cita actual al reagendar
			const params = new URLSearchParams({
				doctor_id: doctorId,
				date: selectedDate,
			});
			if (appointmentId) {
				params.set('exclude_appointment_id', appointmentId);
			}
			
			const res = await fetch(
				`/api/patient/appointments/available?${params.toString()}`,
				{
					credentials: 'include',
				}
			);
			if (res.ok) {
				const data = await res.json();
				setAvailableSlots(data.availableSlots || data.slots || []);
			} else {
				const errorData = await res.json();
				setError(errorData.error || 'Error al cargar horarios disponibles');
			}
		} catch (err) {
			console.error('Error cargando horarios:', err);
			setError('Error al cargar horarios disponibles');
		} finally {
			setLoadingSlots(false);
		}
	};

	const isDateAvailable = (date: Date): boolean => {
		const dayOfWeek = date.getDay();
		return availableDays.includes(dayOfWeek);
	};

	const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const date = new Date(e.target.value);
		if (!isDateAvailable(date)) {
			alert('Este día no está disponible. Por favor seleccione otro día.');
			return;
		}
		setSelectedDate(e.target.value);
		setSelectedTime('');
		setAvailableSlots([]);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedDate || !selectedTime) {
			alert('Por favor seleccione fecha y hora');
			return;
		}

		const newScheduledAt = `${selectedDate}T${selectedTime}:00`;
		const newDate = new Date(newScheduledAt);
		if (newDate <= new Date()) {
			alert('La nueva fecha debe ser futura');
			return;
		}

		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`/api/patient/appointments/${appointmentId}/reschedule`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					new_scheduled_at: newScheduledAt,
					reason: reason || null,
				}),
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || 'Error al reagendar la cita');
			}

			alert('Cita reagendada correctamente. El médico ha sido notificado.');
			onSuccess();
			onClose();
		} catch (err) {
			console.error('Error:', err);
			setError(err instanceof Error ? err.message : 'Error al reagendar la cita');
		} finally {
			setLoading(false);
		}
	};

	if (!isOpen) return null;

	const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
	const availableDayNames = availableDays.map(day => dayNames[day]);

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
				onClick={onClose}
			>
				<motion.div
					initial={{ scale: 0.95, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					exit={{ scale: 0.95, opacity: 0 }}
					onClick={(e) => e.stopPropagation()}
					className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
				>
					{/* Header */}
					<div className="flex items-center justify-between p-6 border-b border-slate-200">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-indigo-100 rounded-xl">
								<Calendar className="w-6 h-6 text-indigo-600" />
							</div>
							<div>
								<h2 className="text-2xl font-bold text-slate-900">Reagendar Cita</h2>
								<p className="text-sm text-slate-600">Seleccione una nueva fecha y hora</p>
							</div>
						</div>
						<button
							onClick={onClose}
							className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
						>
							<X className="w-5 h-5 text-slate-600" />
						</button>
					</div>

					{/* Form */}
					<form onSubmit={handleSubmit} className="p-6 space-y-6">
						{error && (
							<div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3">
								<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
								<p className="text-sm text-red-800">{error}</p>
							</div>
						)}

						{/* Fecha actual */}
						<div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
							<p className="text-sm font-medium text-blue-900 mb-1">Fecha y hora actual:</p>
							<p className="text-blue-700">
								{new Date(currentScheduledAt).toLocaleString('es-ES', {
									weekday: 'long',
									year: 'numeric',
									month: 'long',
									day: 'numeric',
									hour: '2-digit',
									minute: '2-digit',
								})}
							</p>
						</div>

						{/* Días disponibles */}
						{availableDays.length > 0 && (
							<div className="p-4 bg-green-50 border border-green-200 rounded-xl">
								<p className="text-sm font-medium text-green-900 mb-2">Días disponibles:</p>
								<div className="flex flex-wrap gap-2">
									{availableDayNames.map((day, idx) => (
										<span
											key={idx}
											className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium"
										>
											{day}
										</span>
									))}
								</div>
							</div>
						)}

						{/* Nueva fecha */}
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-2">
								Nueva Fecha <span className="text-red-500">*</span>
							</label>
							<input
								type="date"
								required
								value={selectedDate}
								onChange={handleDateChange}
								min={new Date().toISOString().split('T')[0]}
								className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
							/>
						</div>

						{/* Nueva hora */}
						{selectedDate && (
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-2">
									Nueva Hora <span className="text-red-500">*</span>
								</label>
								{loadingSlots ? (
									<div className="w-full px-4 py-2 border border-slate-300 rounded-xl bg-slate-50 flex items-center gap-2">
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
										<span className="text-sm text-slate-600">Cargando horarios disponibles...</span>
									</div>
								) : availableSlots.length === 0 ? (
									<div className="w-full px-4 py-3 border-2 border-yellow-300 rounded-xl bg-yellow-50 text-yellow-800 text-sm">
										No hay horarios disponibles para esta fecha. Intenta con otra fecha.
									</div>
								) : (
									<select
										required
										value={selectedTime}
										onChange={(e) => setSelectedTime(e.target.value)}
										className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
									>
										<option value="">Seleccionar hora</option>
										{availableSlots.map((slot) => (
											<option key={slot} value={slot}>
												{slot}
											</option>
										))}
									</select>
								)}
							</div>
						)}

						{/* Motivo (opcional) */}
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-2">
								Motivo del reagendamiento (opcional)
							</label>
							<textarea
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								rows={3}
								placeholder="Ej: Cambio de disponibilidad..."
								className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
							/>
						</div>

						{/* Botones */}
						<div className="flex gap-3 pt-4 border-t border-slate-200">
							<button
								type="button"
								onClick={onClose}
								className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
							>
								Cancelar
							</button>
							<button
								type="submit"
								disabled={loading || !selectedDate || !selectedTime}
								className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
							>
								{loading ? (
									<>
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
										Reagendando...
									</>
								) : (
									<>
										<Calendar className="w-4 h-4" />
										Reagendar Cita
									</>
								)}
							</button>
						</div>
					</form>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
}

