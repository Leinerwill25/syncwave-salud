'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { CalendarDays } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

type DayAgendaProps = {
	onDateSelect?: (date: Date) => void;
};

export default function DayAgenda({ onDateSelect }: DayAgendaProps) {
	const [selected, setSelected] = useState<Date | undefined>(new Date());

	const handleSelect = (date: Date | undefined) => {
		setSelected(date);
		if (date && onDateSelect) onDateSelect(date);
	};

	return (
		<motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 250, damping: 20 }} className="h-full w-full min-w-0 overflow-hidden">
			<Card className="relative bg-white/95 backdrop-blur-md border border-gray-100 shadow-sm hover:shadow-xl transition-all rounded-2xl overflow-hidden w-full min-w-0">
				<div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-violet-500 to-indigo-600" />

				<CardContent className="p-4 sm:p-6 relative z-10 flex flex-col gap-4 sm:gap-6 w-full min-w-0 overflow-hidden">
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 w-full min-w-0">
						<div className="flex items-center gap-2 min-w-0 flex-shrink">
							<div className="bg-linear-to-br from-violet-500 to-indigo-600 p-2 rounded-lg text-white shadow-md flex-shrink-0">
								<CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
							</div>
							<h3 className="text-base sm:text-lg font-semibold text-gray-800 tracking-tight break-words min-w-0">Agenda del Día</h3>
						</div>
						<p className="text-xs sm:text-sm text-gray-500 font-medium capitalize break-words flex-shrink-0">
							{selected?.toLocaleDateString('es-ES', {
								weekday: 'long',
								day: 'numeric',
								month: 'long',
							})}
						</p>
					</div>

					<div className="flex justify-center items-center bg-linear-to-b from-white to-gray-50 border border-gray-100 rounded-xl sm:rounded-2xl shadow-inner p-3 sm:p-4 w-full min-w-0 overflow-hidden">
						<div className="w-full min-w-0 overflow-hidden">
							<DayPicker
								mode="single"
								selected={selected}
								onSelect={handleSelect}
								weekStartsOn={1}
								className="w-full"
								classNames={{
									months: 'grid grid-cols-1 w-full justify-center text-center',
									caption: 'text-center text-violet-700 font-semibold mb-3',
									head_row: 'flex justify-around mb-1 text-xs text-gray-500',
									day: 'p-2 text-sm rounded-lg hover:bg-violet-100 hover:text-violet-700 transition-all duration-200',
									day_selected: 'bg-violet-600 text-white font-semibold shadow-sm',
									day_today: 'bg-violet-100 text-violet-700 font-semibold border border-violet-200',
								}}
							/>
						</div>
					</div>
				</CardContent>

				<div className="absolute inset-0 bg-linear-to-br from-violet-500/5 to-indigo-600/5 opacity-40 pointer-events-none" />
			</Card>
		</motion.div>
	);
}
