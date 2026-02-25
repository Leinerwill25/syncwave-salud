'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Calendar, Clock, CheckCircle2, XCircle, Search, Loader2, Edit2, X, Save, AlertCircle, Phone, FileText } from 'lucide-react';
import { getRoleUserSession } from '@/lib/role-user-auth-client';
import { useRouter } from 'next/navigation';
import type { RoleUserSession } from '@/lib/role-user-auth-client';

type Patient = {
	id: string;
	firstName: string;
	lastName: string;
	identifier?: string | null;
	phone?: string | null;
	email?: string | null;
	isUnregistered?: boolean;
	createdBy?: string | null;
};

type Appointment = {
	id: string;
	patient_id: string;
	scheduled_at: string;
	status: string;
	reason?: string | null;
	location?: string | null;
};

type PatientAppointments = {
	patient: Patient;
	scheduledAppointments: Appointment[];
	attendedCount: number;
	consultationDates: string[];
};

export default function RoleUserPatientsPage() {
	const router = useRouter();
	const [session, setSession] = useState<RoleUserSession | null>(null);
	const [patients, setPatients] = useState<PatientAppointments[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	
	// Estado para edición
	const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [updateLoading, setUpdateLoading] = useState(false);
	const [updateError, setUpdateError] = useState<string | null>(null);

	useEffect(() => {
		loadSession();
	}, []);

	useEffect(() => {
		if (session) {
			loadPatients();
		}
	}, [session]);

	const loadSession = async () => {
		try {
			const roleUserSession = await getRoleUserSession();
			if (roleUserSession) {
				setSession(roleUserSession);
			} else {
				router.push('/login/role-user');
			}
		} catch (err) {
			console.error('[Role User Patients] Error cargando sesión:', err);
			router.push('/login/role-user');
		}
	};

	const loadPatients = async () => {
		if (!session) return;

		setLoading(true);
		try {
			const res = await fetch('/api/role-users/patients', {
				credentials: 'include',
			});

			if (!res.ok) {
				throw new Error('Error al cargar pacientes');
			}

			const data = await res.json();
			setPatients(data.patients || []);
		} catch (err) {
			console.error('[Role User Patients] Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const handleEditClick = (patient: Patient) => {
		setEditingPatient({ ...patient });
		setIsEditModalOpen(true);
		setUpdateError(null);
	};

	const handleUpdatePatient = async () => {
		if (!editingPatient) return;

		setUpdateLoading(true);
		setUpdateError(null);

		try {
			const res = await fetch(`/api/role-users/patients/${editingPatient.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					firstName: editingPatient.firstName,
					lastName: editingPatient.lastName,
					identifier: editingPatient.identifier,
					phone: editingPatient.phone,
					isUnregistered: editingPatient.isUnregistered
				}),
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || 'Error al actualizar paciente');
			}

			setIsEditModalOpen(false);
			setEditingPatient(null);
			loadPatients(); // Recargar lista
		} catch (err: any) {
			setUpdateError(err.message);
		} finally {
			setUpdateLoading(false);
		}
	};

	const formatDate = (iso: string) => {
		try {
			const d = new Date(iso);
			return d.toLocaleDateString('es-ES', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			});
		} catch {
			return iso;
		}
	};

	const getStatusBadge = (status: string) => {
		const statusLower = status.toLowerCase();
		if (statusLower === 'confirmada' || statusLower === 'completed') {
			return (
				<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
					<CheckCircle2 className="w-3 h-3" />
					Confirmada
				</span>
			);
		}
		if (statusLower === 'cancelada' || statusLower === 'cancelled') {
			return (
				<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
					<XCircle className="w-3 h-3" />
					Cancelada
				</span>
			);
		}
		return (
			<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
				<Clock className="w-3 h-3" />
				Pendiente
			</span>
		);
	};

	const filteredPatients = patients.filter((item) => {
		if (!searchQuery.trim()) return true;
		const query = searchQuery.toLowerCase();
		return (
			item.patient.firstName?.toLowerCase().includes(query) ||
			item.patient.lastName?.toLowerCase().includes(query) ||
			item.patient.identifier?.toLowerCase().includes(query) ||
			item.patient.phone?.toLowerCase().includes(query)
		);
	});

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="w-8 h-8 animate-spin text-teal-600" />
					<p className="text-slate-600">Cargando pacientes...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full min-w-0 px-2 sm:px-0">
			{/* Header */}
			<motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 sm:mb-6">
				<h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 break-words">Gestión de Pacientes</h1>
				<p className="text-xs sm:text-sm md:text-base text-slate-600 mt-1 break-words">Visualiza y edita la información de pacientes asociados a tu organización</p>
			</motion.div>

			{/* Search Bar */}
			<div className="mb-4 sm:mb-6">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
					<input
						type="text"
						placeholder="Buscar por nombre, cédula o teléfono..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
					/>
				</div>
			</div>

			{/* Patients List */}
			{filteredPatients.length === 0 ? (
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8 text-center">
					<User className="w-12 h-12 sm:w-16 sm:h-16 text-slate-400 mx-auto mb-3 sm:mb-4" />
					<p className="text-sm sm:text-base text-slate-600">{searchQuery ? 'No se encontraron pacientes' : 'No hay pacientes registrados'}</p>
				</div>
			) : (
				<div className="space-y-3 sm:space-y-4">
					{filteredPatients.map((item, index) => (
						<motion.div
							key={item.patient.id}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: index * 0.05 }}
							className="bg-white rounded-lg sm:rounded-xl shadow-md border border-slate-200 p-4 sm:p-6 hover:shadow-lg transition-shadow"
						>
							{/* Patient Info */}
							<div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
								<div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-base flex-shrink-0">
									{item.patient.firstName?.[0]?.toUpperCase()}
									{item.patient.lastName?.[0]?.toUpperCase()}
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 flex-wrap">
										<h3 className="text-base sm:text-lg font-semibold text-slate-900 break-words">
											{item.patient.firstName} {item.patient.lastName}
										</h3>
										{item.patient.isUnregistered && (
											<span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full uppercase">
												No registrado
											</span>
										)}
									</div>
									<div className="flex flex-col sm:flex-row sm:flex-wrap gap-1 sm:gap-4 mt-1 text-xs sm:text-sm text-slate-600">
										{item.patient.identifier && <span className="break-words">C.I.: {item.patient.identifier}</span>}
										{item.patient.phone && <span className="break-words">Tel: {item.patient.phone}</span>}
										{item.patient.createdBy && (
											<span className="text-teal-600 font-medium">Registrado por: {item.patient.createdBy}</span>
										)}
									</div>
								</div>
								<button
									onClick={() => handleEditClick(item.patient)}
									className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
									title="Editar información"
								>
									<Edit2 className="w-5 h-5" />
								</button>
							</div>

							{/* Statistics */}
							<div className="grid grid-cols-3 gap-2 sm:gap-4 mb-3 sm:mb-4 p-3 sm:p-4 bg-slate-50 rounded-lg">
								<div className="text-center">
									<div className="text-lg sm:text-2xl font-bold text-teal-600">{item.scheduledAppointments.length}</div>
									<div className="text-[10px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1 leading-tight">Citas Programadas</div>
								</div>
								<div className="text-center">
									<div className="text-lg sm:text-2xl font-bold text-green-600">{item.attendedCount}</div>
									<div className="text-[10px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1 leading-tight">Citas Asistidas</div>
								</div>
								<div className="text-center">
									<div className="text-lg sm:text-2xl font-bold text-blue-600">{item.consultationDates.length}</div>
									<div className="text-[10px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1 leading-tight">Consultas Realizadas</div>
								</div>
							</div>

							{/* Scheduled Appointments */}
							{item.scheduledAppointments.length > 0 && (
								<div className="mt-3 sm:mt-4">
									<h4 className="text-xs sm:text-sm font-semibold text-slate-700 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
										<Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
										<span>Citas Programadas</span>
									</h4>
									<div className="space-y-2">
										{item.scheduledAppointments.map((appointment) => (
											<div
												key={appointment.id}
												className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-2.5 sm:p-3 bg-blue-50 rounded-lg border border-blue-100"
											>
												<div className="flex-1 min-w-0">
													<div className="text-xs sm:text-sm font-medium text-slate-900 break-words">{formatDate(appointment.scheduled_at)}</div>
													{appointment.reason && <div className="text-[10px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1 break-words">Motivo: {appointment.reason}</div>}
													{appointment.location && <div className="text-[10px] sm:text-xs text-slate-600 break-words">Ubicación: {appointment.location}</div>}
												</div>
												<div className="flex-shrink-0">{getStatusBadge(appointment.status)}</div>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Consultation Dates */}
							{item.consultationDates.length > 0 && (
								<div className="mt-3 sm:mt-4">
									<h4 className="text-xs sm:text-sm font-semibold text-slate-700 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
										<Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
										<span>Fechas de Consultas</span>
									</h4>
									<div className="flex flex-wrap gap-1.5 sm:gap-2">
										{item.consultationDates.map((date, idx) => (
											<span key={idx} className="px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium bg-teal-100 text-teal-800 rounded-full break-words">
												{formatDate(date)}
											</span>
										))}
									</div>
								</div>
							)}
						</motion.div>
					))}
				</div>
			)}
			
			{/* Edit Patient Modal */}
			<AnimatePresence>
				{isEditModalOpen && editingPatient && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
						onClick={(e) => { if (e.target === e.currentTarget) setIsEditModalOpen(false); }}
					>
						<motion.div
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.9, opacity: 0 }}
							className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
						>
							<div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
								<h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
									<Edit2 className="w-5 h-5 text-teal-600" />
									Editar Paciente
								</h2>
								<button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
									<X className="w-6 h-6" />
								</button>
							</div>
							
							<div className="p-6 space-y-4">
								{updateError && (
									<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-2 text-sm">
										<AlertCircle className="w-5 h-5 flex-shrink-0" />
										<p>{updateError}</p>
									</div>
								)}
								
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-1.5">
										<label className="text-xs font-semibold text-slate-700 uppercase ml-1">Nombre</label>
										<input
											type="text"
											value={editingPatient.firstName}
											onChange={(e) => setEditingPatient({ ...editingPatient, firstName: e.target.value })}
											className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 transition-all text-sm"
											placeholder="Nombres"
										/>
									</div>
									<div className="space-y-1.5">
										<label className="text-xs font-semibold text-slate-700 uppercase ml-1">Apellido</label>
										<input
											type="text"
											value={editingPatient.lastName || ''}
											onChange={(e) => setEditingPatient({ ...editingPatient, lastName: e.target.value })}
											className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 transition-all text-sm"
											placeholder="Apellidos"
										/>
									</div>
								</div>
								
								<div className="space-y-1.5">
									<label className="text-xs font-semibold text-slate-700 uppercase ml-1">Cédula de Identidad</label>
									<div className="relative">
										<FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
										<input
											type="text"
											value={editingPatient.identifier || ''}
											onChange={(e) => setEditingPatient({ ...editingPatient, identifier: e.target.value })}
											className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 transition-all text-sm"
											placeholder="Ej: V-12345678"
										/>
									</div>
								</div>
								
								<div className="space-y-1.5">
									<label className="text-xs font-semibold text-slate-700 uppercase ml-1">Teléfono de Contacto</label>
									<div className="relative">
										<Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
										<input
											type="text"
											value={editingPatient.phone || ''}
											onChange={(e) => setEditingPatient({ ...editingPatient, phone: e.target.value })}
											className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 transition-all text-sm"
											placeholder="Ej: 0412-1234567"
										/>
									</div>
								</div>
								
								<div className="pt-4 flex gap-3">
									<button
										onClick={handleUpdatePatient}
										disabled={updateLoading}
										className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-teal-100 flex items-center justify-center gap-2 disabled:opacity-50"
									>
										{updateLoading ? (
											<Loader2 className="w-5 h-5 animate-spin" />
										) : (
											<>
												<Save className="w-5 h-5" />
												Guardar Cambios
											</>
										)}
									</button>
									<button
										disabled={updateLoading}
										onClick={() => setIsEditModalOpen(false)}
										className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all"
									>
										Cancelar
									</button>
								</div>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

