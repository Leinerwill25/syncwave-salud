'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Stethoscope, MapPin, Phone, Mail, Globe, Calendar, Clock, User, ArrowLeft, Shield, Award, Image as ImageIcon, CheckCircle2, Building2, Instagram, Facebook, Verified, ExternalLink, X, Star, FileText, Download, Maximize2 } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import LeafletMapViewer from '@/components/clinic/LeafletMapViewer';
import Image from 'next/image';

type ConsultorioDetail = {
	id: string;
	legal_name: string;
	trade_name: string | null;
	address_operational: string | null;
	phone_mobile: string | null;
	phone_fixed: string | null;
	contact_email: string | null;
	specialties: any[];
	opening_hours: any[];
	website: string | null;
	social_facebook: string | null;
	social_instagram: string | null;
	sanitary_license?: string | null;
	liability_insurance_number?: string | null;
	photos?: string[] | null;
	profile_photo?: string | null;
	location?: any;
	has_cashea?: boolean;
	doctors: Array<{
		id: string;
		name: string | null;
		email: string | null;
		medic_profile: {
			id: string;
			specialty: string | null;
			private_specialty: string | null;
			photo_url: string | null;
			signature_url: string | null;
			credentials: any;
			credit_history: any;
			services: any;
			availability: any;
		} | null;
	}>;
	organization: {
		id: string;
		name: string;
		type: string;
	} | null;
};

