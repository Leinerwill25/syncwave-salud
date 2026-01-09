'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Stethoscope, MapPin, Phone, Mail, Globe, Clock, Calendar, Instagram, Facebook, Linkedin, CheckCircle2, Shield, Award, Star, ExternalLink, MessageCircle, Heart, Users, FileText, Building2, Sparkles, Image as ImageIcon, Package, Percent, Zap } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

type ConsultorioData = {
	id: string;
	name: string;
	legal_name: string;
	trade_name: string | null;
	address_operational: string | null;
	phone_mobile: string | null;
	phone_fixed: string | null;
	contact_email: string | null;
	website: string | null;
	social_facebook: string | null;
	social_instagram: string | null;
	social_linkedin: string | null;
	specialties: string[];
	opening_hours: any[];
	location: any;
	photos: string[];
	profile_photo: string | null;
	sanitary_license: string | null;
	liability_insurance_number: string | null;
	has_cashea: boolean;
	doctors: Array<{
		id: string;
		name: string | null;
		email: string | null;
		medic_profile: {
			id: string;
			specialty: string | null;
			private_specialty: string | null;
			photo_url: string | null;
			services: any[];
			serviceCombos?: any[];
			credentials: any;
			availability: any;
			has_cashea: boolean | null;
		} | null;
	}>;
};

