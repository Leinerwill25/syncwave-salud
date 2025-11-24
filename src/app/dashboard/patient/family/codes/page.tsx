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
		<div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-3 sm:p-4 md:p-6">
			<div className="max-w-4xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
				{/* Header */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6">
					<h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 flex items-center gap-2 sm:gap-3">
						<Shield className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-purple-600 flex-shrink-0" />
						<span className="truncate">Códigos de Acceso Médico</span>
					</h1>
					<p className="text-xs sm:text-sm md:text-base text-gray-600">
						Comparte este código con especialistas para que puedan acceder temporalmente a tu información médica
					</p>
				</div>

				{/* Código TOTP */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 lg:p-8">
					<div className="text-center">
						<div className="mb-4 sm:mb-5 md:mb-6">
							<div className="inline-flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl sm:rounded-2xl mb-3 sm:mb-4">
								{loading ? (
									<div className="animate-pulse text-white text-lg sm:text-xl md:text-2xl font-bold">...</div>
								) : (
									<span className="text-white text-2xl sm:text-3xl md:text-4xl font-bold tracking-widest">{code}</span>
								)}
							</div>
						</div>

						<div className="mb-4 sm:mb-5 md:mb-6">
							<div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
								<div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${remainingSeconds > 10 ? 'bg-green-500' : 'bg-red-500'} animate-pulse flex-shrink-0`}></div>
								<span className="text-xs sm:text-sm text-gray-600">
									El código se actualiza en {remainingSeconds} segundos
								</span>
							</div>
							<div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
								<div
									className="bg-purple-600 h-1.5 sm:h-2 rounded-full transition-all duration-1000"
									style={{ width: `${(remainingSeconds / 30) * 100}%` }}
								></div>
							</div>
						</div>

						<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-3 md:gap-4">
							<button
								onClick={handleCopy}
								className="w-full sm:w-auto px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base"
							>
								{copied ? <Check className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" /> : <Copy className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />}
								<span>{copied ? 'Copiado' : 'Copiar Código'}</span>
							</button>
							<button
								onClick={handleRegenerate}
								className="w-full sm:w-auto px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base"
							>
								<RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
								<span>Regenerar</span>
							</button>
						</div>
					</div>
				</div>

				{/* Accesos Activos */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6">
					<h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
						<Shield className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 text-purple-600 flex-shrink-0" />
						<span>Accesos Médicos Activos</span>
					</h2>

					{loadingGrants ? (
						<div className="text-center py-6 sm:py-8 text-gray-600 text-xs sm:text-sm md:text-base">Cargando accesos...</div>
					) : activeGrants.length === 0 ? (
						<div className="text-center py-6 sm:py-8 text-gray-600">
							<AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2" />
							<p className="text-xs sm:text-sm md:text-base">No hay accesos médicos activos</p>
						</div>
					) : (
						<div className="space-y-3 sm:space-y-4">
							{activeGrants.map((grant) => {
								const doctor = grant.doctor;
								const expired = isExpired(grant.expires_at);
								return (
									<div
										key={grant.id}
										className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 ${
											expired ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
										}`}
									>
										<div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3 sm:gap-4">
											<div className="flex items-start gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
												{doctor?.medic_profile?.photo_url ? (
													<img
														src={doctor.medic_profile.photo_url}
														alt={doctor.name || ''}
														className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0"
													/>
												) : (
													<div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
														<User className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
													</div>
												)}
												<div className="flex-1 min-w-0">
													<h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
														Dr. {doctor?.name || 'Médico'}
													</h3>
													{doctor?.medic_profile?.specialty || doctor?.medic_profile?.private_specialty ? (
														<p className="text-xs sm:text-sm text-gray-600 truncate">
															{doctor.medic_profile.specialty || doctor.medic_profile.private_specialty}
														</p>
													) : null}
													<div className="mt-1.5 sm:mt-2 space-y-1 text-[10px] sm:text-xs text-gray-600">
														<div className="flex items-center gap-1.5 sm:gap-2">
															<Clock className="w-3 h-3 flex-shrink-0" />
															<span className="break-words">Otorgado: {formatDate(grant.granted_at)}</span>
														</div>
														{grant.expires_at && (
															<div className="flex items-center gap-1.5 sm:gap-2">
																<Shield className="w-3 h-3 flex-shrink-0" />
																<span className={`break-words ${expired ? 'text-red-600 font-semibold' : ''}`}>
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
												className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
											>
												{revokingGrant === grant.id ? (
													<>
														<div className="animate-spin rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 border-b-2 border-white"></div>
														<span>Revocando...</span>
													</>
												) : (
													<>
														<X className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
														<span>Revocar</span>
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
				<div className="bg-blue-50 border border-blue-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6">
					<h3 className="font-semibold text-blue-900 mb-1.5 sm:mb-2 text-sm sm:text-base md:text-lg">¿Cómo funciona?</h3>
					<ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-blue-800">
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
