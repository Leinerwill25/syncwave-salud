'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, X, Shield, AlertCircle, User, Calendar } from 'lucide-react';
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

	if (!familyData || !familyData.hasFamilyPlan) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-3 sm:p-4 md:p-6">
				<div className="max-w-7xl mx-auto">
					<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-8 sm:p-10 md:p-12 text-center">
						<AlertCircle className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-yellow-500 mx-auto mb-3 sm:mb-4" />
						<h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">Plan Familiar No Activo</h1>
						<p className="text-xs sm:text-sm md:text-base text-gray-600 mb-4 sm:mb-5 md:mb-6">
							Debes actualizar tu plan para usar el Grupo Familiar
						</p>
						<Link
							href="/dashboard/patient/configuracion"
							className="inline-block px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors text-xs sm:text-sm md:text-base"
						>
							Actualizar Plan
						</Link>
					</div>
				</div>
			</div>
		);
	}

	if (!familyData.hasGroup) {
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
						<div className="p-3 sm:p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
							<div className="flex items-center justify-between gap-2">
								<div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
									<div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg flex-shrink-0">
										<User className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
									</div>
									<div className="min-w-0 flex-1">
										<p className="font-semibold text-gray-900 text-sm sm:text-base truncate">Dueño del Grupo</p>
										<p className="text-xs sm:text-sm text-gray-600">Tú</p>
									</div>
								</div>
								<span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-purple-600 text-white text-[9px] sm:text-[10px] md:text-xs font-semibold rounded-full flex-shrink-0">
									Dueño
								</span>
							</div>
						</div>

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
