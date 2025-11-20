// app/dashboard/medic/configuracion/consultorio/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Save, Building2, AlertCircle, MapPin, Image, X, Camera, CheckCircle, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MedicConfig } from '@/types/medic-config';
import LeafletMapPicker from '@/components/clinic/LeafletMapPicker';
import PhotoUploader from '@/components/clinic/PhotoUploader';

interface ClinicProfile {
	id: string;
	organization_id: string;
	legal_name: string;
	trade_name?: string;
	specialties: string[];
	opening_hours: unknown;
	phone_fixed?: string;
	phone_mobile?: string;
	contact_email?: string;
	address_operational?: string;
	location?: { lat: number; lng: number; address: string } | string | null;
	photos?: string[] | string | null;
	profile_photo?: string | null;
}

export default function ConsultorioConfigPage() {
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [medicConfig, setMedicConfig] = useState<MedicConfig | null>(null);
	const [profile, setProfile] = useState<ClinicProfile | null>(null);
	const [formData, setFormData] = useState({
		legal_name: '',
		trade_name: '',
		specialties: [] as string[],
		phone_fixed: '',
		phone_mobile: '',
		contact_email: '',
		address_operational: '',
		location: null as { lat: number; lng: number; address: string } | null,
		photos: [] as string[],
		profile_photo: null as string | null,
	});
	const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);

	useEffect(() => {
		checkAccess();
	}, []);

	const checkAccess = async () => {
		try {
			// Verificar tipo de organización
			const res = await fetch('/api/medic/config', {
				credentials: 'include',
			});

			if (res.ok) {
				const data = await res.json();
				setMedicConfig(data);
				
				// Si no es CONSULTORIO, redirigir
				if (data.organizationType !== 'CONSULTORIO') {
					router.push('/dashboard/medic/configuracion');
					return;
				}
				
				// Si es CONSULTORIO, cargar el perfil
				await fetchProfile();
			}
		} catch (err) {
			console.error('Error verificando acceso:', err);
		} finally {
			setLoading(false);
		}
	};

	const fetchProfile = async () => {
		try {
			// Intentar obtener desde la API de clinic profile
			const res = await fetch('/api/clinic/profile', {
				credentials: 'include',
			});

			if (res.ok) {
				const data = await res.json();
				if (data.profile) {
					setProfile(data.profile);
					
					// Parsear location si existe
					let location = null;
					if (data.profile.location) {
						try {
							location = typeof data.profile.location === 'string' 
								? JSON.parse(data.profile.location) 
								: data.profile.location;
						} catch {
							location = null;
						}
					}

					// Parsear photos si existe
					let photos: string[] = [];
					if (data.profile.photos) {
						try {
							photos = Array.isArray(data.profile.photos)
								? data.profile.photos
								: typeof data.profile.photos === 'string'
								? JSON.parse(data.profile.photos)
								: [];
						} catch {
							photos = [];
						}
					}

					setFormData({
						legal_name: data.profile.legal_name || '',
						trade_name: data.profile.trade_name || '',
						specialties: Array.isArray(data.profile.specialties) ? data.profile.specialties : [],
						phone_fixed: data.profile.phone_fixed || '',
						phone_mobile: data.profile.phone_mobile || '',
						contact_email: data.profile.contact_email || '',
						address_operational: data.profile.address_operational || '',
						location,
						photos,
						profile_photo: data.profile.profile_photo || null,
					});

					if (data.profile.profile_photo) {
						setProfilePhotoPreview(data.profile.profile_photo);
					}
				}
			}
		} catch (err) {
			console.error('Error:', err);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		// Validar mínimo de fotos
		if (formData.photos.length < 3) {
			alert('Debes subir al menos 3 fotos del consultorio');
			return;
		}

		setSaving(true);
		try {
			const payload = {
				...formData,
				location: formData.location ? JSON.stringify(formData.location) : null,
				photos: JSON.stringify(formData.photos),
			};

			const res = await fetch('/api/clinic/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || 'Error al guardar configuración');
			}

			alert('Configuración guardada exitosamente');
			await fetchProfile();
		} catch (err) {
			console.error('Error:', err);
			alert(err instanceof Error ? err.message : 'Error al guardar configuración');
		} finally {
			setSaving(false);
		}
	};

	const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			// Validar tipo
			if (!file.type.startsWith('image/')) {
				alert('Por favor selecciona un archivo de imagen');
				return;
			}

			// Validar tamaño (máximo 5MB)
			if (file.size > 5 * 1024 * 1024) {
				alert('La imagen es muy grande. Máximo 5MB');
				return;
			}

			// Crear URL temporal para preview
			const url = URL.createObjectURL(file);
			setProfilePhotoPreview(url);
			setFormData({ ...formData, profile_photo: url });
			
			// TODO: Subir a Supabase Storage
		}
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="h-8 bg-slate-200 rounded w-1/3 animate-pulse"></div>
				<div className="bg-white rounded-2xl border border-blue-100 p-6 space-y-4">
					<div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse"></div>
				</div>
			</div>
		);
	}

	// Verificación adicional por si acaso
	if (medicConfig && medicConfig.organizationType !== 'CONSULTORIO') {
		return (
			<div className="space-y-6">
				<div className="bg-red-50 border-2 border-red-300 rounded-xl p-6">
					<div className="flex items-center gap-3">
						<AlertCircle className="w-6 h-6 text-red-600" />
						<div>
							<h3 className="text-lg font-semibold text-red-900">Acceso Denegado</h3>
							<p className="text-red-700 mt-1">
								Esta página solo está disponible para médicos afiliados a un CONSULTORIO.
							</p>
							<button
								onClick={() => router.push('/dashboard/medic/configuracion')}
								className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
							>
								Volver a Configuración
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header mejorado */}
			<div className="flex items-center gap-4">
				<div className="p-3 bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 rounded-2xl shadow-lg">
					<Building2 className="w-8 h-8 text-white" />
				</div>
				<div>
					<h1 className="text-3xl font-bold text-slate-900">Configuración del Consultorio</h1>
					<p className="text-slate-600 mt-1">Gestiona la información y ubicación de tu consultorio</p>
				</div>
			</div>

			<motion.form
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				onSubmit={handleSubmit}
				className="bg-white rounded-3xl border border-slate-200/60 shadow-xl p-8 space-y-8"
			>
				{/* Información Básica */}
				<div className="space-y-6">
					<div className="flex items-center gap-2 pb-4 border-b border-slate-200">
						<Building2 className="w-5 h-5 text-teal-600" />
						<h2 className="text-xl font-bold text-slate-900">Información Básica</h2>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="block text-sm font-bold text-slate-900 mb-2">
								Nombre Legal <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								required
								value={formData.legal_name}
								onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
								className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-slate-900 shadow-sm transition-all"
							/>
						</div>

						<div>
							<label className="block text-sm font-bold text-slate-900 mb-2">Nombre Comercial</label>
							<input
								type="text"
								value={formData.trade_name}
								onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
								className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-slate-900 shadow-sm transition-all"
							/>
						</div>

						<div>
							<label className="block text-sm font-bold text-slate-900 mb-2">Teléfono Fijo</label>
							<input
								type="tel"
								value={formData.phone_fixed}
								onChange={(e) => setFormData({ ...formData, phone_fixed: e.target.value })}
								className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-slate-900 shadow-sm transition-all"
							/>
						</div>

						<div>
							<label className="block text-sm font-bold text-slate-900 mb-2">Teléfono Móvil</label>
							<input
								type="tel"
								value={formData.phone_mobile}
								onChange={(e) => setFormData({ ...formData, phone_mobile: e.target.value })}
								className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-slate-900 shadow-sm transition-all"
							/>
						</div>

						<div className="md:col-span-2">
							<label className="block text-sm font-bold text-slate-900 mb-2">Email de Contacto</label>
							<input
								type="email"
								value={formData.contact_email}
								onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
								className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-slate-900 shadow-sm transition-all"
							/>
						</div>

						<div className="md:col-span-2">
							<label className="block text-sm font-bold text-slate-900 mb-2">Dirección Operacional</label>
							<textarea
								value={formData.address_operational}
								onChange={(e) => setFormData({ ...formData, address_operational: e.target.value })}
								rows={3}
								className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-slate-900 shadow-sm transition-all resize-none"
							/>
						</div>
					</div>
				</div>

				{/* Ubicación en Google Maps */}
				<div className="space-y-4 pt-6 border-t border-slate-200">
					<div className="flex items-center gap-2 pb-4">
						<MapPin className="w-5 h-5 text-teal-600" />
						<h2 className="text-xl font-bold text-slate-900">Ubicación del Consultorio</h2>
					</div>
					<p className="text-sm text-slate-600 mb-4">
						Selecciona la ubicación exacta de tu consultorio en el mapa. Los pacientes podrán ver esta ubicación y obtener direcciones.
					</p>
					<LeafletMapPicker
						onLocationSelect={(location) => {
							setFormData({ ...formData, location, address_operational: location.address });
						}}
						initialLocation={formData.location}
					/>
				</div>

				{/* Fotos del Consultorio */}
				<div className="space-y-4 pt-6 border-t border-slate-200">
					<div className="flex items-center gap-2 pb-4">
						<Camera className="w-5 h-5 text-teal-600" />
						<h2 className="text-xl font-bold text-slate-900">Fotos del Consultorio</h2>
					</div>
					<p className="text-sm text-slate-600 mb-4">
						Sube al menos 3 fotos del interior y exterior de tu consultorio para que los pacientes puedan conocer tus instalaciones.
					</p>
					<PhotoUploader
						onPhotosChange={(photos) => setFormData({ ...formData, photos })}
						initialPhotos={formData.photos}
						maxPhotos={10}
						minPhotos={3}
					/>
				</div>

				{/* Foto de Perfil */}
				<div className="space-y-4 pt-6 border-t border-slate-200">
					<div className="flex items-center gap-2 pb-4">
						<Image className="w-5 h-5 text-teal-600" />
						<h2 className="text-xl font-bold text-slate-900">Foto de Perfil del Consultorio</h2>
					</div>
					<p className="text-sm text-slate-600 mb-4">
						Esta será la imagen principal que verán los pacientes al buscar tu consultorio.
					</p>
					<div className="flex items-start gap-6">
						{profilePhotoPreview && (
							<div className="relative group">
								<div className="w-32 h-32 rounded-2xl overflow-hidden border-3 border-teal-200 shadow-lg">
									<img
										src={profilePhotoPreview}
										alt="Foto de perfil del consultorio"
										className="w-full h-full object-cover"
									/>
								</div>
								<button
									type="button"
									onClick={() => {
										setProfilePhotoPreview(null);
										setFormData({ ...formData, profile_photo: null });
									}}
									className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg opacity-0 group-hover:opacity-100"
								>
									<X className="w-4 h-4" />
								</button>
							</div>
						)}
						<div className="flex-1">
							<input
								type="file"
								accept="image/*"
								onChange={handleProfilePhotoChange}
								className="hidden"
								id="profile-photo-input"
							/>
							<label
								htmlFor="profile-photo-input"
								className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl hover:from-teal-700 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg cursor-pointer font-semibold"
							>
								<Upload className="w-5 h-5" />
								{profilePhotoPreview ? 'Cambiar Foto de Perfil' : 'Subir Foto de Perfil'}
							</label>
							<p className="text-xs text-slate-500 mt-2">
								Formato: JPG, PNG • Tamaño máximo: 5MB
							</p>
						</div>
					</div>
				</div>

				{/* Botones de acción */}
				<div className="flex gap-4 pt-6 border-t border-slate-200">
					<Button
						type="submit"
						disabled={saving || formData.photos.length < 3}
						className="px-8 py-3 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 hover:from-teal-700 hover:via-cyan-700 hover:to-blue-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Save className="w-5 h-5 mr-2" />
						{saving ? 'Guardando...' : 'Guardar Configuración'}
					</Button>
					{formData.photos.length < 3 && (
						<div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-2 border-amber-200 rounded-xl">
							<AlertCircle className="w-5 h-5 text-amber-600" />
							<p className="text-sm text-amber-800 font-medium">
								Debes subir al menos 3 fotos para guardar
							</p>
						</div>
					)}
				</div>
			</motion.form>
		</div>
	);
}
