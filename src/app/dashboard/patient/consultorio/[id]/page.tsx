'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Stethoscope, MapPin, Phone, Mail, Globe, Calendar, Clock, User, ArrowLeft, Shield, Award, Image as ImageIcon, CheckCircle2, Building2, Instagram, Facebook, Verified, ExternalLink, X, Star } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import LeafletMapViewer from '@/components/clinic/LeafletMapViewer';

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

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 p-6">
				<div className="max-w-7xl mx-auto">
					<div className="animate-pulse space-y-6">
						<div className="h-8 bg-gray-200 rounded w-1/3"></div>
						<div className="h-64 bg-gray-200 rounded-xl"></div>
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
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Navegación */}
				<div className="mb-8">
					<Link href="/dashboard/patient/consultorio" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors">
						<ArrowLeft className="w-4 h-4" />
						Volver a consultorios
					</Link>
				</div>

				{/* Header Principal */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 mb-8">
					<div className="flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
						<div className="flex items-start gap-6 flex-1 min-w-0">
							{validProfilePhoto ? (
								<div className="flex-shrink-0">
									<img
										src={validProfilePhoto}
										alt={consultorio.trade_name || consultorio.legal_name}
										className="w-24 h-24 md:w-32 md:h-32 rounded-xl object-cover border-2 border-gray-200"
										onError={(e) => {
											(e.target as HTMLImageElement).style.display = 'none';
										}}
									/>
								</div>
							) : (
								<div className="flex-shrink-0 w-24 h-24 md:w-32 md:h-32 rounded-xl bg-gray-100 flex items-center justify-center border-2 border-gray-200">
									<Building2 className="w-12 h-12 text-gray-400" />
								</div>
							)}
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-3 mb-2">
									<h1 className="text-2xl md:text-3xl font-bold text-gray-900 break-words">{consultorio.trade_name || consultorio.legal_name}</h1>
									<Verified className="w-6 h-6 text-blue-600 flex-shrink-0" />
								</div>
								{consultorio.legal_name !== consultorio.trade_name && consultorio.legal_name && <p className="text-gray-600 text-base mb-3 break-words">{consultorio.legal_name}</p>}
								{consultorio.doctors && consultorio.doctors.length > 0 && consultorio.doctors[0]?.name && (
									<p className="text-gray-700 font-medium flex items-center gap-2">
										<User className="w-4 h-4" />
										Dr. {consultorio.doctors[0].name}
									</p>
								)}
							</div>
						</div>
						<div className="flex-shrink-0">
							<Link href={`/dashboard/patient/citas/new?clinic_id=${consultorio.organization?.id || consultorio.id}`} className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm">
								<Calendar className="w-5 h-5" />
								Agendar Cita
							</Link>
						</div>
					</div>
				</div>

				{/* Galería de Imágenes */}
				{allImages.length > 0 && (
					<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
						<h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
							<ImageIcon className="w-5 h-5 text-gray-700" />
							Galería del Consultorio
						</h2>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
							<button className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors z-10" onClick={() => setSelectedImage(null)}>
								<X className="w-6 h-6" />
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

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Columna Principal */}
					<div className="lg:col-span-2 space-y-6">
						{/* Información de Contacto */}
						<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
							<h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
								<Building2 className="w-5 h-5 text-gray-700" />
								Información de Contacto
							</h2>
							<div className="space-y-4">
								{consultorio.address_operational && (
									<div className="flex gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
										<div className="flex-shrink-0">
											<div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
												<MapPin className="w-5 h-5 text-gray-600" />
											</div>
										</div>
										<div className="flex-1 min-w-0">
											<p className="font-semibold text-gray-900 mb-1">Dirección</p>
											<p className="text-gray-600 break-words leading-relaxed">{consultorio.address_operational}</p>
										</div>
									</div>
								)}
								{consultorio.phone_mobile && (
									<div className="flex gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
										<div className="flex-shrink-0">
											<div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
												<Phone className="w-5 h-5 text-gray-600" />
											</div>
										</div>
										<div className="flex-1 min-w-0">
											<p className="font-semibold text-gray-900 mb-1">Teléfono Móvil</p>
											<a href={`tel:${consultorio.phone_mobile}`} className="text-blue-600 hover:text-blue-700 font-medium break-all">
												{consultorio.phone_mobile}
											</a>
										</div>
									</div>
								)}
								{consultorio.phone_fixed && (
									<div className="flex gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
										<div className="flex-shrink-0">
											<div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
												<Phone className="w-5 h-5 text-gray-600" />
											</div>
										</div>
										<div className="flex-1 min-w-0">
											<p className="font-semibold text-gray-900 mb-1">Teléfono Fijo</p>
											<a href={`tel:${consultorio.phone_fixed}`} className="text-blue-600 hover:text-blue-700 font-medium break-all">
												{consultorio.phone_fixed}
											</a>
										</div>
									</div>
								)}
								{consultorio.contact_email && (
									<div className="flex gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
										<div className="flex-shrink-0">
											<div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
												<Mail className="w-5 h-5 text-gray-600" />
											</div>
										</div>
										<div className="flex-1 min-w-0">
											<p className="font-semibold text-gray-900 mb-1">Email</p>
											<a href={`mailto:${consultorio.contact_email}`} className="text-blue-600 hover:text-blue-700 font-medium break-all">
												{consultorio.contact_email}
											</a>
										</div>
									</div>
								)}
								{consultorio.website && (
									<div className="flex gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
										<div className="flex-shrink-0">
											<div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
												<Globe className="w-5 h-5 text-gray-600" />
											</div>
										</div>
										<div className="flex-1 min-w-0">
											<p className="font-semibold text-gray-900 mb-1">Sitio Web</p>
											<a href={consultorio.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 font-medium break-all inline-flex items-center gap-1">
												{consultorio.website}
												<ExternalLink className="w-4 h-4" />
											</a>
										</div>
									</div>
								)}
								{(consultorio.social_facebook || consultorio.social_instagram) && (
									<div className="flex gap-4">
										<div className="flex-shrink-0">
											<div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
												<Globe className="w-5 h-5 text-gray-600" />
											</div>
										</div>
										<div className="flex-1 min-w-0">
											<p className="font-semibold text-gray-900 mb-2">Redes Sociales</p>
											<div className="flex flex-wrap gap-3">
												{consultorio.social_facebook && (
													<a href={consultorio.social_facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm">
														<Facebook className="w-4 h-4" />
														Facebook
													</a>
												)}
												{consultorio.social_instagram && (
													<a href={consultorio.social_instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100 transition-colors font-medium text-sm">
														<Instagram className="w-4 h-4" />
														Instagram
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
							<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
								<h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
									<Stethoscope className="w-5 h-5 text-gray-700" />
									Especialidades Médicas
								</h2>
								<div className="flex flex-wrap gap-2">
									{specialties.map((spec: any, idx: number) => {
										const specName = typeof spec === 'string' ? spec : spec?.name || spec?.specialty || '';
										return (
											<span key={idx} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm border border-gray-200">
												{specName}
											</span>
										);
									})}
								</div>
							</div>
						)}

						{/* Horarios */}
						{openingHours.length > 0 && (
							<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
								<h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
									<Clock className="w-5 h-5 text-gray-700" />
									Horarios de Atención
								</h2>
								<div className="space-y-2">
									{openingHours.map((hour: any, idx: number) => (
										<div key={idx} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg border border-gray-100">
											<span className="font-semibold text-gray-900">{hour.day || hour.dayOfWeek || 'Día'}</span>
											<span className="text-gray-700 font-medium">
												{hour.open || hour.start} - {hour.close || hour.end}
											</span>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Mapa */}
						<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
							<h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
								<MapPin className="w-5 h-5 text-gray-700" />
								Ubicación
							</h2>
							{consultorio.location && typeof consultorio.location === 'object' && consultorio.location.lat && consultorio.location.lng ? (
								<LeafletMapViewer location={consultorio.location as { lat: number; lng: number; address?: string }} address={consultorio.address_operational || undefined} />
							) : (
								<div className="bg-gray-50 rounded-lg h-64 flex items-center justify-center border border-gray-200">
									<div className="text-center">
										<MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
										<p className="text-gray-600 font-medium">{consultorio.address_operational || 'Ubicación no disponible'}</p>
									</div>
								</div>
							)}
						</div>

						{/* Especialistas */}
						{consultorio.doctors && consultorio.doctors.length > 0 && (
							<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
								<h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
									<User className="w-5 h-5 text-gray-700" />
									Especialista{consultorio.doctors.length > 1 ? 's' : ''}
								</h2>
								<div className="space-y-6">
									{consultorio.doctors.map((doctor) => {
										const services = doctor.medic_profile?.services || [];
										const credentials = doctor.medic_profile?.credentials || {};
										const hasServices = Array.isArray(services) && services.length > 0;
										const hasCredentials = credentials && Object.keys(credentials).length > 0;

										return (
											<div key={doctor.id} className="p-5 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
												{/* Información básica del doctor */}
												<div className="flex items-start gap-4">
													{doctor.medic_profile?.photo_url && isValidImageUrl(doctor.medic_profile.photo_url) ? (
														<img
															src={doctor.medic_profile.photo_url}
															alt={doctor.name || 'Especialista'}
															className="w-20 h-20 rounded-lg object-cover border border-gray-200 flex-shrink-0"
															onError={(e) => {
																(e.target as HTMLImageElement).style.display = 'none';
															}}
														/>
													) : (
														<div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center border border-gray-200 flex-shrink-0">
															<User className="w-10 h-10 text-gray-400" />
														</div>
													)}
													<div className="flex-1 min-w-0">
														<p className="font-bold text-gray-900 text-lg mb-1 break-words">Dr. {doctor.name || 'Especialista'}</p>
														<p className="text-gray-600 font-medium mb-2">{doctor.medic_profile?.private_specialty || doctor.medic_profile?.specialty || 'Especialista'}</p>
														{doctor.email && (
															<a href={`mailto:${doctor.email}`} className="text-sm text-blue-600 hover:text-blue-700 font-medium break-all">
																{doctor.email}
															</a>
														)}
													</div>
												</div>

												{/* Servicios ofrecidos */}
												{hasServices && (
													<div className="pt-4 border-t border-gray-200">
														<p className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
															<Stethoscope className="w-4 h-4 text-gray-600" />
															Servicios Ofrecidos
														</p>
														<div className="flex flex-wrap gap-2">
															{services.map((service: any, idx: number) => {
																const serviceName = typeof service === 'string' ? service : service?.name || service?.title || '';
																const servicePrice = typeof service === 'object' && service?.price ? service.price : null;

																return (
																	<div key={idx} className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm">
																		<span className="font-medium text-gray-700">{serviceName}</span>
																		{servicePrice && <span className="text-gray-500 ml-2">- ${servicePrice}</span>}
																	</div>
																);
															})}
														</div>
													</div>
												)}

												{/* Credenciales */}
												{hasCredentials && (
													<div className="pt-4 border-t border-gray-200">
														<p className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
															<Award className="w-4 h-4 text-gray-600" />
															Credenciales y Certificaciones
														</p>
														<div className="space-y-2">
															{Object.entries(credentials).map(([key, value]: [string, any]) => {
																if (!value || (typeof value === 'string' && value.trim() === '')) return null;

																const label = key
																	.split('_')
																	.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
																	.join(' ');

																return (
																	<div key={key} className="flex items-start gap-2 text-sm">
																		<CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
																		<div className="flex-1 min-w-0">
																			<span className="font-medium text-gray-700">{label}:</span>
																			<span className="text-gray-600 ml-2 break-words">{typeof value === 'string' ? value : JSON.stringify(value)}</span>
																		</div>
																	</div>
																);
															})}
														</div>
													</div>
												)}
											</div>
										);
									})}
								</div>
							</div>
						)}
					</div>

					{/* Sidebar */}
					<div className="space-y-6">
						{/* Información de Seguridad */}
						<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
							<h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
								<Shield className="w-5 h-5 text-gray-700" />
								Tu Seguridad es Nuestra Prioridad
							</h2>
							<div className="space-y-3">
								<div className="flex items-start gap-3">
									<CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
									<p className="text-gray-700 text-sm leading-relaxed">Consultorio verificado en SyncWave Salud</p>
								</div>
								<div className="flex items-start gap-3">
									<CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
									<p className="text-gray-700 text-sm leading-relaxed">Especialistas certificados y licenciados</p>
								</div>
								<div className="flex items-start gap-3">
									<CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
									<p className="text-gray-700 text-sm leading-relaxed">Confidencialidad garantizada</p>
								</div>
								<div className="flex items-start gap-3">
									<CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
									<p className="text-gray-700 text-sm leading-relaxed">Historial médico seguro y privado</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
