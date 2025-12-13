'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, MapPin, Loader2, ChevronDown, Users, DollarSign, FileText, X, Edit2, Trash2, User, Phone, Mail, CreditCard, CalendarClock } from 'lucide-react';
import { useAppointmentsForRoleUser } from '@/app/hooks/useAppointmentsForRoleUser';
import ReceptionAppointmentModal from './ReceptionAppointmentModal';
import RescheduleModal from './RescheduleModal';

interface Props {
	selectedDate: Date;
	roleName: string;
	canEdit: boolean;
	isReception: boolean;
	organizationId: string;
}

export default function AppointmentListForRoleUser({ selectedDate, roleName, canEdit, isReception, organizationId }: Props) {
	const { appointments, isLoading, isError, updateAppointment } = useAppointmentsForRoleUser(selectedDate);
	const [loadingId, setLoadingId] = useState<string | null>(null);
	const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [rescheduleAppointment, setRescheduleAppointment] = useState<{ id: string; scheduled_at: string; patient: string } | null>(null);
	const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'CONFIRMADA':
				return 'from-sky-500 to-blue-600';
			case 'EN ESPERA':
			case 'EN_ESPERA':
				return 'from-yellow-400 to-amber-500';
			case 'EN CURSO':
			case 'EN_CURSO':
				return 'from-violet-500 to-indigo-600';
			case 'COMPLETADA':
				return 'from-emerald-500 to-teal-600';
			case 'CANCELADA':
				return 'from-gray-400 to-gray-500';
			case 'REAGENDADA':
				return 'from-orange-500 to-red-600';
			case 'EN PROCESO':
				return 'from-indigo-500 to-purple-600';
			case 'NO ASISTIÓ':
			case 'NO_ASISTIO':
				return 'from-red-500 to-rose-600';
			default:
				return 'from-gray-300 to-gray-400';
		}
	};

	// Estados específicos para Recepción
	const receptionStatusOptions = ['EN ESPERA', 'CONFIRMADA', 'EN CURSO', 'REAGENDADA', 'EN PROCESO', 'CANCELADA', 'COMPLETADA', 'NO ASISTIÓ'];
	// Estados para Asistente De Citas (puede cambiar estado también)
	const assistantStatusOptions = ['EN ESPERA', 'CONFIRMADA', 'EN CURSO', 'COMPLETADA', 'CANCELADA', 'REAGENDADA', 'NO ASISTIÓ'];

	const statusOptions = isReception ? receptionStatusOptions : assistantStatusOptions;

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

	const handleReschedule = async (appointmentId: string, newDate: string) => {
		try {
			// Actualizar la cita con la nueva fecha y cambiar el estado a REAGENDADA
			await updateAppointment(appointmentId, {
				status: 'REAGENDADA',
				scheduled_at: newDate,
			});
		} catch (err) {
			console.error('❌ Error al reagendar:', err);
			throw new Error('No se pudo reagendar la cita.');
		}
	};

	const handleRescheduleClick = (appt: any) => {
		setRescheduleAppointment({
			id: appt.id,
			scheduled_at: appt.scheduled_at || new Date().toISOString(),
			patient: appt.patient,
		});
		setIsRescheduleModalOpen(true);
	};

	const handleViewAppointment = (appt: any) => {
		if (isReception) {
			setSelectedAppointment(appt);
			setIsModalOpen(true);
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

	if (!Array.isArray(appointments) || appointments.length === 0) {
		return <p className="text-gray-500 text-sm">No hay citas para este día.</p>;
	}

	return (
		<>
			<div className="space-y-3 sm:space-y-4 w-full min-w-0">
				{appointments.map((appt) => (
					<motion.div key={appt.id} whileHover={{ y: -3 }} className={`rounded-xl sm:rounded-2xl bg-white/90 backdrop-blur-sm border border-gray-100 shadow-sm hover:shadow-lg transition-all p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 w-full min-w-0 ${isReception ? 'cursor-pointer' : ''}`} onClick={() => isReception && handleViewAppointment(appt)}>
						<div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-3 sm:gap-4 w-full min-w-0">
							<div className="flex-1 min-w-0 w-full sm:w-auto space-y-2">
								{/* Información del paciente */}
								<div className="space-y-2">
									<div className="flex items-center gap-2">
										<User className="w-4 h-4 text-gray-400 shrink-0" />
										<div className="flex items-center gap-2 flex-wrap">
											<h3 className="text-sm sm:text-base font-semibold text-gray-800">
												{appt.patientFirstName || appt.patientLastName ? (
													<>
														{appt.patientFirstName && <span>{appt.patientFirstName}</span>}
														{appt.patientLastName && <span> {appt.patientLastName}</span>}
													</>
												) : (
													appt.patient
												)}
											</h3>
											{appt.isUnregistered && (
												<span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full flex items-center gap-1">
													<Users className="w-3 h-3" />
													No registrado
												</span>
											)}
										</div>
									</div>

									{/* Datos del paciente - Nombre, Apellido, Cédula, Teléfono */}
									<div className="bg-gray-50 border border-gray-200 rounded-lg p-2 sm:p-3 ml-6 space-y-1.5">
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700">
											{appt.patientFirstName && (
												<div className="flex items-center gap-1.5">
													<span className="font-medium text-gray-500 min-w-[60px]">Nombre:</span>
													<span className="text-gray-800">{appt.patientFirstName}</span>
												</div>
											)}
											{appt.patientLastName && (
												<div className="flex items-center gap-1.5">
													<span className="font-medium text-gray-500 min-w-[60px]">Apellido:</span>
													<span className="text-gray-800">{appt.patientLastName}</span>
												</div>
											)}
											{appt.patientIdentifier && (
												<div className="flex items-center gap-1.5">
													<FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
													<span className="font-medium text-gray-500 min-w-[60px]">Cédula:</span>
													<span className="text-gray-800">{appt.patientIdentifier}</span>
												</div>
											)}
											{appt.patientPhone && (
												<div className="flex items-center gap-1.5">
													<Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
													<span className="font-medium text-gray-500 min-w-[60px]">Teléfono:</span>
													<span className="text-gray-800">{appt.patientPhone}</span>
												</div>
											)}
										</div>
									</div>
								</div>

								{/* Servicio solicitado */}
								{appt.selected_service && (
									<div className="bg-teal-50 border border-teal-200 rounded-lg p-2 sm:p-3 ml-6">
										<div className="flex items-center gap-2 mb-1">
											<CreditCard className="w-4 h-4 text-teal-600 shrink-0" />
											<span className="text-xs font-semibold text-teal-900">Servicio:</span>
										</div>
										<div className="text-sm font-medium text-teal-800">{appt.selected_service.name}</div>
										{appt.selected_service.description && <p className="text-xs text-teal-700 mt-1">{appt.selected_service.description}</p>}
										{appt.selected_service.price && (
											<div className="text-xs text-teal-600 mt-1 font-semibold">
												{appt.selected_service.currency} {appt.selected_service.price}
											</div>
										)}
									</div>
								)}

								{/* Motivo de la cita */}
								{appt.reason && (
									<p className="text-xs sm:text-sm text-gray-600 ml-6">
										<span className="font-medium text-gray-700">Motivo: </span>
										{appt.reason}
									</p>
								)}

								{/* Hora y ubicación */}
								<div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mt-2 text-gray-600 text-xs ml-6">
									<div className="flex items-center gap-1.5">
										<Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
										<span className="font-medium text-gray-500">Hora De La Cita:</span>
										<span className="text-gray-800 font-semibold">{appt.time}</span>
									</div>
									{appt.location && (
										<div className="flex items-start gap-1.5 min-w-0 flex-1 max-w-full">
											<MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
											<div className="flex-1 min-w-0">
												<span className="font-medium text-gray-500 block mb-0.5">Dirección Del Consultorio:</span>
												<span className="text-xs leading-relaxed break-words text-gray-800" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
													{appt.location}
												</span>
											</div>
										</div>
									)}
								</div>

								{isReception && (
									<p className="text-xs text-blue-600 mt-2 flex items-center gap-1 ml-6">
										<FileText className="w-3 h-3" />
										<span>Haz clic para ver servicios y gestionar pagos</span>
									</p>
								)}
							</div>

							{/* Botones de acción y estado */}
							<div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
								{/* Botón de reagendar */}
								{canEdit && appt.status !== 'COMPLETADA' && appt.status !== 'CANCELADA' && (
									<button
										onClick={(e) => {
											e.stopPropagation();
											handleRescheduleClick(appt);
										}}
										className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-600 rounded-lg hover:from-orange-600 hover:to-amber-700 transition-all shadow-sm hover:shadow-md">
										<CalendarClock className="w-3.5 h-3.5" />
										Reagendar
									</button>
								)}

								{/* Estado editable */}
								{canEdit && (
									<div className="relative">
										{loadingId === appt.id ? (
											<div className="flex items-center justify-center w-full sm:min-w-[160px] h-10 rounded-xl bg-gray-100 text-gray-400">
												<Loader2 className="w-4 h-4 animate-spin" />
											</div>
										) : (
											<div className="relative group">
												<select
													value={appt.status}
													onChange={(e) => {
														e.stopPropagation();
														handleStatusChange(appt.id, e.target.value);
													}}
													onClick={(e) => e.stopPropagation()}
													className={`appearance-none text-white text-xs font-bold px-4 py-2.5 w-full sm:min-w-[160px] rounded-xl cursor-pointer bg-gradient-to-r ${getStatusColor(appt.status)} hover:shadow-lg transition-all focus:ring-2 focus:ring-offset-2 focus:ring-white/50 border-2 border-white/20 min-w-0`}
													style={{ paddingRight: '2rem' }}>
													{statusOptions.map((s) => (
														<option key={s} value={s} className="text-gray-800 font-medium bg-white">
															{s}
														</option>
													))}
												</select>
												<ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white w-4 h-4 pointer-events-none group-hover:scale-110 transition-transform" />
											</div>
										)}
									</div>
								)}

								{/* Si no puede editar, solo mostrar estado */}
								{!canEdit && <div className={`text-white text-xs font-bold px-4 py-2.5 rounded-xl bg-gradient-to-r ${getStatusColor(appt.status)} shadow-md border-2 border-white/20`}>{appt.status}</div>}
							</div>
						</div>
					</motion.div>
				))}
			</div>

			{/* Modal para Recepción: ver servicios y gestionar pagos */}
			{isReception && (
				<ReceptionAppointmentModal
					isOpen={isModalOpen}
					onClose={() => {
						setIsModalOpen(false);
						setSelectedAppointment(null);
					}}
					appointment={selectedAppointment}
					organizationId={organizationId}
				/>
			)}

			{/* Modal para reagendar citas */}
			<RescheduleModal
				isOpen={isRescheduleModalOpen}
				onClose={() => {
					setIsRescheduleModalOpen(false);
					setRescheduleAppointment(null);
				}}
				appointment={rescheduleAppointment}
				onReschedule={handleReschedule}
			/>
		</>
	);
}
