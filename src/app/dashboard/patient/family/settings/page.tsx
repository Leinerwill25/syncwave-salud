'use client';

import { useState, useEffect } from 'react';
import { Settings, Users, Plus, X, Save, UserPlus, Calendar, Phone, MapPin, AlertCircle } from 'lucide-react';
import Link from 'next/link';

type FamilyGroup = {
	id: string;
	name: string | null;
	maxMembers: number;
};

type FamilyMember = {
	id: string;
	patientId: string;
	roleInGroup: string | null;
	patient: {
		firstName: string;
		lastName: string;
	} | null;
};

export default function FamilySettingsPage() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [group, setGroup] = useState<FamilyGroup | null>(null);
	const [members, setMembers] = useState<FamilyMember[]>([]);
	const [groupName, setGroupName] = useState('');
	const [newMemberId, setNewMemberId] = useState('');
	const [success, setSuccess] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	
	// Formulario de registro de nuevo miembro
	const [showRegisterForm, setShowRegisterForm] = useState(false);
	const [registering, setRegistering] = useState(false);
	const [formData, setFormData] = useState({
		firstName: '',
		lastName: '',
		identifier: '',
		dob: '',
		gender: '' as 'M' | 'F' | 'O' | '',
		phone: '',
		address: '',
		bloodType: '',
		allergies: '',
		hasDisability: false,
		disability: '',
		hasElderlyConditions: false,
		elderlyConditions: '',
		roleInGroup: 'MIEMBRO',
		relationship: '' as 'PADRE' | 'MADRE' | 'REPRESENTANTE_LEGAL' | '',
	});

	useEffect(() => {
		loadFamilyData();
	}, []);

	const loadFamilyData = async () => {
		try {
			setLoading(true);
			const res = await fetch('/api/patient/family', {
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al cargar grupo');

			const data = await res.json();
			if (data.hasGroup && data.isOwner) {
				setGroup(data.group);
				setGroupName(data.group?.name || '');
				setMembers(data.members || []);
			}
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const handleSaveGroupName = async () => {
		try {
			setSaving(true);
			setError(null);
			setSuccess(null);

			const res = await fetch('/api/patient/family/settings', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ name: groupName }),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Error al guardar');
			}

			setSuccess('Nombre del grupo actualizado');
			setTimeout(() => setSuccess(null), 3000);
		} catch (err: any) {
			setError(err.message || 'Error al guardar');
		} finally {
			setSaving(false);
		}
	};

	const handleAddMember = async () => {
		if (!newMemberId.trim()) {
			setError('Por favor ingrese el ID del paciente');
			return;
		}

		try {
			setError(null);
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
			setSuccess('Miembro agregado correctamente');
			setTimeout(() => setSuccess(null), 3000);
			loadFamilyData();
		} catch (err: any) {
			setError(err.message || 'Error al agregar miembro');
		}
	};

	const calculateAge = (dob: string): number | null => {
		if (!dob) return null;
		try {
			const birthDate = new Date(dob);
			const today = new Date();
			let age = today.getFullYear() - birthDate.getFullYear();
			const monthDiff = today.getMonth() - birthDate.getMonth();
			if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
				age--;
			}
			return age >= 0 ? age : null;
		} catch {
			return null;
		}
	};

	const handleRegisterMember = async (e: React.FormEvent) => {
		e.preventDefault();
		
		if (!formData.firstName.trim() || !formData.lastName.trim()) {
			setError('Nombre y apellido son requeridos');
			return;
		}

		// Validar parentesco para menores de edad
		const age = calculateAge(formData.dob);
		if (age !== null && age < 18) {
			if (!formData.relationship) {
				setError('Debe indicar el parentesco con el menor de edad (padre, madre o representante legal)');
				return;
			}
		}

		// Validar campos condicionales
		if (formData.hasDisability && !formData.disability.trim()) {
			setError('Debe describir la discapacidad si el paciente presenta alguna');
			return;
		}

		if (formData.hasElderlyConditions && !formData.elderlyConditions.trim()) {
			setError('Debe describir las condiciones de tercera edad si el paciente las presenta');
			return;
		}

		try {
			setRegistering(true);
			setError(null);
			setSuccess(null);

			const res = await fetch('/api/patient/family/register-member', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(formData),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Error al registrar miembro');
			}

			const data = await res.json();
			setSuccess(data.message || 'Miembro registrado y agregado al grupo correctamente');
			setTimeout(() => setSuccess(null), 5000);
			
			// Resetear formulario
			setFormData({
				firstName: '',
				lastName: '',
				identifier: '',
				dob: '',
				gender: '',
				phone: '',
				address: '',
				bloodType: '',
				allergies: '',
				hasDisability: false,
				disability: '',
				hasElderlyConditions: false,
				elderlyConditions: '',
				roleInGroup: 'MIEMBRO',
				relationship: '',
			});
			setShowRegisterForm(false);
			loadFamilyData();
		} catch (err: any) {
			setError(err.message || 'Error al registrar miembro');
		} finally {
			setRegistering(false);
		}
	};

	const handleRemoveMember = async (memberId: string) => {
		if (!confirm('¿Está seguro de que desea eliminar este miembro?')) return;

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

			setSuccess('Miembro eliminado correctamente');
			setTimeout(() => setSuccess(null), 3000);
			loadFamilyData();
		} catch (err: any) {
			setError(err.message || 'Error al eliminar miembro');
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

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-3 sm:p-4 md:p-6">
			<div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
				{/* Header */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6">
					<h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 flex items-center gap-2 sm:gap-3">
						<Settings className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-purple-600 flex-shrink-0" />
						<span className="truncate">Configuración del Grupo Familiar</span>
					</h1>
					<p className="text-xs sm:text-sm md:text-base text-gray-600">Gestiona tu grupo familiar</p>
				</div>

				{/* Mensajes */}
				{error && (
					<div className="bg-red-50 border border-red-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
						<span className="text-red-700 text-xs sm:text-sm md:text-base break-words">{error}</span>
					</div>
				)}
				{success && (
					<div className="bg-green-50 border border-green-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
						<span className="text-green-700 text-xs sm:text-sm md:text-base break-words">{success}</span>
					</div>
				)}

				{/* Nombre del grupo */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6">
					<h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Nombre del Grupo</h2>
					<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 md:gap-4">
						<input
							type="text"
							value={groupName}
							onChange={(e) => setGroupName(e.target.value)}
							className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
						/>
						<button
							onClick={handleSaveGroupName}
							disabled={saving}
							className="w-full sm:w-auto px-4 sm:px-5 md:px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base"
						>
							<Save className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
							<span>{saving ? 'Guardando...' : 'Guardar'}</span>
						</button>
					</div>
				</div>

				{/* Agregar miembro existente */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6">
					<h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
						<Plus className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
						<span>Agregar Miembro Existente</span>
					</h2>
					<p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
						Si el paciente ya está registrado en el sistema, ingresa su ID para agregarlo al grupo.
					</p>
					<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 md:gap-4">
						<input
							type="text"
							placeholder="ID del paciente a agregar"
							value={newMemberId}
							onChange={(e) => setNewMemberId(e.target.value)}
							className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
						/>
						<button
							onClick={handleAddMember}
							disabled={members.length >= (group?.maxMembers || 5) - 1}
							className="w-full sm:w-auto px-4 sm:px-5 md:px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm md:text-base"
						>
							Agregar
						</button>
					</div>
					{members.length >= (group?.maxMembers || 5) - 1 && (
						<p className="text-xs sm:text-sm text-gray-500 mt-1.5 sm:mt-2">
							Se ha alcanzado el límite de miembros ({group?.maxMembers || 5})
						</p>
					)}
				</div>

				{/* Registrar nuevo miembro */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6">
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-3 sm:gap-4">
						<h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 flex items-center gap-1.5 sm:gap-2">
							<UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" />
							<span>Registrar Nuevo Miembro</span>
						</h2>
						<button
							onClick={() => {
								setShowRegisterForm(!showRegisterForm);
								setError(null);
							}}
							className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base"
						>
							{showRegisterForm ? <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" /> : <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />}
							<span>{showRegisterForm ? 'Cerrar' : 'Nuevo Registro'}</span>
						</button>
					</div>
					<p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
						Registra un nuevo paciente y agrégalo automáticamente a tu grupo familiar.
					</p>

					{showRegisterForm && (
						<form onSubmit={handleRegisterMember} className="space-y-4 sm:space-y-5 md:space-y-6 mt-4 sm:mt-5 md:mt-6">
							{/* Advertencia sobre quién debe registrarse */}
							<div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
								<div className="flex items-start gap-2 sm:gap-3">
									<AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
									<div className="text-xs sm:text-sm text-blue-800">
										<p className="font-semibold mb-1">Recomendación:</p>
										<p className="break-words">
											Se recomienda registrar en el plan familiar a menores de edad, personas de la tercera edad, o personas con discapacidad que no puedan realizar la gestión médica por su cuenta.
										</p>
									</div>
								</div>
							</div>

							{/* Información Personal */}
							<div className="border-t border-gray-200 pt-4 sm:pt-5 md:pt-6">
								<h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
									<UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" />
									<span>Información Personal</span>
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
									<div>
										<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
											Nombre <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
											required
											value={formData.firstName}
											onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
											className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
											placeholder="Nombre"
										/>
									</div>
									<div>
										<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
											Apellido <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
											required
											value={formData.lastName}
											onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
											className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
											placeholder="Apellido"
										/>
									</div>
									<div>
										<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
											Identificador / Cédula <span className="text-gray-400 text-xs">(Opcional)</span>
										</label>
										<input
											type="text"
											value={formData.identifier}
											onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
											className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
											placeholder="V-12345678 (Los niños pueden no tener cédula)"
										/>
									</div>
									<div>
										<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
											<Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
											<span>Fecha de Nacimiento</span>
										</label>
										<input
											type="date"
											value={formData.dob}
											onChange={(e) => {
												const newDob = e.target.value;
												const age = calculateAge(newDob);
												// Si no es menor de edad, limpiar relationship
												if (age !== null && age >= 18) {
													setFormData({ ...formData, dob: newDob, relationship: '' });
												} else {
													setFormData({ ...formData, dob: newDob });
												}
											}}
											className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
										/>
									</div>
									<div>
										<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
											Género
										</label>
										<select
											value={formData.gender}
											onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'M' | 'F' | 'O' | '' })}
											className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
										>
											<option value="">Seleccionar</option>
											<option value="M">Masculino</option>
											<option value="F">Femenino</option>
											<option value="O">Otro</option>
										</select>
									</div>
									<div>
										<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
											<Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
											<span>Teléfono <span className="text-gray-400 text-xs">(Opcional)</span></span>
										</label>
										<input
											type="tel"
											value={formData.phone}
											onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
											className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
											placeholder="+58 412 1234567 (Los niños pueden no tener teléfono)"
										/>
									</div>
								</div>
								<div className="mt-3 sm:mt-4">
									<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
										<MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
										<span>Dirección</span>
									</label>
									<textarea
										value={formData.address}
										onChange={(e) => setFormData({ ...formData, address: e.target.value })}
										rows={3}
										className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base resize-none"
										placeholder="Dirección completa"
									/>
								</div>
							</div>

							{/* Información Médica */}
							<div className="border-t border-gray-200 pt-4 sm:pt-5 md:pt-6">
								<h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
									<AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" />
									<span>Información Médica</span>
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
									<div>
										<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
											Tipo de Sangre
										</label>
										<select
											value={formData.bloodType}
											onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
											className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
										>
											<option value="">Seleccionar</option>
											<option value="A+">A+</option>
											<option value="A-">A-</option>
											<option value="B+">B+</option>
											<option value="B-">B-</option>
											<option value="AB+">AB+</option>
											<option value="AB-">AB-</option>
											<option value="O+">O+</option>
											<option value="O-">O-</option>
										</select>
									</div>
									<div className="md:col-span-2">
										<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
											Alergias
										</label>
										<textarea
											value={formData.allergies}
											onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
											rows={3}
											className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base resize-none"
											placeholder="Liste las alergias conocidas (medicamentos, alimentos, etc.)"
										/>
									</div>
								</div>
							</div>

							{/* Discapacidad */}
							<div className="border-t border-gray-200 pt-4 sm:pt-5 md:pt-6">
								<h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
									<AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" />
									<span>Discapacidad</span>
								</h3>
								<div className="mb-3 sm:mb-4">
									<label className="flex items-center gap-2 sm:gap-3 cursor-pointer">
										<input
											type="checkbox"
											checked={formData.hasDisability}
											onChange={(e) => {
												setFormData({
													...formData,
													hasDisability: e.target.checked,
													disability: e.target.checked ? formData.disability : '',
												});
											}}
											className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
										/>
										<span className="text-xs sm:text-sm font-medium text-gray-700">
											El paciente presenta alguna discapacidad
										</span>
									</label>
								</div>
								{formData.hasDisability && (
									<div>
										<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
											Descripción de la discapacidad <span className="text-red-500">*</span>
										</label>
										<textarea
											required
											value={formData.disability}
											onChange={(e) => setFormData({ ...formData, disability: e.target.value })}
											rows={3}
											className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base resize-none"
											placeholder="Describa la discapacidad que presenta el paciente"
										/>
									</div>
								)}
							</div>

							{/* Condiciones de Tercera Edad */}
							{(() => {
								const age = calculateAge(formData.dob);
								const isElderly = age !== null && age >= 65;
								return isElderly ? (
									<div className="border-t border-gray-200 pt-4 sm:pt-5 md:pt-6">
										<h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
											<AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" />
											<span>Condiciones de Tercera Edad</span>
										</h3>
										<div className="mb-3 sm:mb-4">
											<label className="flex items-center gap-2 sm:gap-3 cursor-pointer">
												<input
													type="checkbox"
													checked={formData.hasElderlyConditions}
													onChange={(e) => {
														setFormData({
															...formData,
															hasElderlyConditions: e.target.checked,
															elderlyConditions: e.target.checked ? formData.elderlyConditions : '',
														});
													}}
													className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
												/>
												<span className="text-xs sm:text-sm font-medium text-gray-700">
													El paciente presenta condiciones especiales de tercera edad
												</span>
											</label>
										</div>
										{formData.hasElderlyConditions && (
											<div>
												<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
													Descripción de las condiciones <span className="text-red-500">*</span>
												</label>
												<textarea
													required
													value={formData.elderlyConditions}
													onChange={(e) => setFormData({ ...formData, elderlyConditions: e.target.value })}
													rows={3}
													className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base resize-none"
													placeholder="Describa las condiciones de tercera edad que presenta el paciente (ej: movilidad reducida, problemas de memoria, etc.)"
												/>
											</div>
										)}
									</div>
								) : null;
							})()}

							{/* Parentesco para menores de edad */}
							{(() => {
								const age = calculateAge(formData.dob);
								const isMinor = age !== null && age < 18;
								return isMinor ? (
									<div className="border-t border-gray-200 pt-4 sm:pt-5 md:pt-6">
										<h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
											<AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
											<span>Parentesco con el Menor de Edad</span>
										</h3>
										<div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
											<div className="flex items-start gap-2 sm:gap-3">
												<AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 mt-0.5 flex-shrink-0" />
												<div className="text-xs sm:text-sm text-red-800">
													<p className="font-semibold mb-1">ADVERTENCIA LEGAL:</p>
													<p className="break-words mb-2">
														Solo puede registrar a un menor de edad si usted es el padre, madre o representante legal del mismo. 
														Si no cumple con esta condición, debe abstenerse de registrar al menor, ya que esta práctica será considerada ilegal dentro de la plataforma y podrá acarrear cargos legales.
													</p>
												</div>
											</div>
										</div>
										<div>
											<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
												Parentesco <span className="text-red-500">*</span>
											</label>
											<select
												required
												value={formData.relationship}
												onChange={(e) => setFormData({ ...formData, relationship: e.target.value as 'PADRE' | 'MADRE' | 'REPRESENTANTE_LEGAL' | '' })}
												className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
											>
												<option value="">Seleccionar parentesco</option>
												<option value="PADRE">Padre</option>
												<option value="MADRE">Madre</option>
												<option value="REPRESENTANTE_LEGAL">Representante Legal</option>
											</select>
										</div>
									</div>
								) : null;
							})()}

							{/* Rol en el Grupo */}
							<div className="border-t border-gray-200 pt-4 sm:pt-5 md:pt-6">
								<h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
									<Users className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" />
									<span>Rol en el Grupo</span>
								</h3>
								<div>
									<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
										Rol
									</label>
									<select
										value={formData.roleInGroup}
										onChange={(e) => setFormData({ ...formData, roleInGroup: e.target.value })}
										className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
									>
										<option value="MIEMBRO">Miembro</option>
										<option value="HIJO">Hijo/Hija</option>
										<option value="PADRE">Padre/Madre</option>
										<option value="CONYUGE">Cónyuge</option>
										<option value="OTRO">Otro</option>
									</select>
								</div>
							</div>

							{/* Información */}
							{members.length >= (group?.maxMembers || 5) - 1 && (
								<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
									<AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
									<p className="text-xs sm:text-sm text-yellow-800 break-words">
										Se ha alcanzado el límite de miembros ({group?.maxMembers || 5}). No puedes agregar más miembros al grupo.
									</p>
								</div>
							)}

							{/* Botones */}
							<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 md:gap-4 pt-3 sm:pt-4 border-t border-gray-200">
								<button
									type="button"
									onClick={() => {
										setShowRegisterForm(false);
										setFormData({
											firstName: '',
											lastName: '',
											identifier: '',
											dob: '',
											gender: '',
											phone: '',
											address: '',
											bloodType: '',
											allergies: '',
											hasDisability: false,
											disability: '',
											hasElderlyConditions: false,
											elderlyConditions: '',
											roleInGroup: 'MIEMBRO',
											relationship: '',
										});
									}}
									className="w-full sm:w-auto px-4 sm:px-5 md:px-6 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-xs sm:text-sm md:text-base"
								>
									Cancelar
								</button>
								<button
									type="submit"
									disabled={registering || members.length >= (group?.maxMembers || 5) - 1}
									className="w-full sm:w-auto px-4 sm:px-5 md:px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base"
								>
									{registering ? (
										<>
											<div className="animate-spin rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 border-b-2 border-white"></div>
											<span>Registrando...</span>
										</>
									) : (
										<>
											<UserPlus className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
											<span>Registrar y Agregar al Grupo</span>
										</>
									)}
								</button>
							</div>
						</form>
					)}
				</div>

				{/* Lista de miembros */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6">
					<h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
						<Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
						<span>Miembros del Grupo ({members.length + 1})</span>
					</h2>
					<div className="space-y-2 sm:space-y-3">
						{members.map((member) => (
							<div key={member.id} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg gap-2">
								<div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
									<div className="p-1.5 sm:p-2 bg-indigo-100 rounded-lg flex-shrink-0">
										<Users className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
									</div>
									<div className="min-w-0 flex-1">
										<p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
											{member.patient?.firstName} {member.patient?.lastName}
										</p>
										<p className="text-xs sm:text-sm text-gray-600 truncate">{member.roleInGroup || 'Miembro'}</p>
									</div>
								</div>
								<button
									onClick={() => handleRemoveMember(member.id)}
									className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
								>
									<X className="w-4 h-4 sm:w-5 sm:h-5" />
								</button>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

