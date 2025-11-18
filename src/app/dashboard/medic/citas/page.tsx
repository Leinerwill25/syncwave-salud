// components/CitasPage.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle } from 'lucide-react';
import DayAgenda from '@/app/dashboard/medic/components/DayAgenda'; // usa tu componente existente
import AppointmentList from './AppointmentList';
import AppointmentForm from '@/app/dashboard/medic/components/AppointmentForm';
import { Button } from '@/components/ui/button';

export default function CitasPage() {
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());
	const [isModalOpen, setIsModalOpen] = useState(false);

	return (
		<main className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 p-6">
			<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto flex flex-col gap-6">
				{/* Parte superior: Calendario (ahora full width y encima de la lista) */}
				<div className="w-full">
					<DayAgenda onDateSelect={(date) => date && setSelectedDate(date)} />
				</div>
				{/* Parte inferior: Header + Lista de citas (debajo del calendario) */}
				<div className="w-full flex flex-col gap-4">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<h1 className="text-2xl font-semibold text-gray-900">
							Citas —{' '}
							<span className="text-indigo-600">
								{selectedDate.toLocaleDateString('es-ES', {
									weekday: 'long',
									day: 'numeric',
									month: 'long',
								})}
							</span>
						</h1>

						<button onClick={() => setIsModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-medium text-white bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 hover:shadow-lg transition-all">
							<PlusCircle className="w-5 h-5" />
							Nueva Cita
						</button>
					</div>

					<AppointmentList selectedDate={selectedDate} />
				</div>
				{/* Modal */}
				<AnimatePresence>
					{isModalOpen && (
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
							<motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ duration: 0.2 }} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 relative">
								<Button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full" onClick={() => setIsModalOpen(false)}>
									X
								</Button>

								<AppointmentForm />
							</motion.div>
						</motion.div>
					)}
				</AnimatePresence>
			</motion.div>
		</main>
	);
}
