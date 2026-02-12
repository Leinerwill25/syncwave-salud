'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
	isOpen: boolean;
	onClose: () => void;
	appointment: {
		id: string;
		scheduled_at?: string;
		patient: string;
	} | null;
	onReschedule: (appointmentId: string, newDate: string) => Promise<void>;
}

export default function RescheduleModal({ isOpen, onClose, appointment, onReschedule }: Props) {
	const [newDate, setNewDate] = useState('');
	const [newTime, setNewTime] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	useEffect(() => {
		if (appointment && isOpen) {
			const scheduledAt = appointment.scheduled_at || new Date().toISOString();
			// Fix: Parse JSON ISO string explicitly to avoid local timezone conversion
			// The backend sends ISO string like "2023-10-10T08:00:00" which means 8:00 AM.
			// extracting parts directly preserves the "intended" time.
			const dateStr = scheduledAt.split('T')[0];
			const timeStr = scheduledAt.split('T')[1].substring(0, 5); // HH:MM
			setNewDate(dateStr);
			setNewTime(timeStr);
			setError(null);
			setSuccess(false);
		}
	}, [appointment, isOpen]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!appointment || !newDate || !newTime) {
			setError('Por favor, complete todos los campos');
			return;
		}

		try {
			setLoading(true);
			setError(null);
			// Fix: Construct UTC date specifically to preserve the selected time
			const [year, month, day] = newDate.split('-').map(Number);
			const [hours, minutes] = newTime.split(':').map(Number);
			const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
			const newDateTimeISO = utcDate.toISOString();
			
			await onReschedule(appointment.id, newDateTimeISO);
			setSuccess(true);
			setTimeout(() => {
				onClose();
				setSuccess(false);
			}, 1500);
		} catch (err: any) {
			setError(err.message || 'Error al reagendar la cita');
		} finally {
			setLoading(false);
		}
	};

	if (!isOpen || !appointment) return null;

	const scheduledAt = appointment.scheduled_at || new Date().toISOString();
	const currentDate = new Date(scheduledAt);
	const formattedCurrentDate = currentDate.toLocaleDateString('es-ES', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		timeZone: 'UTC', // Fix: Force UTC display
	});
	const formattedCurrentTime = currentDate.toLocaleTimeString('es-ES', {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'UTC', // Fix: Force UTC display
	});

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
					<motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
						<button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
							<X className="w-5 h-5" />
						</button>

						<div className="mb-6">
							<h2 className="text-2xl font-bold text-gray-900 mb-2">Reagendar Cita</h2>
							<p className="text-sm text-gray-600">Cambiar la fecha y hora de la cita del paciente</p>
						</div>

						{success ? (
							<div className="text-center py-8">
								<CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
								<p className="text-lg font-semibold text-gray-900">¡Cita reagendada exitosamente!</p>
							</div>
						) : (
							<form onSubmit={handleSubmit} className="space-y-6">
								{/* Información del paciente */}
								<div className="bg-gray-50 rounded-lg p-4">
									<p className="text-sm font-medium text-gray-700 mb-1">Paciente:</p>
									<p className="text-base font-semibold text-gray-900">{appointment.patient}</p>
								</div>

								{/* Fecha y hora actual */}
								<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
									<p className="text-xs font-medium text-blue-700 mb-2">Fecha y Hora Actual:</p>
									<div className="flex items-center gap-2 text-blue-900">
										<Calendar className="w-4 h-4" />
										<span className="font-medium">{formattedCurrentDate}</span>
										<Clock className="w-4 h-4 ml-2" />
										<span className="font-medium">{formattedCurrentTime}</span>
									</div>
								</div>

								{/* Nueva fecha y hora */}
								<div className="space-y-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">Nueva Fecha:</label>
										<input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition" required />
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">Nueva Hora:</label>
										<input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition" required />
									</div>
								</div>

								{error && (
									<div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
										<AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
										<p className="text-sm text-red-700">{error}</p>
									</div>
								)}

								<div className="flex gap-3 pt-4">
									<button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition">
										Cancelar
									</button>
									<button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-medium rounded-lg hover:from-teal-700 hover:to-cyan-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
										{loading ? (
											<>
												<Loader2 className="w-4 h-4 animate-spin" />
												Reagendando...
											</>
										) : (
											'Reagendar Cita'
										)}
									</button>
								</div>
							</form>
						)}
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

