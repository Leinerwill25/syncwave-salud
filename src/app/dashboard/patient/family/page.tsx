'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, X, Shield, AlertCircle, User, Calendar, Stethoscope, Pill, Star, Activity } from 'lucide-react';
import Link from 'next/link';

type FamilyGroup = {
	id: string;
	name: string | null;
	maxMembers: number;
	ownerId: string;
};

type FamilyMember = {
	id: string;
	patientId: string;
	roleInGroup: string | null;
	addedAt: string;
	consultationCount?: number;
	patient: {
		id: string;
		firstName: string;
		lastName: string;
		identifier: string | null;
		dob: string | null;
		gender: string | null;
	} | null;
};

type FamilyData = {
	hasFamilyPlan: boolean;
	hasGroup: boolean;
	isOwner: boolean;
	group: FamilyGroup | null;
	members: FamilyMember[];
	ownerConsultationCount?: number;
	ownerId?: string;
	hasFamilyDashboard?: boolean;
	consolidatedAppointments?: any[];
	consolidatedPrescriptions?: any[];
};

export default function FamilyPage() {
	const [loading, setLoading] = useState(true);
	const [familyData, setFamilyData] = useState<FamilyData | null>(null);
	const [showAddMember, setShowAddMember] = useState(false);
	const [newMemberId, setNewMemberId] = useState('');

	useEffect(() => {
		loadFamilyData();
	}, []);

	const loadFamilyData = async () => {
		try {
			setLoading(true);
			const res = await fetch('/api/patient/family', {
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al cargar grupo familiar');

			const data = await res.json();
			setFamilyData(data);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const handleAddMember = async () => {
		if (!newMemberId.trim()) {
			alert('Por favor ingrese el ID del paciente');
			return;
		}

		try {
			const res = await fetch('/api/patient/family/add-member', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					patientId: newMemberId,
					roleInGroup: 'MIEMBRO',
				}),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Error al agregar miembro');
			}

			setNewMemberId('');
			setShowAddMember(false);
			loadFamilyData();
		} catch (err: any) {
			alert(err.message || 'Error al agregar miembro');
		}
	};

	const handleRemoveMember = async (memberId: string) => {
		if (!confirm('¿Está seguro de que desea eliminar este miembro del grupo?')) return;

		try {
			const res = await fetch('/api/patient/family/remove-member', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ memberId }),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Error al eliminar miembro');
			}

			loadFamilyData();
		} catch (err: any) {
			alert(err.message || 'Error al eliminar miembro');
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-3 sm:p-4 md:p-6">
				<div className="max-w-7xl mx-auto">
					<div className="animate-pulse space-y-3 sm:space-y-4 md:space-y-6">
						<div className="h-6 sm:h-7 md:h-8 bg-gray-200 rounded w-1/2 sm:w-1/3"></div>
						<div className="h-48 sm:h-56 md:h-64 bg-gray-200 rounded"></div>
					</div>
				</div>
			</div>
		);
	}


	if (!familyData || !familyData.hasGroup) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-3 sm:p-4 md:p-6">
				<div className="max-w-7xl mx-auto">
					<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-8 sm:p-10 md:p-12 text-center">
						<Users className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
						<h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">No Tienes un Grupo Familiar</h1>
						<p className="text-xs sm:text-sm md:text-base text-gray-600 mb-4 sm:mb-5 md:mb-6">
							Crea un grupo familiar para gestionar la información médica de tu familia
						</p>
						<button
							onClick={async () => {
								try {
									const res = await fetch('/api/patient/family', {
										method: 'POST',
										headers: { 'Content-Type': 'application/json' },
										credentials: 'include',
										body: JSON.stringify({ name: 'Mi Grupo Familiar' }),
									});

									if (!res.ok) throw new Error('Error al crear grupo');

									loadFamilyData();
								} catch (err: any) {
									alert(err.message || 'Error al crear grupo');
								}
							}}
							className="inline-block px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors text-xs sm:text-sm md:text-base"
						>
							Crear Grupo Familiar
						</button>
					</div>
				</div>
			</div>
		);
	}

	// TypeScript guard: después del return temprano, familyData no puede ser null
	if (!familyData) {
		return null;
	}

	const totalMembers = familyData.members.length + 1; // +1 por el owner
	const usedSlots = totalMembers;
	const maxSlots = familyData.group?.maxMembers || 5;

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-3 sm:p-4 md:p-6">
			<div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
				{/* Header */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6">
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
						<div className="min-w-0 flex-1">
							<h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 flex items-center gap-2 sm:gap-3">
								<Users className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-purple-600 flex-shrink-0" />
								<span className="truncate">Grupo Familiar</span>
							</h1>
							<p className="text-xs sm:text-sm md:text-base text-gray-600 truncate">{familyData.group?.name || 'Mi Grupo Familiar'}</p>
						</div>
						<Link
							href="/dashboard/patient/family/codes"
							className="w-full sm:w-auto px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base"
						>
							<Shield className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 flex-shrink-0" />
							<span>Códigos de Acceso</span>
						</Link>
					</div>
				</div>

				{/* Estadísticas */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6">
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
						<div className="p-3 sm:p-4 bg-purple-50 rounded-lg">
							<p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">Miembros</p>
							<p className="text-xl sm:text-2xl font-bold text-purple-600">
								{usedSlots} / {maxSlots}
							</p>
						</div>
						<div className="p-3 sm:p-4 bg-indigo-50 rounded-lg">
							<p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">Espacios Disponibles</p>
							<p className="text-xl sm:text-2xl font-bold text-indigo-600">{maxSlots - usedSlots}</p>
						</div>
						<div className="p-3 sm:p-4 bg-pink-50 rounded-lg">
							<p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">Estado</p>
							<p className="text-base sm:text-lg font-semibold text-pink-600">
								{familyData.isOwner ? 'Dueño' : 'Miembro'}
							</p>
						</div>
					</div>
				</div>

				{/* Dashboard Unificado ASHIRA Salud+ */}
				{familyData.hasFamilyDashboard && (
					<div className="bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-5 md:p-6 border border-indigo-500/30 text-white relative overflow-hidden">
						<div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
						
						<div className="flex items-center gap-3 mb-6 relative z-10">
							<div className="p-2 bg-gradient-to-br from-[#7FFFD4] to-teal-400 rounded-lg text-slate-900 shadow-[0_0_15px_rgba(127,255,212,0.4)]">
								<Star className="w-6 h-6" fill="currentColor" />
							</div>
							<div>
								<h2 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
									Dashboard Familiar Unificado
								</h2>
								<p className="text-xs sm:text-sm text-indigo-200/80">Vista consolidada de salud activada vía ASHIRA Salud+</p>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 relative z-10">
							{/* Próximas Citas Consolidadas */}
							<div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
								<h3 className="font-semibold text-indigo-100 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
									<Calendar className="w-4 h-4 text-[#7FFFD4]" />
									Próximas Citas
								</h3>
								<div className="space-y-3">
									{!familyData.consolidatedAppointments || familyData.consolidatedAppointments.length === 0 ? (
										<p className="text-sm text-white/50 text-center py-4">No hay citas próximas en la familia.</p>
									) : (
										familyData.consolidatedAppointments.map((appt: any) => {
											const member = familyData.members.find(m => m.patientId === appt.patient_id);
											const name = member?.patient?.firstName ? `${member.patient.firstName} ${member.patient.lastName}` : 'Miembro';
											const isOwner = appt.patient_id === familyData.ownerId;
											return (
												<div key={appt.id} className="flex flex-col p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
													<div className="flex justify-between items-start mb-1">
														<span className="text-sm font-bold text-white flex items-center gap-1.5">
															<User className="w-3.5 h-3.5 text-indigo-300" />
															{isOwner ? 'Tú' : name}
														</span>
														<span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
															{appt.status}
														</span>
													</div>
													<div className="text-xs text-white/70 mt-1">
														{new Date(appt.scheduled_at).toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
													</div>
													{appt.doctor && (
														<div className="text-[10px] text-white/50 mt-1">Dr. {appt.doctor.name}</div>
													)}
												</div>
											)
										})
									)}
								</div>
							</div>

							{/* Recetas Activas Consolidadas */}
							<div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
								<h3 className="font-semibold text-indigo-100 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
									<Pill className="w-4 h-4 text-[#7FFFD4]" />
									Recetas Activas
								</h3>
								<div className="space-y-3">
									{!familyData.consolidatedPrescriptions || familyData.consolidatedPrescriptions.length === 0 ? (
										<p className="text-sm text-white/50 text-center py-4">No hay recetas activas en la familia.</p>
									) : (
										familyData.consolidatedPrescriptions.map((presc: any) => {
											// presc.consultation.patient_id is where the patient id is
											const patientId = presc.consultation?.patient_id;
											const member = familyData.members.find(m => m.patientId === patientId);
											const name = member?.patient?.firstName ? `${member.patient.firstName} ${member.patient.lastName}` : 'Miembro';
											const isOwner = patientId === familyData.ownerId;
											return (
												<div key={presc.id} className="flex flex-col p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
													<div className="flex justify-between items-start mb-1">
														<span className="text-sm font-bold text-white flex items-center gap-1.5">
															<User className="w-3.5 h-3.5 text-indigo-300" />
															{isOwner ? 'Tú' : name}
														</span>
														<span className="text-[10px] px-2 py-0.5 rounded bg-[#7FFFD4]/20 text-[#7FFFD4] border border-[#7FFFD4]/30">
															ACTIVA
														</span>
													</div>
													<div className="text-xs text-white/90 mt-1">
														{presc.prescription_item && presc.prescription_item.map((item: any) => item.name).join(', ')}
													</div>
													{presc.valid_until && (
														<div className="text-[10px] text-white/50 mt-1">Válida hasta: {new Date(presc.valid_until).toLocaleDateString('es-ES')}</div>
													)}
												</div>
											)
										})
									)}
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Miembros */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6">
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-3 sm:gap-4">
						<h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">Miembros del Grupo</h2>
						{familyData.isOwner && usedSlots < maxSlots && (
							<button
								onClick={() => setShowAddMember(!showAddMember)}
								className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base"
							>
								<Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
								<span>Agregar Miembro</span>
							</button>
						)}
					</div>

					{showAddMember && (
						<div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
							<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2">
								<input
									type="text"
									placeholder="ID del paciente a agregar"
									value={newMemberId}
									onChange={(e) => setNewMemberId(e.target.value)}
									className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
								/>
								<div className="flex gap-2">
									<button
										onClick={handleAddMember}
										className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-xs sm:text-sm md:text-base"
									>
										Agregar
									</button>
									<button
										onClick={() => {
											setShowAddMember(false);
											setNewMemberId('');
										}}
										className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors text-xs sm:text-sm md:text-base"
									>
										Cancelar
									</button>
								</div>
							</div>
						</div>
					)}

					<div className="space-y-3 sm:space-y-4">
						{/* Owner */}
						{familyData.ownerId && (
							<Link
								href={`/dashboard/patient/family/members/${familyData.ownerId}`}
								className="block p-3 sm:p-4 bg-purple-50 rounded-lg border-2 border-purple-200 hover:border-purple-300 transition-colors"
							>
								<div className="flex items-center justify-between gap-2">
									<div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
										<div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg flex-shrink-0">
											<User className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
										</div>
										<div className="min-w-0 flex-1">
											<p className="font-semibold text-gray-900 text-sm sm:text-base truncate">Dueño del Grupo</p>
											<div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 md:gap-4 text-xs sm:text-sm text-gray-600">
												<span>Tú</span>
												{familyData.ownerConsultationCount !== undefined && (
													<span className="flex items-center gap-1">
														<Stethoscope className="w-3 h-3 flex-shrink-0" />
														{familyData.ownerConsultationCount} consulta{(familyData.ownerConsultationCount !== 1 ? 's' : '')}
													</span>
												)}
											</div>
										</div>
									</div>
									<span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-purple-600 text-white text-[9px] sm:text-[10px] md:text-xs font-semibold rounded-full flex-shrink-0">
										Dueño
									</span>
								</div>
							</Link>
						)}

						{/* Miembros */}
						{familyData.members.map((member) => (
							<div key={member.id} className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors">
								<div className="flex items-center justify-between gap-2">
									<Link
										href={`/dashboard/patient/family/members/${member.patientId}`}
										className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0"
									>
										<div className="p-1.5 sm:p-2 bg-indigo-100 rounded-lg flex-shrink-0">
											<User className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
										</div>
										<div className="min-w-0 flex-1">
											<p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
												{member.patient?.firstName} {member.patient?.lastName}
											</p>
											<div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 md:gap-4 text-xs sm:text-sm text-gray-600">
												{member.patient?.identifier && (
													<span className="truncate">ID: {member.patient.identifier}</span>
												)}
												{member.patient?.dob && (
													<span className="flex items-center gap-1">
														<Calendar className="w-3 h-3 flex-shrink-0" />
														{new Date(member.patient.dob).toLocaleDateString('es-ES')}
													</span>
												)}
												<span className="flex items-center gap-1">
													<Stethoscope className="w-3 h-3 flex-shrink-0" />
													{member.consultationCount || 0} consulta{(member.consultationCount || 0) !== 1 ? 's' : ''}
												</span>
											</div>
										</div>
									</Link>
									{familyData.isOwner && (
										<button
											onClick={() => handleRemoveMember(member.id)}
											className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
										>
											<X className="w-4 h-4 sm:w-5 sm:h-5" />
										</button>
									)}
								</div>
							</div>
						))}

						{familyData.members.length === 0 && (
							<div className="text-center py-6 sm:py-8 text-gray-500">
								<Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
								<p className="text-xs sm:text-sm md:text-base">No hay miembros adicionales en el grupo</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
