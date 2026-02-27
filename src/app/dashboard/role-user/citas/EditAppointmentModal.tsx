'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, Loader2, AlertCircle, Edit2, Trash2, PlusCircle } from 'lucide-react';
import CurrencyDisplay from '@/components/CurrencyDisplay';
import AddServiceModal from '@/app/dashboard/components/AddServiceModal';

interface Props {
	isOpen: boolean;
	onClose: () => void;
	appointment: any;
	onUpdate: (appointmentId: string, updates: any) => Promise<void>;
    organizationId: string;
}

export default function EditAppointmentModal({ isOpen, onClose, appointment, onUpdate, organizationId }: Props) {
	// Schedule state
	const [newDate, setNewDate] = useState('');
	const [newTime, setNewTime] = useState('');

	// Services state
	const [currentServices, setCurrentServices] = useState<any[]>([]);
	const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (appointment && isOpen) {
			// Extract date and time safely
            try {
                if (appointment.scheduled_at) {
                    const dateObj = new Date(appointment.scheduled_at);
                    if (!isNaN(dateObj.getTime())) {
                        const dateStr = dateObj.toISOString().split('T')[0];
                        const timeStr = dateObj.toISOString().split('T')[1].substring(0, 5); // HH:MM
                        setNewDate(dateStr);
                        setNewTime(timeStr);
                    }
                }
            } catch (e) {
                console.error("Error parsing date", e);
            }

            // Normalizar servicios
            let normalizedServices: any[] = [];
            if (Array.isArray(appointment.selected_service)) {
                normalizedServices = [...appointment.selected_service];
            } else if (typeof appointment.selected_service === 'string') {
                try {
                    const parsed = JSON.parse(appointment.selected_service);
                    normalizedServices = Array.isArray(parsed) ? [...parsed] : [parsed];
                } catch {
                    normalizedServices = [{ name: appointment.selected_service }];
                }
            } else if (appointment.selected_service) {
                normalizedServices = [appointment.selected_service];
            }
            setCurrentServices(normalizedServices);

			setError(null);
		}
	}, [appointment, isOpen]);

    const handleRemoveService = (serviceIndex: number) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este servicio de la cita?')) return;
        const updatedServices = currentServices.filter((_, idx) => idx !== serviceIndex);
        setCurrentServices(updatedServices);
    };

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!appointment || !newDate || !newTime) {
			setError('Por favor, complete la fecha y la hora.');
			return;
		}

		try {
			setLoading(true);
			setError(null);
			
			const [year, month, day] = newDate.split('-').map(Number);
			const [hours, minutes] = newTime.split(':').map(Number);
			const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
			const newDateTimeISO = utcDate.toISOString();

            // Recalcular montos en caso de cambios en servicios
			const newTotal = currentServices.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
			const updatedBilling = {
				...appointment.billing,
				subtotal: newTotal,
				total: newTotal,
				currency: currentServices[0]?.currency || appointment.billing?.currency || 'USD'
			};
			
			await onUpdate(appointment.id, {
                scheduled_at: newDateTimeISO,
                selected_service: currentServices,
                billing: updatedBilling,
            });

            onClose();
		} catch (err: any) {
			setError(err.message || 'Error al actualizar la cita');
		} finally {
			setLoading(false);
		}
	};

    const handleServicesUpdated = (newAppointmentData: any) => {
        // Since AddServiceModal closes automatically and might update the DB directly via its own logic,
        // we should instead capture the updated list if possible or just rely on parent mutate.
        // Wait, AddServiceModal as implemented does a PATCH request inside it.
        // So clicking "Save" inside AddServiceModal commits changes.
        // To preserve a unified flow where changes are "drafted" until "Guardar Cambios" is clicked,
        // we could just fetch the latest appointment.
        // For simplicity, we just close this modal so the parent can refresh, or just fetch the updated data.
        // Let's rely on parent's mutate by closing both.
        setIsAddServiceModalOpen(false);
        onClose(); // Force close to refresh the view since AddServiceModal already saved the service
    };

	if (!isOpen || !appointment) return null;

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
					<motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative max-h-[90vh] flex flex-col">
						<button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
							<X className="w-5 h-5" />
						</button>

						<div className="mb-4">
							<h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Edit2 className="w-5 h-5 text-teal-600" />
                                Editar Cita
                            </h2>
							<p className="text-sm text-gray-600 mt-1">Modificar la fecha, hora o los servicios de la cita</p>
						</div>

						<form onSubmit={handleSubmit} className="overflow-y-auto flex-1 pr-2 space-y-6">
                            {/* Schedule Section */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-slate-500" />
                                    Fecha y Hora
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Fecha</label>
                                        <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition" required />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Hora</label>
                                        <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition" required />
                                    </div>
                                </div>
                            </div>

                            {/* Services Section */}
                            <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-teal-900 flex items-center gap-2">
                                        <PlusCircle className="w-4 h-4 text-teal-600" />
                                        Servicios Atendidos
                                    </h3>
                                    <button 
                                        type="button"
                                        onClick={() => setIsAddServiceModalOpen(true)}
                                        className="text-xs font-medium text-teal-700 bg-teal-100 hover:bg-teal-200 px-2 py-1 rounded-md transition-colors"
                                    >
                                        Añadir Servicio
                                    </button>
                                </div>
                                
                                {currentServices.length > 0 ? (
                                    <div className="space-y-2">
                                        {currentServices.map((item: any, idx: number) => (
                                            <div key={idx} className="bg-white border border-teal-100 rounded-lg p-2.5 flex justify-between items-start gap-2 shadow-sm">
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-teal-800 truncate">{item.name || 'Servicio sin nombre'}</div>
                                                    {item.price !== undefined && (
                                                        <div className="text-xs text-teal-600 font-semibold mt-0.5">
                                                            <CurrencyDisplay 
                                                                amount={Number(item.price)} 
                                                                currency={item.currency || 'USD'} 
                                                                showBoth={true}
                                                                size="xs"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => handleRemoveService(idx)}
                                                    className="text-red-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors shrink-0"
                                                    title="Eliminar este servicio"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-sm text-teal-600/70 italic p-3 text-center bg-white/50 rounded-lg border border-teal-100/50">
                                        No hay servicios seleccionados
                                    </div>
                                )}
                            </div>

							{error && (
								<div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 mt-4">
									<AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
									<p className="text-sm text-red-700">{error}</p>
								</div>
							)}

							<div className="flex gap-3 pt-4 mt-6 border-t border-gray-100">
								<button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 text-sm font-medium hover:bg-gray-50 transition">
									Cancelar
								</button>
								<button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white text-sm font-medium rounded-xl transition shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
									{loading ? (
										<>
											<Loader2 className="w-4 h-4 animate-spin" />
											Guardando...
										</>
									) : (
										'Guardar Cambios'
									)}
								</button>
							</div>
						</form>
					</motion.div>
				</motion.div>
			)}

            {/* Add Service Modal nested slightly above the default Z-index */}
            {isAddServiceModalOpen && (
                <AddServiceModal
                    isOpen={isAddServiceModalOpen}
                    onClose={() => setIsAddServiceModalOpen(false)}
                    appointment={appointment}
                    organizationId={organizationId}
                    onSuccess={() => handleServicesUpdated(appointment)}
                />
            )}
		</AnimatePresence>
	);
}
