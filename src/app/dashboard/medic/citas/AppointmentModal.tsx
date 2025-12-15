'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, CalendarDays } from 'lucide-react';
import { useAppointments } from '@/app/hooks/useAppointments';

interface Props {
	isOpen: boolean;
	onClose: () => void;
	selectedDate: Date | null;
}

export default function AppointmentModal({ isOpen, onClose, selectedDate }: Props) {
	const { createAppointment } = useAppointments(selectedDate || new Date());

	const [form, setForm] = useState({
		patient_id: '',
		doctor_id: '', // puedes asignarlo desde el contexto de usuario logueado
		reason: '',
		status: 'EN_ESPERA',
		time: '09:00',
		location: '',
	});

	const [isSubmitting, setIsSubmitting] = useState(false);

	if (!isOpen) return null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			setIsSubmitting(true);

			const scheduled_at = new Date(selectedDate || new Date());
			const [hours, minutes] = form.time.split(':').map(Number);
			scheduled_at.setHours(hours, minutes, 0, 0);

			await createAppointment({
				patient_id: form.patient_id,
				doctor_id: form.doctor_id,
				scheduled_at: scheduled_at.toISOString(),
				reason: form.reason,
				status: form.status,
				location: form.location,
			});

			onClose();
		} catch (err) {
			console.error('❌ Error creando cita:', err);
			alert('Error creando cita. Intenta nuevamente.');
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
			<motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-semibold flex items-center gap-2">
						<CalendarDays className="w-5 h-5 text-indigo-600" />
						Nueva Cita
					</h2>
					<button onClick={onClose} className="text-gray-500 hover:text-gray-700">
						<X className="w-5 h-5" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="text-sm font-medium text-gray-700">ID Paciente</label>
						<input type="text" className="w-full mt-1 p-2 border rounded-xl focus:ring-2 focus:ring-indigo-500" value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} required />
					</div>

					<div>
						<label className="text-sm font-medium text-gray-700">Motivo</label>
						<textarea className="w-full mt-1 p-2 border rounded-xl focus:ring-2 focus:ring-indigo-500" rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="text-sm font-medium text-gray-700">Hora</label>
							<input type="time" className="w-full mt-1 p-2 border rounded-xl" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
						</div>

						<div>
							<label className="text-sm font-medium text-gray-700">Estado</label>
							<select
								className="w-full mt-1 p-2 border rounded-xl"
								value={form.status}
								onChange={(e) => setForm({ ...form, status: e.target.value })}
							>
								<option value="EN_ESPERA">En espera</option>
								<option value="CONFIRMADA">Confirmada</option>
								<option value="REAGENDADA">Reagendada</option>
								<option value="CANCELADA">Cancelada</option>
								<option value="COMPLETADA">Finalizada</option>
							</select>
						</div>
					</div>

					<div>
						<label className="text-sm font-medium text-gray-700">Ubicación</label>
						<input type="text" className="w-full mt-1 p-2 border rounded-xl" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
					</div>

					<div className="flex justify-end mt-4">
						<button type="submit" disabled={isSubmitting} className={`px-4 py-2 rounded-xl text-white font-medium transition-all ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-linear-to-r from-emerald-500 to-teal-600 hover:shadow-lg'}`}>
							{isSubmitting ? 'Guardando...' : 'Guardar Cita'}
						</button>
					</div>
				</form>
			</motion.div>
		</div>
	);
}
