'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, CalendarDays, CheckCircle2 } from 'lucide-react';
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

    const [schedulingType, setSchedulingType] = useState<'specific_time' | 'shift'>('specific_time');
    const [selectedShift, setSelectedShift] = useState<'morning' | 'afternoon'>('morning');

	const [isSubmitting, setIsSubmitting] = useState(false);

	if (!isOpen) return null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			setIsSubmitting(true);

			const scheduled_at = new Date(selectedDate || new Date());
            let notes = '';

            if (schedulingType === 'shift') {
                const timeStr = selectedShift === 'morning' ? '08:00' : '14:00';
                const [hours, minutes] = timeStr.split(':').map(Number);
                scheduled_at.setHours(hours, minutes, 0, 0);
                const shiftLabel = selectedShift === 'morning' ? 'Turno Diurno (AM)' : 'Turno Vespertino (PM)';
                notes = `Cita agendada por: ${shiftLabel}.`;
            } else {
                const [hours, minutes] = form.time.split(':').map(Number);
                scheduled_at.setHours(hours, minutes, 0, 0);
            }

			await createAppointment({
				patient_id: form.patient_id,
				doctor_id: form.doctor_id,
				scheduled_at: scheduled_at.toISOString(),
				reason: form.reason,
				status: form.status,
				location: form.location,
                notes: notes || null,
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

					<div className="space-y-4">
                        {/* Toggle Tipo de Agendamiento */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">Tipo de Agendamiento</label>
                            <div className="flex p-1 bg-slate-100 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setSchedulingType('specific_time')}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${
                                        schedulingType === 'specific_time'
                                            ? 'bg-white text-teal-700 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    Hora Exacta
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
                                    Por Turno
                                </button>
                            </div>
                        </div>

                        {schedulingType === 'specific_time' ? (
                            <div>
                                <label className="text-sm font-medium text-gray-700">Hora</label>
                                <input type="time" className="w-full mt-1 p-2 border rounded-xl" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setSelectedShift('morning')}
                                    className={`p-3 rounded-xl border-2 transition text-left relative overflow-hidden ${
                                        selectedShift === 'morning'
                                            ? 'border-yellow-500 bg-yellow-50 ring-1 ring-yellow-200'
                                            : 'border-slate-200 hover:border-yellow-300 bg-white'
                                    }`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`font-bold text-sm ${selectedShift === 'morning' ? 'text-yellow-700' : 'text-slate-800'}`}>Diurno (AM)</span>
                                        {selectedShift === 'morning' && <CheckCircle2 className="w-4 h-4 text-yellow-600" />}
                                    </div>
                                    <span className="text-xs text-slate-600 block">08:00 AM - 12:00 PM</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setSelectedShift('afternoon')}
                                    className={`p-3 rounded-xl border-2 transition text-left relative overflow-hidden ${
                                        selectedShift === 'afternoon'
                                            ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-200'
                                            : 'border-slate-200 hover:border-blue-300 bg-white'
                                    }`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`font-bold text-sm ${selectedShift === 'afternoon' ? 'text-blue-700' : 'text-slate-800'}`}>Vespertino (PM)</span>
                                        {selectedShift === 'afternoon' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                                    </div>
                                    <span className="text-xs text-slate-600 block">02:00 PM - 06:00 PM</span>
                                </button>
                            </div>
                        )}

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
