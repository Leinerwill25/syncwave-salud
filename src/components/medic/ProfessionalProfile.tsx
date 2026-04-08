'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, Camera, FileText, Award, Building2, Stethoscope, X, Check, User, CreditCard, Smartphone, Trash2, Loader2, FileCheck } from 'lucide-react';
import type { MedicConfig, MedicCredentials, MedicService, MedicServiceCombo, CreditHistory, PaymentMethod } from '@/types/medic-config';
import { PRIVATE_SPECIALTIES } from '@/lib/constants/specialties';
import { uploadMedicFile, deleteMedicFile } from '@/lib/supabase/medic-storage';
import { toast } from 'sonner';

export default function ProfessionalProfile({ config, onUpdate }: { config: MedicConfig; onUpdate: () => void }) {
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Estados de carga para archivos
	const [uploadingPhoto, setUploadingPhoto] = useState(false);
	const [uploadingSignature, setUploadingSignature] = useState(false);
	const [uploadingCredentials, setUploadingCredentials] = useState(false);

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
		paymentMethods: config.config.paymentMethods || [],
		serviceCombos: (config.config as any).serviceCombos || [],
		whatsappNumber: config.config.whatsappNumber || '',
		whatsappMessageTemplate: config.config.whatsappMessageTemplate || 'Hola {NOMBRE_PACIENTE}, le recordamos su cita el {FECHA} a las {HORA} con el Dr/a {NOMBRE_DOCTORA} en {CLÍNICA}. Por los servicios de:\n\n{SERVICIOS}\n\npor favor confirmar con un "Asistiré" o "No Asistiré"',
	});

	// Helper para obtener especialidades guardadas del config
	const getSavedSpecialties = (currentConfig: MedicConfig): string[] => {
		// Primero intentar usar privateSpecialties (array)
		if (Array.isArray(currentConfig.config.privateSpecialties) && currentConfig.config.privateSpecialties.length > 0) {
			// Filtrar y parsear strings JSON si es necesario
			const result: string[] = [];
			for (const item of currentConfig.config.privateSpecialties) {
				if (!item) continue;
				
				// Si es un string que parece JSON, intentar parsearlo
				if (typeof item === 'string') {
					const trimmed = item.trim();
					if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
						try {
							const parsed = JSON.parse(trimmed);
							if (Array.isArray(parsed)) {
								result.push(...parsed.filter((s: any) => s && typeof s === 'string' && s.trim().length > 0));
								continue;
							}
						} catch {
							// Si falla el parseo, tratar como string simple
						}
					}
					if (trimmed.length > 0) {
						result.push(trimmed);
					}
				} else if (typeof item === 'string') {
					const trimmed = String(item).trim();
					if (trimmed.length > 0) {
						result.push(trimmed);
					}
				}
			}
			return result.filter((s: string) => s && s.trim().length > 0);
		}
		
		// Si no, intentar usar privateSpecialty (puede ser string o array)
		if (currentConfig.config.privateSpecialty) {
			// Si es un string que parece JSON, intentar parsearlo
			if (typeof currentConfig.config.privateSpecialty === 'string') {
				const trimmed = currentConfig.config.privateSpecialty.trim();
				if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
					try {
						const parsed = JSON.parse(trimmed);
						if (Array.isArray(parsed)) {
							return parsed.filter((s: any) => s && typeof s === 'string' && s.trim().length > 0);
						}
					} catch {
						// Si falla el parseo, tratar como string simple
					}
				}
				if (trimmed.length > 0) {
					return [trimmed];
				}
			}
			if (Array.isArray(currentConfig.config.privateSpecialty) && currentConfig.config.privateSpecialty.length > 0) {
				// Procesar cada elemento del array (puede contener strings JSON)
				const result: string[] = [];
				for (const item of currentConfig.config.privateSpecialty) {
					if (!item) continue;
					if (typeof item === 'string') {
						const trimmed = item.trim();
						if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
							try {
								const parsed = JSON.parse(trimmed);
								if (Array.isArray(parsed)) {
									result.push(...parsed.filter((s: any) => s && typeof s === 'string' && s.trim().length > 0));
									continue;
								}
							} catch {
								// Si falla el parseo, tratar como string simple
							}
						}
						if (trimmed.length > 0) {
							result.push(trimmed);
						}
					}
				}
				return result.filter((s: string) => s && s.trim().length > 0);
			}
		}
		return [];
	};
	
	const initialSpecialties = getSavedSpecialties(config);
	
	const [privateForm, setPrivateForm] = useState({
		name: config.user.name || '',
		photo: config.config.photo || '',
		signature: config.config.signature || '',
		privateSpecialty: initialSpecialties,
		services: config.config.services || [],
		credentials: config.config.credentials || {
			license: '',
			licenseNumber: '',
			issuedBy: '',
			expirationDate: '',
			credentialFiles: [] as string[],
		},
		creditHistory: config.config.creditHistory || {
			university: '',
			degree: '',
			graduationYear: '',
			certifications: [],
		},
		paymentMethods: config.config.paymentMethods || [],
		serviceCombos: (config.config as any).serviceCombos || [],
		whatsappNumber: config.config.whatsappNumber || '',
		whatsappMessageTemplate: config.config.whatsappMessageTemplate || 'Hola {NOMBRE_PACIENTE}, le recordamos su cita el {FECHA} a las {HORA} con el Dr/a {NOMBRE_DOCTORA} en {CLÍNICA}. Por los servicios de:\n\n{SERVICIOS}\n\npor favor confirmar con un "Asistiré" o "No Asistiré"',
	});

	const photoInputRef = useRef<HTMLInputElement>(null);
	const signatureInputRef = useRef<HTMLInputElement>(null);
	const credentialInputRef = useRef<HTMLInputElement>(null);

	// Actualizar especialidades cuando cambie el config (después de guardar o recargar)
	useEffect(() => {
		if (!config.isAffiliated) {
			const savedSpecialties = getSavedSpecialties(config);
			setPrivateForm((prev) => ({
				...prev,
				privateSpecialty: savedSpecialties,
			}));
		}
	}, [config.config.privateSpecialties, config.config.privateSpecialty, config.isAffiliated, config]);

	const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setUploadingPhoto(true);
		try {
			const { url, error } = await uploadMedicFile(file, 'photos');
			if (error) {
				toast.error('Error al subir la foto: ' + error);
				return;
			}

			if (url) {
				// Eliminar foto anterior si existe
				const oldPhoto = config.isAffiliated ? affiliatedForm.photo : privateForm.photo;
				if (oldPhoto && oldPhoto.startsWith('http')) {
					await deleteMedicFile(oldPhoto);
				}

				if (config.isAffiliated) {
					setAffiliatedForm((prev) => ({ ...prev, photo: url }));
				} else {
					setPrivateForm((prev) => ({ ...prev, photo: url }));
				}
				toast.success('Foto subida correctamente');
			}
		} catch (err) {
			toast.error('Error inesperado al subir la foto');
		} finally {
			setUploadingPhoto(false);
		}
	};

	const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setUploadingSignature(true);
		try {
			const { url, error } = await uploadMedicFile(file, 'signatures');
			if (error) {
				toast.error('Error al subir la firma: ' + error);
				return;
			}

			if (url) {
				// Eliminar firma anterior si existe
				const oldSignature = config.isAffiliated ? affiliatedForm.signature : privateForm.signature;
				if (oldSignature && oldSignature.startsWith('http')) {
					await deleteMedicFile(oldSignature);
				}

				if (config.isAffiliated) {
					setAffiliatedForm((prev) => ({ ...prev, signature: url }));
				} else {
					setPrivateForm((prev) => ({ ...prev, signature: url }));
				}
				toast.success('Firma subida correctamente');
			}
		} catch (err) {
			toast.error('Error inesperado al subir la firma');
		} finally {
			setUploadingSignature(false);
		}
	};

	const handleCredentialUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		if (files.length === 0) return;

		setUploadingCredentials(true);
		try {
			const uploadedUrls: string[] = [];
			for (const file of files) {
				const { url, error } = await uploadMedicFile(file, 'credentials');
				if (error) {
					toast.error(`Error al subir el archivo ${file.name}: ${error}`);
					continue;
				}
				if (url) uploadedUrls.push(url);
			}

			if (uploadedUrls.length > 0) {
				if (config.isAffiliated) {
					setAffiliatedForm((prev) => ({
						...prev,
						credentials: {
							...prev.credentials,
							credentialFiles: [...(prev.credentials.credentialFiles || []), ...uploadedUrls],
						},
					}));
				} else {
					setPrivateForm((prev) => ({
						...prev,
						credentials: {
							...prev.credentials,
							credentialFiles: [...(prev.credentials.credentialFiles || []), ...uploadedUrls],
						},
					}));
				}
				toast.success(`${uploadedUrls.length} documento(s) subido(s) correctamente`);
			}
		} catch (err) {
			toast.error('Error inesperado al subir los documentos');
		} finally {
			setUploadingCredentials(false);
		}
	};

	const handleDeleteCredential = async (urlToDelete: string) => {
		try {
			// Solo intentamos eliminar del storage si es una URL real
			if (urlToDelete.startsWith('http')) {
				await deleteMedicFile(urlToDelete);
			}

			if (config.isAffiliated) {
				setAffiliatedForm((prev) => ({
					...prev,
					credentials: {
						...prev.credentials,
						credentialFiles: (prev.credentials.credentialFiles || []).filter(url => url !== urlToDelete),
					},
				}));
			} else {
				setPrivateForm((prev) => ({
					...prev,
					credentials: {
						...prev.credentials,
						credentialFiles: (prev.credentials.credentialFiles || []).filter(url => url !== urlToDelete),
					},
				}));
			}
			toast.success('Documento eliminado');
		} catch (err) {
			toast.error('Error al eliminar el documento');
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
						paymentMethods: affiliatedForm.paymentMethods,
				  }
				: {
						name: privateForm.name,
						signature: privateForm.signature,
						photo: privateForm.photo,
						privateSpecialty: Array.isArray(privateForm.privateSpecialty) 
							? privateForm.privateSpecialty.filter((s: string) => s && typeof s === 'string' && s.trim().length > 0)
							: [],
						services: privateForm.services,
						credentials: privateForm.credentials,
						creditHistory: privateForm.creditHistory,
						paymentMethods: privateForm.paymentMethods,
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

			// Disparar evento personalizado para notificar al sidebar que debe recargar
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('medicConfigUpdated'));
			}

			setTimeout(() => setSuccess(null), 3000);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Error al guardar la configuración';
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	const addServiceAffiliated = () => {
		setAffiliatedForm((prev) => ({
			...prev,
			services: [...prev.services, { name: '', description: '', price: '', currency: 'USD' }],
		}));
	};

	const removeServiceAffiliated = (index: number, e?: React.MouseEvent) => {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		setAffiliatedForm((prev) => ({
			...prev,
			services: prev.services.filter((_, i) => i !== index),
		}));
	};

	const updateServiceAffiliated = (index: number, field: string, value: string) => {
		setAffiliatedForm((prev) => ({
			...prev,
			services: prev.services.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
		}));
	};

	const addService = () => {
		setPrivateForm((prev) => ({
			...prev,
			services: [...prev.services, { name: '', description: '', price: '', currency: 'USD' }],
		}));
	};

	const removeService = (index: number, e?: React.MouseEvent) => {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		setPrivateForm((prev) => ({
			...prev,
			services: prev.services.filter((_, i) => i !== index),
		}));
	};

	const updateService = (index: number, field: string, value: string) => {
		setPrivateForm((prev) => ({
			...prev,
			services: prev.services.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
		}));
	};

	// Combos de servicios (affiliated/private comparten lógica, usan mismo campo en medic_profile)
	const addServiceCombo = (isAffiliatedForm: boolean) => {
		if (isAffiliatedForm) {
			setAffiliatedForm((prev: any) => ({
				...prev,
				serviceCombos: [
					...(prev.serviceCombos || []),
					{
						id: crypto.randomUUID(),
						name: '',
						description: '',
						price: '',
						currency: 'USD',
						serviceIds: [],
					},
				],
			}));
		} else {
			setPrivateForm((prev: any) => ({
				...prev,
				serviceCombos: [
					...(prev.serviceCombos || []),
					{
						id: crypto.randomUUID(),
						name: '',
						description: '',
						price: '',
						currency: 'USD',
						serviceIds: [],
					},
				],
			}));
		}
	};

	const updateServiceCombo = (isAffiliatedForm: boolean, index: number, field: keyof MedicServiceCombo | 'serviceIds', value: string | string[]) => {
		if (isAffiliatedForm) {
			setAffiliatedForm((prev: any) => ({
				...prev,
				serviceCombos: (prev.serviceCombos || []).map((c: MedicServiceCombo, i: number) => (i === index ? { ...c, [field]: value } : c)),
			}));
		} else {
			setPrivateForm((prev: any) => ({
				...prev,
				serviceCombos: (prev.serviceCombos || []).map((c: MedicServiceCombo, i: number) => (i === index ? { ...c, [field]: value } : c)),
			}));
		}
	};

	const removeServiceCombo = (isAffiliatedForm: boolean, index: number) => {
		if (isAffiliatedForm) {
			setAffiliatedForm((prev: any) => ({
				...prev,
				serviceCombos: (prev.serviceCombos || []).filter((_: MedicServiceCombo, i: number) => i !== index),
			}));
		} else {
			setPrivateForm((prev: any) => ({
				...prev,
				serviceCombos: (prev.serviceCombos || []).filter((_: MedicServiceCombo, i: number) => i !== index),
			}));
		}
	};

	const addCertification = () => {
		setAffiliatedForm((prev) => ({
			...prev,
			creditHistory: {
				...prev.creditHistory,
				certifications: [...(prev.creditHistory.certifications || []), { name: '', issuer: '', date: '' }],
			},
		}));
	};

	const removeCertification = (index: number) => {
		setAffiliatedForm((prev) => ({
			...prev,
			creditHistory: {
				...prev.creditHistory,
				certifications: (prev.creditHistory.certifications || []).filter((_, i) => i !== index),
			},
		}));
	};

	const updateCertification = (index: number, field: string, value: string) => {
		setAffiliatedForm((prev) => ({
			...prev,
			creditHistory: {
				...prev.creditHistory,
				certifications: (prev.creditHistory.certifications || []).map((c, i) => (i === index ? { ...c, [field]: value } : c)),
			},
		}));
	};

	const clinicSpecialties = config.clinicProfile?.specialties || [];
	const specialtyOptions = clinicSpecialties.map((s) => (typeof s === 'string' ? s : String(s)));

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
						<label className="block text-sm font-medium text-gray-700 mb-2">Nombre Completo</label>
						<input
							type="text"
							value={config.isAffiliated ? affiliatedForm.name : privateForm.name}
							onChange={(e) => {
								if (config.isAffiliated) {
									setAffiliatedForm((prev) => ({ ...prev, name: e.target.value }));
								} else {
									setPrivateForm((prev) => ({ ...prev, name: e.target.value }));
								}
							}}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							required
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
						<input type="email" value={config.user.email || ''} disabled className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600" />
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
					<div className="relative group">
						{(config.isAffiliated ? affiliatedForm.photo : privateForm.photo) ? (
							<div className="relative">
								<img src={config.isAffiliated ? affiliatedForm.photo : privateForm.photo} alt="Foto de perfil" className="w-32 h-32 rounded-full object-cover border-4 border-indigo-200" />
								{uploadingPhoto && (
									<div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
										<Loader2 className="w-8 h-8 text-white animate-spin" />
									</div>
								)}
								{!uploadingPhoto && (
									<button 
										type="button"
										onClick={async () => {
											const photoUrl = config.isAffiliated ? affiliatedForm.photo : privateForm.photo;
											if (photoUrl) {
												await deleteMedicFile(photoUrl);
												if (config.isAffiliated) setAffiliatedForm(prev => ({ ...prev, photo: '' }));
												else setPrivateForm(prev => ({ ...prev, photo: '' }));
												toast.success('Foto eliminada');
											}
										}}
										className="absolute -top-1 -right-1 p-1.5 bg-red-600 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
									>
										<Trash2 className="w-4 h-4" />
									</button>
								)}
							</div>
						) : (
							<div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-indigo-200">
								{uploadingPhoto ? <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /> : <Camera className="w-8 h-8 text-gray-400" />}
							</div>
						)}
					</div>
					<div>
						<input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
						<button 
							type="button" 
							onClick={() => photoInputRef.current?.click()} 
							disabled={uploadingPhoto}
							className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
						>
							{uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
							{config.isAffiliated ? affiliatedForm.photo : privateForm.photo ? 'Cambiar Foto' : 'Subir Foto'}
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
							<label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Especialidad</label>
							<select value={affiliatedForm.specialty} onChange={(e) => setAffiliatedForm((prev) => ({ ...prev, specialty: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required>
								<option value="">Seleccione una especialidad</option>
								{specialtyOptions.map((spec, idx) => (
									<option key={idx} value={spec}>
										{spec}
									</option>
								))}
							</select>
							<p className="mt-2 text-sm text-gray-500">Seleccione la especialidad que ejerce en {config.clinicProfile?.name}</p>
						</div>
					</div>

					{/* Servicios y Precios (para médico afiliado) */}
					<div className="bg-gray-50 rounded-xl p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
							<Stethoscope className="w-5 h-5 text-indigo-600" />
							Servicios y Precios
						</h3>
						<div className="space-y-4">
							{affiliatedForm.services.map((service, idx) => (
								<div key={idx} className="relative p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors overflow-hidden">
									<div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
										<div className="flex-1 min-w-0 w-full md:w-auto">
											<input type="text" placeholder="Nombre del servicio" value={service.name || ''} onChange={(e) => updateServiceAffiliated(idx, 'name', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
										</div>
										<div className="flex-1 min-w-0 w-full md:w-auto">
											<input type="text" placeholder="Descripción" value={service.description || ''} onChange={(e) => updateServiceAffiliated(idx, 'description', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
										</div>
										<div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto">
											<input type="text" placeholder="Precio" value={service.price || ''} onChange={(e) => updateServiceAffiliated(idx, 'price', e.target.value)} className="flex-1 md:w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
											<select value={service.currency || 'USD'} onChange={(e) => updateServiceAffiliated(idx, 'currency', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white flex-shrink-0" onClick={(e) => e.stopPropagation()}>
												<option value="USD">USD</option>
												<option value="VES">VES</option>
												<option value="EUR">EUR</option>
											</select>
										</div>
										<div className="flex-shrink-0">
											<button type="button" onClick={(e) => removeServiceAffiliated(idx, e)} onMouseDown={(e) => e.preventDefault()} className="flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1" aria-label={`Eliminar servicio ${idx + 1}`}>
												<X className="w-5 h-5" />
											</button>
										</div>
									</div>
								</div>
							))}
							<button type="button" onClick={addServiceAffiliated} className="w-full px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200 font-medium">
								+ Agregar Servicio
							</button>
						</div>
					</div>

					{/* Configuración de WhatsApp para recordatorios — Solo visible para consultorios privados */}
					{!config.isAffiliated && <div className="bg-gray-50 rounded-xl p-6 mt-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
							<Smartphone className="w-5 h-5 text-emerald-600" />
							Recordatorios por WhatsApp
						</h3>
						<p className="text-sm text-gray-600 mb-4">Configura el número oficial de WhatsApp y el mensaje base que usará tu equipo de recepción / asistente para enviar recordatorios y confirmaciones de citas. No se usa la API oficial de WhatsApp: se abrirá WhatsApp Web o la app en el dispositivo con el mensaje prellenado.</p>

						<div className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Número de WhatsApp del consultorio</label>
									<input
										type="text"
										value={config.isAffiliated ? affiliatedForm.whatsappNumber : privateForm.whatsappNumber}
										onChange={(e) => {
											const value = e.target.value;
											if (config.isAffiliated) {
												setAffiliatedForm((prev) => ({
													...prev,
													whatsappNumber: value,
												}));
											} else {
												setPrivateForm((prev) => ({
													...prev,
													whatsappNumber: value,
												}));
											}
										}}
										placeholder="Ej: +584121234567"
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
									/>
									<p className="mt-1 text-xs text-gray-500">Use el formato internacional con código de país (ejemplo: +58 para Venezuela). Este número se mostrará como referencia al equipo, pero el mensaje se envía desde el WhatsApp del asistente/recepción.</p>
								</div>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Plantilla de mensaje para recordatorios</label>
								<textarea
									value={config.isAffiliated ? affiliatedForm.whatsappMessageTemplate : privateForm.whatsappMessageTemplate}
									onChange={(e) => {
										const value = e.target.value;
										if (config.isAffiliated) {
											setAffiliatedForm((prev) => ({
												...prev,
												whatsappMessageTemplate: value,
											}));
										} else {
											setPrivateForm((prev) => ({
												...prev,
												whatsappMessageTemplate: value,
											}));
										}
									}}
									rows={6}
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm resize-vertical"
									placeholder={`Hola {NOMBRE_PACIENTE}, le recordamos su cita el {FECHA} a las {HORA} con la Dra. {NOMBRE_DOCTORA} en {CLÍNICA}. Por los servicios de:

{SERVICIOS}

por favor confirmar con un "Asistiré" o "No Asistiré"`}
								/>
								<p className="mt-2 text-xs text-gray-500">Puede usar estas variables que se reemplazarán automáticamente:</p>
								<ul className="mt-1 text-xs text-gray-500 list-disc list-inside space-y-0.5">
									<li>
										<span className="font-mono text-emerald-700">{'{NOMBRE_PACIENTE}'}</span> — nombre completo del paciente
									</li>
									<li>
										<span className="font-mono text-emerald-700">{'{FECHA}'}</span> — fecha de la cita (formato dd/mm/aaaa)
									</li>
									<li>
										<span className="font-mono text-emerald-700">{'{HORA}'}</span> — hora de la cita
									</li>
									<li>
										<span className="font-mono text-emerald-700">{'{NOMBRE_DOCTORA}'}</span> — nombre del médico/a que atiende
									</li>
									<li>
										<span className="font-mono text-emerald-700">{'{CLÍNICA}'}</span> — nombre del consultorio o clínica
									</li>
									<li>
										<span className="font-mono text-emerald-700">{'{SERVICIOS}'}</span> — lista de servicios programados para la cita
									</li>
								</ul>
							</div>
						</div>
					</div>}

					{/* Combos de servicios (afiliado) */}
					<div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-8 mt-6 border border-indigo-100">
						{/* Header de la sección */}
						<div className="mb-8">
							<div className="flex items-center gap-3 mb-3">
								<div className="p-2.5 bg-indigo-600 rounded-lg">
									<Stethoscope className="w-6 h-6 text-white" />
								</div>
								<h3 className="text-2xl font-bold text-gray-900">Combos de Servicios</h3>
							</div>
							<p className="text-sm text-gray-600 ml-14">Crea paquetes que agrupen varios servicios individuales con un precio especial. Estos combos se mostrarán también en el módulo de servicios del asistente/recepción.</p>
						</div>
						
						{/* Lista de combos */}
						<div className="space-y-8">
							{(affiliatedForm as any).serviceCombos?.map((combo: MedicServiceCombo, idx: number) => {
								const selectedServices = combo.serviceIds?.map((id) => {
									const svc = affiliatedForm.services.find((s, i) => ((s as any).id || String(i)) === id);
									return svc;
								}).filter(Boolean) || [];
								
								const totalIndividualPrice = selectedServices.reduce((sum, svc) => {
									if (!svc) return sum;
									const price = parseFloat(svc.price || '0') || 0;
									return sum + price;
								}, 0);
								
								const comboPrice = parseFloat(combo.price || '0') || 0;
								const savings = totalIndividualPrice > 0 && comboPrice > 0 ? totalIndividualPrice - comboPrice : 0;
								const savingsPercent = totalIndividualPrice > 0 ? Math.round((savings / totalIndividualPrice) * 100) : 0;
								
								return (
									<div key={combo.id || idx} className="bg-white rounded-xl border-2 border-gray-200 hover:border-indigo-300 transition-all duration-200 shadow-lg">
										{/* Header del combo con nombre y botón eliminar */}
										<div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-4 sm:px-6 py-4 sm:py-5 border-b-2 border-gray-200">
											<div className="flex items-center justify-between gap-4">
												<div className="flex-1 min-w-0">
													<label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Nombre del Combo</label>
													<input 
														type="text" 
														placeholder="Ej: Control Prenatal Básico" 
														value={combo.name || ''} 
														onChange={(e) => updateServiceCombo(true, idx, 'name', e.target.value)} 
														className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-semibold text-gray-900 placeholder:text-gray-400 text-base" 
													/>
												</div>
												<div className="flex-shrink-0 pt-6">
													<button 
														type="button" 
														onClick={() => removeServiceCombo(true, idx)} 
														className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border-2 border-transparent hover:border-red-200" 
														aria-label="Eliminar combo"
													>
														<X className="w-5 h-5" />
													</button>
												</div>
											</div>
										</div>
										
										{/* Contenido principal del combo */}
										<div className="p-4 sm:p-6 space-y-8">
											{/* Sección 1: Descripción */}
											<div className="border-b border-gray-200 pb-6">
												<label className="block text-sm font-bold text-gray-700 mb-3">Descripción del Combo</label>
												<textarea 
													placeholder="Describe brevemente qué incluye este paquete promocional y sus beneficios..." 
													value={combo.description || ''} 
													onChange={(e) => updateServiceCombo(true, idx, 'description', e.target.value)} 
													rows={4} 
													className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm text-gray-700 placeholder:text-gray-400" 
												/>
											</div>
											
											{/* Sección 2: Precio Promocional */}
											<div className="border-b border-gray-200 pb-6">
												<label className="block text-sm font-bold text-gray-700 mb-3">Precio Promocional</label>
												<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
													<div className="flex-1 w-full sm:w-auto">
														<input 
															type="text" 
															placeholder="0.00" 
															value={combo.price || ''} 
															onChange={(e) => updateServiceCombo(true, idx, 'price', e.target.value)} 
															className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xl font-bold text-gray-900" 
														/>
													</div>
													<div className="w-full sm:w-auto">
														<select 
															value={combo.currency || 'USD'} 
															onChange={(e) => updateServiceCombo(true, idx, 'currency', e.target.value)} 
															className="w-full sm:w-auto px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-semibold"
														>
															<option value="USD">USD</option>
															<option value="VES">VES</option>
															<option value="EUR">EUR</option>
														</select>
													</div>
												</div>
												{savings > 0 && (
													<div className="mt-4 p-3 bg-green-50 border-2 border-green-200 rounded-lg">
														<div className="flex items-center gap-3">
															<span className="text-base font-bold text-green-700">💰 Ahorro: {savings.toFixed(2)} {combo.currency || 'USD'}</span>
															<span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm font-bold">
																-{savingsPercent}%
															</span>
														</div>
													</div>
												)}
											</div>
											
											{/* Sección 3: Servicios Incluidos */}
											<div>
												<div className="flex items-center justify-between mb-4">
													<label className="block text-sm font-bold text-gray-700">
														Servicios Incluidos en el Combo
													</label>
													{selectedServices.length > 0 && (
														<span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
															{selectedServices.length} {selectedServices.length === 1 ? 'servicio seleccionado' : 'servicios seleccionados'}
														</span>
													)}
												</div>
												<div className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-5 bg-gray-50 max-h-80 overflow-y-auto">
													{affiliatedForm.services.length === 0 ? (
														<div className="text-center py-8">
															<p className="text-sm text-gray-500 font-medium">Primero debes registrar servicios individuales en la sección "Servicios y Precios".</p>
														</div>
													) : (
														<div className="space-y-3">
															{affiliatedForm.services.map((svc, sIdx) => {
																const svcId = (svc as any).id || String(sIdx);
																const checked = combo.serviceIds?.includes(svcId);
																return (
																	<label 
																		key={svcId} 
																		className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
																			checked 
																				? 'bg-indigo-50 border-indigo-400 shadow-md' 
																				: 'bg-white border-gray-200 hover:border-gray-400'
																		}`}
																	>
																		<input
																			type="checkbox"
																			checked={checked}
																			onChange={(e) => {
																				const current = combo.serviceIds || [];
																				const next = e.target.checked ? [...current, svcId] : current.filter((id) => id !== svcId);
																				updateServiceCombo(true, idx, 'serviceIds', next);
																			}}
																			className="mt-1 w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
																		/>
																		<div className="flex-1 min-w-0">
																			<div className="flex items-start justify-between gap-3">
																				<div className="flex-1 min-w-0">
																					<span className={`block text-sm font-semibold ${checked ? 'text-indigo-900' : 'text-gray-800'}`}>
																						{svc.name || `Servicio ${sIdx + 1}`}
																					</span>
																					{svc.description && (
																						<p className="text-xs text-gray-600 mt-1 line-clamp-2">{svc.description}</p>
																					)}
																				</div>
																				{svc.price && (
																					<span className="text-sm font-bold text-gray-700 whitespace-nowrap flex-shrink-0">
																						{svc.price} {svc.currency || 'USD'}
																					</span>
																				)}
																			</div>
																		</div>
																	</label>
																);
															})}
														</div>
													)}
												</div>
											</div>
											
											{/* Sección 4: Resumen del Combo */}
											{selectedServices.length > 0 && (
												<div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 sm:p-5 border-2 border-indigo-200">
													<p className="text-sm font-bold text-indigo-900 mb-3 uppercase tracking-wide">Resumen del Combo</p>
													<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
														<div className="bg-white rounded-lg p-4 border border-gray-200">
															<p className="text-xs text-gray-600 mb-1">Precio Individual Total</p>
															<p className="text-lg font-bold text-gray-900">
																{totalIndividualPrice.toFixed(2)} {combo.currency || 'USD'}
															</p>
														</div>
														<div className="bg-white rounded-lg p-4 border border-gray-200">
															<p className="text-xs text-gray-600 mb-1">Precio del Combo</p>
															<p className="text-lg font-bold text-indigo-600">
																{comboPrice.toFixed(2)} {combo.currency || 'USD'}
															</p>
														</div>
													</div>
													{savings > 0 && (
														<div className="mt-4 p-4 bg-green-100 rounded-lg border-2 border-green-300">
															<div className="flex items-center justify-between">
																<span className="text-sm font-semibold text-green-800">Ahorro Total</span>
																<span className="text-xl font-bold text-green-700">
																	{savings.toFixed(2)} {combo.currency || 'USD'} ({savingsPercent}%)
																</span>
															</div>
														</div>
													)}
												</div>
											)}
										</div>
									</div>
								);
							})}
							
							{/* Botón para agregar nuevo combo */}
							<button 
								type="button" 
								onClick={() => addServiceCombo(true)} 
								className="w-full px-6 py-5 border-2 border-dashed border-indigo-400 rounded-xl text-indigo-700 hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-200 font-bold text-base flex items-center justify-center gap-3 group shadow-sm hover:shadow-md"
							>
								<span className="text-2xl group-hover:scale-125 transition-transform">+</span>
								<span>Agregar Nuevo Combo de Servicios</span>
							</button>
						</div>
					</div>

					{/* Credenciales y validación */}
					<div className="bg-gray-50 rounded-xl p-4 sm:p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
							<Award className="w-5 h-5 text-indigo-600" />
							Credenciales y Validación
						</h3>
						<div className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Licencia Médica <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={affiliatedForm.credentials.license || ''}
										onChange={(e) =>
											setAffiliatedForm((prev) => ({
												...prev,
												credentials: { ...prev.credentials, license: e.target.value },
											}))
										}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										required
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Número de Licencia <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={affiliatedForm.credentials.licenseNumber || ''}
										onChange={(e) =>
											setAffiliatedForm((prev) => ({
												...prev,
												credentials: { ...prev.credentials, licenseNumber: e.target.value },
											}))
										}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										required
									/>
								</div>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Emitida por <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={affiliatedForm.credentials.issuedBy || ''}
										onChange={(e) =>
											setAffiliatedForm((prev) => ({
												...prev,
												credentials: { ...prev.credentials, issuedBy: e.target.value },
											}))
										}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										placeholder="Ej: Colegio de Médicos de Venezuela"
										required
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Fecha de Expiración <span className="text-red-500">*</span>
									</label>
									<input
										type="date"
										value={affiliatedForm.credentials.expirationDate || ''}
										onChange={(e) =>
											setAffiliatedForm((prev) => ({
												...prev,
												credentials: { ...prev.credentials, expirationDate: e.target.value },
											}))
										}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										required
									/>
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Documentos de Credenciales <span className="text-red-500">*</span>
								</label>
								<p className="text-xs text-gray-500 mb-2">Debe subir al menos un documento que valide su licencia médica (PDF, JPG, PNG)</p>
								<input ref={credentialInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={handleCredentialUpload} className="hidden" />
								<button type="button" onClick={() => credentialInputRef.current?.click()} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2">
									<FileText className="w-4 h-4" />
									Subir Documentos
								</button>
								{(affiliatedForm.credentials.credentialFiles || []).length > 0 && (
									<div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
										{affiliatedForm.credentials.credentialFiles.map((url, idx) => {
											const isImage = url.match(/\.(jpg|jpeg|png|webp|gif)$|data:image/i);
											return (
												<div key={idx} className="relative group bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
													<div className="flex flex-col items-center">
														{isImage ? (
															<div className="w-full h-32 mb-2 rounded-lg overflow-hidden bg-gray-100 border border-gray-100 flex items-center justify-center">
																<img src={url} alt={`Documento ${idx + 1}`} className="w-full h-full object-cover" />
															</div>
														) : (
															<div className="w-full h-32 mb-2 rounded-lg bg-indigo-50 flex flex-col items-center justify-center border border-indigo-100">
																<FileText className="w-10 h-10 text-indigo-400 mb-2" />
																<span className="text-[10px] font-medium text-indigo-600 uppercase tracking-wider">Documento PDF/Otro</span>
															</div>
														)}
														<div className="flex items-center gap-2 w-full px-1">
															<FileCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
															<span className="text-xs text-gray-600 truncate flex-1 font-medium">Documento {idx + 1}</span>
														</div>
													</div>
													<button 
														type="button" 
														onClick={() => handleDeleteCredential(url)}
														className="absolute -top-2 -right-2 p-1.5 bg-red-600 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
														title="Eliminar documento"
													>
														<Trash2 className="w-3.5 h-3.5" />
													</button>
												</div>
											);
										})}
									</div>
								)}
								{uploadingCredentials && (
									<div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-3 animate-pulse">
										<Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
										<span className="text-sm text-indigo-700 font-medium">Subiendo documentos...</span>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Historial Crediticio */}
					<div className="bg-gray-50 rounded-xl p-4 sm:p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
							<Award className="w-5 h-5 text-indigo-600" />
							Historial Crediticio
						</h3>
						<div className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Universidad <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={affiliatedForm.creditHistory.university || ''}
										onChange={(e) =>
											setAffiliatedForm((prev) => ({
												...prev,
												creditHistory: { ...prev.creditHistory, university: e.target.value },
											}))
										}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										required
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Título <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={affiliatedForm.creditHistory.degree || ''}
										onChange={(e) =>
											setAffiliatedForm((prev) => ({
												...prev,
												creditHistory: { ...prev.creditHistory, degree: e.target.value },
											}))
										}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										placeholder="Ej: Médico Cirujano"
										required
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Año de Graduación <span className="text-red-500">*</span>
									</label>
									<input
										type="number"
										value={affiliatedForm.creditHistory.graduationYear || ''}
										onChange={(e) =>
											setAffiliatedForm((prev) => ({
												...prev,
												creditHistory: { ...prev.creditHistory, graduationYear: e.target.value },
											}))
										}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										placeholder="Ej: 2010"
										min="1950"
										max={new Date().getFullYear()}
										required
									/>
								</div>
							</div>
							<div>
								<div className="flex items-center justify-between mb-2">
									<label className="block text-sm font-medium text-gray-700">Certificaciones</label>
									<button type="button" onClick={addCertification} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
										+ Agregar Certificación
									</button>
								</div>
								{(affiliatedForm.creditHistory.certifications || []).map((cert, idx) => (
									<div key={idx} className="mb-3 p-4 bg-white rounded-lg border border-gray-200">
										<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
											<input type="text" placeholder="Nombre de la certificación" value={cert.name || ''} onChange={(e) => updateCertification(idx, 'name', e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
											<input type="text" placeholder="Emisor" value={cert.issuer || ''} onChange={(e) => updateCertification(idx, 'issuer', e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
											<div className="flex items-center gap-2">
												<input type="date" value={cert.date || ''} onChange={(e) => updateCertification(idx, 'date', e.target.value)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
												<button type="button" onClick={() => removeCertification(idx)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
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
					{/* Especialidades del consultorio privado */}
					<div className="bg-gray-50 rounded-xl p-4 sm:p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
							<Stethoscope className="w-5 h-5 text-indigo-600" />
							Especialidades Médicas
						</h3>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Seleccionar Especialidades
							</label>
							<div className="mt-3 space-y-2">
								{PRIVATE_SPECIALTIES.map((specialty) => {
									// Normalizar para comparar (trim y case-insensitive)
									const normalizedSpecialty = specialty.trim();
									const currentSpecialties = Array.isArray(privateForm.privateSpecialty) 
										? privateForm.privateSpecialty 
										: [];
									const isChecked = currentSpecialties.some((s: string) => {
										if (!s || typeof s !== 'string') return false;
										const normalized = s.trim().toLowerCase();
										return normalized === normalizedSpecialty.toLowerCase();
									});
									
									return (
										<label
											key={specialty}
											className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
										>
											<input
												type="checkbox"
												checked={isChecked}
												onChange={(e) => {
													const current = Array.isArray(privateForm.privateSpecialty) 
														? [...privateForm.privateSpecialty] 
														: (privateForm.privateSpecialty ? [privateForm.privateSpecialty] : []);
													
													if (e.target.checked) {
														// Agregar la especialidad si no está ya en el array
														if (!current.includes(specialty)) {
															current.push(specialty);
														}
													} else {
														// Remover la especialidad del array
														const index = current.indexOf(specialty);
														if (index > -1) {
															current.splice(index, 1);
														}
													}
													
													setPrivateForm((prev) => ({ ...prev, privateSpecialty: current }));
												}}
												className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer"
											/>
											<span className="text-sm font-medium text-gray-700 flex-1">
												{specialty}
											</span>
										</label>
									);
								})}
							</div>
							<p className="mt-4 text-sm text-gray-500">
								Seleccione todas las especialidades médicas que ejerce en su consultorio privado marcando las casillas correspondientes. Esta información será visible para los pacientes en las búsquedas.
							</p>
						</div>
					</div>

					{/* Servicios del consultorio privado */}
					<div className="bg-gray-50 rounded-xl p-4 sm:p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
							<Stethoscope className="w-5 h-5 text-indigo-600" />
							Servicios y Precios
						</h3>
						<div className="space-y-4">
							{privateForm.services.map((service, idx) => (
								<div key={idx} className="relative p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors overflow-hidden">
									<div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
										<div className="flex-1 min-w-0 w-full md:w-auto">
											<input type="text" placeholder="Nombre del servicio" value={service.name || ''} onChange={(e) => updateService(idx, 'name', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
										</div>
										<div className="flex-1 min-w-0 w-full md:w-auto">
											<input type="text" placeholder="Descripción" value={service.description || ''} onChange={(e) => updateService(idx, 'description', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
										</div>
										<div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto">
											<input type="text" placeholder="Precio" value={service.price || ''} onChange={(e) => updateService(idx, 'price', e.target.value)} className="flex-1 md:w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
											<select value={service.currency || 'USD'} onChange={(e) => updateService(idx, 'currency', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white flex-shrink-0" onClick={(e) => e.stopPropagation()}>
												<option value="USD">USD</option>
												<option value="VES">VES</option>
												<option value="EUR">EUR</option>
											</select>
										</div>
										<div className="flex-shrink-0">
											<button type="button" onClick={(e) => removeService(idx, e)} onMouseDown={(e) => e.preventDefault()} className="flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1" aria-label={`Eliminar servicio ${idx + 1}`}>
												<X className="w-5 h-5" />
											</button>
										</div>
									</div>
								</div>
							))}
							<button type="button" onClick={addService} className="w-full px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200 font-medium">
								+ Agregar Servicio
							</button>
						</div>
					</div>

					{/* Combos de servicios (consultorio privado) */}
					<div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 sm:p-8 mt-6 border border-indigo-100">
						{/* Header de la sección */}
						<div className="mb-8">
							<div className="flex items-center gap-3 mb-3">
								<div className="p-2.5 bg-indigo-600 rounded-lg">
									<Stethoscope className="w-6 h-6 text-white" />
								</div>
								<h3 className="text-2xl font-bold text-gray-900">Combos de Servicios</h3>
							</div>
							<p className="text-sm text-gray-600 ml-14">Crea combos que agrupen varios de tus servicios privados con precios especiales.</p>
						</div>
						
						{/* Lista de combos */}
						<div className="space-y-8">
							{(privateForm as any).serviceCombos?.map((combo: MedicServiceCombo, idx: number) => {
								const selectedServices = combo.serviceIds?.map((id) => {
									const svc = privateForm.services.find((s, i) => ((s as any).id || String(i)) === id);
									return svc;
								}).filter(Boolean) || [];
								
								const totalIndividualPrice = selectedServices.reduce((sum, svc) => {
									if (!svc) return sum;
									const price = parseFloat(svc.price || '0') || 0;
									return sum + price;
								}, 0);
								
								const comboPrice = parseFloat(combo.price || '0') || 0;
								const savings = totalIndividualPrice > 0 && comboPrice > 0 ? totalIndividualPrice - comboPrice : 0;
								const savingsPercent = totalIndividualPrice > 0 ? Math.round((savings / totalIndividualPrice) * 100) : 0;
								
								return (
									<div key={combo.id || idx} className="bg-white rounded-xl border-2 border-gray-200 hover:border-indigo-300 transition-all duration-200 shadow-lg">
										{/* Header del combo con nombre y botón eliminar */}
										<div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-4 sm:px-6 py-4 sm:py-5 border-b-2 border-gray-200">
											<div className="flex items-center justify-between gap-4">
												<div className="flex-1 min-w-0">
													<label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Nombre del Combo</label>
													<input 
														type="text" 
														placeholder="Ej: Control Prenatal Básico" 
														value={combo.name || ''} 
														onChange={(e) => updateServiceCombo(false, idx, 'name', e.target.value)} 
														className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-semibold text-gray-900 placeholder:text-gray-400 text-base" 
													/>
												</div>
												<div className="flex-shrink-0 pt-6">
													<button 
														type="button" 
														onClick={() => removeServiceCombo(false, idx)} 
														className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border-2 border-transparent hover:border-red-200" 
														aria-label="Eliminar combo"
													>
														<X className="w-5 h-5" />
													</button>
												</div>
											</div>
										</div>
										
										{/* Contenido principal del combo */}
										<div className="p-4 sm:p-6 space-y-8">
											{/* Sección 1: Descripción */}
											<div className="border-b border-gray-200 pb-6">
												<label className="block text-sm font-bold text-gray-700 mb-3">Descripción del Combo</label>
												<textarea 
													placeholder="Describe brevemente qué incluye este paquete promocional y sus beneficios..." 
													value={combo.description || ''} 
													onChange={(e) => updateServiceCombo(false, idx, 'description', e.target.value)} 
													rows={4} 
													className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm text-gray-700 placeholder:text-gray-400" 
												/>
											</div>
											
											{/* Sección 2: Precio Promocional */}
											<div className="border-b border-gray-200 pb-6">
												<label className="block text-sm font-bold text-gray-700 mb-3">Precio Promocional</label>
												<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
													<div className="flex-1 w-full sm:w-auto">
														<input 
															type="text" 
															placeholder="0.00" 
															value={combo.price || ''} 
															onChange={(e) => updateServiceCombo(false, idx, 'price', e.target.value)} 
															className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xl font-bold text-gray-900" 
														/>
													</div>
													<div className="w-full sm:w-auto">
														<select 
															value={combo.currency || 'USD'} 
															onChange={(e) => updateServiceCombo(false, idx, 'currency', e.target.value)} 
															className="w-full sm:w-auto px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-semibold"
														>
															<option value="USD">USD</option>
															<option value="VES">VES</option>
															<option value="EUR">EUR</option>
														</select>
													</div>
												</div>
												{savings > 0 && (
													<div className="mt-4 p-3 bg-green-50 border-2 border-green-200 rounded-lg">
														<div className="flex items-center gap-3">
															<span className="text-base font-bold text-green-700">💰 Ahorro: {savings.toFixed(2)} {combo.currency || 'USD'}</span>
															<span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm font-bold">
																-{savingsPercent}%
															</span>
														</div>
													</div>
												)}
											</div>
											
											{/* Sección 3: Servicios Incluidos */}
											<div>
												<div className="flex items-center justify-between mb-4">
													<label className="block text-sm font-bold text-gray-700">
														Servicios Incluidos en el Combo
													</label>
													{selectedServices.length > 0 && (
														<span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
															{selectedServices.length} {selectedServices.length === 1 ? 'servicio seleccionado' : 'servicios seleccionados'}
														</span>
													)}
												</div>
												<div className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-5 bg-gray-50 max-h-80 overflow-y-auto">
													{privateForm.services.length === 0 ? (
														<div className="text-center py-8">
															<p className="text-sm text-gray-500 font-medium">Primero debes registrar servicios individuales en la sección "Servicios y Precios".</p>
														</div>
													) : (
														<div className="space-y-3">
															{privateForm.services.map((svc, sIdx) => {
																const svcId = (svc as any).id || String(sIdx);
																const checked = combo.serviceIds?.includes(svcId);
																return (
																	<label 
																		key={svcId} 
																		className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
																			checked 
																				? 'bg-indigo-50 border-indigo-400 shadow-md' 
																				: 'bg-white border-gray-200 hover:border-gray-400'
																		}`}
																	>
																		<input
																			type="checkbox"
																			checked={checked}
																			onChange={(e) => {
																				const current = combo.serviceIds || [];
																				const next = e.target.checked ? [...current, svcId] : current.filter((id) => id !== svcId);
																				updateServiceCombo(false, idx, 'serviceIds', next);
																			}}
																			className="mt-1 w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
																		/>
																		<div className="flex-1 min-w-0">
																			<div className="flex items-start justify-between gap-3">
																				<div className="flex-1 min-w-0">
																					<span className={`block text-sm font-semibold ${checked ? 'text-indigo-900' : 'text-gray-800'}`}>
																						{svc.name || `Servicio ${sIdx + 1}`}
																					</span>
																					{svc.description && (
																						<p className="text-xs text-gray-600 mt-1 line-clamp-2">{svc.description}</p>
																					)}
																				</div>
																				{svc.price && (
																					<span className="text-sm font-bold text-gray-700 whitespace-nowrap flex-shrink-0">
																						{svc.price} {svc.currency || 'USD'}
																					</span>
																				)}
																			</div>
																		</div>
																	</label>
																);
															})}
														</div>
													)}
												</div>
											</div>
											
											{/* Sección 4: Resumen del Combo */}
											{selectedServices.length > 0 && (
												<div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 sm:p-5 border-2 border-indigo-200">
													<p className="text-sm font-bold text-indigo-900 mb-3 uppercase tracking-wide">Resumen del Combo</p>
													<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
														<div className="bg-white rounded-lg p-4 border border-gray-200">
															<p className="text-xs text-gray-600 mb-1">Precio Individual Total</p>
															<p className="text-lg font-bold text-gray-900">
																{totalIndividualPrice.toFixed(2)} {combo.currency || 'USD'}
															</p>
														</div>
														<div className="bg-white rounded-lg p-4 border border-gray-200">
															<p className="text-xs text-gray-600 mb-1">Precio del Combo</p>
															<p className="text-lg font-bold text-indigo-600">
																{comboPrice.toFixed(2)} {combo.currency || 'USD'}
															</p>
														</div>
													</div>
													{savings > 0 && (
														<div className="mt-4 p-4 bg-green-100 rounded-lg border-2 border-green-300">
															<div className="flex items-center justify-between">
																<span className="text-sm font-semibold text-green-800">Ahorro Total</span>
																<span className="text-xl font-bold text-green-700">
																	{savings.toFixed(2)} {combo.currency || 'USD'} ({savingsPercent}%)
																</span>
															</div>
														</div>
													)}
												</div>
											)}
										</div>
									</div>
								);
							})}
							
							{/* Botón para agregar nuevo combo */}
							<button 
								type="button" 
								onClick={() => addServiceCombo(false)} 
								className="w-full px-6 py-5 border-2 border-dashed border-indigo-400 rounded-xl text-indigo-700 hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-200 font-bold text-base flex items-center justify-center gap-3 group shadow-sm hover:shadow-md"
							>
								<span className="text-2xl group-hover:scale-125 transition-transform">+</span>
								<span>Agregar Nuevo Combo de Servicios</span>
							</button>
						</div>
					</div>

					{/* Credenciales para consultorio privado */}
					<div className="bg-gray-50 rounded-xl p-4 sm:p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
							<Award className="w-5 h-5 text-indigo-600" />
							Credenciales y Validación
						</h3>
						<div className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Licencia Médica <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={privateForm.credentials.license || ''}
										onChange={(e) =>
											setPrivateForm((prev) => ({
												...prev,
												credentials: { ...prev.credentials, license: e.target.value },
											}))
										}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										required
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Número de Licencia <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={privateForm.credentials.licenseNumber || ''}
										onChange={(e) =>
											setPrivateForm((prev) => ({
												...prev,
												credentials: { ...prev.credentials, licenseNumber: e.target.value },
											}))
										}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										required
									/>
								</div>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Emitida por <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={privateForm.credentials.issuedBy || ''}
										onChange={(e) =>
											setPrivateForm((prev) => ({
												...prev,
												credentials: { ...prev.credentials, issuedBy: e.target.value },
											}))
										}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										placeholder="Ej: Colegio de Médicos de Venezuela"
										required
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Fecha de Expiración <span className="text-red-500">*</span>
									</label>
									<input
										type="date"
										value={privateForm.credentials.expirationDate || ''}
										onChange={(e) =>
											setPrivateForm((prev) => ({
												...prev,
												credentials: { ...prev.credentials, expirationDate: e.target.value },
											}))
										}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										required
									/>
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Documentos de Credenciales <span className="text-red-500">*</span>
								</label>
								<p className="text-xs text-gray-500 mb-2">Debe subir al menos un documento que valide su licencia médica (PDF, JPG, PNG)</p>
								<input ref={credentialInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={handleCredentialUpload} className="hidden" />
								<button type="button" onClick={() => credentialInputRef.current?.click()} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2">
									<FileText className="w-4 h-4" />
									Subir Documentos
								</button>
								{(privateForm.credentials.credentialFiles || []).length > 0 && (
									<div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
										{privateForm.credentials.credentialFiles.map((url, idx) => {
											const isImage = url.match(/\.(jpg|jpeg|png|webp|gif)$|data:image/i);
											return (
												<div key={idx} className="relative group bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
													<div className="flex flex-col items-center">
														{isImage ? (
															<div className="w-full h-32 mb-2 rounded-lg overflow-hidden bg-gray-100 border border-gray-100 flex items-center justify-center">
																<img src={url} alt={`Documento ${idx + 1}`} className="w-full h-full object-cover" />
															</div>
														) : (
															<div className="w-full h-32 mb-2 rounded-lg bg-indigo-50 flex flex-col items-center justify-center border border-indigo-100">
																<FileText className="w-10 h-10 text-indigo-400 mb-2" />
																<span className="text-[10px] font-medium text-indigo-600 uppercase tracking-wider">Documento PDF/Otro</span>
															</div>
														)}
														<div className="flex items-center gap-2 w-full px-1">
															<FileCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
															<span className="text-xs text-gray-600 truncate flex-1 font-medium">Documento {idx + 1}</span>
														</div>
													</div>
													<button 
														type="button" 
														onClick={() => handleDeleteCredential(url)}
														className="absolute -top-2 -right-2 p-1.5 bg-red-600 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
														title="Eliminar documento"
													>
														<Trash2 className="w-3.5 h-3.5" />
													</button>
												</div>
											);
										})}
									</div>
								)}
								{uploadingCredentials && (
									<div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-3 animate-pulse">
										<Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
										<span className="text-sm text-indigo-700 font-medium">Subiendo documentos...</span>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Historial Crediticio para consultorio privado */}
					<div className="bg-gray-50 rounded-xl p-4 sm:p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
							<Award className="w-5 h-5 text-indigo-600" />
							Historial Crediticio
						</h3>
						<div className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Universidad <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={privateForm.creditHistory?.university || ''}
										onChange={(e) =>
											setPrivateForm((prev) => ({
												...prev,
												creditHistory: { ...(prev.creditHistory || {}), university: e.target.value },
											}))
										}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										required
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Título <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={privateForm.creditHistory?.degree || ''}
										onChange={(e) =>
											setPrivateForm((prev) => ({
												...prev,
												creditHistory: { ...(prev.creditHistory || {}), degree: e.target.value },
											}))
										}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										placeholder="Ej: Médico Cirujano"
										required
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Año de Graduación <span className="text-red-500">*</span>
									</label>
									<input
										type="number"
										value={privateForm.creditHistory?.graduationYear || ''}
										onChange={(e) =>
											setPrivateForm((prev) => ({
												...prev,
												creditHistory: { ...(prev.creditHistory || {}), graduationYear: e.target.value },
											}))
										}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										placeholder="Ej: 2010"
										min="1950"
										max={new Date().getFullYear()}
										required
									/>
								</div>
							</div>
						</div>
					</div>
				</>
			)}

			<div className="bg-gray-50 rounded-xl p-4 sm:p-6">
				<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
					<FileText className="w-5 h-5 text-indigo-600" />
					Firma Digital
				</h3>
				<div className="space-y-4">
					<div className="relative group max-w-md mx-auto">
						{(config.isAffiliated ? affiliatedForm.signature : privateForm.signature) ? (
							<div className="relative border-2 border-gray-300 rounded-lg p-4 bg-white">
								<img src={config.isAffiliated ? affiliatedForm.signature : privateForm.signature} alt="Firma digital" className="max-h-32 mx-auto" />
								{uploadingSignature && (
									<div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-lg">
										<Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
									</div>
								)}
								{!uploadingSignature && (
									<button 
										type="button"
										onClick={async () => {
											const sigUrl = config.isAffiliated ? affiliatedForm.signature : privateForm.signature;
											if (sigUrl) {
												await deleteMedicFile(sigUrl);
												if (config.isAffiliated) setAffiliatedForm(prev => ({ ...prev, signature: '' }));
												else setPrivateForm(prev => ({ ...prev, signature: '' }));
												toast.success('Firma eliminada');
											}
										}}
										className="absolute -top-2 -right-2 p-1.5 bg-red-600 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
									>
										<Trash2 className="w-4 h-4" />
									</button>
								)}
							</div>
						) : (
							<div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-white">
								{uploadingSignature ? (
									<Loader2 className="w-12 h-12 text-indigo-400 mx-auto mb-2 animate-spin" />
								) : (
									<FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
								)}
								<p className="text-gray-500">{uploadingSignature ? 'Subiendo firma...' : 'No hay firma digital cargada'}</p>
							</div>
						)}
					</div>
					<div className="text-center">
						<input ref={signatureInputRef} type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
						<button 
							type="button" 
							onClick={() => signatureInputRef.current?.click()} 
							disabled={uploadingSignature}
							className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
						>
							{uploadingSignature ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
							{config.isAffiliated ? affiliatedForm.signature : privateForm.signature ? 'Cambiar Firma' : 'Subir Firma'}
						</button>
					</div>
				</div>
			</div>

			{/* Métodos de Pago */}
			<div className="bg-gray-50 rounded-xl p-6">
				<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
					<CreditCard className="w-5 h-5 text-indigo-600" />
					Métodos de Pago
				</h3>
				<p className="text-sm text-gray-600 mb-4">Configure los métodos de pago que acepta para recibir pagos de sus pacientes.</p>

				{/* Pago Móvil */}
				<div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-green-100 rounded-lg">
								<Smartphone className="w-5 h-5 text-green-600" />
							</div>
							<div>
								<h4 className="font-semibold text-gray-900">Pago Móvil</h4>
								<p className="text-sm text-gray-500">Recibe pagos mediante transferencias móviles</p>
							</div>
						</div>
						<label className="relative inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								checked={(config.isAffiliated ? affiliatedForm.paymentMethods : privateForm.paymentMethods).find((pm) => pm.type === 'pago_movil')?.enabled || false}
								onChange={(e) => {
									const currentMethods = config.isAffiliated ? affiliatedForm.paymentMethods : privateForm.paymentMethods;
									const existingIndex = currentMethods.findIndex((pm) => pm.type === 'pago_movil');

									if (existingIndex >= 0) {
										const updated = [...currentMethods];
										updated[existingIndex] = { ...updated[existingIndex], enabled: e.target.checked };
										if (config.isAffiliated) {
											setAffiliatedForm((prev) => ({ ...prev, paymentMethods: updated }));
										} else {
											setPrivateForm((prev) => ({ ...prev, paymentMethods: updated }));
										}
									} else {
										const newMethod: PaymentMethod = {
											type: 'pago_movil',
											enabled: e.target.checked,
											data: {
												cedula: '',
												rif: '',
												banco: '',
												telefono: '',
											},
										};
										if (config.isAffiliated) {
											setAffiliatedForm((prev) => ({ ...prev, paymentMethods: [...prev.paymentMethods, newMethod] }));
										} else {
											setPrivateForm((prev) => ({ ...prev, paymentMethods: [...prev.paymentMethods, newMethod] }));
										}
									}
								}}
								className="sr-only peer"
							/>
							<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
						</label>
					</div>

					{(config.isAffiliated ? affiliatedForm.paymentMethods : privateForm.paymentMethods).find((pm) => pm.type === 'pago_movil')?.enabled && (
						<div className="space-y-4 mt-4 pt-4 border-t border-gray-200">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Cédula de Identidad o RIF <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										placeholder="Ej: V-12345678 o J-12345678-9"
										value={(config.isAffiliated ? affiliatedForm.paymentMethods : privateForm.paymentMethods).find((pm) => pm.type === 'pago_movil')?.data?.cedula || (config.isAffiliated ? affiliatedForm.paymentMethods : privateForm.paymentMethods).find((pm) => pm.type === 'pago_movil')?.data?.rif || ''}
										onChange={(e) => {
											const currentMethods = config.isAffiliated ? affiliatedForm.paymentMethods : privateForm.paymentMethods;
											const existingIndex = currentMethods.findIndex((pm) => pm.type === 'pago_movil');

											if (existingIndex >= 0) {
												const updated = [...currentMethods];
												const value = e.target.value;
												// Determinar si es cédula (V- o E-) o RIF (J-)
												if (value.startsWith('J-') || value.startsWith('j-')) {
													updated[existingIndex] = {
														...updated[existingIndex],
														data: {
															...updated[existingIndex].data,
															rif: value,
															cedula: '',
														},
													};
												} else {
													updated[existingIndex] = {
														...updated[existingIndex],
														data: {
															...updated[existingIndex].data,
															cedula: value,
															rif: '',
														},
													};
												}
												if (config.isAffiliated) {
													setAffiliatedForm((prev) => ({ ...prev, paymentMethods: updated }));
												} else {
													setPrivateForm((prev) => ({ ...prev, paymentMethods: updated }));
												}
											}
										}}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										required
									/>
									<p className="mt-1 text-xs text-gray-500">Ingrese su cédula (V-12345678) o RIF (J-12345678-9)</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Banco <span className="text-red-500">*</span>
									</label>
									<select
										value={(config.isAffiliated ? affiliatedForm.paymentMethods : privateForm.paymentMethods).find((pm) => pm.type === 'pago_movil')?.data?.banco || ''}
										onChange={(e) => {
											const currentMethods = config.isAffiliated ? affiliatedForm.paymentMethods : privateForm.paymentMethods;
											const existingIndex = currentMethods.findIndex((pm) => pm.type === 'pago_movil');

											if (existingIndex >= 0) {
												const updated = [...currentMethods];
												updated[existingIndex] = {
													...updated[existingIndex],
													data: {
														...updated[existingIndex].data,
														banco: e.target.value,
													},
												};
												if (config.isAffiliated) {
													setAffiliatedForm((prev) => ({ ...prev, paymentMethods: updated }));
												} else {
													setPrivateForm((prev) => ({ ...prev, paymentMethods: updated }));
												}
											}
										}}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										required>
										<option value="">Seleccione un banco</option>
										<option value="Banesco">Banesco</option>
										<option value="Mercantil">Mercantil</option>
										<option value="Venezuela">Banco de Venezuela</option>
										<option value="Bancaribe">Bancaribe</option>
										<option value="Banco del Tesoro">Banco del Tesoro</option>
										<option value="100% Banco">100% Banco</option>
										<option value="BFC Banco Fondo Común">BFC Banco Fondo Común</option>
										<option value="Banco Activo">Banco Activo</option>
										<option value="Banco Caroní">Banco Caroní</option>
										<option value="Banco de la Gente Emprendedora">Banco de la Gente Emprendedora</option>
										<option value="Banco del Sur">Banco del Sur</option>
										<option value="Banco Exterior">Banco Exterior</option>
										<option value="Banco Plaza">Banco Plaza</option>
										<option value="Banco Provincial">Banco Provincial</option>
										<option value="Banco Sofitasa">Banco Sofitasa</option>
										<option value="Banco Venezolano de Crédito">Banco Venezolano de Crédito</option>
										<option value="BBVA Provincial">BBVA Provincial</option>
										<option value="BNC">BNC</option>
										<option value="Citibank">Citibank</option>
										<option value="Mi Banco">Mi Banco</option>
										<option value="Otro">Otro</option>
									</select>
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Número de Teléfono Afiliado <span className="text-red-500">*</span>
								</label>
								<input
									type="tel"
									placeholder="Ej: 0412-1234567"
									value={(config.isAffiliated ? affiliatedForm.paymentMethods : privateForm.paymentMethods).find((pm) => pm.type === 'pago_movil')?.data?.telefono || ''}
									onChange={(e) => {
										const currentMethods = config.isAffiliated ? affiliatedForm.paymentMethods : privateForm.paymentMethods;
										const existingIndex = currentMethods.findIndex((pm) => pm.type === 'pago_movil');

										if (existingIndex >= 0) {
											const updated = [...currentMethods];
											updated[existingIndex] = {
												...updated[existingIndex],
												data: {
													...updated[existingIndex].data,
													telefono: e.target.value,
												},
											};
											if (config.isAffiliated) {
												setAffiliatedForm((prev) => ({ ...prev, paymentMethods: updated }));
											} else {
												setPrivateForm((prev) => ({ ...prev, paymentMethods: updated }));
											}
										}
									}}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									required
								/>
								<p className="mt-1 text-xs text-gray-500">Ingrese el número de teléfono asociado a su cuenta de pago móvil</p>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Botón de guardar */}
			<div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
				<button type="button" onClick={() => window.location.reload()} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
					Cancelar
				</button>
				<button type="submit" disabled={loading} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
					{loading ? 'Guardando...' : 'Guardar Cambios'}
				</button>
			</div>
		</form>
	);
}
