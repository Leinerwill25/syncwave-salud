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
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
			<div className="max-w-7xl mx-auto space-y-6">
				{/* Header */}
				<div className="bg-white rounded-2xl shadow-lg p-6">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
								<Calendar className="w-8 h-8 text-indigo-600" />
								Mis Citas
							</h1>
							<p className="text-gray-600">Gestiona tus citas médicas</p>
						</div>
						<Link
							href="/dashboard/patient/citas/new"
							className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
						>
							Nueva Cita
						</Link>
					</div>
				</div>

				{/* Filtros */}
				<div className="bg-white rounded-2xl shadow-lg p-6">
					<div className="flex gap-2">
						<button
							onClick={() => setFilter('upcoming')}
							className={`px-4 py-2 rounded-lg font-medium transition-colors ${
								filter === 'upcoming'
									? 'bg-indigo-600 text-white'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							}`}
						>
							Próximas
						</button>
						<button
							onClick={() => setFilter('past')}
							className={`px-4 py-2 rounded-lg font-medium transition-colors ${
								filter === 'past'
									? 'bg-indigo-600 text-white'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							}`}
						>
							Pasadas
						</button>
						<button
							onClick={() => setFilter('all')}
							className={`px-4 py-2 rounded-lg font-medium transition-colors ${
								filter === 'all'
									? 'bg-indigo-600 text-white'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							}`}
						>
							Todas
						</button>
					</div>
				</div>

				{/* Lista de citas */}
				{loading ? (
					<div className="space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
								<div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
								<div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
							</div>
						))}
					</div>
				) : appointments.length === 0 ? (
					<div className="bg-white rounded-2xl shadow-lg p-12 text-center">
						<Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
						<p className="text-gray-600 text-lg">No tienes citas {filter === 'upcoming' ? 'próximas' : filter === 'past' ? 'pasadas' : ''}</p>
					</div>
				) : (
					<div className="space-y-4">
						{appointments.map((appointment) => {
							const date = new Date(appointment.scheduled_at);
							const isPast = date < new Date();
							const canCancel = appointment.status === 'SCHEDULED' && !isPast;

							return (
								<div
									key={appointment.id}
									className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
								>
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<div className="flex items-center gap-3 mb-4">
												<div className="p-3 bg-indigo-100 rounded-lg">
													<Calendar className="w-6 h-6 text-indigo-600" />
												</div>
												<div>
													<h3 className="text-lg font-semibold text-gray-900">
														{date.toLocaleDateString('es-ES', {
															weekday: 'long',
															year: 'numeric',
															month: 'long',
															day: 'numeric',
														})}
													</h3>
													<p className="text-gray-600 flex items-center gap-2 mt-1">
														<Clock className="w-4 h-4" />
														{date.toLocaleTimeString('es-ES', {
															hour: '2-digit',
															minute: '2-digit',
														})}
														{appointment.duration_minutes && ` • ${appointment.duration_minutes} min`}
													</p>
												</div>
											</div>

											<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
												{appointment.doctor && (
													<div className="flex items-center gap-2 text-gray-700">
														<User className="w-4 h-4 text-gray-400" />
														<span className="font-medium">Dr. {appointment.doctor.name || 'Médico'}</span>
													</div>
												)}
												{appointment.organization && (
													<div className="flex items-center gap-2 text-gray-700">
														<MapPin className="w-4 h-4 text-gray-400" />
														<span>{appointment.organization.name || 'Clínica'}</span>
													</div>
												)}
												{appointment.location && (
													<div className="flex items-center gap-2 text-gray-700">
														<MapPin className="w-4 h-4 text-gray-400" />
														<span>{appointment.location}</span>
													</div>
												)}
												{appointment.reason && (
													<div className="text-gray-700">
														<span className="font-medium">Motivo: </span>
														<span>{appointment.reason}</span>
													</div>
												)}
											</div>

											<div className="flex items-center gap-2">
												<span
													className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
														appointment.status
													)}`}
												>
													{getStatusIcon(appointment.status)}
													{appointment.status}
												</span>
											</div>
										</div>

										{canCancel && (
											<div className="flex flex-col gap-2">
												<button
													onClick={() => handleCancel(appointment.id)}
													className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors flex items-center gap-2"
												>
													<X className="w-4 h-4" />
													Cancelar
												</button>
												<button
													onClick={() => handleReschedule(appointment)}
													className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100 transition-colors flex items-center gap-2"
												>
													<RefreshCw className="w-4 h-4" />
													Reprogramar
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
