'use client';

import { useState } from 'react';
import { Lock, Key, Shield, Eye, EyeOff, Check, X } from 'lucide-react';

type MedicConfig = {
	user: any;
	isAffiliated: boolean;
	clinicProfile: any;
	config: any;
};

export default function SecuritySettings({ 
	config, 
	onUpdate 
}: { 
	config: MedicConfig; 
	onUpdate: () => void;
}) {
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Cambio de contraseña
	const [passwordForm, setPasswordForm] = useState({
		currentPassword: '',
		newPassword: '',
		confirmPassword: '',
	});
	const [showPasswords, setShowPasswords] = useState({
		current: false,
		new: false,
		confirm: false,
	});

	// 2FA
	const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
	const [twoFactorCode, setTwoFactorCode] = useState('');
	const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);

	const handlePasswordChange = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		setSuccess(null);

		if (passwordForm.newPassword !== passwordForm.confirmPassword) {
			setError('Las contraseñas no coinciden');
			setLoading(false);
			return;
		}

		if (passwordForm.newPassword.length < 8) {
			setError('La contraseña debe tener al menos 8 caracteres');
			setLoading(false);
			return;
		}

		try {
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
			setLoading(false);
		}
	};

	const handleTwoFactorToggle = async () => {
		if (twoFactorEnabled) {
			// Deshabilitar 2FA
			setLoading(true);
			try {
				const res = await fetch('/api/auth/disable-2fa', {
					method: 'POST',
					credentials: 'include',
				});

				if (!res.ok) {
					const data = await res.json();
					throw new Error(data.error || 'Error al deshabilitar 2FA');
				}

				setTwoFactorEnabled(false);
				setShowTwoFactorSetup(false);
				setSuccess('Autenticación de dos factores deshabilitada');
				setTimeout(() => setSuccess(null), 3000);
			} catch (err: any) {
				setError(err.message || 'Error al deshabilitar 2FA');
			} finally {
				setLoading(false);
			}
		} else {
			// Habilitar 2FA - mostrar setup
			setShowTwoFactorSetup(true);
		}
	};

	const handleTwoFactorSetup = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			const res = await fetch('/api/auth/enable-2fa', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ code: twoFactorCode }),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Error al configurar 2FA');
			}

			setTwoFactorEnabled(true);
			setShowTwoFactorSetup(false);
			setTwoFactorCode('');
			setSuccess('Autenticación de dos factores habilitada correctamente');
			setTimeout(() => setSuccess(null), 3000);
		} catch (err: any) {
			setError(err.message || 'Error al configurar 2FA');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-6">
			{/* Mensajes de estado */}
			{error && (
				<div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
					<X className="w-5 h-5 text-red-600" />
					<span className="text-red-700">{error}</span>
				</div>
			)}
			{success && (
				<div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
					<Check className="w-5 h-5 text-green-600" />
					<span className="text-green-700">{success}</span>
				</div>
			)}

			{/* Cambio de contraseña */}
			<div className="bg-gray-50 rounded-xl p-6">
				<div className="flex items-center gap-3 mb-4">
					<div className="p-2 bg-indigo-100 rounded-lg">
						<Key className="w-5 h-5 text-indigo-600" />
					</div>
					<div>
						<h3 className="text-lg font-semibold text-gray-900">Cambiar Contraseña</h3>
						<p className="text-sm text-gray-600">Actualiza tu contraseña para mantener tu cuenta segura</p>
					</div>
				</div>
				<form onSubmit={handlePasswordChange} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Contraseña Actual
						</label>
						<div className="relative">
							<input
								type={showPasswords.current ? 'text' : 'password'}
								value={passwordForm.currentPassword}
								onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
								className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
								required
							/>
							<button
								type="button"
								onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
							>
								{showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
							</button>
						</div>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Nueva Contraseña
						</label>
						<div className="relative">
							<input
								type={showPasswords.new ? 'text' : 'password'}
								value={passwordForm.newPassword}
								onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
								className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
								required
								minLength={8}
							/>
							<button
								type="button"
								onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
							>
								{showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
							</button>
						</div>
						<p className="mt-1 text-xs text-gray-500">
							Mínimo 8 caracteres, incluye mayúsculas, minúsculas y números
						</p>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Confirmar Nueva Contraseña
						</label>
						<div className="relative">
							<input
								type={showPasswords.confirm ? 'text' : 'password'}
								value={passwordForm.confirmPassword}
								onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
								className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
								required
							/>
							<button
								type="button"
								onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
							>
								{showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
							</button>
						</div>
					</div>
					<button
						type="submit"
						disabled={loading}
						className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? 'Cambiando...' : 'Cambiar Contraseña'}
					</button>
				</form>
			</div>

			{/* Autenticación de dos factores */}
			<div className="bg-gray-50 rounded-xl p-6">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-green-100 rounded-lg">
							<Shield className="w-5 h-5 text-green-600" />
						</div>
						<div>
							<h3 className="text-lg font-semibold text-gray-900">Autenticación de Dos Factores (2FA)</h3>
							<p className="text-sm text-gray-600">
								Agrega una capa adicional de seguridad a tu cuenta
							</p>
						</div>
					</div>
					<label className="relative inline-flex items-center cursor-pointer">
						<input
							type="checkbox"
							checked={twoFactorEnabled}
							onChange={handleTwoFactorToggle}
							disabled={loading || showTwoFactorSetup}
							className="sr-only peer"
						/>
						<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-disabled:opacity-50"></div>
					</label>
				</div>

				{showTwoFactorSetup && !twoFactorEnabled && (
					<div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
						<p className="text-sm text-blue-800 mb-4">
							Para habilitar la autenticación de dos factores, necesitarás una aplicación autenticadora
							como Google Authenticator o Authy. Escanea el código QR que se mostrará o ingresa el código manualmente.
						</p>
						<form onSubmit={handleTwoFactorSetup} className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Código de Verificación
								</label>
								<input
									type="text"
									value={twoFactorCode}
									onChange={(e) => setTwoFactorCode(e.target.value)}
									placeholder="000000"
									maxLength={6}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									required
								/>
								<p className="mt-1 text-xs text-gray-500">
									Ingrese el código de 6 dígitos de su aplicación autenticadora
								</p>
							</div>
							<div className="flex gap-2">
								<button
									type="submit"
									disabled={loading}
									className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{loading ? 'Configurando...' : 'Verificar y Habilitar'}
								</button>
								<button
									type="button"
									onClick={() => {
										setShowTwoFactorSetup(false);
										setTwoFactorCode('');
									}}
									className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
								>
									Cancelar
								</button>
							</div>
						</form>
					</div>
				)}

				{twoFactorEnabled && (
					<div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
						<p className="text-sm text-green-800">
							✓ Autenticación de dos factores está activa. Tu cuenta está protegida con una capa adicional de seguridad.
						</p>
					</div>
				)}
			</div>

			{/* Información de seguridad adicional */}
			<div className="bg-gray-50 rounded-xl p-6">
				<div className="flex items-center gap-3 mb-4">
					<div className="p-2 bg-gray-100 rounded-lg">
						<Lock className="w-5 h-5 text-gray-600" />
					</div>
					<div>
						<h3 className="text-lg font-semibold text-gray-900">Recomendaciones de Seguridad</h3>
					</div>
				</div>
				<ul className="space-y-2 text-sm text-gray-700">
					<li className="flex items-start gap-2">
						<span className="text-indigo-600 mt-0.5">•</span>
						<span>Usa una contraseña única y segura que no uses en otros servicios</span>
					</li>
					<li className="flex items-start gap-2">
						<span className="text-indigo-600 mt-0.5">•</span>
						<span>Habilita la autenticación de dos factores para mayor seguridad</span>
					</li>
					<li className="flex items-start gap-2">
						<span className="text-indigo-600 mt-0.5">•</span>
						<span>No compartas tus credenciales con nadie</span>
					</li>
					<li className="flex items-start gap-2">
						<span className="text-indigo-600 mt-0.5">•</span>
						<span>Cierra sesión cuando uses dispositivos compartidos</span>
					</li>
					<li className="flex items-start gap-2">
						<span className="text-indigo-600 mt-0.5">•</span>
						<span>Revisa regularmente la actividad de tu cuenta</span>
					</li>
				</ul>
			</div>
		</div>
	);
}

