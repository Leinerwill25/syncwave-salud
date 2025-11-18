'use client';

import { useState, useRef } from 'react';
import { Upload, Camera, FileText, Award, Building2, Stethoscope, X, Check, User } from 'lucide-react';
import type { MedicConfig, MedicCredentials, MedicService, CreditHistory } from '@/types/medic-config';

export default function ProfessionalProfile({ 
	config, 
	onUpdate 
}: { 
	config: MedicConfig; 
	onUpdate: () => void;
}) {
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Formulario para médico afiliado
	const [affiliatedForm, setAffiliatedForm] = useState({
		name: config.user.name || '',
		specialty: config.config.specialty || '',
		signature: config.config.signature || '',
		photo: config.config.photo || '',
		services: config.config.services || [],
		credentials: config.config.credentials || {
			license: '',
			licenseNumber: '',
			issuedBy: '',
			expirationDate: '',
			credentialFiles: [],
		},
		creditHistory: config.config.creditHistory || {
			university: '',
			degree: '',
			graduationYear: '',
			certifications: [],
		},
	});

	// Formulario para consultorio privado
	const [privateForm, setPrivateForm] = useState({
		name: config.user.name || '',
		photo: config.config.photo || '',
		signature: config.config.signature || '',
		privateSpecialty: config.config.privateSpecialty || '',
		services: config.config.services || [],
		credentials: config.config.credentials || {
			license: '',
			licenseNumber: '',
			issuedBy: '',
			expirationDate: '',
			credentialFiles: [] as string[],
		},
	});

	const photoInputRef = useRef<HTMLInputElement>(null);
	const signatureInputRef = useRef<HTMLInputElement>(null);
	const credentialInputRef = useRef<HTMLInputElement>(null);

	const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// TODO: Implementar upload a Supabase Storage
		// Por ahora, solo mostramos preview
		const reader = new FileReader();
		reader.onloadend = () => {
			if (config.isAffiliated) {
				setAffiliatedForm(prev => ({ ...prev, photo: reader.result as string }));
			} else {
				setPrivateForm(prev => ({ ...prev, photo: reader.result as string }));
			}
		};
		reader.readAsDataURL(file);
	};

	const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// TODO: Implementar upload a Supabase Storage
		const reader = new FileReader();
		reader.onloadend = () => {
			if (config.isAffiliated) {
				setAffiliatedForm(prev => ({ ...prev, signature: reader.result as string }));
			} else {
				setPrivateForm(prev => ({ ...prev, signature: reader.result as string }));
			}
		};
		reader.readAsDataURL(file);
	};

	const handleCredentialUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		if (files.length === 0) return;

		// TODO: Implementar upload a Supabase Storage
		const newFiles: string[] = [];
		for (const file of files) {
			const reader = new FileReader();
			await new Promise((resolve) => {
				reader.onloadend = () => {
					newFiles.push(reader.result as string);
					resolve(null);
				};
				reader.readAsDataURL(file);
			});
		}

		if (config.isAffiliated) {
			setAffiliatedForm(prev => ({
				...prev,
				credentials: {
					...prev.credentials,
					credentialFiles: [...(prev.credentials.credentialFiles || []), ...newFiles],
				},
			}));
		} else {
			setPrivateForm(prev => ({
				...prev,
				credentials: {
					...prev.credentials,
					credentialFiles: [...(prev.credentials.credentialFiles || []), ...newFiles],
				},
			}));
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		setSuccess(null);

		try {
			const payload = config.isAffiliated
				? {
						name: affiliatedForm.name,
						specialty: affiliatedForm.specialty,
						signature: affiliatedForm.signature,
						photo: affiliatedForm.photo,
						services: affiliatedForm.services,
						credentials: affiliatedForm.credentials,
						creditHistory: affiliatedForm.creditHistory,
				  }
				: {
						name: privateForm.name,
						signature: privateForm.signature,
						photo: privateForm.photo,
						privateSpecialty: privateForm.privateSpecialty,
						services: privateForm.services,
						credentials: privateForm.credentials,
				  };

			const res = await fetch('/api/medic/config', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Error al guardar configuración');
			}

			setSuccess('Configuración guardada correctamente');
			onUpdate();
			setTimeout(() => setSuccess(null), 3000);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Error al guardar la configuración';
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	const addServiceAffiliated = () => {
		setAffiliatedForm(prev => ({
			...prev,
			services: [...prev.services, { name: '', description: '', price: '', currency: 'USD' }],
		}));
	};

	const removeServiceAffiliated = (index: number) => {
		setAffiliatedForm(prev => ({
			...prev,
			services: prev.services.filter((_, i) => i !== index),
		}));
	};

	const updateServiceAffiliated = (index: number, field: string, value: string) => {
		setAffiliatedForm(prev => ({
			...prev,
			services: prev.services.map((s, i) =>
				i === index ? { ...s, [field]: value } : s
			),
		}));
	};

	const addService = () => {
		setPrivateForm(prev => ({
			...prev,
			services: [...prev.services, { name: '', description: '', price: '', currency: 'USD' }],
		}));
	};

	const removeService = (index: number) => {
		setPrivateForm(prev => ({
			...prev,
			services: prev.services.filter((_, i) => i !== index),
		}));
	};

	const updateService = (index: number, field: string, value: string) => {
		setPrivateForm(prev => ({
			...prev,
			services: prev.services.map((s, i) =>
				i === index ? { ...s, [field]: value } : s
			),
		}));
	};

	const addCertification = () => {
		setAffiliatedForm(prev => ({
			...prev,
			creditHistory: {
				...prev.creditHistory,
				certifications: [...(prev.creditHistory.certifications || []), { name: '', issuer: '', date: '' }],
			},
		}));
	};

	const removeCertification = (index: number) => {
		setAffiliatedForm(prev => ({
			...prev,
			creditHistory: {
				...prev.creditHistory,
				certifications: (prev.creditHistory.certifications || []).filter((_, i) => i !== index),
			},
		}));
	};

	const updateCertification = (index: number, field: string, value: string) => {
		setAffiliatedForm(prev => ({
			...prev,
			creditHistory: {
				...prev.creditHistory,
				certifications: (prev.creditHistory.certifications || []).map((c, i) =>
					i === index ? { ...c, [field]: value } : c
				),
			},
		}));
	};

	const clinicSpecialties = config.clinicProfile?.specialties || [];
	const specialtyOptions = clinicSpecialties.map((s) => 
		typeof s === 'string' ? s : String(s)
	);

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
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

			{/* Información básica */}
			<div className="bg-gray-50 rounded-xl p-6">
				<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
					<User className="w-5 h-5 text-indigo-600" />
					Información Básica
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Nombre Completo
						</label>
						<input
							type="text"
							value={config.isAffiliated ? affiliatedForm.name : privateForm.name}
							onChange={(e) => {
								if (config.isAffiliated) {
									setAffiliatedForm(prev => ({ ...prev, name: e.target.value }));
								} else {
									setPrivateForm(prev => ({ ...prev, name: e.target.value }));
								}
							}}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							required
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Email
						</label>
						<input
							type="email"
							value={config.user.email || ''}
							disabled
							className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
						/>
					</div>
				</div>
			</div>

			{/* Foto de perfil */}
			<div className="bg-gray-50 rounded-xl p-6">
				<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
					<Camera className="w-5 h-5 text-indigo-600" />
					Foto de Perfil
				</h3>
				<div className="flex items-center gap-6">
					<div className="relative">
						{(config.isAffiliated ? affiliatedForm.photo : privateForm.photo) ? (
							<img
								src={config.isAffiliated ? affiliatedForm.photo : privateForm.photo}
								alt="Foto de perfil"
								className="w-32 h-32 rounded-full object-cover border-4 border-indigo-200"
							/>
						) : (
							<div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-indigo-200">
								<Camera className="w-8 h-8 text-gray-400" />
							</div>
						)}
					</div>
					<div>
						<input
							ref={photoInputRef}
							type="file"
							accept="image/*"
							onChange={handlePhotoUpload}
							className="hidden"
						/>
						<button
							type="button"
							onClick={() => photoInputRef.current?.click()}
							className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
						>
							<Upload className="w-4 h-4" />
							Subir Foto
						</button>
					</div>
				</div>
			</div>

			{/* Contenido específico según tipo */}
			{config.isAffiliated ? (
				<>
					{/* Especialidad (de la clínica) */}
					<div className="bg-gray-50 rounded-xl p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
							<Building2 className="w-5 h-5 text-indigo-600" />
							Especialidad en la Clínica
						</h3>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Seleccionar Especialidad
							</label>
							<select
								value={affiliatedForm.specialty}
								onChange={(e) => setAffiliatedForm(prev => ({ ...prev, specialty: e.target.value }))}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
								required
							>
								<option value="">Seleccione una especialidad</option>
								{specialtyOptions.map((spec, idx) => (
									<option key={idx} value={spec}>
										{spec}
									</option>
								))}
							</select>
							<p className="mt-2 text-sm text-gray-500">
								Seleccione la especialidad que ejerce en {config.clinicProfile?.name}
							</p>
						</div>
					</div>

					{/* Servicios y Precios (para médico afiliado) */}
					<div className="bg-gray-50 rounded-xl p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
							<Stethoscope className="w-5 h-5 text-indigo-600" />
							Servicios y Precios
						</h3>
						<div className="space-y-3">
							{affiliatedForm.services.map((service, idx) => (
								<div key={idx} className="p-4 bg-white rounded-lg border border-gray-200">
									<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
										<input
											type="text"
											placeholder="Nombre del servicio"
											value={service.name || ''}
											onChange={(e) => updateServiceAffiliated(idx, 'name', e.target.value)}
											className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										/>
										<input
											type="text"
											placeholder="Descripción"
											value={service.description || ''}
											onChange={(e) => updateServiceAffiliated(idx, 'description', e.target.value)}
											className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										/>
										<div className="flex items-center gap-2">
											<input
												type="text"
												placeholder="Precio"
												value={service.price || ''}
												onChange={(e) => updateServiceAffiliated(idx, 'price', e.target.value)}
												className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
											/>
											<select
												value={service.currency || 'USD'}
												onChange={(e) => updateServiceAffiliated(idx, 'currency', e.target.value)}
												className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
											>
												<option value="USD">USD</option>
												<option value="VES">VES</option>
												<option value="EUR">EUR</option>
											</select>
										</div>
										<button
											type="button"
											onClick={() => removeServiceAffiliated(idx)}
											className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
										>
											<X className="w-4 h-4" />
										</button>
									</div>
								</div>
							))}
							<button
								type="button"
								onClick={addServiceAffiliated}
								className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
							>
								+ Agregar Servicio
							</button>
						</div>
					</div>

					{/* Credenciales y validación */}
					<div className="bg-gray-50 rounded-xl p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
							<Award className="w-5 h-5 text-indigo-600" />
							Credenciales y Validación
						</h3>
						<div className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Licencia Médica
									</label>
									<input
										type="text"
										value={affiliatedForm.credentials.license || ''}
										onChange={(e) => setAffiliatedForm(prev => ({
											...prev,
											credentials: { ...prev.credentials, license: e.target.value },
										}))}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Número de Licencia
									</label>
									<input
										type="text"
										value={affiliatedForm.credentials.licenseNumber || ''}
										onChange={(e) => setAffiliatedForm(prev => ({
											...prev,
											credentials: { ...prev.credentials, licenseNumber: e.target.value },
										}))}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									/>
								</div>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Emitida por
									</label>
									<input
										type="text"
										value={affiliatedForm.credentials.issuedBy || ''}
										onChange={(e) => setAffiliatedForm(prev => ({
											...prev,
											credentials: { ...prev.credentials, issuedBy: e.target.value },
										}))}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Fecha de Expiración
									</label>
									<input
										type="date"
										value={affiliatedForm.credentials.expirationDate || ''}
										onChange={(e) => setAffiliatedForm(prev => ({
											...prev,
											credentials: { ...prev.credentials, expirationDate: e.target.value },
										}))}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									/>
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Documentos de Credenciales
								</label>
								<input
									ref={credentialInputRef}
									type="file"
									accept=".pdf,.jpg,.jpeg,.png"
									multiple
									onChange={handleCredentialUpload}
									className="hidden"
								/>
								<button
									type="button"
									onClick={() => credentialInputRef.current?.click()}
									className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
								>
									<FileText className="w-4 h-4" />
									Subir Documentos
								</button>
								{affiliatedForm.credentials.credentialFiles && affiliatedForm.credentials.credentialFiles.length > 0 && (
									<div className="mt-2 space-y-2">
										{affiliatedForm.credentials.credentialFiles.map((file, idx) => (
											<div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
												<FileText className="w-4 h-4" />
												<span>Documento {idx + 1}</span>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Historial Crediticio */}
					<div className="bg-gray-50 rounded-xl p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
							<Award className="w-5 h-5 text-indigo-600" />
							Historial Crediticio
						</h3>
						<div className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Universidad
									</label>
									<input
										type="text"
										value={affiliatedForm.creditHistory.university || ''}
										onChange={(e) => setAffiliatedForm(prev => ({
											...prev,
											creditHistory: { ...prev.creditHistory, university: e.target.value },
										}))}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Título
									</label>
									<input
										type="text"
										value={affiliatedForm.creditHistory.degree || ''}
										onChange={(e) => setAffiliatedForm(prev => ({
											...prev,
											creditHistory: { ...prev.creditHistory, degree: e.target.value },
										}))}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Año de Graduación
									</label>
									<input
										type="number"
										value={affiliatedForm.creditHistory.graduationYear || ''}
										onChange={(e) => setAffiliatedForm(prev => ({
											...prev,
											creditHistory: { ...prev.creditHistory, graduationYear: e.target.value },
										}))}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									/>
								</div>
							</div>
							<div>
								<div className="flex items-center justify-between mb-2">
									<label className="block text-sm font-medium text-gray-700">
										Certificaciones
									</label>
									<button
										type="button"
										onClick={addCertification}
										className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
									>
										+ Agregar Certificación
									</button>
								</div>
								{(affiliatedForm.creditHistory.certifications || []).map((cert, idx) => (
									<div key={idx} className="mb-3 p-4 bg-white rounded-lg border border-gray-200">
										<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
											<input
												type="text"
												placeholder="Nombre de la certificación"
												value={cert.name || ''}
												onChange={(e) => updateCertification(idx, 'name', e.target.value)}
												className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
											/>
											<input
												type="text"
												placeholder="Emisor"
												value={cert.issuer || ''}
												onChange={(e) => updateCertification(idx, 'issuer', e.target.value)}
												className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
											/>
											<div className="flex items-center gap-2">
												<input
													type="date"
													value={cert.date || ''}
													onChange={(e) => updateCertification(idx, 'date', e.target.value)}
													className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
												/>
												<button
													type="button"
													onClick={() => removeCertification(idx)}
													className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
												>
													<X className="w-4 h-4" />
												</button>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</>
			) : (
				<>
					{/* Especialidad del consultorio privado */}
					<div className="bg-gray-50 rounded-xl p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
							<Stethoscope className="w-5 h-5 text-indigo-600" />
							Especialidad
						</h3>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Especialidad que Ofrece
							</label>
							<input
								type="text"
								value={privateForm.privateSpecialty}
								onChange={(e) => setPrivateForm(prev => ({ ...prev, privateSpecialty: e.target.value }))}
								placeholder="Ej: Cardiología, Pediatría, Medicina General..."
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
								required
							/>
							<p className="mt-2 text-sm text-gray-500">
								Registre la especialidad que ofrece en su consultorio privado
							</p>
						</div>
					</div>

					{/* Servicios del consultorio privado */}
					<div className="bg-gray-50 rounded-xl p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
							<Stethoscope className="w-5 h-5 text-indigo-600" />
							Servicios y Precios
						</h3>
						<div className="space-y-3">
							{privateForm.services.map((service, idx) => (
								<div key={idx} className="p-4 bg-white rounded-lg border border-gray-200">
									<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
										<input
											type="text"
											placeholder="Nombre del servicio"
											value={service.name || ''}
											onChange={(e) => updateService(idx, 'name', e.target.value)}
											className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										/>
										<input
											type="text"
											placeholder="Descripción"
											value={service.description || ''}
											onChange={(e) => updateService(idx, 'description', e.target.value)}
											className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										/>
										<div className="flex items-center gap-2">
											<input
												type="text"
												placeholder="Precio"
												value={service.price || ''}
												onChange={(e) => updateService(idx, 'price', e.target.value)}
												className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
											/>
											<select
												value={service.currency || 'USD'}
												onChange={(e) => updateService(idx, 'currency', e.target.value)}
												className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
											>
												<option value="USD">USD</option>
												<option value="VES">VES</option>
												<option value="EUR">EUR</option>
											</select>
										</div>
										<button
											type="button"
											onClick={() => removeService(idx)}
											className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
										>
											<X className="w-4 h-4" />
										</button>
									</div>
								</div>
							))}
							<button
								type="button"
								onClick={addService}
								className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
							>
								+ Agregar Servicio
							</button>
						</div>
					</div>

					{/* Credenciales para consultorio privado */}
					<div className="bg-gray-50 rounded-xl p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
							<Award className="w-5 h-5 text-indigo-600" />
							Credenciales
						</h3>
						<div className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Licencia Médica
									</label>
									<input
										type="text"
										value={privateForm.credentials.license || ''}
										onChange={(e) => setPrivateForm(prev => ({
											...prev,
											credentials: { ...prev.credentials, license: e.target.value },
										}))}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Número de Licencia
									</label>
									<input
										type="text"
										value={privateForm.credentials.licenseNumber || ''}
										onChange={(e) => setPrivateForm(prev => ({
											...prev,
											credentials: { ...prev.credentials, licenseNumber: e.target.value },
										}))}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									/>
								</div>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Emitida por
									</label>
									<input
										type="text"
										value={privateForm.credentials.issuedBy || ''}
										onChange={(e) => setPrivateForm(prev => ({
											...prev,
											credentials: { ...prev.credentials, issuedBy: e.target.value },
										}))}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Fecha de Expiración
									</label>
									<input
										type="date"
										value={privateForm.credentials.expirationDate || ''}
										onChange={(e) => setPrivateForm(prev => ({
											...prev,
											credentials: { ...prev.credentials, expirationDate: e.target.value },
										}))}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									/>
								</div>
							</div>
						</div>
					</div>
				</>
			)}

			{/* Firma digital */}
			<div className="bg-gray-50 rounded-xl p-6">
				<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
					<FileText className="w-5 h-5 text-indigo-600" />
					Firma Digital
				</h3>
				<div className="space-y-4">
					{(config.isAffiliated ? affiliatedForm.signature : privateForm.signature) ? (
						<div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
							<img
								src={config.isAffiliated ? affiliatedForm.signature : privateForm.signature}
								alt="Firma digital"
								className="max-h-32 mx-auto"
							/>
						</div>
					) : (
						<div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
							<FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
							<p className="text-gray-500">No hay firma digital cargada</p>
						</div>
					)}
					<input
						ref={signatureInputRef}
						type="file"
						accept="image/*"
						onChange={handleSignatureUpload}
						className="hidden"
					/>
					<button
						type="button"
						onClick={() => signatureInputRef.current?.click()}
						className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
					>
						<Upload className="w-4 h-4" />
						{config.isAffiliated ? affiliatedForm.signature : privateForm.signature ? 'Cambiar Firma' : 'Subir Firma'}
					</button>
				</div>
			</div>

			{/* Botón de guardar */}
			<div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
				<button
					type="button"
					onClick={() => window.location.reload()}
					className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
				>
					Cancelar
				</button>
				<button
					type="submit"
					disabled={loading}
					className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
				>
					{loading ? 'Guardando...' : 'Guardar Cambios'}
				</button>
			</div>
		</form>
	);
}