export default function ConsultorioPublicPage({ consultorio }: { consultorio: ConsultorioData }) {
	const [selectedImage, setSelectedImage] = useState<string | null>(null);

	const displayName = consultorio.trade_name || consultorio.legal_name || consultorio.name;

	// Extraer especialidad desde los doctores (private_specialty o specialty)
	const getPrimarySpecialty = () => {
		if (consultorio.doctors && consultorio.doctors.length > 0) {
			// Obtener la especialidad del primer doctor disponible
			for (const doctor of consultorio.doctors) {
				const specialty = doctor.medic_profile?.private_specialty || doctor.medic_profile?.specialty;
				if (specialty) {
					return specialty;
				}
			}
		}
		// Fallback: usar specialties del consultorio si está disponible
		if (consultorio.specialties && consultorio.specialties.length > 0) {
			return consultorio.specialties[0];
		}
		return 'Medicina General';
	};

	const primarySpecialty = getPrimarySpecialty();

	// Verificar si hay múltiples especialidades únicas entre los doctores
	const getAllSpecialties = () => {
		const specialtiesSet = new Set<string>();

		// Agregar especialidades de los doctores
		consultorio.doctors?.forEach((doctor) => {
			const specialty = doctor.medic_profile?.private_specialty || doctor.medic_profile?.specialty;
			if (specialty) {
				specialtiesSet.add(specialty);
			}
		});

		// Agregar especialidades del consultorio si existen
		consultorio.specialties?.forEach((spec) => {
			if (spec) specialtiesSet.add(spec);
		});

		return Array.from(specialtiesSet);
	};

	const allSpecialties = getAllSpecialties();
	const hasMultipleSpecialties = allSpecialties.length > 1;

	const formatPhone = (phone: string | null | undefined) => {
		if (!phone) return null;
		// Limpiar y formatear número de teléfono
		const cleaned = phone.replace(/\D/g, '');
		if (cleaned.length === 10) {
			return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
		}
		return phone;
	};

	// Extraer horarios desde availability de los doctores
	const getAvailabilityFromDoctors = () => {
		const allSchedules: Array<{ day: string; start: string; end: string }> = [];

		consultorio.doctors?.forEach((doctor) => {
			const availability = doctor.medic_profile?.availability;
			if (!availability || !availability.schedule) return;

			const schedule = availability.schedule;
			const dayMap: Record<string, string> = {
				monday: 'Lunes',
				tuesday: 'Martes',
				wednesday: 'Miércoles',
				thursday: 'Jueves',
				friday: 'Viernes',
				saturday: 'Sábado',
				sunday: 'Domingo',
			};

			Object.keys(schedule).forEach((dayKey) => {
				const daySlots = schedule[dayKey];
				if (Array.isArray(daySlots) && daySlots.length > 0) {
					// Procesar cada slot del día
					daySlots.forEach((slot: any) => {
						if (slot.enabled && slot.startTime && slot.endTime) {
							allSchedules.push({
								day: dayMap[dayKey] || dayKey,
								start: slot.startTime,
								end: slot.endTime,
							});
						}
					});
				}
			});
		});

		return allSchedules;
	};

	const formatOpeningHours = (schedules: Array<{ day: string; start: string; end: string }>) => {
		if (!schedules || schedules.length === 0) return null;

		// Agrupar días con el mismo horario
		const groupedHours: Record<string, { days: string[]; start: string; end: string }> = {};

		schedules.forEach((schedule) => {
			const timeKey = `${schedule.start}-${schedule.end}`;
			if (!groupedHours[timeKey]) {
				groupedHours[timeKey] = { days: [], start: schedule.start, end: schedule.end };
			}
			if (!groupedHours[timeKey].days.includes(schedule.day)) {
				groupedHours[timeKey].days.push(schedule.day);
			}
		});

		return Object.values(groupedHours).map((group) => ({
			days: group.days.sort((a, b) => {
				const order = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
				return order.indexOf(a) - order.indexOf(b);
			}),
			time: `${group.start} - ${group.end}`,
		}));
	};

	const doctorSchedules = getAvailabilityFromDoctors();
	const openingHoursFormatted = formatOpeningHours(doctorSchedules);

	return (
		<div className="min-h-screen bg-white">
			{/* Hero Section with Image Collage */}
			<div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
				{/* Image Collage */}
				{consultorio.photos && consultorio.photos.length > 0 ? (
					<div className="relative h-[500px] sm:h-[600px] lg:h-[700px] overflow-hidden">
						{/* Grid Layout for Images */}
						<div className="absolute inset-0 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
							{consultorio.photos.slice(0, 8).map((photo, idx) => (
								<div key={idx} className="relative overflow-hidden group cursor-pointer" onClick={() => setSelectedImage(photo)}>
									<Image src={photo} alt={`Foto del consultorio ${idx + 1}`} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
									<div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
								</div>
							))}
							{/* Fill remaining spaces if less than 8 images */}
							{Array.from({ length: Math.max(0, 8 - (consultorio.photos.length || 0)) }).map((_, idx) => (
								<div key={`empty-${idx}`} className="relative bg-gradient-to-br from-teal-900/50 to-cyan-900/50" />
							))}
						</div>
						{/* Overlay Gradient */}
						<div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/80 to-slate-900/60" />
					</div>
				) : consultorio.profile_photo ? (
					<div className="relative h-[500px] sm:h-[600px] lg:h-[700px] overflow-hidden">
						<Image src={consultorio.profile_photo} alt={displayName} fill className="object-cover" priority />
						<div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/80 to-slate-900/60" />
					</div>
				) : (
					<div className="relative h-[500px] sm:h-[600px] lg:h-[700px] overflow-hidden bg-gradient-to-br from-teal-900 to-cyan-900">
						<div className="absolute inset-0 flex items-center justify-center">
							<Building2 className="w-48 h-48 text-white/20" />
						</div>
						<div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/80 to-slate-900/60" />
					</div>
				)}

				{/* Content Overlay */}
				<div className="absolute inset-0 flex items-end">
					<div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16 lg:pb-24">
						<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="space-y-6 text-white">
							{/* Badge */}
							<div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md text-white rounded-full text-sm font-semibold border border-white/30">
								<Sparkles className="w-4 h-4" />
								Consultorio Médico Profesional
							</div>

							{/* Title */}
							<h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight drop-shadow-lg">{displayName}</h1>

							{/* Specialty */}
							<div className="flex items-center gap-4">
								<div className="p-3 bg-white/20 backdrop-blur-md rounded-xl border border-white/30">
									<Stethoscope className="w-8 h-8" />
								</div>
								<div>
									<p className="text-2xl sm:text-3xl font-bold">{primarySpecialty}</p>
									{hasMultipleSpecialties && (
										<p className="text-lg text-white/80 mt-1">
											+{allSpecialties.length - 1} especialidad{allSpecialties.length - 1 > 1 ? 'es' : ''} más
										</p>
									)}
								</div>
							</div>

							{/* Quick Contact Info */}
							<div className="flex flex-wrap gap-4 pt-4">
								{consultorio.phone_mobile && (
									<a href={`tel:${consultorio.phone_mobile}`} className="inline-flex items-center gap-2 px-5 py-3 bg-white/20 backdrop-blur-md rounded-xl hover:bg-white/30 transition border border-white/30 text-white font-medium">
										<Phone className="w-5 h-5" />
										<span>{formatPhone(consultorio.phone_mobile)}</span>
									</a>
								)}
								{consultorio.address_operational && (
									<div className="inline-flex items-center gap-2 px-5 py-3 bg-white/20 backdrop-blur-md rounded-xl border border-white/30 text-white">
										<MapPin className="w-5 h-5" />
										<span className="text-sm">{consultorio.address_operational}</span>
									</div>
								)}
							</div>
						</motion.div>
					</div>
				</div>
			</div>

			{/* Registration Notice Banner */}
			<div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 text-white py-6 sm:py-8">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="flex flex-col md:flex-row items-center justify-between gap-4">
						<div className="flex items-start gap-4 flex-1">
							<div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 flex-shrink-0">
								<Users className="w-6 h-6" />
							</div>
							<div>
								<h3 className="text-xl sm:text-2xl font-bold mb-2">¿Deseas agendar una cita?</h3>
								<p className="text-teal-50 text-sm sm:text-base leading-relaxed">
									Para agendar una cita con nuestro especialista, es necesario <strong className="text-white">registrarte en nuestra plataforma</strong> o puedes <strong className="text-white">contactarnos directamente</strong> a través de nuestros canales de comunicación.
								</p>
							</div>
						</div>
						<div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
							<Link href="/register?role=PACIENTE" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-teal-600 rounded-xl font-bold shadow-xl hover:shadow-2xl transition hover:scale-105 whitespace-nowrap">
								<Users className="w-5 h-5" />
								Registrarse Ahora
							</Link>
							{consultorio.phone_mobile && (
								<a href={`tel:${consultorio.phone_mobile}`} className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-xl font-bold hover:bg-white/30 transition whitespace-nowrap">
									<Phone className="w-5 h-5" />
									Llamar Ahora
								</a>
							)}
						</div>
					</motion.div>
				</div>
			</div>

			{/* Main Content */}
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
				{/* About Section */}
				<motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="bg-gradient-to-br from-slate-50 to-white rounded-3xl shadow-xl border border-slate-200 p-8 lg:p-12">
					<div className="flex items-center gap-4 mb-8">
						<div className="p-4 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-2xl shadow-lg">
							<FileText className="w-8 h-8 text-white" />
						</div>
						<h2 className="text-3xl lg:text-4xl font-bold text-slate-900">Acerca de Nosotros</h2>
					</div>
					<div className="prose prose-lg max-w-none">
						<p className="text-slate-700 text-lg lg:text-xl leading-relaxed mb-6">
							Somos un consultorio privado especializado en <strong className="text-teal-700">{primarySpecialty}</strong>, comprometido con brindar atención médica de excelencia y un trato personalizado a cada paciente. Nuestro equipo de profesionales altamente capacitados está dedicado a proporcionar el más alto estándar de cuidado médico.
						</p>
						{allSpecialties.length > 1 && (
							<div className="mt-8 pt-8 border-t border-slate-200">
								<h3 className="text-2xl font-bold text-slate-900 mb-4">Nuestras Especialidades</h3>
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
									{allSpecialties.map((specialty, idx) => (
										<div key={idx} className="px-5 py-3 bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-800 rounded-xl font-semibold border border-teal-200 hover:shadow-md transition">
											{specialty}
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</motion.section>

				{/* Doctors Section */}
				{consultorio.doctors && consultorio.doctors.length > 0 && (
					<motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="bg-gradient-to-br from-white to-slate-50 rounded-3xl shadow-xl border border-slate-200 p-8 lg:p-12">
						<div className="flex items-center gap-4 mb-10">
							<div className="p-4 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-2xl shadow-lg">
								<Users className="w-8 h-8 text-white" />
							</div>
							<h2 className="text-3xl lg:text-4xl font-bold text-slate-900">Nuestro Equipo Médico</h2>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
							{consultorio.doctors.map((doctor) => {
								const specialty = doctor.medic_profile?.private_specialty || doctor.medic_profile?.specialty || 'Médico';
								return (
									<div key={doctor.id} className="bg-white rounded-2xl p-6 border-2 border-slate-200 hover:border-teal-300 hover:shadow-xl transition-all group">
										<div className="flex flex-col items-center text-center">
											{doctor.medic_profile?.photo_url ? (
												<div className="relative w-32 h-32 rounded-2xl mb-4 overflow-hidden shadow-lg group-hover:scale-105 transition-transform">
													<Image src={doctor.medic_profile.photo_url} alt={doctor.name || 'Doctor'} fill className="object-cover" />
												</div>
											) : (
												<div className="w-32 h-32 rounded-2xl mb-4 bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg">
													<Stethoscope className="w-16 h-16 text-white" />
												</div>
											)}
											<h3 className="text-xl font-bold text-slate-900 mb-2">{doctor.name || 'Dr. Sin Nombre'}</h3>
											<div className="px-4 py-2 bg-teal-50 text-teal-700 rounded-lg font-semibold mb-4">{specialty}</div>
											{doctor.email && (
												<a href={`mailto:${doctor.email}`} className="text-sm text-slate-600 hover:text-teal-600 transition flex items-center gap-2">
													<Mail className="w-4 h-4" />
													{doctor.email}
												</a>
											)}
										</div>
									</div>
								);
							})}
						</div>
					</motion.section>
				)}

				{/* Services Section */}
				{consultorio.doctors.some((d) => d.medic_profile?.services && d.medic_profile.services.length > 0) && (
					<motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="bg-gradient-to-br from-white via-slate-50 to-white rounded-3xl shadow-2xl border border-slate-200/50 p-8 lg:p-12 relative overflow-hidden">
						{/* Decorative background elements */}
						<div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-teal-100/30 to-cyan-100/30 rounded-full blur-3xl -mr-48 -mt-48" />
						<div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-100/30 to-teal-100/30 rounded-full blur-3xl -ml-48 -mb-48" />
						
						<div className="relative z-10">
							<div className="flex items-center gap-4 mb-10">
								<div className="p-4 bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-600 rounded-2xl shadow-xl transform hover:scale-105 transition-transform">
									<Heart className="w-8 h-8 text-white" />
								</div>
								<div>
									<h2 className="text-3xl lg:text-4xl font-bold text-slate-900 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Servicios Individuales</h2>
									<p className="text-slate-600 mt-1">Consulta nuestros servicios médicos disponibles</p>
								</div>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
								{consultorio.doctors
									.flatMap((d) => d.medic_profile?.services || [])
									.filter((service, idx, arr) => {
										// Eliminar duplicados por nombre
										const serviceName = typeof service === 'string' ? service : service?.name || '';
										return arr.findIndex((s) => (typeof s === 'string' ? s : s?.name || '') === serviceName) === idx;
									})
									.map((service, idx) => {
										// Normalizar el servicio
										let serviceName = 'Servicio';
										let serviceDescription = '';
										let servicePrice = '';
										let serviceCurrency: 'USD' | 'VES' | 'EUR' = 'USD';

										if (typeof service === 'string') {
											serviceName = service;
										} else if (service && typeof service === 'object') {
											serviceName = service.name || 'Servicio';
											serviceDescription = service.description || '';
											servicePrice = service.price || '';
											serviceCurrency = service.currency || 'USD';
										}

										const formatPrice = (price: string, currency: string) => {
											if (!price) return 'Consultar precio';
											const numPrice = parseFloat(price);
											if (isNaN(numPrice)) return 'Consultar precio';

											const currencySymbols: Record<string, string> = {
												USD: '$',
												VES: 'Bs.',
												EUR: '€',
											};

											const symbol = currencySymbols[currency] || currency;
											return `${symbol} ${numPrice.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
										};

										return (
											<motion.div 
												key={idx} 
												initial={{ opacity: 0, y: 10 }} 
												whileInView={{ opacity: 1, y: 0 }} 
												viewport={{ once: true }}
												transition={{ duration: 0.4, delay: idx * 0.1 }}
												className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-slate-200 hover:border-teal-400 hover:shadow-xl transition-all group relative overflow-hidden"
											>
												{/* Hover effect background */}
												<div className="absolute inset-0 bg-gradient-to-br from-teal-50/0 to-cyan-50/0 group-hover:from-teal-50/50 group-hover:to-cyan-50/50 transition-all duration-300" />
												
												<div className="relative z-10">
													<div className="flex items-start gap-3 mb-4">
														<div className="p-2.5 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-xl group-hover:from-teal-200 group-hover:to-cyan-200 transition-colors">
															<CheckCircle2 className="w-5 h-5 text-teal-600" />
														</div>
														<div className="flex-1 min-w-0">
															<h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-teal-700 transition-colors">{serviceName}</h3>
															{serviceDescription && <p className="text-sm text-slate-600 mb-3 line-clamp-2 leading-relaxed">{serviceDescription}</p>}
														</div>
													</div>
													{servicePrice && (
														<div className="mt-4 pt-4 border-t border-slate-200">
															<div className="flex items-baseline gap-2">
																<span className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">{formatPrice(servicePrice, serviceCurrency)}</span>
																<span className="text-sm text-slate-500 font-medium">{serviceCurrency}</span>
															</div>
														</div>
													)}
												</div>
											</motion.div>
										);
									})}
							</div>
						</div>
					</motion.section>
				)}

				{/* Service Combos Section */}
				{consultorio.doctors.some((d) => d.medic_profile?.serviceCombos && d.medic_profile.serviceCombos.length > 0) && (() => {
					// Recopilar todos los combos únicos de todos los doctores
					const allCombos = consultorio.doctors
						.flatMap((d) => d.medic_profile?.serviceCombos || [])
						.filter((combo, idx, arr) => {
							// Eliminar duplicados por nombre
							const comboName = combo?.name || '';
							return arr.findIndex((c) => (c?.name || '') === comboName) === idx;
						});

					// Obtener todos los servicios para calcular ahorros
					const allServices = consultorio.doctors
						.flatMap((d) => d.medic_profile?.services || [])
						.reduce((acc: Map<string, any>, service) => {
							const serviceId = typeof service === 'object' && service?.id ? service.id : '';
							const serviceName = typeof service === 'string' ? service : service?.name || '';
							if (serviceId || serviceName) {
								acc.set(serviceId || serviceName, service);
							}
							return acc;
						}, new Map());

					return (
						<motion.section 
							initial={{ opacity: 0, y: 20 }} 
							whileInView={{ opacity: 1, y: 0 }} 
							viewport={{ once: true }} 
							transition={{ duration: 0.6 }} 
							className="bg-gradient-to-br from-gradient-to-br from-amber-50 via-orange-50 to-rose-50 rounded-3xl shadow-2xl border-2 border-orange-200/50 p-8 lg:p-12 relative overflow-hidden"
						>
							{/* Decorative background elements */}
							<div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-200/20 to-orange-200/20 rounded-full blur-3xl -mr-48 -mt-48" />
							<div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-rose-200/20 to-pink-200/20 rounded-full blur-3xl -ml-48 -mb-48" />
							
							<div className="relative z-10">
								<div className="flex items-center gap-4 mb-10">
									<div className="p-4 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-2xl shadow-xl transform hover:scale-105 transition-transform">
										<Package className="w-8 h-8 text-white" />
									</div>
									<div>
										<h2 className="text-3xl lg:text-4xl font-bold text-slate-900 bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">Combos Promocionales</h2>
										<p className="text-slate-600 mt-1">Paquetes especiales con descuentos exclusivos</p>
									</div>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
									{allCombos.map((combo: any, idx: number) => {
										if (!combo) return null;

										const comboName = combo.name || 'Combo';
										const comboDescription = combo.description || '';
										const comboPrice = combo.price || '';
										const comboCurrency = combo.currency || 'USD';
										const serviceIds = combo.serviceIds || [];

										// Calcular precio total de servicios individuales
										let totalIndividualPrice = 0;
										serviceIds.forEach((serviceId: string) => {
											const service = allServices.get(serviceId);
											if (service) {
												const price = typeof service === 'object' && service.price ? parseFloat(service.price) : 0;
												if (!isNaN(price)) {
													totalIndividualPrice += price;
												}
											}
										});

										// Calcular ahorro
										const comboPriceNum = comboPrice ? parseFloat(comboPrice) : 0;
										const savings = totalIndividualPrice > 0 && comboPriceNum > 0 ? totalIndividualPrice - comboPriceNum : 0;
										const savingsPercent = totalIndividualPrice > 0 ? Math.round((savings / totalIndividualPrice) * 100) : 0;

										const formatPrice = (price: string | number, currency: string) => {
											const numPrice = typeof price === 'string' ? parseFloat(price) : price;
											if (isNaN(numPrice)) return 'Consultar precio';

											const currencySymbols: Record<string, string> = {
												USD: '$',
												VES: 'Bs.',
												EUR: '€',
											};

											const symbol = currencySymbols[currency] || currency;
											return `${symbol} ${numPrice.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
										};

										return (
											<motion.div 
												key={idx} 
												initial={{ opacity: 0, y: 10 }} 
												whileInView={{ opacity: 1, y: 0 }} 
												viewport={{ once: true }}
												transition={{ duration: 0.4, delay: idx * 0.1 }}
												className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border-2 border-orange-200 hover:border-orange-400 hover:shadow-2xl transition-all group relative overflow-hidden"
											>
												{/* Badge de ahorro */}
												{savings > 0 && (
													<div className="absolute top-4 right-4 z-20">
														<div className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1">
															<Percent className="w-3 h-3" />
															{savingsPercent}% OFF
														</div>
													</div>
												)}

												{/* Hover effect background */}
												<div className="absolute inset-0 bg-gradient-to-br from-amber-50/0 to-orange-50/0 group-hover:from-amber-50/50 group-hover:to-orange-50/50 transition-all duration-300" />
												
												<div className="relative z-10">
													<div className="flex items-start gap-3 mb-4">
														<div className="p-2.5 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl group-hover:from-amber-200 group-hover:to-orange-200 transition-colors">
															<Package className="w-5 h-5 text-orange-600" />
														</div>
														<div className="flex-1 min-w-0 pr-8">
															<h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-orange-700 transition-colors">{comboName}</h3>
															{comboDescription && <p className="text-sm text-slate-600 mb-3 line-clamp-2 leading-relaxed">{comboDescription}</p>}
														</div>
													</div>

													{/* Servicios incluidos */}
													{serviceIds.length > 0 && (
														<div className="mb-4 pt-4 border-t border-slate-200">
															<p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Servicios Incluidos:</p>
															<div className="flex flex-wrap gap-2">
																{serviceIds.slice(0, 3).map((serviceId: string, sidx: number) => {
																	const service = allServices.get(serviceId);
																	const serviceName = typeof service === 'object' && service?.name ? service.name : (typeof service === 'string' ? service : serviceId);
																	return (
																		<span key={sidx} className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg">
																			{serviceName}
																		</span>
																	);
																})}
																{serviceIds.length > 3 && (
																	<span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg">
																		+{serviceIds.length - 3} más
																	</span>
																)}
															</div>
														</div>
													)}

													{/* Precio */}
													<div className="mt-4 pt-4 border-t border-slate-200">
														{totalIndividualPrice > 0 && (
															<div className="mb-2">
																<p className="text-xs text-slate-500 line-through">Precio individual: {formatPrice(totalIndividualPrice, comboCurrency)}</p>
															</div>
														)}
														<div className="flex items-baseline gap-2">
															<span className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">{formatPrice(comboPrice, comboCurrency)}</span>
															<span className="text-sm text-slate-500 font-medium">{comboCurrency}</span>
														</div>
														{savings > 0 && (
															<div className="mt-2 flex items-center gap-1 text-sm font-semibold text-green-600">
																<Zap className="w-4 h-4" />
																<span>Ahorras {formatPrice(savings, comboCurrency)}</span>
															</div>
														)}
													</div>
												</div>
											</motion.div>
										);
									})}
								</div>
							</div>
						</motion.section>
					);
				})()}

				{/* Gallery Section - Only show if there are more photos than the collage */}
				{consultorio.photos && consultorio.photos.length > 8 && (
					<motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="bg-gradient-to-br from-white to-slate-50 rounded-3xl shadow-xl border border-slate-200 p-8 lg:p-12">
						<div className="flex items-center gap-4 mb-8">
							<div className="p-4 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-2xl shadow-lg">
								<ImageIcon className="w-8 h-8 text-white" />
							</div>
							<h2 className="text-3xl lg:text-4xl font-bold text-slate-900">Galería de Instalaciones</h2>
						</div>
						<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
							{consultorio.photos.slice(8).map((photo, idx) => (
								<button key={idx + 8} onClick={() => setSelectedImage(photo)} className="relative aspect-square rounded-xl overflow-hidden hover:scale-105 transition cursor-pointer shadow-md hover:shadow-xl group">
									<Image src={photo} alt={`Foto ${idx + 9}`} fill className="object-cover" />
									<div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
								</button>
							))}
						</div>
					</motion.section>
				)}

				{/* Contact & Info Grid */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{/* Contact Information */}
					<motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="bg-gradient-to-br from-white to-slate-50 rounded-3xl shadow-xl border border-slate-200 p-8 lg:p-10">
						<div className="flex items-center gap-4 mb-8">
							<div className="p-4 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-2xl shadow-lg">
								<MessageCircle className="w-8 h-8 text-white" />
							</div>
							<h2 className="text-3xl lg:text-4xl font-bold text-slate-900">Información de Contacto</h2>
						</div>
						<div className="space-y-4">
							{consultorio.phone_mobile && (
								<a href={`tel:${consultorio.phone_mobile}`} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition group">
									<div className="p-3 bg-teal-100 rounded-lg group-hover:bg-teal-200 transition">
										<Phone className="w-6 h-6 text-teal-600" />
									</div>
									<div>
										<p className="text-sm text-slate-600">Teléfono Móvil</p>
										<p className="text-lg font-semibold text-slate-900">{formatPhone(consultorio.phone_mobile)}</p>
									</div>
								</a>
							)}
							{consultorio.phone_fixed && (
								<a href={`tel:${consultorio.phone_fixed}`} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition group">
									<div className="p-3 bg-teal-100 rounded-lg group-hover:bg-teal-200 transition">
										<Phone className="w-6 h-6 text-teal-600" />
									</div>
									<div>
										<p className="text-sm text-slate-600">Teléfono Fijo</p>
										<p className="text-lg font-semibold text-slate-900">{formatPhone(consultorio.phone_fixed)}</p>
									</div>
								</a>
							)}
							{consultorio.contact_email && (
								<a href={`mailto:${consultorio.contact_email}`} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition group">
									<div className="p-3 bg-teal-100 rounded-lg group-hover:bg-teal-200 transition">
										<Mail className="w-6 h-6 text-teal-600" />
									</div>
									<div>
										<p className="text-sm text-slate-600">Email</p>
										<p className="text-lg font-semibold text-slate-900">{consultorio.contact_email}</p>
									</div>
								</a>
							)}
							{consultorio.address_operational && (
								<div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
									<div className="p-3 bg-teal-100 rounded-lg">
										<MapPin className="w-6 h-6 text-teal-600" />
									</div>
									<div>
										<p className="text-sm text-slate-600">Dirección</p>
										<p className="text-lg font-semibold text-slate-900">{consultorio.address_operational}</p>
									</div>
								</div>
							)}
						</div>

						{/* Social Media */}
						{(consultorio.social_instagram || consultorio.social_facebook || consultorio.social_linkedin) && (
							<div className="mt-6 pt-6 border-t border-slate-200">
								<p className="text-sm font-semibold text-slate-700 mb-3">Síguenos en:</p>
								<div className="flex gap-3">
									{consultorio.social_instagram && (
										<a href={consultorio.social_instagram} target="_blank" rel="noopener noreferrer" className="p-3 bg-gradient-to-br from-pink-500 to-purple-600 text-white rounded-lg hover:scale-110 transition shadow-md">
											<Instagram className="w-5 h-5" />
										</a>
									)}
									{consultorio.social_facebook && (
										<a href={consultorio.social_facebook} target="_blank" rel="noopener noreferrer" className="p-3 bg-blue-600 text-white rounded-lg hover:scale-110 transition shadow-md">
											<Facebook className="w-5 h-5" />
										</a>
									)}
									{consultorio.social_linkedin && (
										<a href={consultorio.social_linkedin} target="_blank" rel="noopener noreferrer" className="p-3 bg-blue-700 text-white rounded-lg hover:scale-110 transition shadow-md">
											<Linkedin className="w-5 h-5" />
										</a>
									)}
								</div>
							</div>
						)}
					</motion.section>

					{/* Schedule & Certifications */}
					<motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="bg-gradient-to-br from-white to-slate-50 rounded-3xl shadow-xl border border-slate-200 p-8 lg:p-10">
						<div className="flex items-center gap-4 mb-8">
							<div className="p-4 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-2xl shadow-lg">
								<Clock className="w-8 h-8 text-white" />
							</div>
							<h2 className="text-3xl lg:text-4xl font-bold text-slate-900">Horarios de Atención</h2>
						</div>
						{openingHoursFormatted && openingHoursFormatted.length > 0 ? (
							<div className="space-y-4">
								{openingHoursFormatted.map((schedule, idx) => (
									<div key={idx} className="bg-white rounded-xl p-4 border border-slate-200 hover:border-teal-300 transition">
										<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
											<div className="flex items-center gap-3">
												<div className="p-2 bg-teal-100 rounded-lg">
													<Calendar className="w-5 h-5 text-teal-600" />
												</div>
												<div>
													<p className="text-sm font-semibold text-slate-700">{schedule.days.length === 1 ? schedule.days[0] : schedule.days.length === 7 ? 'Todos los días' : schedule.days.join(', ')}</p>
													{schedule.days.length > 1 && schedule.days.length < 7 && <p className="text-xs text-slate-500 mt-0.5">{schedule.days.length} días a la semana</p>}
												</div>
											</div>
											<div className="flex items-center gap-2 sm:ml-4">
												<Clock className="w-4 h-4 text-teal-600" />
												<span className="text-lg font-bold text-slate-900">{schedule.time}</span>
											</div>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="bg-slate-50 rounded-xl p-6 border border-slate-200 text-center">
								<Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
								<p className="text-slate-600 font-medium">Horarios disponibles bajo consulta</p>
								<p className="text-sm text-slate-500 mt-2">Contacta directamente para conocer nuestros horarios de atención</p>
							</div>
						)}

						{/* Cashea Section - Solo mostrar si has_cashea es true explícitamente */}
						{(consultorio.has_cashea === true || consultorio.doctors?.some((d) => d.medic_profile?.has_cashea === true)) && (
							<div className="mt-8 pt-8 border-t border-slate-200">
								<div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-6 border-2 border-teal-200">
									<div className="flex flex-col sm:flex-row items-center gap-4">
										<div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0">
											<Image src="/descarga.png" alt="Cashea" fill className="object-contain" />
										</div>
										<div className="flex-1 text-center sm:text-left">
											<h3 className="text-xl font-bold text-slate-900 mb-2">Aceptamos Cashea</h3>
											<p className="text-slate-700">Este consultorio acepta pagos a través de Cashea. Puedes realizar tus pagos de forma segura y conveniente.</p>
										</div>
									</div>
								</div>
							</div>
						)}

						{/* Certifications */}
						{(consultorio.sanitary_license || consultorio.liability_insurance_number || consultorio.has_cashea) && (
							<div className="mt-8 pt-8 border-t border-slate-200">
								<h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
									<Shield className="w-6 h-6 text-teal-600" />
									Certificaciones
								</h3>
								<div className="space-y-3">
									{consultorio.sanitary_license && (
										<div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
											<Award className="w-5 h-5 text-green-600" />
											<div>
												<p className="text-sm text-slate-600">Licencia Sanitaria</p>
												<p className="text-sm font-semibold text-slate-900">{consultorio.sanitary_license}</p>
											</div>
										</div>
									)}
									{consultorio.liability_insurance_number && (
										<div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
											<Shield className="w-5 h-5 text-blue-600" />
											<div>
												<p className="text-sm text-slate-600">Seguro de Responsabilidad</p>
												<p className="text-sm font-semibold text-slate-900">{consultorio.liability_insurance_number}</p>
											</div>
										</div>
									)}
									{consultorio.has_cashea && (
										<div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
											<CheckCircle2 className="w-5 h-5 text-purple-600" />
											<div>
												<p className="text-sm font-semibold text-slate-900">Acepta Cashea</p>
												<p className="text-xs text-slate-600">Método de pago digital disponible</p>
											</div>
										</div>
									)}
								</div>
							</div>
						)}
					</motion.section>
				</div>

				{/* CTA Section */}
				<motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 rounded-3xl shadow-2xl p-10 lg:p-16 text-center text-white relative overflow-hidden">
					{/* Decorative Elements */}
					<div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
					<div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full -ml-32 -mb-32 blur-3xl" />

					<div className="relative z-10">
						<h2 className="text-3xl lg:text-5xl font-bold mb-4">¿Listo para agendar tu cita?</h2>
						<p className="text-xl lg:text-2xl mb-8 opacity-95 max-w-2xl mx-auto">Regístrate en nuestra plataforma para agendar tu consulta de forma rápida y sencilla, o contáctanos directamente</p>
						<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
							<Link href="/register?role=PACIENTE" className="inline-flex items-center gap-3 px-8 py-4 bg-white text-teal-600 rounded-xl font-bold text-lg shadow-2xl hover:scale-105 transition hover:shadow-3xl">
								<Users className="w-6 h-6" />
								Registrarse para Agendar
							</Link>
							{consultorio.phone_mobile && (
								<a href={`tel:${consultorio.phone_mobile}`} className="inline-flex items-center gap-3 px-8 py-4 bg-white/20 backdrop-blur-md border-2 border-white/30 text-white rounded-xl font-bold text-lg hover:bg-white/30 transition hover:scale-105">
									<Phone className="w-6 h-6" />
									Llamar Ahora
								</a>
							)}
						</div>
					</div>
				</motion.section>
			</div>

			{/* Image Modal */}
			{selectedImage && (
				<div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
					<button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 text-white hover:text-gray-300">
						<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
					<div className="relative max-w-5xl max-h-[90vh]">
						<Image src={selectedImage} alt="Imagen ampliada" width={1200} height={800} className="object-contain max-h-[90vh] rounded-lg" />
					</div>
				</div>
			)}
		</div>
	);
}
