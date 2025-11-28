'use client';

import { useState, useEffect } from 'react';
import { Pill, Clock, CheckCircle, AlertCircle, Calendar, User, Bell } from 'lucide-react';
import { format, formatDistanceToNow, isToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

type Reminder = {
	prescription_id: string;
	prescription_item_id: string;
	medication_name: string;
	dosage: string | null;
	form: string | null;
	frequency: string | null;
	duration: string | null;
	instructions: string | null;
	doctor: {
		id: string;
		name: string | null;
		email: string | null;
	} | null;
	issued_at: string;
	valid_until: string | null;
	next_reminders: string[];
	has_pending_today: boolean;
	taken_today: boolean;
	total_taken: number;
};

export default function RecordatoriosPage() {
	const [loading, setLoading] = useState(true);
	const [reminders, setReminders] = useState<Reminder[]>([]);
	const [pendingToday, setPendingToday] = useState(0);
	const [taking, setTaking] = useState<Set<string>>(new Set());

	useEffect(() => {
		loadReminders();
	}, []);

	const loadReminders = async () => {
		try {
			setLoading(true);
			const res = await fetch('/api/patient/medication-reminders', {
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al cargar recordatorios');

			const data = await res.json();
			setReminders(data.reminders || []);
			setPendingToday(data.pending_today || 0);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const handleTakeMedication = async (reminder: Reminder) => {
		if (taking.has(reminder.prescription_item_id)) return;

		try {
			setTaking((prev) => new Set(prev).add(reminder.prescription_item_id));

			const res = await fetch('/api/patient/medication-reminders/take', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify({
					prescription_item_id: reminder.prescription_item_id,
					prescription_id: reminder.prescription_id,
				}),
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.error || 'Error al registrar la toma');
			}

			// Recargar recordatorios
			await loadReminders();
		} catch (err: any) {
			alert(err.message || 'Error al registrar la toma del medicamento');
		} finally {
			setTaking((prev) => {
				const next = new Set(prev);
				next.delete(reminder.prescription_item_id);
				return next;
			});
		}
	};

	const getNextReminderTime = (reminder: Reminder): string | null => {
		if (reminder.next_reminders.length === 0) return null;
		const next = parseISO(reminder.next_reminders[0]);
		if (isToday(next)) {
			return `Hoy a las ${format(next, 'HH:mm')}`;
		}
		return formatDistanceToNow(next, { addSuffix: true });
	};

	const getStatusColor = (reminder: Reminder) => {
		if (reminder.taken_today) {
			return 'bg-green-100 text-green-700 border-green-200';
		}
		if (reminder.has_pending_today) {
			return 'bg-amber-100 text-amber-700 border-amber-200';
		}
		return 'bg-blue-100 text-blue-700 border-blue-200';
	};

	const getStatusIcon = (reminder: Reminder) => {
		if (reminder.taken_today) {
			return <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />;
		}
		if (reminder.has_pending_today) {
			return <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />;
		}
		return <Clock className="w-4 h-4 sm:w-5 sm:h-5" />;
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-3 sm:p-4 md:p-6">
			<div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
				{/* Header */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-5 lg:p-6">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
						<div>
							<h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 flex items-center gap-2 sm:gap-3">
								<Bell className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-purple-600 flex-shrink-0" />
								<span>Recordatorios de Medicamentos</span>
							</h1>
							<p className="text-xs sm:text-sm md:text-base text-gray-600">
								Controla tus tratamientos y notifica a tu médico cuando tomes tus medicamentos
							</p>
						</div>
						{pendingToday > 0 && (
							<div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
								<AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
								<span className="text-xs sm:text-sm md:text-base font-semibold text-amber-800">
									{pendingToday} {pendingToday === 1 ? 'recordatorio pendiente' : 'recordatorios pendientes'} hoy
								</span>
							</div>
						)}
					</div>
				</div>

				{/* Lista de recordatorios */}
				{loading ? (
					<div className="space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
								<div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
								<div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
							</div>
						))}
					</div>
				) : reminders.length === 0 ? (
					<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-6 sm:p-8 md:p-12 text-center">
						<Pill className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-2 sm:mb-3 md:mb-4" />
						<p className="text-gray-600 text-sm sm:text-base md:text-lg">No tienes recordatorios de medicamentos activos</p>
					</div>
				) : (
					<div className="space-y-3 sm:space-y-4">
						{reminders.map((reminder) => {
							const nextReminder = getNextReminderTime(reminder);
							const isTaking = taking.has(reminder.prescription_item_id);

							return (
								<div
									key={`${reminder.prescription_id}-${reminder.prescription_item_id}`}
									className={`bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-5 lg:p-6 hover:shadow-xl transition-shadow border-2 ${getStatusColor(reminder)}`}
								>
									<div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
										<div className="flex-1 min-w-0 w-full">
											<div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 flex-wrap">
												<div className="p-1.5 sm:p-2 md:p-3 bg-purple-100 rounded-lg flex-shrink-0">
													<Pill className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-purple-600" />
												</div>
												<div className="flex-1 min-w-0">
													<h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 flex items-center gap-1.5 sm:gap-2 flex-wrap">
														<span className="break-words">{reminder.medication_name}</span>
														<span className={`inline-flex items-center gap-1 px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] md:text-xs font-semibold ${getStatusColor(reminder)}`}>
															{getStatusIcon(reminder)}
															<span className="hidden sm:inline">
																{reminder.taken_today ? 'Tomado hoy' : reminder.has_pending_today ? 'Pendiente' : 'Próximo'}
															</span>
															<span className="sm:hidden">
																{reminder.taken_today ? 'Tomado' : reminder.has_pending_today ? 'Pend.' : 'Próx.'}
															</span>
														</span>
													</h3>
													<div className="flex flex-wrap gap-2 sm:gap-3 mt-1 text-[10px] sm:text-xs md:text-sm text-gray-600">
														{reminder.dosage && (
															<span className="flex items-center gap-1">
																<span className="font-medium">Dosis:</span>
																<span>{reminder.dosage}</span>
																{reminder.form && <span>({reminder.form})</span>}
															</span>
														)}
														{reminder.frequency && (
															<span className="flex items-center gap-1">
																<Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 flex-shrink-0" />
																<span>{reminder.frequency}</span>
															</span>
														)}
													</div>
												</div>
											</div>
											{reminder.doctor && (
												<p className="text-[10px] sm:text-xs md:text-sm text-gray-600 flex items-center gap-1.5 sm:gap-2 mb-2">
													<User className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 flex-shrink-0" />
													<span className="break-words">Dr. {reminder.doctor.name || 'Médico'}</span>
												</p>
											)}
											{nextReminder && (
												<p className="text-[10px] sm:text-xs md:text-sm text-gray-600 flex items-center gap-1.5 sm:gap-2 mb-2">
													<Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 flex-shrink-0" />
													<span>Próximo recordatorio: {nextReminder}</span>
												</p>
											)}
											{reminder.instructions && (
												<p className="text-[10px] sm:text-xs md:text-sm text-gray-700 bg-gray-50 rounded-lg p-2 sm:p-2.5 md:p-3 mt-2 break-words">
													<span className="font-medium">Instrucciones: </span>
													{reminder.instructions}
												</p>
											)}
										</div>
										{!reminder.taken_today && (
											<button
												onClick={() => handleTakeMedication(reminder)}
												disabled={isTaking}
												className={`w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base shadow-md hover:shadow-lg ${
													isTaking
														? 'bg-gray-400 text-white cursor-not-allowed'
														: reminder.has_pending_today
															? 'bg-amber-600 hover:bg-amber-700 text-white'
															: 'bg-purple-600 hover:bg-purple-700 text-white'
												}`}
											>
												{isTaking ? (
													<>
														<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
														<span>Registrando...</span>
													</>
												) : (
													<>
														<CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
														<span>Tomé este medicamento</span>
													</>
												)}
											</button>
										)}
									</div>
									{reminder.taken_today && (
										<div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
											<p className="text-xs sm:text-sm text-green-700 flex items-center gap-2">
												<CheckCircle className="w-4 h-4" />
												<span>Ya registraste la toma de este medicamento hoy</span>
											</p>
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}

