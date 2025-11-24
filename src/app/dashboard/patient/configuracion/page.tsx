'use client';

import { useState, useEffect } from 'react';
import { Settings, User, Mail, Phone, MapPin, Calendar, Lock, Bell, AlertCircle, Save } from 'lucide-react';

type PatientProfile = {
	id: string;
	firstName: string;
	lastName: string;
	identifier: string | null;
	dob: string | null;
	gender: string | null;
	phone: string | null;
	address: string | null;
};

export default function ConfiguracionPage() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [profile, setProfile] = useState<PatientProfile | null>(null);
	const [formData, setFormData] = useState({
		firstName: '',
		lastName: '',
		identifier: '',
		dob: '',
		gender: '',
		phone: '',
		address: '',
		allergies: '',
		conditions: '',
		notifications: {
			email: true,
			sms: false,
			push: false,
		},
	});
	const [passwordForm, setPasswordForm] = useState({
		currentPassword: '',
		newPassword: '',
		confirmPassword: '',
	});
	const [success, setSuccess] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		loadProfile();
	}, []);

	const loadProfile = async () => {
		try {
			setLoading(true);
			const res = await fetch('/api/patient/profile', {
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al cargar perfil');

			const data = await res.json();
			setProfile(data);
			setFormData({
				firstName: data.firstName || '',
				lastName: data.lastName || '',
				identifier: data.identifier || '',
				dob: data.dob ? data.dob.split('T')[0] : '',
				gender: data.gender || '',
				phone: data.phone || '',
				address: data.address || '',
				allergies: '',
				conditions: '',
				notifications: {
					email: true,
					sms: false,
					push: false,
				},
			});
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const handleSave = async () => {
		try {
			setSaving(true);
			setError(null);
			setSuccess(null);

			const res = await fetch('/api/patient/profile', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(formData),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Error al guardar');
			}

			setSuccess('Perfil actualizado correctamente');
			setTimeout(() => setSuccess(null), 3000);
		} catch (err: any) {
			setError(err.message || 'Error al guardar el perfil');
		} finally {
			setSaving(false);
		}
	};

	const handlePasswordChange = async () => {
		if (passwordForm.newPassword !== passwordForm.confirmPassword) {
			setError('Las contraseñas no coinciden');
			return;
		}

		if (passwordForm.newPassword.length < 8) {
			setError('La contraseña debe tener al menos 8 caracteres');
			return;
		}

		try {
			setSaving(true);
			setError(null);
			setSuccess(null);

			const res = await fetch('/api/auth/change-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					currentPassword: passwordForm.currentPassword,
					newPassword: passwordForm.newPassword,
				}),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Error al cambiar contraseña');
			}

			setSuccess('Contraseña cambiada correctamente');
			setPasswordForm({
				currentPassword: '',
				newPassword: '',
				confirmPassword: '',
			});
			setTimeout(() => setSuccess(null), 3000);
		} catch (err: any) {
			setError(err.message || 'Error al cambiar la contraseña');
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-3 sm:p-4 md:p-6">
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
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-3 sm:p-4 md:p-6">
			<div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
				{/* Header */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6">
					<h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 flex items-center gap-2 sm:gap-3">
						<Settings className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-indigo-600 flex-shrink-0" />
						<span>Configuración</span>
					</h1>
					<p className="text-xs sm:text-sm md:text-base text-gray-600">Gestiona tu perfil y preferencias</p>
				</div>

				{/* Mensajes */}
				{error && (
					<div className="bg-red-50 border border-red-200 rounded-lg sm:rounded-xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
						<AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
						<span className="text-red-700 text-xs sm:text-sm md:text-base break-words">{error}</span>
					</div>
				)}
				{success && (
					<div className="bg-green-50 border border-green-200 rounded-lg sm:rounded-xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
						<Save className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
						<span className="text-green-700 text-xs sm:text-sm md:text-base break-words">{success}</span>
					</div>
				)}

				{/* Datos Personales */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6">
					<h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
						<User className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" />
						<span>Datos Personales</span>
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
						<div>
							<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Nombre</label>
							<input
								type="text"
								value={formData.firstName}
								onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
								className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
							/>
						</div>
						<div>
							<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Apellido</label>
							<input
								type="text"
								value={formData.lastName}
								onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
								className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
							/>
						</div>
						<div>
							<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Identificación</label>
							<input
								type="text"
								value={formData.identifier}
								onChange={(e) => setFormData(prev => ({ ...prev, identifier: e.target.value }))}
								className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
							/>
						</div>
						<div>
							<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Fecha de Nacimiento</label>
							<input
								type="date"
								value={formData.dob}
								onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
								className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
							/>
						</div>
						<div>
							<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Género</label>
							<select
								value={formData.gender}
								onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
								className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
							>
								<option value="">Seleccionar</option>
								<option value="M">Masculino</option>
								<option value="F">Femenino</option>
								<option value="O">Otro</option>
							</select>
						</div>
						<div>
							<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Teléfono</label>
							<input
								type="tel"
								value={formData.phone}
								onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
								className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
							/>
						</div>
						<div className="md:col-span-2">
							<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Dirección</label>
							<input
								type="text"
								value={formData.address}
								onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
								className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
							/>
						</div>
					</div>
				</div>

				{/* Alergias y Condiciones */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6">
					<h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
						<AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" />
						<span>Alergias y Condiciones</span>
					</h2>
					<div className="space-y-3 sm:space-y-4">
						<div>
							<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Alergias</label>
							<textarea
								value={formData.allergies}
								onChange={(e) => setFormData(prev => ({ ...prev, allergies: e.target.value }))}
								placeholder="Lista tus alergias separadas por comas..."
								rows={3}
								className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base resize-none"
							/>
						</div>
						<div>
							<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Condiciones Médicas</label>
							<textarea
								value={formData.conditions}
								onChange={(e) => setFormData(prev => ({ ...prev, conditions: e.target.value }))}
								placeholder="Lista tus condiciones médicas..."
								rows={3}
								className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base resize-none"
							/>
						</div>
					</div>
				</div>

				{/* Notificaciones */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6">
					<h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
						<Bell className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" />
						<span>Notificaciones</span>
					</h2>
					<div className="space-y-2 sm:space-y-3">
						<label className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 rounded-lg cursor-pointer">
							<span className="text-gray-700 text-xs sm:text-sm md:text-base">Notificaciones por Email</span>
							<input
								type="checkbox"
								checked={formData.notifications.email}
								onChange={(e) =>
									setFormData(prev => ({
										...prev,
										notifications: { ...prev.notifications, email: e.target.checked },
									}))
								}
								className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 flex-shrink-0"
							/>
						</label>
						<label className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 rounded-lg cursor-pointer">
							<span className="text-gray-700 text-xs sm:text-sm md:text-base">Notificaciones por SMS</span>
							<input
								type="checkbox"
								checked={formData.notifications.sms}
								onChange={(e) =>
									setFormData(prev => ({
										...prev,
										notifications: { ...prev.notifications, sms: e.target.checked },
									}))
								}
								className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 flex-shrink-0"
							/>
						</label>
						<label className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 rounded-lg cursor-pointer">
							<span className="text-gray-700 text-xs sm:text-sm md:text-base">Notificaciones Push</span>
							<input
								type="checkbox"
								checked={formData.notifications.push}
								onChange={(e) =>
									setFormData(prev => ({
										...prev,
										notifications: { ...prev.notifications, push: e.target.checked },
									}))
								}
								className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 flex-shrink-0"
							/>
						</label>
					</div>
				</div>

				{/* Cambio de Contraseña */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6">
					<h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
						<Lock className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" />
						<span>Cambiar Contraseña</span>
					</h2>
					<div className="space-y-3 sm:space-y-4">
						<div>
							<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Contraseña Actual</label>
							<input
								type="password"
								value={passwordForm.currentPassword}
								onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
								className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
							/>
						</div>
						<div>
							<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Nueva Contraseña</label>
							<input
								type="password"
								value={passwordForm.newPassword}
								onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
								className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
							/>
						</div>
						<div>
							<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Confirmar Nueva Contraseña</label>
							<input
								type="password"
								value={passwordForm.confirmPassword}
								onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
								className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
							/>
						</div>
						<button
							onClick={handlePasswordChange}
							disabled={saving}
							className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
						>
							{saving ? 'Cambiando...' : 'Cambiar Contraseña'}
						</button>
					</div>
				</div>

				{/* Botón Guardar */}
				<div className="flex justify-end">
					<button
						onClick={handleSave}
						disabled={saving}
						className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
					>
						<Save className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
						<span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
					</button>
				</div>
			</div>
		</div>
	);
}
