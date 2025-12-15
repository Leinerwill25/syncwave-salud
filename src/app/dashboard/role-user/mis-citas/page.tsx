'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, User, Tag, Loader2, FileText } from 'lucide-react';
import { getRoleUserSession } from '@/lib/role-user-auth-client';

interface Appointment {
	id: string;
	scheduledAt: string;
	status: string;
	reason: string;
	location: string | null;
	referralSource: string | null;
	createdAt: string;
	patientName: string;
	patientIdentifier: string | null;
	isUnregistered: boolean;
	doctorName: string | null;
}

const SOURCE_LABELS: Record<string, string> = {
	FACEBOOK: 'Facebook',
	INSTAGRAM: 'Instagram',
	WHATSAPP: 'WhatsApp',
	REFERIDO: 'Boca en Boca (Referido)',
	OTRO: 'Otro',
};

export default function MisCitasPage() {
	const [appointments, setAppointments] = useState<Appointment[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [session, setSession] = useState<any>(null);
	
	// Obtener mes y año actual por defecto
	const currentDate = new Date();
	const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
	const currentYear = String(currentDate.getFullYear());
	
	const [filterMonth, setFilterMonth] = useState<string>(currentMonth);
	const [filterYear, setFilterYear] = useState<string>(currentYear);

	useEffect(() => {
		loadSession();
	}, []);

	useEffect(() => {
		if (session) {
			loadAppointments();
		}
	}, [session, filterMonth, filterYear]);

	const loadSession = async () => {
		try {
			const roleUserSession = await getRoleUserSession();
			if (roleUserSession) {
				setSession(roleUserSession);
			}
		} catch (err) {
			console.error('[Mis Citas] Error cargando sesión:', err);
			setError('Error al cargar la sesión');
		}
	};

	const loadAppointments = async () => {
		try {
			setLoading(true);
			setError(null);

			let url = '/api/role-users/appointments?';
			if (filterMonth && filterYear) {
				url += `month=${filterMonth}&year=${filterYear}`;
			} else if (filterYear) {
				url += `year=${filterYear}`;
			}

			const res = await fetch(url, { credentials: 'include' });

			if (!res.ok) {
				throw new Error('Error al cargar las citas');
			}

			const data = await res.json();
			setAppointments(data.appointments || []);
		} catch (err: any) {
			console.error('[Mis Citas] Error:', err);
			setError(err.message || 'Error al cargar las citas');
		} finally {
			setLoading(false);
		}
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString('es-ES', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	};

	const formatTime = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleTimeString('es-ES', {
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'CONFIRMADA':
				return 'bg-blue-100 text-blue-800';
			case 'EN ESPERA':
			case 'EN_ESPERA':
				return 'bg-yellow-100 text-yellow-800';
			case 'COMPLETADA':
				// "Finalizada" en UI, se mantiene COMpletada internamente
				return 'bg-green-100 text-green-800';
			case 'CANCELADA':
				return 'bg-gray-100 text-gray-800';
			case 'REAGENDADA':
				return 'bg-orange-100 text-orange-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	};

	if (loading && appointments.length === 0) {
		return (
			<div className="flex items-center justify-center h-64">
				<Loader2 className="w-8 h-8 animate-spin text-teal-600" />
			</div>
		);
	}

	return (
		<div className="w-full space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
					<FileText className="w-8 h-8 text-teal-600" />
					Mis Citas Programadas
				</h1>
				<p className="text-sm text-slate-600 mt-2">Visualiza todas las citas que has programado con información del paciente y origen</p>
			</div>

			{/* Filtros */}
			<div className="bg-white rounded-xl shadow-md border border-slate-200 p-4">
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-2">Año</label>
						<input
							type="number"
							value={filterYear}
							onChange={(e) => setFilterYear(e.target.value)}
							min="2020"
							max={currentYear}
							className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
							placeholder={currentYear}
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-2">Mes</label>
						<select
							value={filterMonth}
							onChange={(e) => setFilterMonth(e.target.value)}
							className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
						>
							<option value="">Todos los meses</option>
							<option value="01">Enero</option>
							<option value="02">Febrero</option>
							<option value="03">Marzo</option>
							<option value="04">Abril</option>
							<option value="05">Mayo</option>
							<option value="06">Junio</option>
							<option value="07">Julio</option>
							<option value="08">Agosto</option>
							<option value="09">Septiembre</option>
							<option value="10">Octubre</option>
							<option value="11">Noviembre</option>
							<option value="12">Diciembre</option>
						</select>
					</div>
					<div className="flex items-end">
						<button
							onClick={loadAppointments}
							className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
						>
							Filtrar
						</button>
					</div>
				</div>
			</div>

			{/* Error */}
			{error && (
				<div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
					<p className="text-sm text-red-800">{error}</p>
				</div>
			)}

			{/* Lista de citas */}
			{appointments.length === 0 ? (
				<div className="bg-white rounded-xl shadow-md border border-slate-200 p-12 text-center">
					<Calendar className="w-16 h-16 text-slate-400 mx-auto mb-4" />
					<p className="text-slate-600">No hay citas programadas para el período seleccionado</p>
				</div>
			) : (
				<div className="space-y-4">
					{appointments.map((appt) => (
						<motion.div
							key={appt.id}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							className="bg-white rounded-xl shadow-md border border-slate-200 p-6 hover:shadow-lg transition"
						>
							<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
								<div className="flex-1 space-y-3">
									{/* Información del paciente */}
									<div className="flex items-start gap-3">
										<div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
											<User className="w-5 h-5 text-teal-600" />
										</div>
										<div className="flex-1">
											<h3 className="font-semibold text-lg text-slate-900">{appt.patientName}</h3>
											{appt.patientIdentifier && (
												<p className="text-sm text-slate-600">C.I.: {appt.patientIdentifier}</p>
											)}
											{appt.isUnregistered && (
												<span className="inline-block mt-1 text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded">
													Paciente no registrado
												</span>
											)}
										</div>
									</div>

									{/* Motivo */}
									{appt.reason && (
										<div className="flex items-start gap-3">
											<FileText className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
											<div>
												<p className="text-sm font-medium text-slate-700">Motivo:</p>
												<p className="text-sm text-slate-600">{appt.reason}</p>
											</div>
										</div>
									)}

									{/* Fecha y hora */}
									<div className="flex flex-wrap gap-4 text-sm text-slate-600">
										<div className="flex items-center gap-2">
											<Calendar className="w-4 h-4" />
											<span>{formatDate(appt.scheduledAt)}</span>
										</div>
										<div className="flex items-center gap-2">
											<Clock className="w-4 h-4" />
											<span>{formatTime(appt.scheduledAt)}</span>
										</div>
										{appt.location && (
											<div className="flex items-center gap-2">
												<MapPin className="w-4 h-4" />
												<span>{appt.location}</span>
											</div>
										)}
									</div>

									{/* Origen del cliente */}
									{appt.referralSource && (
										<div className="flex items-center gap-2 pt-2 border-t border-slate-100">
											<Tag className="w-4 h-4 text-slate-400" />
											<span className="text-xs font-medium text-slate-700">Origen:</span>
											<span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-semibold">
												{SOURCE_LABELS[appt.referralSource] || appt.referralSource}
											</span>
										</div>
									)}
								</div>

								{/* Estado */}
								<div className="flex-shrink-0">
									<span className={`px-4 py-2 rounded-lg text-sm font-semibold ${getStatusColor(appt.status)}`}>
										{appt.status === 'COMPLETADA' ? 'Finalizada' : appt.status}
									</span>
								</div>
							</div>
						</motion.div>
					))}
				</div>
			)}
		</div>
	);
}

