'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, Camera, FileText, Award, Building2, Stethoscope, X, Check, User, CreditCard, Smartphone } from 'lucide-react';
import type { MedicConfig, MedicCredentials, MedicService, MedicServiceCombo, CreditHistory, PaymentMethod } from '@/types/medic-config';
import { PRIVATE_SPECIALTIES } from '@/lib/constants/specialties';

export default function ProfessionalProfile({ config, onUpdate }: { config: MedicConfig; onUpdate: () => void }) {
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

		// TODO: Implementar upload a Supabase Storage
		// Por ahora, solo mostramos preview
		const reader = new FileReader();
		reader.onloadend = () => {
			if (config.isAffiliated) {
				setAffiliatedForm((prev) => ({ ...prev, photo: reader.result as string }));
			} else {
				setPrivateForm((prev) => ({ ...prev, photo: reader.result as string }));
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
				setAffiliatedForm((prev) => ({ ...prev, signature: reader.result as string }));
			} else {
				setPrivateForm((prev) => ({ ...prev, signature: reader.result as string }));
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
			setAffiliatedForm((prev) => ({
				...prev,
				credentials: {
					...prev.credentials,
					credentialFiles: [...(prev.credentials.credentialFiles || []), ...newFiles],
				},
			}));
		} else {
			setPrivateForm((prev) => ({
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
					<div className="relative">
						{(config.isAffiliated ? affiliatedForm.photo : privateForm.photo) ? (
							<img src={config.isAffiliated ? affiliatedForm.photo : privateForm.photo} alt="Foto de perfil" className="w-32 h-32 rounded-full object-cover border-4 border-indigo-200" />
						) : (
							<div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-indigo-200">
								<Camera className="w-8 h-8 text-gray-400" />
							</div>
						)}
					</div>
					<div>
						<input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
						<button type="button" onClick={() => photoInputRef.current?.click()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
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

					{/* Configuración de WhatsApp para recordatorios */}
					<div className="bg-gray-50 rounded-xl p-6 mt-6">
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
					</div>

					{/* Combos de servicios (afiliado) */}
					<div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 mt-6 border border-indigo-100">
						<div className="mb-6">
							<h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-3">
								<div className="p-2 bg-indigo-600 rounded-lg">
									<Stethoscope className="w-5 h-5 text-white" />
								</div>
								Combos de Servicios (Paquetes Promocionales)
							</h3>
							<p className="text-sm text-gray-600 ml-14">Crea paquetes que agrupen varios servicios individuales con un precio especial. Estos combos se mostrarán también en el módulo de servicios del asistente/recepción.</p>
						</div>
						
						<div className="space-y-6">
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
									<div key={combo.id || idx} className="bg-white rounded-xl border-2 border-gray-200 hover:border-indigo-300 transition-all duration-200 shadow-sm hover:shadow-md overflow-hidden">
										{/* Header del combo */}
										<div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-200">
											<div className="flex items-start justify-between gap-4">
												<div className="flex-1 min-w-0">
													<input 
														type="text" 
														placeholder="Nombre del combo (ej: Control Prenatal Básico)" 
														value={combo.name || ''} 
														onChange={(e) => updateServiceCombo(true, idx, 'name', e.target.value)} 
														className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-semibold text-gray-900 placeholder:text-gray-400" 
													/>
												</div>
												<button 
													type="button" 
													onClick={() => removeServiceCombo(true, idx)} 
													className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
													aria-label="Eliminar combo"
												>
													<X className="w-5 h-5" />
												</button>
											</div>
										</div>
										
										{/* Contenido del combo */}
										<div className="p-6 space-y-6">
											{/* Descripción */}
											<div>
												<label className="block text-sm font-semibold text-gray-700 mb-2">Descripción del Combo</label>
												<textarea 
													placeholder="Describe brevemente qué incluye este paquete promocional..." 
													value={combo.description || ''} 
													onChange={(e) => updateServiceCombo(true, idx, 'description', e.target.value)} 
													rows={3} 
													className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm text-gray-700 placeholder:text-gray-400" 
												/>
											</div>
											
											{/* Precio y moneda */}
											<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
												<div>
													<label className="block text-sm font-semibold text-gray-700 mb-2">Precio Promocional</label>
													<div className="flex items-center gap-3">
														<input 
															type="text" 
															placeholder="0.00" 
															value={combo.price || ''} 
															onChange={(e) => updateServiceCombo(true, idx, 'price', e.target.value)} 
															className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg font-semibold" 
														/>
														<select 
															value={combo.currency || 'USD'} 
															onChange={(e) => updateServiceCombo(true, idx, 'currency', e.target.value)} 
															className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium"
														>
															<option value="USD">USD</option>
															<option value="VES">VES</option>
															<option value="EUR">EUR</option>
														</select>
													</div>
													{savings > 0 && (
														<div className="mt-2 flex items-center gap-2 text-sm">
															<span className="text-green-600 font-semibold">💰 Ahorro: {savings.toFixed(2)} {combo.currency || 'USD'}</span>
															<span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
																-{savingsPercent}%
															</span>
														</div>
													)}
												</div>
												
												{/* Servicios incluidos */}
												<div>
													<label className="block text-sm font-semibold text-gray-700 mb-2">
														Servicios Incluidos
														{selectedServices.length > 0 && (
															<span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
																{selectedServices.length} {selectedServices.length === 1 ? 'servicio' : 'servicios'}
															</span>
														)}
													</label>
													<div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 max-h-64 overflow-y-auto">
														{affiliatedForm.services.length === 0 ? (
															<div className="text-center py-4">
																<p className="text-sm text-gray-400">Primero debes registrar servicios individuales.</p>
															</div>
														) : (
															<div className="space-y-2">
																{affiliatedForm.services.map((svc, sIdx) => {
																	const svcId = (svc as any).id || String(sIdx);
																	const checked = combo.serviceIds?.includes(svcId);
																	return (
																		<label 
																			key={svcId} 
																			className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
																				checked 
																					? 'bg-indigo-50 border-indigo-300 shadow-sm' 
																					: 'bg-white border-gray-200 hover:border-gray-300'
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
																				className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
																			/>
																			<div className="flex-1 min-w-0">
																				<span className={`text-sm font-medium ${checked ? 'text-indigo-900' : 'text-gray-700'}`}>
																					{svc.name || `Servicio ${sIdx + 1}`}
																				</span>
																				{svc.description && (
																					<p className="text-xs text-gray-500 mt-0.5 truncate">{svc.description}</p>
																				)}
																			</div>
																			{svc.price && (
																				<span className="text-xs font-semibold text-gray-600 whitespace-nowrap">
																					{svc.price} {svc.currency || 'USD'}
																				</span>
																			)}
																		</label>
																	);
																})}
															</div>
														)}
													</div>
												</div>
											</div>
											
											{/* Resumen de servicios seleccionados */}
											{selectedServices.length > 0 && (
												<div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
													<div className="flex items-center justify-between">
														<div>
															<p className="text-sm font-semibold text-indigo-900 mb-1">Resumen del Combo</p>
															<p className="text-xs text-indigo-700">
																Precio individual total: <span className="font-semibold">{totalIndividualPrice.toFixed(2)} {combo.currency || 'USD'}</span>
															</p>
														</div>
														{savings > 0 && (
															<div className="text-right">
																<p className="text-sm font-bold text-green-600">
																	Precio del combo: {comboPrice.toFixed(2)} {combo.currency || 'USD'}
																</p>
																<p className="text-xs text-green-700 mt-0.5">
																	Ahorras {savings.toFixed(2)} {combo.currency || 'USD'} ({savingsPercent}%)
																</p>
															</div>
														)}
													</div>
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
								className="w-full px-6 py-4 border-2 border-dashed border-indigo-300 rounded-xl text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition-all duration-200 font-semibold flex items-center justify-center gap-2 group"
							>
								<span className="text-xl group-hover:scale-110 transition-transform">+</span>
								<span>Agregar Nuevo Combo de Servicios</span>
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
					<div className="bg-gray-50 rounded-xl p-6">
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
					<div className="bg-gray-50 rounded-xl p-6">
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
					<div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 mt-6 border border-indigo-100">
						<div className="mb-6">
							<h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-3">
								<div className="p-2 bg-indigo-600 rounded-lg">
									<Stethoscope className="w-5 h-5 text-white" />
								</div>
								Combos de Servicios (Paquetes Promocionales)
							</h3>
							<p className="text-sm text-gray-600 ml-14">Crea combos que agrupen varios de tus servicios privados con precios especiales.</p>
						</div>
						
						<div className="space-y-6">
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
									<div key={combo.id || idx} className="bg-white rounded-xl border-2 border-gray-200 hover:border-indigo-300 transition-all duration-200 shadow-sm hover:shadow-md overflow-hidden">
										{/* Header del combo */}
										<div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-200">
											<div className="flex items-start justify-between gap-4">
												<div className="flex-1 min-w-0">
													<input 
														type="text" 
														placeholder="Nombre del combo (ej: Control Prenatal Básico)" 
														value={combo.name || ''} 
														onChange={(e) => updateServiceCombo(false, idx, 'name', e.target.value)} 
														className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-semibold text-gray-900 placeholder:text-gray-400" 
													/>
												</div>
												<button 
													type="button" 
													onClick={() => removeServiceCombo(false, idx)} 
													className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
													aria-label="Eliminar combo"
												>
													<X className="w-5 h-5" />
												</button>
											</div>
										</div>
										
										{/* Contenido del combo */}
										<div className="p-6 space-y-6">
											{/* Descripción */}
											<div>
												<label className="block text-sm font-semibold text-gray-700 mb-2">Descripción del Combo</label>
												<textarea 
													placeholder="Describe brevemente qué incluye este paquete promocional..." 
													value={combo.description || ''} 
													onChange={(e) => updateServiceCombo(false, idx, 'description', e.target.value)} 
													rows={3} 
													className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm text-gray-700 placeholder:text-gray-400" 
												/>
											</div>
											
											{/* Precio y moneda */}
											<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
												<div>
													<label className="block text-sm font-semibold text-gray-700 mb-2">Precio Promocional</label>
													<div className="flex items-center gap-3">
														<input 
															type="text" 
															placeholder="0.00" 
															value={combo.price || ''} 
															onChange={(e) => updateServiceCombo(false, idx, 'price', e.target.value)} 
															className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg font-semibold" 
														/>
														<select 
															value={combo.currency || 'USD'} 
															onChange={(e) => updateServiceCombo(false, idx, 'currency', e.target.value)} 
															className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium"
														>
															<option value="USD">USD</option>
															<option value="VES">VES</option>
															<option value="EUR">EUR</option>
														</select>
													</div>
													{savings > 0 && (
														<div className="mt-2 flex items-center gap-2 text-sm">
															<span className="text-green-600 font-semibold">💰 Ahorro: {savings.toFixed(2)} {combo.currency || 'USD'}</span>
															<span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
																-{savingsPercent}%
															</span>
														</div>
													)}
												</div>
												
												{/* Servicios incluidos */}
												<div>
													<label className="block text-sm font-semibold text-gray-700 mb-2">
														Servicios Incluidos
														{selectedServices.length > 0 && (
															<span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
																{selectedServices.length} {selectedServices.length === 1 ? 'servicio' : 'servicios'}
															</span>
														)}
													</label>
													<div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 max-h-64 overflow-y-auto">
														{privateForm.services.length === 0 ? (
															<div className="text-center py-4">
																<p className="text-sm text-gray-400">Primero debes registrar servicios individuales.</p>
															</div>
														) : (
															<div className="space-y-2">
																{privateForm.services.map((svc, sIdx) => {
																	const svcId = (svc as any).id || String(sIdx);
																	const checked = combo.serviceIds?.includes(svcId);
																	return (
																		<label 
																			key={svcId} 
																			className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
																				checked 
																					? 'bg-indigo-50 border-indigo-300 shadow-sm' 
																					: 'bg-white border-gray-200 hover:border-gray-300'
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
																				className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
																			/>
																			<div className="flex-1 min-w-0">
																				<span className={`text-sm font-medium ${checked ? 'text-indigo-900' : 'text-gray-700'}`}>
																					{svc.name || `Servicio ${sIdx + 1}`}
																				</span>
																				{svc.description && (
																					<p className="text-xs text-gray-500 mt-0.5 truncate">{svc.description}</p>
																				)}
																			</div>
																			{svc.price && (
																				<span className="text-xs font-semibold text-gray-600 whitespace-nowrap">
																					{svc.price} {svc.currency || 'USD'}
																				</span>
																			)}
																		</label>
																	);
																})}
															</div>
														)}
													</div>
												</div>
											</div>
											
											{/* Resumen de servicios seleccionados */}
											{selectedServices.length > 0 && (
												<div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
													<div className="flex items-center justify-between">
														<div>
															<p className="text-sm font-semibold text-indigo-900 mb-1">Resumen del Combo</p>
															<p className="text-xs text-indigo-700">
																Precio individual total: <span className="font-semibold">{totalIndividualPrice.toFixed(2)} {combo.currency || 'USD'}</span>
															</p>
														</div>
														{savings > 0 && (
															<div className="text-right">
																<p className="text-sm font-bold text-green-600">
																	Precio del combo: {comboPrice.toFixed(2)} {combo.currency || 'USD'}
																</p>
																<p className="text-xs text-green-700 mt-0.5">
																	Ahorras {savings.toFixed(2)} {combo.currency || 'USD'} ({savingsPercent}%)
																</p>
															</div>
														)}
													</div>
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
								className="w-full px-6 py-4 border-2 border-dashed border-indigo-300 rounded-xl text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition-all duration-200 font-semibold flex items-center justify-center gap-2 group"
							>
								<span className="text-xl group-hover:scale-110 transition-transform">+</span>
								<span>Agregar Nuevo Combo de Servicios</span>
							</button>
						</div>
					</div>

					{/* Credenciales para consultorio privado */}
					<div className="bg-gray-50 rounded-xl p-6">
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
								{privateForm.credentials.credentialFiles && privateForm.credentials.credentialFiles.length > 0 && (
									<div className="mt-2 space-y-2">
										{privateForm.credentials.credentialFiles.map((file, idx) => (
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

					{/* Historial Crediticio para consultorio privado */}
					<div className="bg-gray-50 rounded-xl p-6">
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

			{/* Firma digital */}
			<div className="bg-gray-50 rounded-xl p-6">
				<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
					<FileText className="w-5 h-5 text-indigo-600" />
					Firma Digital
				</h3>
				<div className="space-y-4">
					{(config.isAffiliated ? affiliatedForm.signature : privateForm.signature) ? (
						<div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
							<img src={config.isAffiliated ? affiliatedForm.signature : privateForm.signature} alt="Firma digital" className="max-h-32 mx-auto" />
						</div>
					) : (
						<div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
							<FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
							<p className="text-gray-500">No hay firma digital cargada</p>
						</div>
					)}
					<input ref={signatureInputRef} type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
					<button type="button" onClick={() => signatureInputRef.current?.click()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
						<Upload className="w-4 h-4" />
						{config.isAffiliated ? affiliatedForm.signature : privateForm.signature ? 'Cambiar Firma' : 'Subir Firma'}
					</button>
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
