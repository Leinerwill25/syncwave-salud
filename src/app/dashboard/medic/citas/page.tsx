// components/CitasPage.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle } from 'lucide-react';
import DayAgenda from '@/app/dashboard/medic/components/DayAgenda'; // usa tu componente existente
import AppointmentList from './AppointmentList';
import AppointmentForm from '@/app/dashboard/medic/components/AppointmentForm';
import { Button } from '@/components/ui/button';
import { useLiteMode } from '@/contexts/LiteModeContext';
import { getLiteAnimation } from '@/lib/lite-mode-utils';

export default function CitasPage() {
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());
	const [isModalOpen, setIsModalOpen] = useState(false);
	const { isLiteMode } = useLiteMode();

	return (
		<div className="w-full min-w-0 overflow-x-hidden">
			<motion.div {...getLiteAnimation(isLiteMode)} className="w-full min-w-0 flex flex-col gap-4 sm:gap-6">
				{/* Parte superior: Calendario (ahora full width y encima de la lista) */}
				<div className="w-full min-w-0">
					<DayAgenda onDateSelect={(date) => date && setSelectedDate(date)} />
				</div>
				{/* Parte inferior: Header + Lista de citas (debajo del calendario) */}
				<div className="w-full min-w-0 flex flex-col gap-4">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full min-w-0">
						<h1 className="text-xl sm:text-2xl font-semibold text-gray-900 break-words min-w-0 flex-1">
							Citas —{' '}
							<span className="text-indigo-600 text-lg sm:text-2xl break-words">
								{selectedDate.toLocaleDateString('es-ES', {
									weekday: 'long',
									day: 'numeric',
									month: 'long',
								})}
							</span>
						</h1>

						<button onClick={() => setIsModalOpen(true)} className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base rounded-xl sm:rounded-2xl font-medium text-white bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 hover:shadow-lg transition-all flex-shrink-0 whitespace-nowrap">
							<PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
							<span className="hidden sm:inline">Nueva Cita</span>
							<span className="sm:hidden">Nueva</span>
						</button>
					</div>

					<div className="w-full min-w-0">
						<AppointmentList selectedDate={selectedDate} />
					</div>
				</div>
			</motion.div>
			{/* Modal */}
			<AnimatePresence>
				{isModalOpen && (
					<motion.div 
						initial={isLiteMode ? { opacity: 1 } : { opacity: 0 }} 
						animate={{ opacity: 1 }} 
						exit={{ opacity: 0 }} 
						className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
					>
						<motion.div 
							initial={isLiteMode ? { scale: 1, opacity: 1 } : { scale: 0.9, opacity: 0 }} 
							animate={{ scale: 1, opacity: 1 }} 
							exit={{ scale: 0.9, opacity: 0 }} 
							transition={isLiteMode ? { duration: 0 } : { duration: 0.2 }} 
							className="bg-white rounded-xl sm:rounded-2xl shadow-xl w-full max-w-2xl p-4 sm:p-6 relative max-h-[90vh] overflow-y-auto min-w-0" 
							style={{ maxWidth: 'calc(100vw - 2rem)' }}
						>
							<Button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full z-10" onClick={() => setIsModalOpen(false)}>
								X
							</Button>

							<AppointmentForm />
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
