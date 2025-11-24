'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, X, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import RescheduleModal from '@/components/patient/RescheduleModal';

type Appointment = {
	id: string;
	scheduled_at: string;
	duration_minutes: number | null;
	status: string;
	reason: string | null;
	location: string | null;
	doctor: {
		id: string;
		name: string | null;
		email: string | null;
	} | null;
	organization: {
		id: string;
		name: string | null;
		type: string;
	} | null;
};

export default function CitasPage() {
	const [loading, setLoading] = useState(true);
	const [appointments, setAppointments] = useState<Appointment[]>([]);
	const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
	const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
	const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

	useEffect(() => {
		loadAppointments();
	}, [filter]);

	const loadAppointments = async () => {
		try {
			setLoading(true);
			const status = filter === 'all' ? 'all' : filter;
			const res = await fetch(`/api/patient/appointments?status=${status}`, {
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al cargar citas');

			const data = await res.json();
			setAppointments(data.data || []);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const handleCancel = async (appointmentId: string) => {
		if (!confirm('¿Está seguro de que desea cancelar esta cita?')) return;

		try {
			const res = await fetch(`/api/patient/appointments/${appointmentId}/cancel`, {
				method: 'POST',
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al cancelar cita');

			loadAppointments();
		} catch (err) {
			console.error('Error:', err);
			alert('Error al cancelar la cita');
		}
	};

	const handleReschedule = (appointment: Appointment) => {
		setSelectedAppointment(appointment);
		setRescheduleModalOpen(true);
	};

	const handleRescheduleSuccess = () => {
		loadAppointments();
	};

	const getStatusColor = (status: string) => {
		switch (status.toUpperCase()) {
			case 'SCHEDULED':
				return 'bg-blue-100 text-blue-700';
			case 'COMPLETED':
				return 'bg-green-100 text-green-700';
			case 'CANCELLED':
				return 'bg-red-100 text-red-700';
			case 'IN_PROGRESS':
				return 'bg-yellow-100 text-yellow-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status.toUpperCase()) {
			case 'COMPLETED':
				return <CheckCircle className="w-4 h-4" />;
			case 'CANCELLED':
				return <XCircle className="w-4 h-4" />;
			default:
				return <Clock className="w-4 h-4" />;
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-3 sm:p-4 md:p-6">
			<div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
				{/* Header */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-5 lg:p-6">
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
						<div className="flex-1 min-w-0 w-full">
							<h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 flex items-center gap-2 sm:gap-3">
								<Calendar className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-indigo-600 flex-shrink-0" />
								<span>Mis Citas</span>
							</h1>
							<p className="text-xs sm:text-sm md:text-base text-gray-600">Gestiona tus citas médicas</p>
						</div>
						<Link
							href="/dashboard/patient/citas/new"
							className="w-full sm:w-auto px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors text-center text-xs sm:text-sm md:text-base shadow-md hover:shadow-lg"
						>
							Nueva Cita
						</Link>
					</div>
				</div>

				{/* Filtros */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-5 lg:p-6">
					<div className="flex flex-wrap gap-2">
						<button
							onClick={() => setFilter('upcoming')}
							className={`px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm md:text-base ${
								filter === 'upcoming'
									? 'bg-indigo-600 text-white shadow-md'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							}`}
						>
							Próximas
						</button>
						<button
							onClick={() => setFilter('past')}
							className={`px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm md:text-base ${
								filter === 'past'
									? 'bg-indigo-600 text-white shadow-md'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							}`}
						>
							Pasadas
						</button>
						<button
							onClick={() => setFilter('all')}
							className={`px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm md:text-base ${
								filter === 'all'
									? 'bg-indigo-600 text-white shadow-md'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							}`}
						>
							Todas
						</button>
					</div>
				</div>

				{/* Lista de citas */}
				{loading ? (
					<div className="space-y-3 sm:space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="bg-white rounded-xl shadow-lg p-4 sm:p-6 animate-pulse">
								<div className="h-5 sm:h-6 bg-gray-200 rounded w-1/2 sm:w-1/3 mb-3 sm:mb-4"></div>
								<div className="h-3 sm:h-4 bg-gray-200 rounded w-full mb-2"></div>
							</div>
						))}
					</div>
				) : appointments.length === 0 ? (
					<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-6 sm:p-8 md:p-12 text-center">
						<Calendar className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-2 sm:mb-3 md:mb-4" />
						<p className="text-gray-600 text-sm sm:text-base md:text-lg">No tienes citas {filter === 'upcoming' ? 'próximas' : filter === 'past' ? 'pasadas' : ''}</p>
					</div>
				) : (
					<div className="space-y-3 sm:space-y-4">
						{appointments.map((appointment) => {
							const date = new Date(appointment.scheduled_at);
							const isPast = date < new Date();
							const canCancel = appointment.status === 'SCHEDULED' && !isPast;

							return (
								<div
									key={appointment.id}
									className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-5 lg:p-6 hover:shadow-xl transition-shadow"
								>
									<div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3 sm:gap-4">
										<div className="flex-1 min-w-0 w-full">
											<div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
												<div className="p-1.5 sm:p-2 md:p-3 bg-indigo-100 rounded-lg flex-shrink-0">
													<Calendar className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-indigo-600" />
												</div>
												<div className="flex-1 min-w-0">
													<h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 break-words leading-tight">
														<span className="hidden sm:inline">
															{date.toLocaleDateString('es-ES', {
																weekday: 'long',
																year: 'numeric',
																month: 'long',
																day: 'numeric',
															})}
														</span>
														<span className="sm:hidden">
															{date.toLocaleDateString('es-ES', {
																day: 'numeric',
																month: 'short',
																year: 'numeric',
															})}
														</span>
													</h3>
													<p className="text-xs sm:text-sm md:text-base text-gray-600 flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
														<Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 flex-shrink-0" />
														<span>
															{date.toLocaleTimeString('es-ES', {
																hour: '2-digit',
																minute: '2-digit',
															})}
															{appointment.duration_minutes && (
																<span className="hidden sm:inline"> • {appointment.duration_minutes} min</span>
															)}
														</span>
													</p>
												</div>
											</div>

											<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4">
												{appointment.doctor && (
													<div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base text-gray-700">
														<User className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-gray-400 flex-shrink-0" />
														<span className="font-medium break-words">Dr. {appointment.doctor.name || 'Médico'}</span>
													</div>
												)}
												{appointment.organization && (
													<div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base text-gray-700">
														<MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-gray-400 flex-shrink-0" />
														<span className="break-words">{appointment.organization.name || 'Clínica'}</span>
													</div>
												)}
												{appointment.location && (
													<div className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base text-gray-700 sm:col-span-2">
														<MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-gray-400 flex-shrink-0 mt-0.5" />
														<span className="break-words">{appointment.location}</span>
													</div>
												)}
												{appointment.reason && (
													<div className="text-xs sm:text-sm md:text-base text-gray-700 sm:col-span-2">
														<span className="font-medium">Motivo: </span>
														<span className="break-words">{appointment.reason}</span>
													</div>
												)}
											</div>

											<div className="flex items-center gap-2 flex-wrap mb-3 sm:mb-0">
												<span
													className={`inline-flex items-center gap-1 px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] md:text-xs font-semibold ${getStatusColor(
														appointment.status
													)}`}
												>
													{getStatusIcon(appointment.status)}
													<span className="hidden sm:inline">{appointment.status}</span>
													<span className="sm:hidden">{appointment.status.substring(0, 3)}</span>
												</span>
											</div>
										</div>

										{canCancel && (
											<div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto sm:min-w-[140px]">
												<button
													onClick={() => handleCancel(appointment.id)}
													className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base shadow-sm hover:shadow-md"
												>
													<X className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
													<span>Cancelar</span>
												</button>
												<button
													onClick={() => handleReschedule(appointment)}
													className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base shadow-sm hover:shadow-md"
												>
													<RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
													<span>Reprogramar</span>
												</button>
											</div>
										)}
									</div>
								</div>
							);
						})}
					</div>
				)}

				{/* Modal de Reagendamiento */}
				{selectedAppointment && (
					<RescheduleModal
						isOpen={rescheduleModalOpen}
						onClose={() => {
							setRescheduleModalOpen(false);
							setSelectedAppointment(null);
						}}
						appointmentId={selectedAppointment.id}
						doctorId={selectedAppointment.doctor?.id || null}
						currentScheduledAt={selectedAppointment.scheduled_at}
						onSuccess={handleRescheduleSuccess}
					/>
				)}
			</div>
		</div>
	);
}
