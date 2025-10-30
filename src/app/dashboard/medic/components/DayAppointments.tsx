'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { User, Clock, CalendarX } from 'lucide-react';

interface Appointment {
	id: number;
	patient: string;
	time: string;
	status: string;
}

export default function DayAppointments({ selectedDate }: { selectedDate: Date }) {
	const [appointments, setAppointments] = useState<Appointment[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!selectedDate) return;

		const fetchAppointments = async () => {
			setLoading(true);
			try {
				const res = await fetch(`/api/dashboard/medic/appointments?date=${selectedDate.toISOString().split('T')[0]}`);
				const data = await res.json();
				setAppointments(Array.isArray(data) ? data : []);
			} catch (err) {
				console.error('❌ Error al cargar citas:', err);
				setAppointments([]);
			} finally {
				setLoading(false);
			}
		};

		fetchAppointments();
	}, [selectedDate]);

	return (
		<motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 250, damping: 22 }} className="h-full w-full">
			<Card className="relative h-full w-full flex flex-col bg-white/95 backdrop-blur-md border border-gray-100 shadow-sm hover:shadow-lg transition-all rounded-2xl overflow-hidden">
				{/* Línea superior decorativa */}
				<div className="absolute inset-x-0 top-0 h-[3px] bg-linear-to-r from-violet-500 to-indigo-600" />

				<CardContent className="flex flex-col p-5 relative z-10 grow">
					{/* Encabezado */}
					<div className="flex items-center justify-between mb-5">
						<div className="flex items-center gap-2">
							<div className="bg-linear-to-br from-violet-500 to-indigo-600 p-1.5 rounded-md text-white shadow-md">
								<User className="w-4 h-4" />
							</div>
							<h3 className="text-base font-semibold text-gray-800 tracking-tight">Citas del Día</h3>
						</div>
						<p className="text-xs text-gray-500 font-medium">
							{selectedDate.toLocaleDateString('es-ES', {
								weekday: 'short',
								day: 'numeric',
								month: 'short',
							})}
						</p>
					</div>

					{/* Contenido dinámico */}
					<div className="space-y-3 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-violet-300 scrollbar-track-transparent">
						{loading ? (
							<p className="text-sm text-gray-500 text-center py-4">Cargando citas...</p>
						) : appointments.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-8 text-gray-500">
								<CalendarX className="w-8 h-8 text-violet-400 mb-2" />
								<p className="text-sm">No hay citas registradas para esta fecha</p>
							</div>
						) : (
							appointments.map((a) => (
								<motion.div key={a.id} whileHover={{ scale: 1.01 }} className="group flex flex-col gap-1 p-3 bg-gray-50 hover:bg-linear-to-r hover:from-violet-50 hover:to-indigo-50 border border-gray-100 hover:border-violet-100 rounded-xl transition-all duration-300 shadow-sm">
									<div className="flex items-center gap-3">
										<div className="bg-linear-to-br from-violet-500 to-indigo-600 p-1.5 rounded-full text-white shrink-0 shadow-sm">
											<User className="w-4 h-4" />
										</div>
										<p className="font-medium text-gray-800 text-sm leading-tight group-hover:text-violet-700 transition">{a.patient}</p>
									</div>
									<p className="text-xs text-gray-500 flex items-center gap-1 ml-7">
										<Clock className="w-3 h-3 text-violet-500" />
										{a.time}
									</p>
								</motion.div>
							))
						)}
					</div>
				</CardContent>

				{/* Overlay decorativo */}
				<div className="absolute inset-0 bg-linear-to-br from-violet-500/5 to-indigo-600/5 opacity-40 pointer-events-none" />
			</Card>
		</motion.div>
	);
}
