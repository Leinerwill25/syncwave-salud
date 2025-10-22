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
		<motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 250, damping: 20 }} className="h-full w-full">
			<Card className="relative bg-white/95 backdrop-blur-md border border-gray-100 shadow-sm hover:shadow-xl transition-all rounded-2xl overflow-hidden">
				<div className="absolute inset-x-0 top-0 h-[4px] bg-gradient-to-r from-violet-500 to-indigo-600" />

				<CardContent className="p-6 relative z-10 flex flex-col gap-6">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div className="bg-gradient-to-br from-violet-500 to-indigo-600 p-2 rounded-lg text-white shadow-md">
								<CalendarDays className="w-5 h-5" />
							</div>
							<h3 className="text-lg font-semibold text-gray-800 tracking-tight">Agenda del Día</h3>
						</div>
						<p className="text-sm text-gray-500 font-medium capitalize">
							{selected?.toLocaleDateString('es-ES', {
								weekday: 'long',
								day: 'numeric',
								month: 'long',
							})}
						</p>
					</div>

					<div className="flex justify-center items-center bg-gradient-to-b from-white to-gray-50 border border-gray-100 rounded-2xl shadow-inner p-4">
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
				</CardContent>

				<div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-indigo-600/5 opacity-40 pointer-events-none" />
			</Card>
		</motion.div>
	);
}
