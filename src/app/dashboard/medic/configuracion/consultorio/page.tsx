// app/dashboard/medic/configuracion/consultorio/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Building2, AlertCircle, MapPin, Image, X, Camera, CheckCircle, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MedicConfig } from '@/types/medic-config';
import LeafletMapPicker from '@/components/clinic/LeafletMapPicker';
import PhotoUploader from '@/components/clinic/PhotoUploader';

// Helper function to convert Supabase Storage path to public URL
function getPublicImageUrl(path: string): string {
	if (!path) return path;
	// Si ya es una URL completa, devolverla tal cual
	if (path.startsWith('http://') || path.startsWith('https://')) {
		return path;
	}
	// Si es un path de Supabase Storage, convertir a URL pública
	if (path.startsWith('clinic-photos/')) {
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
		const bucket = 'clinic-photos';
		return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
	}
	// Si es un blob URL temporal, mantenerla
	if (path.startsWith('blob:')) {
		return path;
	}
	return path;
}

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
	const [showSuccessModal, setShowSuccessModal] = useState(false);
	const [medicConfig, setMedicConfig] = useState<MedicConfig | null>(null);
	const [profile, setProfile] = useState<ClinicProfile | null>(null);
	const [formData, setFormData] = useState({
		legal_name: '',
		trade_name: '',
		specialties: [] as string[],
		phone_fixed: '',
		phone_mobile: '',
		contact_email: '',
		website: '',
		social_facebook: '',
		social_instagram: '',
		sanitary_license: '',
		liability_insurance_number: '',
		address_operational: '',
		opening_hours: [] as any[],
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
			setLoading(true);
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

					// Parsear photos si existe y convertir a URLs públicas si son paths de Supabase Storage
					let photos: string[] = [];
					if (data.profile.photos) {
						try {
							const parsedPhotos = Array.isArray(data.profile.photos)
								? data.profile.photos
								: typeof data.profile.photos === 'string'
								? JSON.parse(data.profile.photos)
								: [];
							
							// Convertir paths de Supabase Storage a URLs públicas
							photos = parsedPhotos.map((photo: string) => getPublicImageUrl(photo));
						} catch {
							photos = [];
						}
					}

					// Parsear opening_hours si existe
					let openingHours: any[] = [];
					if (data.profile.opening_hours) {
						try {
							openingHours = Array.isArray(data.profile.opening_hours)
								? data.profile.opening_hours
								: typeof data.profile.opening_hours === 'string'
								? JSON.parse(data.profile.opening_hours)
								: [];
						} catch {
							openingHours = [];
						}
					}

					// Cargar todos los campos en el formulario
					setFormData({
						legal_name: data.profile.legal_name || '',
						trade_name: data.profile.trade_name || '',
						specialties: Array.isArray(data.profile.specialties) ? data.profile.specialties : [],
						phone_fixed: data.profile.phone_fixed || '',
						phone_mobile: data.profile.phone_mobile || '',
						contact_email: data.profile.contact_email || '',
						website: data.profile.website || '',
						social_facebook: data.profile.social_facebook || '',
						social_instagram: data.profile.social_instagram || '',
						sanitary_license: data.profile.sanitary_license || '',
						liability_insurance_number: data.profile.liability_insurance_number || '',
						address_operational: data.profile.address_operational || '',
						opening_hours: openingHours,
						location,
						photos,
						profile_photo: data.profile.profile_photo || null,
					});

					// Convertir profile_photo a URL pública si es un path de Supabase Storage
					if (data.profile.profile_photo) {
						const profilePhotoUrl = getPublicImageUrl(data.profile.profile_photo);
						setProfilePhotoPreview(profilePhotoUrl);
					}
				} else {
					// No hay perfil guardado aún, mantener valores por defecto
					console.log('No hay perfil guardado aún. El formulario está listo para crear uno nuevo.');
				}
			} else {
				// Error al obtener el perfil
				const errorData = await res.json().catch(() => ({}));
				console.error('Error al obtener perfil:', errorData);
			}
		} catch (err) {
			console.error('Error al cargar perfil:', err);
		} finally {
			setLoading(false);
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
				legal_name: formData.legal_name || null,
				trade_name: formData.trade_name || null,
				phone_fixed: formData.phone_fixed || null,
				phone_mobile: formData.phone_mobile || null,
				contact_email: formData.contact_email || null,
				website: formData.website || null,
				social_facebook: formData.social_facebook || null,
				social_instagram: formData.social_instagram || null,
				sanitary_license: formData.sanitary_license || null,
				liability_insurance_number: formData.liability_insurance_number || null,
				address_operational: formData.address_operational || null,
				location: formData.location ? JSON.stringify(formData.location) : null,
				photos: formData.photos.length > 0 ? JSON.stringify(formData.photos) : null,
				opening_hours: formData.opening_hours.length > 0 ? JSON.stringify(formData.opening_hours) : null,
				specialties: formData.specialties.length > 0 ? JSON.stringify(formData.specialties) : null,
				profile_photo: formData.profile_photo || null,
			};

			const res = await fetch('/api/clinic/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const errorData = await res.json();
				console.error('Error del servidor:', errorData);
				throw new Error(errorData.error || errorData.details || 'Error al guardar configuración');
			}

			const savedData = await res.json();
			console.log('Datos guardados exitosamente:', savedData);

			// Recargar los datos primero
			await fetchProfile();
			
			// Mostrar modal de éxito
			setShowSuccessModal(true);
			
			// Cerrar modal y recargar página después de 2.5 segundos
			setTimeout(() => {
				setShowSuccessModal(false);
				window.location.reload();
			}, 2500);
		} catch (err) {
			console.error('Error:', err);
			alert(err instanceof Error ? err.message : 'Error al guardar configuración');
		} finally {
			setSaving(false);
		}
	};

	const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			// Detectar tipo MIME basado en la extensión si el tipo detectado no es válido
			let fileType = file.type;
			const fileName = file.name.toLowerCase();
			const fileExt = fileName.split('.').pop() || '';
			
			// Mapeo de extensiones a tipos MIME
			const mimeTypeMap: Record<string, string> = {
				'jpg': 'image/jpeg',
				'jpeg': 'image/jpeg',
				'png': 'image/png',
				'gif': 'image/gif',
				'webp': 'image/webp',
				'bmp': 'image/bmp',
				'svg': 'image/svg+xml',
			};

			// Si el tipo MIME no es válido o es text/plain, intentar detectarlo por extensión
			if (!fileType || !fileType.startsWith('image/') || fileType.includes('text/plain')) {
				if (mimeTypeMap[fileExt]) {
					fileType = mimeTypeMap[fileExt];
					console.log(`[Profile Photo] Tipo MIME corregido de "${file.type}" a "${fileType}" para archivo ${file.name}`);
				} else {
					alert(`Tipo de archivo no soportado. Extensiones permitidas: ${Object.keys(mimeTypeMap).join(', ')}`);
					return;
				}
			}

			// Validar tipo de archivo
			if (!fileType.startsWith('image/')) {
				alert('Por favor selecciona un archivo de imagen');
				return;
			}

			// Validar tamaño (máximo 5MB)
			if (file.size > 5 * 1024 * 1024) {
				alert('La imagen es muy grande. Máximo 5MB');
				return;
			}

			// Crear URL temporal para preview
			const previewUrl = URL.createObjectURL(file);
			setProfilePhotoPreview(previewUrl);

			// Subir a Supabase Storage
			try {
				const uploadFormData = new FormData();
				uploadFormData.append('file', file);
				uploadFormData.append('photo_type', 'profile');

				const uploadRes = await fetch('/api/clinic/upload-photo', {
					method: 'POST',
					credentials: 'include',
					body: uploadFormData,
				});

				if (uploadRes.ok) {
					const uploadData = await uploadRes.json();
					// Guardar la URL pública en el formulario
					setFormData({ ...formData, profile_photo: uploadData.url });
					// Actualizar el preview con la URL pública
					setProfilePhotoPreview(uploadData.url);
					// Revocar la URL temporal
					URL.revokeObjectURL(previewUrl);
				} else {
					const errorData = await uploadRes.json().catch(() => ({ error: 'Error desconocido' }));
					console.error('Error subiendo foto de perfil:', errorData);
					alert(`Error al subir la imagen: ${errorData.error || 'Error desconocido'}`);
					// Revocar la URL temporal
					URL.revokeObjectURL(previewUrl);
					setProfilePhotoPreview(null);
				}
			} catch (err) {
				console.error('Error subiendo foto de perfil:', err);
				alert('Error al subir la imagen. Por favor, inténtalo de nuevo.');
				setProfilePhotoPreview(null);
			}
		}
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<div className="p-3 bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 rounded-2xl shadow-lg animate-pulse">
						<Building2 className="w-8 h-8 text-white" />
					</div>
					<div className="space-y-2">
						<div className="h-8 bg-slate-200 rounded w-64 animate-pulse"></div>
						<div className="h-4 bg-slate-200 rounded w-96 animate-pulse"></div>
					</div>
				</div>
				<div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 space-y-6">
					<div className="space-y-4">
						<div className="h-4 bg-slate-200 rounded w-1/4 animate-pulse"></div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{[...Array(6)].map((_, i) => (
								<div key={i} className="space-y-2">
									<div className="h-4 bg-slate-200 rounded w-1/3 animate-pulse"></div>
									<div className="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
								</div>
							))}
						</div>
					</div>
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
					<p className="text-slate-600 mt-1">
						{profile ? 'Edita la información y ubicación de tu consultorio' : 'Completa la información de tu consultorio'}
					</p>
				</div>
			</div>

			{/* Indicador de datos cargados */}
			{profile && (
				<div className="bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-xl p-4 flex items-center gap-3">
					<CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0" />
					<div>
						<p className="text-sm font-semibold text-teal-900">Datos del consultorio cargados</p>
						<p className="text-xs text-teal-700 mt-0.5">Puedes editar cualquier campo y guardar los cambios</p>
					</div>
				</div>
			)}

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

						<div className="md:col-span-2">
							<label className="block text-sm font-bold text-slate-900 mb-2">Sitio Web</label>
							<input
								type="url"
								value={formData.website}
								onChange={(e) => setFormData({ ...formData, website: e.target.value })}
								placeholder="https://ejemplo.com"
								className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-slate-900 shadow-sm transition-all"
							/>
						</div>

						<div>
							<label className="block text-sm font-bold text-slate-900 mb-2">Facebook</label>
							<input
								type="url"
								value={formData.social_facebook}
								onChange={(e) => setFormData({ ...formData, social_facebook: e.target.value })}
								placeholder="https://facebook.com/tu-pagina"
								className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-slate-900 shadow-sm transition-all"
							/>
						</div>

						<div>
							<label className="block text-sm font-bold text-slate-900 mb-2">Instagram</label>
							<input
								type="url"
								value={formData.social_instagram}
								onChange={(e) => setFormData({ ...formData, social_instagram: e.target.value })}
								placeholder="https://instagram.com/tu-cuenta"
								className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-slate-900 shadow-sm transition-all"
							/>
						</div>

						<div>
							<label className="block text-sm font-bold text-slate-900 mb-2">Licencia Sanitaria</label>
							<input
								type="text"
								value={formData.sanitary_license}
								onChange={(e) => setFormData({ ...formData, sanitary_license: e.target.value })}
								placeholder="Número de licencia sanitaria"
								className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-slate-900 shadow-sm transition-all"
							/>
						</div>

						<div>
							<label className="block text-sm font-bold text-slate-900 mb-2">Seguro de Responsabilidad</label>
							<input
								type="text"
								value={formData.liability_insurance_number}
								onChange={(e) => setFormData({ ...formData, liability_insurance_number: e.target.value })}
								placeholder="Número de seguro de responsabilidad"
								className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-slate-900 shadow-sm transition-all"
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

			{/* Modal de Éxito */}
			<AnimatePresence>
				{showSuccessModal && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999] p-4"
						onClick={() => setShowSuccessModal(false)}
					>
						<motion.div
							initial={{ scale: 0.85, opacity: 0, y: 30 }}
							animate={{ scale: 1, opacity: 1, y: 0 }}
							exit={{ scale: 0.85, opacity: 0, y: 30 }}
							transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
							onClick={(e) => e.stopPropagation()}
							className="bg-gradient-to-br from-white to-slate-50 rounded-3xl shadow-2xl max-w-lg w-full p-10 relative overflow-hidden border border-slate-200/50"
						>
							{/* Decoración de fondo elegante */}
							<div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-teal-400/10 via-cyan-400/10 to-blue-400/10 rounded-full -mr-20 -mt-20 blur-2xl"></div>
							<div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-400/10 via-pink-400/10 to-rose-400/10 rounded-full -ml-16 -mb-16 blur-2xl"></div>
							<div className="absolute inset-0 bg-gradient-to-br from-teal-50/30 via-transparent to-cyan-50/30"></div>

							{/* Contenido */}
							<div className="relative z-10 text-center">
								{/* Icono de éxito animado con efecto de pulso */}
								<motion.div
									initial={{ scale: 0, rotate: -180 }}
									animate={{ scale: 1, rotate: 0 }}
									transition={{ type: 'spring', delay: 0.1, stiffness: 200, damping: 15 }}
									className="mx-auto mb-8 relative"
								>
									<motion.div
										animate={{ scale: [1, 1.1, 1] }}
										transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
										className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full blur-xl opacity-50"
									></motion.div>
									<div className="relative w-24 h-24 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-2xl border-4 border-white">
										<CheckCircle className="w-14 h-14 text-white" strokeWidth={2.5} />
									</div>
								</motion.div>

								{/* Título */}
								<motion.h3
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.3 }}
									className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent mb-3"
								>
									¡Datos Guardados Exitosamente!
								</motion.h3>

								{/* Mensaje */}
								<motion.p
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.4 }}
									className="text-slate-600 mb-8 text-lg leading-relaxed"
								>
									La información de tu consultorio ha sido actualizada correctamente y está lista para ser vista por los pacientes.
								</motion.p>

								{/* Barra de progreso elegante */}
								<div className="mb-4">
									<div className="h-2 bg-slate-200 rounded-full overflow-hidden">
										<motion.div
											initial={{ width: 0 }}
											animate={{ width: '100%' }}
											transition={{ duration: 2.5, ease: 'easeInOut' }}
											className="h-full bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 rounded-full shadow-lg"
										/>
									</div>
								</div>

								<p className="text-sm text-slate-500 font-medium">Actualizando página automáticamente...</p>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
