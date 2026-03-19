'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { CalendarDays } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { useAppointmentIndicators } from '@/app/hooks/useAppointmentIndicators';

type DayAgendaProps = {
	onDateSelect?: (date: Date) => void;
};

export default function DayAgenda({ onDateSelect }: DayAgendaProps) {
	const [selected, setSelected] = useState<Date | undefined>(new Date());
	const [month, setMonth] = useState<Date>(new Date());
	
	// Obtener indicadores para el mes actual mostrado en el calendario
	const { appointmentDates } = useAppointmentIndicators(
		month.getMonth() + 1,
		month.getFullYear()
	);

	const handleSelect = (date: Date | undefined) => {
		setSelected(date);
		if (date && onDateSelect) onDateSelect(date);
	};

	// Modificador para días con citas
	const modifiers = useMemo(() => ({
		hasAppointment: (date: Date) => {
			const dateStr = date.toISOString().split('T')[0];
			return appointmentDates.has(dateStr);
		}
	}), [appointmentDates]);

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

					<div className="flex justify-center items-center bg-linear-to-b from-white to-gray-50 border border-gray-100 rounded-xl sm:rounded-2xl shadow-inner p-1 sm:p-4 w-full min-w-0 overflow-hidden">
						<div className="w-full min-w-0 overflow-x-hidden pb-1">
							<style>{`
								.rdp-day_hasAppointment {
									position: relative;
								}
								.rdp-day_hasAppointment::after {
									content: "";
									position: absolute;
									bottom: 2px;
									left: 50%;
									transform: translateX(-50%);
									width: 4px;
									height: 4px;
									border-radius: 50%;
									background-color: #7c3aed; /* violet-600 */
								}
								.rdp-day_selected.rdp-day_hasAppointment::after {
									background-color: white;
								}
                                .rdp-table {
                                    width: 100% !important;
                                    max-width: 100% !important;
                                    margin: 0 auto !important;
                                }
                                .rdp-head_cell {
                                    font-size: 10px !important;
                                    padding: 2px 0 !important;
                                    font-weight: 700 !important;
                                    text-transform: uppercase !important;
                                    color: #6b7280 !important;
                                }
                                .rdp-cell {
                                    padding: 1px !important;
                                }
                                .rdp-button {
                                    width: 32px !important;
                                    height: 32px !important;
                                    padding: 0 !important;
                                    display: flex !important;
                                    align-items: center !important;
                                    justify-content: center !important;
                                }
                                @media (max-width: 380px) {
                                    .rdp-button {
                                        width: 28px !important;
                                        height: 28px !important;
                                        font-size: 11px !important;
                                    }
                                }
							`}</style>
							<DayPicker
								mode="single"
								selected={selected}
								onSelect={handleSelect}
								month={month}
								onMonthChange={setMonth}
								weekStartsOn={1}
								modifiers={modifiers}
								className="w-full m-0 p-0"
								classNames={{
									months: 'w-full',
									caption: 'flex justify-between items-center text-violet-700 font-semibold mb-2 px-2',
                                    caption_label: 'text-sm sm:text-base',
                                    nav: 'flex gap-1',
									head_row: 'grid grid-cols-7 w-full mb-1',
                                    head_cell: 'text-center uppercase tracking-tighter text-gray-400 font-bold',
                                    row: 'grid grid-cols-7 w-full',
									day: 'mx-auto flex items-center justify-center text-xs sm:text-sm rounded-lg hover:bg-violet-100 hover:text-violet-700 transition-all duration-200 cursor-pointer',
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
