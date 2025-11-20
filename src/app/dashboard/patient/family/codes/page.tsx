'use client';

import { useState, useEffect } from 'react';
import { Shield, RefreshCw, Copy, Check, X, User, Clock, AlertCircle } from 'lucide-react';

type MedicalAccessGrant = {
	id: string;
	doctor_id: string;
	granted_at: string;
	expires_at: string | null;
	doctor: {
		id: string;
		name: string | null;
		email: string | null;
		medic_profile: {
			specialty: string | null;
			private_specialty: string | null;
			photo_url: string | null;
		} | null;
	} | null;
};

export default function FamilyCodesPage() {
	const [loading, setLoading] = useState(true);
	const [code, setCode] = useState<string>('');
	const [remainingSeconds, setRemainingSeconds] = useState(30);
	const [copied, setCopied] = useState(false);
	const [activeGrants, setActiveGrants] = useState<MedicalAccessGrant[]>([]);
	const [loadingGrants, setLoadingGrants] = useState(true);
	const [revokingGrant, setRevokingGrant] = useState<string | null>(null);

	useEffect(() => {
		loadCode();
		loadActiveGrants();
		const interval = setInterval(() => {
			loadCode();
		}, 30000); // Recargar cada 30 segundos

		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		// Actualizar código cada vez que remainingSeconds llegue a 0
		if (remainingSeconds === 0) {
			loadCode();
		}
	}, [remainingSeconds]);

	useEffect(() => {
		if (remainingSeconds > 0) {
			const timer = setTimeout(() => {
				setRemainingSeconds(prev => {
					if (prev <= 1) {
						loadCode();
						return 30;
					}
					return prev - 1;
				});
			}, 1000);
			return () => clearTimeout(timer);
		}
	}, [remainingSeconds]);

	const loadCode = async () => {
		try {
			setLoading(true);
			const res = await fetch('/api/patient/access-code', {
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al cargar código');

			const data = await res.json();
			setCode(data.code);
			setRemainingSeconds(data.remainingSeconds || 30);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const handleCopy = () => {
		navigator.clipboard.writeText(code);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const loadActiveGrants = async () => {
		try {
			setLoadingGrants(true);
			const res = await fetch('/api/patient/medical-access/grants', {
				credentials: 'include',
			});

			if (res.ok) {
				const data = await res.json();
				setActiveGrants(data.grants || []);
			}
		} catch (err) {
			console.error('Error cargando accesos activos:', err);
		} finally {
			setLoadingGrants(false);
		}
	};

	const handleRevokeAccess = async (grantId: string, doctorId: string) => {
		if (!confirm('¿Está seguro de que desea revocar el acceso de este especialista? Ya no podrá ver su historial médico completo.')) {
			return;
		}

		setRevokingGrant(grantId);
		try {
			const res = await fetch('/api/patient/medical-access/revoke', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ doctor_id: doctorId }),
			});

			if (!res.ok) throw new Error('Error al revocar acceso');

			alert('Acceso revocado correctamente');
			loadActiveGrants();
		} catch (err) {
			console.error('Error:', err);
			alert('Error al revocar el acceso');
		} finally {
			setRevokingGrant(null);
		}
	};

	const handleRegenerate = async () => {
		if (!confirm('¿Está seguro de que desea regenerar el código? El código anterior dejará de funcionar.')) {
			return;
		}

		try {
			const res = await fetch('/api/patient/access-code', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ action: 'regenerate' }),
			});

			if (!res.ok) throw new Error('Error al regenerar código');

			loadCode();
		} catch (err) {
			console.error('Error:', err);
			alert('Error al regenerar el código');
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleString('es-ES', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const isExpired = (expiresAt: string | null) => {
		if (!expiresAt) return false;
		return new Date(expiresAt).getTime() < Date.now();
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-6">
			<div className="max-w-4xl mx-auto space-y-6">
				{/* Header */}
				<div className="bg-white rounded-2xl shadow-lg p-6">
					<h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
						<Shield className="w-8 h-8 text-purple-600" />
						Códigos de Acceso Médico
					</h1>
					<p className="text-gray-600">
						Comparte este código con especialistas para que puedan acceder temporalmente a tu información médica
					</p>
				</div>

				{/* Código TOTP */}
				<div className="bg-white rounded-2xl shadow-lg p-8">
					<div className="text-center">
						<div className="mb-6">
							<div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl mb-4">
								{loading ? (
									<div className="animate-pulse text-white text-2xl font-bold">...</div>
								) : (
									<span className="text-white text-4xl font-bold tracking-widest">{code}</span>
								)}
							</div>
						</div>

						<div className="mb-6">
							<div className="flex items-center justify-center gap-2 mb-2">
								<div className={`w-3 h-3 rounded-full ${remainingSeconds > 10 ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
								<span className="text-sm text-gray-600">
									El código se actualiza en {remainingSeconds} segundos
								</span>
							</div>
							<div className="w-full bg-gray-200 rounded-full h-2">
								<div
									className="bg-purple-600 h-2 rounded-full transition-all duration-1000"
									style={{ width: `${(remainingSeconds / 30) * 100}%` }}
								></div>
							</div>
						</div>

						<div className="flex items-center justify-center gap-4">
							<button
								onClick={handleCopy}
								className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"
							>
								{copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
								{copied ? 'Copiado' : 'Copiar Código'}
							</button>
							<button
								onClick={handleRegenerate}
								className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors flex items-center gap-2"
							>
								<RefreshCw className="w-5 h-5" />
								Regenerar
							</button>
						</div>
					</div>
				</div>

				{/* Accesos Activos */}
				<div className="bg-white rounded-2xl shadow-lg p-6">
					<h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
						<Shield className="w-6 h-6 text-purple-600" />
						Accesos Médicos Activos
					</h2>

					{loadingGrants ? (
						<div className="text-center py-8 text-gray-600">Cargando accesos...</div>
					) : activeGrants.length === 0 ? (
						<div className="text-center py-8 text-gray-600">
							<AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
							<p>No hay accesos médicos activos</p>
						</div>
					) : (
						<div className="space-y-4">
							{activeGrants.map((grant) => {
								const doctor = grant.doctor;
								const expired = isExpired(grant.expires_at);
								return (
									<div
										key={grant.id}
										className={`p-4 rounded-xl border-2 ${
											expired ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
										}`}
									>
										<div className="flex items-start justify-between">
											<div className="flex items-start gap-4 flex-1">
												{doctor?.medic_profile?.photo_url ? (
													<img
														src={doctor.medic_profile.photo_url}
														alt={doctor.name || ''}
														className="w-12 h-12 rounded-full object-cover"
													/>
												) : (
													<div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
														<User className="w-6 h-6 text-purple-600" />
													</div>
												)}
												<div className="flex-1">
													<h3 className="font-semibold text-gray-900">
														Dr. {doctor?.name || 'Médico'}
													</h3>
													{doctor?.medic_profile?.specialty || doctor?.medic_profile?.private_specialty ? (
														<p className="text-sm text-gray-600">
															{doctor.medic_profile.specialty || doctor.medic_profile.private_specialty}
														</p>
													) : null}
													<div className="mt-2 space-y-1 text-xs text-gray-600">
														<div className="flex items-center gap-2">
															<Clock className="w-3 h-3" />
															<span>Otorgado: {formatDate(grant.granted_at)}</span>
														</div>
														{grant.expires_at && (
															<div className="flex items-center gap-2">
																<Shield className="w-3 h-3" />
																<span className={expired ? 'text-red-600 font-semibold' : ''}>
																	{expired ? 'Expirado: ' : 'Expira: '}
																	{formatDate(grant.expires_at)}
																</span>
															</div>
														)}
													</div>
												</div>
											</div>
											<button
												onClick={() => handleRevokeAccess(grant.id, grant.doctor_id)}
												disabled={revokingGrant === grant.id}
												className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
											>
												{revokingGrant === grant.id ? (
													<>
														<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
														Revocando...
													</>
												) : (
													<>
														<X className="w-4 h-4" />
														Revocar
													</>
												)}
											</button>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* Información */}
				<div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
					<h3 className="font-semibold text-blue-900 mb-2">¿Cómo funciona?</h3>
					<ul className="space-y-2 text-sm text-blue-800">
						<li>• El código se regenera automáticamente cada 30 segundos</li>
						<li>• Comparte este código con especialistas médicos cuando necesites que accedan a tu información</li>
						<li>• El código es válido por 30 segundos</li>
						<li>• Puedes regenerar el código en cualquier momento</li>
						<li>• El acceso médico es temporal y seguro (24 horas)</li>
						<li>• Puedes revocar el acceso de cualquier especialista en cualquier momento</li>
					</ul>
				</div>
			</div>
		</div>
	);
}