export default function ConsultorioDetailPage() {
	const params = useParams();
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [consultorio, setConsultorio] = useState<ConsultorioDetail | null>(null);
	const [selectedImage, setSelectedImage] = useState<string | null>(null);
	const [selectedCredentialFile, setSelectedCredentialFile] = useState<string | null>(null);

	useEffect(() => {
		if (params.id) {
			loadConsultorio();
		}
	}, [params.id]);

	const loadConsultorio = async () => {
		try {
			setLoading(true);
			const res = await fetch(`/api/patient/consultorio/${params.id}`, {
				credentials: 'include',
			});

			if (!res.ok) {
				if (res.status === 404) {
					router.push('/dashboard/patient/consultorio');
					return;
				}
				throw new Error('Error al cargar consultorio');
			}

			const data = await res.json();
			setConsultorio(data);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const isValidImageUrl = (url: any): boolean => {
		if (!url || typeof url !== 'string') return false;
		return url.startsWith('http') || url.startsWith('/') || url.startsWith('data:');
	};

	const isPdf = (url: string): boolean => {
		if (!url || typeof url !== 'string') return false;
		return url.toLowerCase().endsWith('.pdf');
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
				<div className="max-w-7xl mx-auto">
					<div className="animate-pulse space-y-3 sm:space-y-4 md:space-y-6">
						<div className="h-6 sm:h-7 md:h-8 bg-gray-200 rounded w-1/2 sm:w-1/3"></div>
						<div className="h-48 sm:h-56 md:h-64 bg-gray-200 rounded-lg sm:rounded-xl"></div>
					</div>
				</div>
			</div>
		);
	}

	if (!consultorio) {
		return null;
	}

	const specialties = Array.isArray(consultorio.specialties) ? consultorio.specialties : typeof consultorio.specialties === 'string' ? JSON.parse(consultorio.specialties) : [];

	const openingHours = Array.isArray(consultorio.opening_hours) ? consultorio.opening_hours : typeof consultorio.opening_hours === 'string' ? JSON.parse(consultorio.opening_hours) : [];

	// Procesar imágenes de manera más robusta
	const processPhotos = (photosData: any): string[] => {
		if (!photosData) return [];

		try {
			let parsed: any = null;
			if (Array.isArray(photosData)) {
				parsed = photosData;
			} else if (typeof photosData === 'string') {
				try {
					parsed = JSON.parse(photosData);
				} catch {
					// Si no es JSON, puede ser un string único
					parsed = photosData.trim() !== '' ? [photosData] : [];
				}
			}

			if (Array.isArray(parsed)) {
				return parsed.filter((url: any) => isValidImageUrl(url));
			}
		} catch (error) {
			console.error('Error procesando fotos:', error);
		}

		return [];
	};

	const validPhotos = processPhotos(consultorio.photos);
	const validProfilePhoto = isValidImageUrl(consultorio.profile_photo) ? consultorio.profile_photo : null;

	// Combinar imágenes evitando duplicados
	const allImagesSet = new Set<string>();
	if (validProfilePhoto) allImagesSet.add(validProfilePhoto);
	validPhotos.forEach((photo: string) => allImagesSet.add(photo));
	const allImages = Array.from(allImagesSet);

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
				{/* Navegación */}
				<div className="mb-4 sm:mb-6 md:mb-8">
					<Link href="/dashboard/patient/consultorio" className="inline-flex items-center gap-1.5 sm:gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors text-xs sm:text-sm md:text-base">
						<ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
						<span>Volver a consultorios</span>
					</Link>
				</div>

				{/* Header Principal */}
				<div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6 lg:p-8 mb-4 sm:mb-6 md:mb-8">
					<div className="flex flex-col md:flex-row gap-4 sm:gap-5 md:gap-6 md:items-center md:justify-between">
						<div className="flex items-start gap-3 sm:gap-4 md:gap-6 flex-1 min-w-0">
							{validProfilePhoto ? (
								<div className="flex-shrink-0">
									<img
										src={validProfilePhoto}
										alt={consultorio.trade_name || consultorio.legal_name}
										className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 rounded-lg sm:rounded-xl object-cover border-2 border-gray-200"
										onError={(e) => {
											(e.target as HTMLImageElement).style.display = 'none';
										}}
									/>
								</div>
							) : (
								<div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 rounded-lg sm:rounded-xl bg-gray-100 flex items-center justify-center border-2 border-gray-200">
									<Building2 className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-gray-400" />
								</div>
							)}
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
									<h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 break-words">{consultorio.trade_name || consultorio.legal_name}</h1>
									<Verified className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-600 flex-shrink-0" />
								</div>
								{consultorio.legal_name !== consultorio.trade_name && consultorio.legal_name && <p className="text-gray-600 text-xs sm:text-sm md:text-base mb-2 sm:mb-3 break-words">{consultorio.legal_name}</p>}
								{consultorio.doctors && consultorio.doctors.length > 0 && consultorio.doctors[0]?.name && (
									<p className="text-gray-700 font-medium flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base">
										<User className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
										<span className="truncate">Dr. {consultorio.doctors[0].name}</span>
									</p>
								)}
							</div>
						</div>
						<div className="flex-shrink-0">
							<Link href={`/dashboard/patient/citas/new?clinic_id=${consultorio.organization?.id || consultorio.id}`} className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm text-xs sm:text-sm md:text-base">
								<Calendar className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 flex-shrink-0" />
								<span>Agendar Cita</span>
							</Link>
						</div>
					</div>
				</div>

				{/* Galería de Imágenes */}
				{allImages.length > 0 && (
					<div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6 mb-4 sm:mb-6 md:mb-8">
						<h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
							<ImageIcon className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-gray-700 flex-shrink-0" />
							<span>Galería del Consultorio</span>
						</h2>
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
							{allImages.map((img, idx) => (
								<button key={idx} onClick={() => setSelectedImage(img)} className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer hover:opacity-90 transition-opacity border border-gray-200">
									<img
										src={img}
										alt={`Imagen ${idx + 1}`}
										className="w-full h-full object-cover"
										onError={(e) => {
											(e.target as HTMLImageElement).style.display = 'none';
										}}
									/>
									<div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
								</button>
							))}
						</div>
					</div>
				)}

				{/* Modal de Imagen */}
				<AnimatePresence>
					{selectedImage && (
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-2 sm:p-4" onClick={() => setSelectedImage(null)}>
							<button className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white hover:text-gray-300 p-1.5 sm:p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors z-10" onClick={() => setSelectedImage(null)}>
								<X className="w-5 h-5 sm:w-6 sm:h-6" />
							</button>
							<img
								src={selectedImage}
								alt="Vista ampliada"
								className="max-w-full max-h-full object-contain rounded-lg"
								onClick={(e) => e.stopPropagation()}
								onError={(e) => {
									(e.target as HTMLImageElement).style.display = 'none';
								}}
							/>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Modal de Archivo de Credencial */}
				<AnimatePresence>
					{selectedCredentialFile && (
						<motion.div 
							initial={{ opacity: 0 }} 
							animate={{ opacity: 1 }} 
							exit={{ opacity: 0 }} 
							className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-2 sm:p-4" 
							onClick={() => setSelectedCredentialFile(null)}
						>
							<button 
								className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white hover:text-gray-300 p-1.5 sm:p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors z-10" 
								onClick={() => setSelectedCredentialFile(null)}
							>
								<X className="w-5 h-5 sm:w-6 sm:h-6" />
							</button>
							{isPdf(selectedCredentialFile) ? (
								<iframe
									src={selectedCredentialFile}
									className="max-w-full max-h-full w-full h-full rounded-lg"
									onClick={(e) => e.stopPropagation()}
									title="Vista de PDF"
								/>
							) : (
								<img
									src={selectedCredentialFile}
									alt="Vista ampliada de credencial"
									className="max-w-full max-h-full object-contain rounded-lg"
									onClick={(e) => e.stopPropagation()}
									onError={(e) => {
										(e.target as HTMLImageElement).style.display = 'none';
									}}
								/>
							)}
						</motion.div>
					)}
				</AnimatePresence>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
					{/* Columna Principal */}
					<div className="lg:col-span-2 space-y-4 sm:space-y-5 md:space-y-6">
						{/* Información de Contacto */}
						<div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6">
							<h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-4 sm:mb-5 md:mb-6 flex items-center gap-1.5 sm:gap-2">
								<Building2 className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-gray-700 flex-shrink-0" />
								<span>Información de Contacto</span>
							</h2>
							<div className="space-y-3 sm:space-y-4">
								{consultorio.address_operational && (
									<div className="flex gap-2 sm:gap-3 md:gap-4 pb-3 sm:pb-4 border-b border-gray-100 last:border-0 last:pb-0">
										<div className="flex-shrink-0">
											<div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg bg-gray-100 flex items-center justify-center">
												<MapPin className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-gray-600" />
											</div>
										</div>
										<div className="flex-1 min-w-0">
											<p className="font-semibold text-gray-900 mb-0.5 sm:mb-1 text-xs sm:text-sm md:text-base">Dirección</p>
											<p className="text-gray-600 break-words leading-relaxed text-xs sm:text-sm md:text-base">{consultorio.address_operational}</p>
										</div>
									</div>
								)}
								{consultorio.phone_mobile && (
									<div className="flex gap-2 sm:gap-3 md:gap-4 pb-3 sm:pb-4 border-b border-gray-100 last:border-0 last:pb-0">
										<div className="flex-shrink-0">
											<div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg bg-gray-100 flex items-center justify-center">
												<Phone className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-gray-600" />
											</div>
										</div>
										<div className="flex-1 min-w-0">
											<p className="font-semibold text-gray-900 mb-0.5 sm:mb-1 text-xs sm:text-sm md:text-base">Teléfono Móvil</p>
											<a href={`tel:${consultorio.phone_mobile}`} className="text-blue-600 hover:text-blue-700 font-medium break-all text-xs sm:text-sm md:text-base">
												{consultorio.phone_mobile}
											</a>
										</div>
									</div>
								)}
								{consultorio.phone_fixed && (
									<div className="flex gap-2 sm:gap-3 md:gap-4 pb-3 sm:pb-4 border-b border-gray-100 last:border-0 last:pb-0">
										<div className="flex-shrink-0">
											<div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg bg-gray-100 flex items-center justify-center">
												<Phone className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-gray-600" />
											</div>
										</div>
										<div className="flex-1 min-w-0">
											<p className="font-semibold text-gray-900 mb-0.5 sm:mb-1 text-xs sm:text-sm md:text-base">Teléfono Fijo</p>
											<a href={`tel:${consultorio.phone_fixed}`} className="text-blue-600 hover:text-blue-700 font-medium break-all text-xs sm:text-sm md:text-base">
												{consultorio.phone_fixed}
											</a>
										</div>
									</div>
								)}
								{consultorio.contact_email && (
									<div className="flex gap-2 sm:gap-3 md:gap-4 pb-3 sm:pb-4 border-b border-gray-100 last:border-0 last:pb-0">
										<div className="flex-shrink-0">
											<div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg bg-gray-100 flex items-center justify-center">
												<Mail className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-gray-600" />
											</div>
										</div>
										<div className="flex-1 min-w-0">
											<p className="font-semibold text-gray-900 mb-0.5 sm:mb-1 text-xs sm:text-sm md:text-base">Email</p>
											<a href={`mailto:${consultorio.contact_email}`} className="text-blue-600 hover:text-blue-700 font-medium break-all text-xs sm:text-sm md:text-base">
												{consultorio.contact_email}
											</a>
										</div>
									</div>
								)}
								{consultorio.website && (
									<div className="flex gap-2 sm:gap-3 md:gap-4 pb-3 sm:pb-4 border-b border-gray-100 last:border-0 last:pb-0">
										<div className="flex-shrink-0">
											<div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg bg-gray-100 flex items-center justify-center">
												<Globe className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-gray-600" />
											</div>
										</div>
										<div className="flex-1 min-w-0">
											<p className="font-semibold text-gray-900 mb-0.5 sm:mb-1 text-xs sm:text-sm md:text-base">Sitio Web</p>
											<a href={consultorio.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 font-medium break-all inline-flex items-center gap-1 text-xs sm:text-sm md:text-base">
												<span className="truncate">{consultorio.website}</span>
												<ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
											</a>
										</div>
									</div>
								)}
								{/* Cashea */}
								<div className="flex gap-2 sm:gap-3 md:gap-4 pb-3 sm:pb-4 border-b border-gray-100 last:border-0 last:pb-0">
									<div className="flex-shrink-0">
										<div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg bg-gray-100 flex items-center justify-center">
											<Image 
												src="/descarga.png" 
												alt="Cashea" 
												width={24} 
												height={24} 
												className="flex-shrink-0"
											/>
										</div>
									</div>
									<div className="flex-1 min-w-0 flex items-center gap-2">
										{consultorio.has_cashea ? (
											<CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
										) : (
											<X className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
										)}
										<div>
											<p className="font-semibold text-gray-900 mb-0.5 sm:mb-1 text-xs sm:text-sm md:text-base">Cashea</p>
											<p className="text-gray-600 text-xs sm:text-sm md:text-base">
												{consultorio.has_cashea ? 'Cuenta con Cashea' : 'No cuenta con Cashea'}
											</p>
										</div>
									</div>
								</div>
								{(consultorio.social_facebook || consultorio.social_instagram) && (
									<div className="flex gap-2 sm:gap-3 md:gap-4">
										<div className="flex-shrink-0">
											<div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg bg-gray-100 flex items-center justify-center">
												<Globe className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-gray-600" />
											</div>
										</div>
										<div className="flex-1 min-w-0">
											<p className="font-semibold text-gray-900 mb-1.5 sm:mb-2 text-xs sm:text-sm md:text-base">Redes Sociales</p>
											<div className="flex flex-wrap gap-2 sm:gap-3">
												{consultorio.social_facebook && (
													<a href={consultorio.social_facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-xs sm:text-sm">
														<Facebook className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
														<span>Facebook</span>
													</a>
												)}
												{consultorio.social_instagram && (
													<a href={consultorio.social_instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100 transition-colors font-medium text-xs sm:text-sm">
														<Instagram className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
														<span>Instagram</span>
													</a>
												)}
											</div>
										</div>
									</div>
								)}
							</div>
						</div>

						{/* Especialidades */}
						{specialties.length > 0 && (
							<div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6">
								<h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
									<Stethoscope className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-gray-700 flex-shrink-0" />
									<span>Especialidades Médicas</span>
								</h2>
								<div className="flex flex-wrap gap-1.5 sm:gap-2">
									{specialties.map((spec: any, idx: number) => {
										const specName = typeof spec === 'string' ? spec : spec?.name || spec?.specialty || '';
										return (
											<span key={idx} className="px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-xs sm:text-sm border border-gray-200">
												{specName}
											</span>
										);
									})}
								</div>
							</div>
						)}

						{/* Horarios */}
						{openingHours.length > 0 && (
							<div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6">
								<h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
									<Clock className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-gray-700 flex-shrink-0" />
									<span>Horarios de Atención</span>
								</h2>
								<div className="space-y-1.5 sm:space-y-2">
									{openingHours.map((hour: any, idx: number) => (
										<div key={idx} className="flex items-center justify-between py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 bg-gray-50 rounded-lg border border-gray-100">
											<span className="font-semibold text-gray-900 text-xs sm:text-sm md:text-base">{hour.day || hour.dayOfWeek || 'Día'}</span>
											<span className="text-gray-700 font-medium text-xs sm:text-sm md:text-base">
												{hour.open || hour.start} - {hour.close || hour.end}
											</span>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Mapa */}
						<div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6">
							<h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
								<MapPin className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-gray-700 flex-shrink-0" />
								<span>Ubicación</span>
							</h2>
							{consultorio.location && typeof consultorio.location === 'object' && consultorio.location.lat && consultorio.location.lng ? (
								<LeafletMapViewer location={consultorio.location as { lat: number; lng: number; address?: string }} address={consultorio.address_operational || undefined} />
							) : (
								<div className="bg-gray-50 rounded-lg h-48 sm:h-56 md:h-64 flex items-center justify-center border border-gray-200">
									<div className="text-center px-4">
										<MapPin className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2 sm:mb-3" />
										<p className="text-gray-600 font-medium text-xs sm:text-sm md:text-base break-words">{consultorio.address_operational || 'Ubicación no disponible'}</p>
									</div>
								</div>
							)}
						</div>

						{/* Especialistas */}
						{consultorio.doctors && consultorio.doctors.length > 0 && (
							<div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6">
								<h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
									<User className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-gray-700 flex-shrink-0" />
									<span>Especialista{consultorio.doctors.length > 1 ? 's' : ''}</span>
								</h2>
								<div className="space-y-4 sm:space-y-5 md:space-y-6">
									{consultorio.doctors.map((doctor) => {
										const services = doctor.medic_profile?.services || [];
										const credentials = doctor.medic_profile?.credentials || {};
										const hasServices = Array.isArray(services) && services.length > 0;
										const hasCredentials = credentials && Object.keys(credentials).length > 0;

										return (
											<div key={doctor.id} className="p-3 sm:p-4 md:p-5 bg-gray-50 rounded-lg border border-gray-200 space-y-3 sm:space-y-4">
												{/* Información básica del doctor */}
												<div className="flex items-start gap-2 sm:gap-3 md:gap-4">
													{doctor.medic_profile?.photo_url && isValidImageUrl(doctor.medic_profile.photo_url) ? (
														<img
															src={doctor.medic_profile.photo_url}
															alt={doctor.name || 'Especialista'}
															className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-lg object-cover border border-gray-200 flex-shrink-0"
															onError={(e) => {
																(e.target as HTMLImageElement).style.display = 'none';
															}}
														/>
													) : (
														<div className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-lg bg-gray-200 flex items-center justify-center border border-gray-200 flex-shrink-0">
															<User className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 text-gray-400" />
														</div>
													)}
													<div className="flex-1 min-w-0">
														<p className="font-bold text-gray-900 text-sm sm:text-base md:text-lg mb-0.5 sm:mb-1 break-words">Dr. {doctor.name || 'Especialista'}</p>
														<p className="text-gray-600 font-medium mb-1 sm:mb-2 text-xs sm:text-sm md:text-base truncate">{doctor.medic_profile?.private_specialty || doctor.medic_profile?.specialty || 'Especialista'}</p>
														{doctor.email && (
															<a href={`mailto:${doctor.email}`} className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium break-all">
																{doctor.email}
															</a>
														)}
													</div>
												</div>

												{/* Servicios ofrecidos */}
												{hasServices && (
													<div className="pt-3 sm:pt-4 border-t border-gray-200">
														<p className="font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base">
															<Stethoscope className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 flex-shrink-0" />
															<span>Servicios Ofrecidos</span>
														</p>
														<div className="flex flex-wrap gap-1.5 sm:gap-2">
															{services.map((service: any, idx: number) => {
																const serviceName = typeof service === 'string' ? service : service?.name || service?.title || '';
																const servicePrice = typeof service === 'object' && service?.price ? service.price : null;

																return (
																	<div key={idx} className="px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm">
																		<span className="font-medium text-gray-700">{serviceName}</span>
																		{servicePrice && <span className="text-gray-500 ml-1 sm:ml-2">- ${servicePrice}</span>}
																	</div>
																);
															})}
														</div>
													</div>
												)}

												{/* Credenciales */}
												{hasCredentials && (() => {
													const credentialFiles = Array.isArray(credentials.credentialFiles) 
														? credentials.credentialFiles 
														: credentials.credentialFiles 
															? [credentials.credentialFiles] 
															: [];
													
													const otherCredentials = Object.entries(credentials).filter(
														([key]) => key !== 'credentialFiles'
													);

													const hasCredentialFiles = credentialFiles.length > 0;
													const hasOtherCredentials = otherCredentials.some(
														([, value]) => value && (typeof value === 'string' ? value.trim() !== '' : true)
													);

													if (!hasCredentialFiles && !hasOtherCredentials) return null;

													const isImage = (url: string) => {
														if (!url || typeof url !== 'string') return false;
														const ext = url.toLowerCase().split('.').pop();
														return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
													};

													const isPdf = (url: string) => {
														if (!url || typeof url !== 'string') return false;
														return url.toLowerCase().endsWith('.pdf');
													};

													const getFileName = (url: string) => {
														try {
															const parts = url.split('/');
															return parts[parts.length - 1] || 'Documento';
														} catch {
															return 'Documento';
														}
													};

													return (
														<div className="pt-3 sm:pt-4 border-t border-gray-200">
															<p className="font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base">
																<Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 flex-shrink-0" />
																<span>Credenciales y Certificaciones</span>
															</p>
															
															{/* Archivos de Credenciales */}
															{hasCredentialFiles && (
																<div className="mb-3 sm:mb-4">
																	<p className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Documentos de Credenciales</p>
																	<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
																		{credentialFiles.map((fileUrl: string, idx: number) => {
																			if (!fileUrl || typeof fileUrl !== 'string') return null;
																			
																			const isImg = isImage(fileUrl);
																			const isPdfFile = isPdf(fileUrl);
																			const fileName = getFileName(fileUrl);

																			return (
																				<div key={idx} className="relative group">
																					{isImg ? (
																						<button
																							onClick={() => setSelectedCredentialFile(fileUrl)}
																							className="w-full aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-colors cursor-pointer bg-gray-50"
																						>
																							<img
																								src={fileUrl}
																								alt={`Credencial ${idx + 1}`}
																								className="w-full h-full object-cover"
																								onError={(e) => {
																									(e.target as HTMLImageElement).style.display = 'none';
																								}}
																							/>
																							<div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
																								<Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
																							</div>
																						</button>
																					) : (
																						<a
																							href={fileUrl}
																							target="_blank"
																							rel="noopener noreferrer"
																							className="flex flex-col items-center justify-center p-3 sm:p-4 bg-gray-50 rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:bg-gray-100 transition-colors group"
																						>
																							{isPdfFile ? (
																								<FileText className="w-8 h-8 sm:w-10 sm:h-10 text-red-600 mb-2" />
																							) : (
																								<FileText className="w-8 h-8 sm:w-10 sm:h-10 text-gray-600 mb-2" />
																							)}
																							<p className="text-[10px] sm:text-xs font-medium text-gray-700 text-center truncate w-full" title={fileName}>
																								{fileName.length > 20 ? `${fileName.substring(0, 20)}...` : fileName}
																							</p>
																							<Download className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 group-hover:text-blue-600 mt-1" />
																						</a>
																					)}
																				</div>
																			);
																		})}
																	</div>
																</div>
															)}

															{/* Otras Credenciales (texto) */}
															{hasOtherCredentials && (
																<div className="space-y-1.5 sm:space-y-2">
																	{otherCredentials.map(([key, value]: [string, any]) => {
																		if (!value || (typeof value === 'string' && value.trim() === '')) return null;

																		const label = key
																			.split('_')
																			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
																			.join(' ');

																		return (
																			<div key={key} className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm">
																				<CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 flex-shrink-0 mt-0.5" />
																				<div className="flex-1 min-w-0">
																					<span className="font-medium text-gray-700">{label}:</span>
																					<span className="text-gray-600 ml-1 sm:ml-2 break-words">
																						{typeof value === 'string' ? value : JSON.stringify(value)}
																					</span>
																				</div>
																			</div>
																		);
																	})}
																</div>
															)}
														</div>
													);
												})()}
											</div>
										);
									})}
								</div>
							</div>
						)}
					</div>

					{/* Sidebar */}
					<div className="space-y-4 sm:space-y-5 md:space-y-6">
						{/* Información de Seguridad */}
						<div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6">
							<h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
								<Shield className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-gray-700 flex-shrink-0" />
								<span className="truncate">Tu Seguridad es Nuestra Prioridad</span>
							</h2>
							<div className="space-y-2 sm:space-y-3">
								<div className="flex items-start gap-2 sm:gap-3">
									<CheckCircle2 className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-green-600 flex-shrink-0 mt-0.5" />
									<p className="text-gray-700 text-xs sm:text-sm leading-relaxed">Consultorio verificado en SyncWave Salud</p>
								</div>
								<div className="flex items-start gap-2 sm:gap-3">
									<CheckCircle2 className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-green-600 flex-shrink-0 mt-0.5" />
									<p className="text-gray-700 text-xs sm:text-sm leading-relaxed">Especialistas certificados y licenciados</p>
								</div>
								<div className="flex items-start gap-2 sm:gap-3">
									<CheckCircle2 className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-green-600 flex-shrink-0 mt-0.5" />
									<p className="text-gray-700 text-xs sm:text-sm leading-relaxed">Confidencialidad garantizada</p>
								</div>
								<div className="flex items-start gap-2 sm:gap-3">
									<CheckCircle2 className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-green-600 flex-shrink-0 mt-0.5" />
									<p className="text-gray-700 text-xs sm:text-sm leading-relaxed">Historial médico seguro y privado</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
