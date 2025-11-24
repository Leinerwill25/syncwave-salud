'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, Loader2, ChevronDown } from 'lucide-react';
import { useAppointments } from '@/app/hooks/useAppointments';

interface Props {
	selectedDate: Date;
}

export default function AppointmentList({ selectedDate }: Props) {
	const { appointments, isLoading, isError, updateAppointment } = useAppointments(selectedDate);
	const [loadingId, setLoadingId] = useState<string | null>(null);

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'CONFIRMADA':
				return 'from-sky-500 to-blue-600';
			case 'EN ESPERA':
				return 'from-yellow-400 to-amber-500';
			case 'EN CURSO':
				return 'from-violet-500 to-indigo-600';
			case 'COMPLETADA':
				return 'from-emerald-500 to-teal-600';
			case 'CANCELADA':
				return 'from-gray-400 to-gray-500';
			default:
				return 'from-gray-300 to-gray-400';
		}
	};

	const statusOptions = ['EN ESPERA', 'CONFIRMADA', 'EN CURSO', 'COMPLETADA', 'CANCELADA'];

	const handleStatusChange = async (id: string, newStatus: string) => {
		try {
			setLoadingId(id);
			await updateAppointment(id, { status: newStatus });
		} catch (err) {
			console.error('❌ Error al cambiar estado:', err);
			alert('No se pudo actualizar el estado de la cita.');
		} finally {
			setLoadingId(null);
		}
	};

	if (isLoading)
		return (
			<div className="flex justify-center items-center py-20 text-gray-400">
				<Loader2 className="animate-spin w-6 h-6 mr-2" />
				Cargando citas...
			</div>
		);

	if (isError) return <p className="text-red-500 text-sm mt-4">Error al cargar las citas del día.</p>;

	if (!appointments || appointments.length === 0) return <p className="text-gray-500 text-sm">No hay citas para este día.</p>;

	return (
		<div className="space-y-3 sm:space-y-4">
			{appointments.map((appt) => (
				<motion.div key={appt.id} whileHover={{ y: -3 }} className="rounded-xl sm:rounded-2xl bg-white/90 backdrop-blur-sm border border-gray-100 shadow-sm hover:shadow-lg transition-all p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
					<div className="flex-1 min-w-0">
						<h3 className="text-sm sm:text-base font-semibold text-gray-800 truncate">{appt.patient}</h3>
						<p className="text-xs sm:text-sm text-gray-500 truncate">{appt.reason}</p>
						<div className="flex flex-wrap gap-2 sm:gap-3 mt-2 text-gray-400 text-[10px] sm:text-xs">
							<span className="flex items-center gap-1">
								<Clock className="w-3 h-3 sm:w-4 sm:h-4" /> {appt.time}
							</span>
							{appt.location && (
								<span className="flex items-center gap-1 truncate">
									<MapPin className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" /> <span className="truncate">{appt.location}</span>
								</span>
							)}
						</div>
					</div>

					{/* Estado editable */}
					<div className="relative shrink-0 w-full sm:w-auto">
						{loadingId === appt.id ? (
							<div className="flex items-center justify-center w-full sm:w-28 h-8 rounded-lg sm:rounded-xl bg-gray-100 text-gray-400">
								<Loader2 className="w-4 h-4 animate-spin" />
							</div>
						) : (
							<select value={appt.status} onChange={(e) => handleStatusChange(appt.id, e.target.value)} className={`appearance-none text-white text-xs font-semibold px-3 py-1.5 sm:py-1 w-full sm:w-auto rounded-lg sm:rounded-xl cursor-pointer bg-linear-to-r ${getStatusColor(appt.status)} focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500`} style={{ paddingRight: '1.5rem' }}>
								{statusOptions.map((s) => (
									<option key={s} value={s} className="text-gray-800">
										{s}
									</option>
								))}
							</select>
						)}
						<ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white w-3.5 h-3.5 sm:w-4 sm:h-4 pointer-events-none" />
					</div>
				</motion.div>
			))}
		</div>
	);
}
