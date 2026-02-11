'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Stethoscope, MapPin, Phone, Mail, Globe, Clock, Calendar, Instagram, Facebook, Linkedin, CheckCircle2, Shield, Award, Star, ExternalLink, MessageCircle, Heart, Users, FileText, Building2, Sparkles, Image as ImageIcon, Package, Percent, Zap, Info } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import AppointmentBookingModal, { Doctor } from './AppointmentBookingModal';

type ConsultorioData = {
	id: string;
	name: string;
	legal_name: string;
	trade_name: string | null;
	address_operational: string | null;
	address_fiscal: string | null;
	phone_mobile: string | null;
	phone_fixed: string | null;
	contact_email: string | null;
	website: string | null;
	social_facebook: string | null;
	social_instagram: string | null;
	social_linkedin: string | null;
	specialties: string[] | any;
	opening_hours: any[];
	location: any;
	photos: string[];
	profile_photo: string | null;
	sanitary_license: string | null;
	liability_insurance_number: string | null;
	has_cashea: boolean | null;
	// Additional clinic_profile fields
	legal_rif?: string | null;
	entity_type?: string | null;
	state_province?: string | null;
	city_municipality?: string | null;
	postal_code?: string | null;
	offices_count?: number | null;
	capacity_per_day?: number | null;
	employees_count?: number | null;
	director_name?: string | null;
	admin_name?: string | null;
	director_id_number?: string | null;
	bank_name?: string | null;
	bank_account_type?: string | null;
	bank_account_number?: string | null;
	bank_account_owner?: string | null;
	currency?: string | null;
	payment_methods?: any[] | null;
	billing_series?: string | null;
	tax_regime?: string | null;
	billing_address?: string | null;
	doctors: Doctor[];
};

export default function ConsultorioPublicPage({ consultorio }: { consultorio: ConsultorioData }) {
	const [selectedImage, setSelectedImage] = useState<string | null>(null);
	const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);

	const displayName = consultorio.trade_name || consultorio.legal_name || consultorio.name;

	// Verificar si hay múltiples especialidades únicas entre los doctores - siempre retornar array de strings limpios (nunca JSON)
	const getAllSpecialties = (): string[] => {
		const specialtiesSet = new Set<string>();

		// Función helper para limpiar y agregar una especialidad
		const addSpecialty = (spec: any) => {
			if (!spec) return;
			
			if (typeof spec === 'string') {
				const cleaned = spec.trim();
				if (!cleaned || cleaned === 'null' || cleaned === 'undefined') return;
				
				// Si parece ser JSON array/object, parsearlo
				if (cleaned.startsWith('[')) {
					try {
						const parsed = JSON.parse(cleaned);
						if (Array.isArray(parsed)) {
							parsed.forEach((p: any) => addSpecialty(p)); // Recursivo
							return;
						}
						addSpecialty(parsed); // Recursivo si es objeto
						return;
					} catch {
						// Si falla parseo JSON, intentar extraer manualmente
						const extracted = cleaned.replace(/^\[|\]$/g, '').replace(/"/g, '').trim();
						if (extracted) {
							extracted.split(',').forEach((s: string) => {
								const trimmed = s.trim();
								if (trimmed && !trimmed.startsWith('[') && !trimmed.startsWith('{')) {
									specialtiesSet.add(trimmed);
								}
							});
						}
						return;
					}
				}
				// Si parece JSON object
				if (cleaned.startsWith('{')) {
					try {
						const parsed = JSON.parse(cleaned);
						if (parsed.name) addSpecialty(parsed.name);
						else if (parsed.label) addSpecialty(parsed.label);
						return;
					} catch {
						return; // Ignorar si no es parseable
					}
				}
				// String normal, agregarlo
				if (cleaned && !cleaned.startsWith('[') && !cleaned.startsWith('{')) {
					specialtiesSet.add(cleaned);
				}
			}
			// Si es objeto, extraer nombre
			else if (typeof spec === 'object' && spec !== null) {
				if (spec.name && typeof spec.name === 'string') {
					addSpecialty(spec.name);
				} else if (spec.label && typeof spec.label === 'string') {
					addSpecialty(spec.label);
				} else {
					// Intentar convertir a string
					const strSpec = String(spec);
					if (strSpec && strSpec !== '[object Object]' && !strSpec.startsWith('[') && !strSpec.startsWith('{')) {
						specialtiesSet.add(strSpec.trim());
					}
				}
			}
		};

		// Agregar especialidades de los doctores
		consultorio.doctors?.forEach((doctor) => {
			const specialty = doctor.medic_profile?.private_specialty || doctor.medic_profile?.specialty;
			if (specialty) {
				addSpecialty(specialty);
			}
		});

		// Agregar especialidades del consultorio si existen
		if (consultorio.specialties) {
			if (Array.isArray(consultorio.specialties)) {
				consultorio.specialties.forEach((spec: any) => {
					addSpecialty(spec);
				});
			} else {
				addSpecialty(consultorio.specialties);
			}
		}

		// Filtrar y retornar array limpio de strings (nunca JSON)
		return Array.from(specialtiesSet)
			.filter((s): s is string => {
				if (typeof s !== 'string') return false;
				const cleaned = s.trim();
				return cleaned.length > 0 
					&& cleaned !== 'null' 
					&& cleaned !== 'undefined' 
					&& !cleaned.startsWith('[') 
					&& !cleaned.startsWith('{')
					&& cleaned !== '[object Object]';
			})
			.sort(); // Ordenar alfabéticamente para consistencia
	};

	const allSpecialties = getAllSpecialties();
	const hasMultipleSpecialties = allSpecialties.length > 1;
	
	// Obtener especialidad primaria después de parsear
	const getPrimarySpecialty = () => {
		if (allSpecialties.length > 0) {
			return allSpecialties[0];
		}
		if (consultorio.doctors && consultorio.doctors.length > 0) {
			for (const doctor of consultorio.doctors) {
				const specialty = doctor.medic_profile?.private_specialty || doctor.medic_profile?.specialty;
				if (specialty && typeof specialty === 'string' && specialty.trim() && !specialty.trim().startsWith('[') && !specialty.trim().startsWith('{')) {
					return specialty.trim();
				}
			}
		}
		return 'Medicina General';
	};
	
	const primarySpecialty = getPrimarySpecialty();
	
	// Función helper para mostrar datos o "Dato no disponible"
	const displayOrNotAvailable = (value: any, prefix: string = ''): string => {
		if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
			return 'Dato no disponible';
		}
		if (typeof value === 'boolean') {
			return value ? 'Sí' : 'No';
		}
		if (typeof value === 'number') {
			return `${prefix}${value.toLocaleString('es-VE')}`;
		}
		return `${prefix}${String(value).trim()}`;
	};

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

	// Agrupar consultorios únicos y sus configuraciones
	const officesInfo = (() => {
		const officesMap = new Map<string, any>();
		
		consultorio.doctors.forEach(doctor => {
			const config = doctor.medic_profile?.doctor_schedule_config;
			const offices = config?.offices || [];
			
			offices.forEach((office: any) => {
				if (!officesMap.has(office.id)) {
					officesMap.set(office.id, {
						...office,
						consultationType: config?.consultation_type || 'TURNOS'
					});
				}
			});
		});
		
		return Array.from(officesMap.values());
	})();

	const dayNameMap: Record<string, string> = {
		monday: 'Lun', tuesday: 'Mar', wednesday: 'Mié', thursday: 'Jue',
		friday: 'Vie', saturday: 'Sáb', sunday: 'Dom'
	};

	return (
		<div className="min-h-screen bg-white">
			<style jsx>{`
				@keyframes pulse-subtle {
					0%, 100% { opacity: 0.7; transform: scale(1); }
					50% { opacity: 0.9; transform: scale(1.02); }
				}
				.animate-pulse-subtle {
					animation: pulse-subtle 4s ease-in-out infinite;
				}
			`}</style>
			{/* Hero Section with Innovative Mosaic Background */}
			<div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
				{/* Mosaic Background with Pattern */}
				<div className="relative h-[500px] sm:h-[600px] lg:h-[700px] overflow-hidden">
					{/* Mosaic Grid with Images */}
					{consultorio.photos && consultorio.photos.length > 0 ? (
						<div className="absolute inset-0 grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1 opacity-80">
							{Array.from({ length: 32 }).map((_, idx) => {
								const photoIndex = idx % consultorio.photos.length;
								const photo = consultorio.photos[photoIndex];
								return (
									<div key={idx} className="relative overflow-hidden group cursor-pointer animate-pulse-subtle" style={{ animationDelay: `${idx * 0.1}s` }} onClick={() => setSelectedImage(photo)}>
										<Image src={photo} alt={`Foto del consultorio ${photoIndex + 1}`} fill className="object-cover group-hover:scale-125 transition-transform duration-700 group-hover:opacity-100 opacity-70" />
										<div className="absolute inset-0 bg-gradient-to-br from-teal-900/30 via-cyan-900/20 to-slate-900/40 group-hover:bg-transparent transition-all duration-500" />
									</div>
								);
							})}
						</div>
					) : consultorio.profile_photo ? (
						<div className="absolute inset-0">
							<Image src={consultorio.profile_photo} alt={displayName} fill className="object-cover opacity-60" priority />
							{/* Geometric Pattern Overlay */}
							<div className="absolute inset-0 opacity-20" style={{
								backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(14, 165, 233, 0.1) 35px, rgba(14, 165, 233, 0.1) 70px)'
							}} />
						</div>
					) : (
						<div className="absolute inset-0 bg-gradient-to-br from-teal-900 to-cyan-900">
							{/* Animated Pattern Background */}
							<div className="absolute inset-0 opacity-30" style={{
								backgroundImage: `
									repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px),
									repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)
								`,
								backgroundSize: '50px 50px'
							}} />
							<div className="absolute inset-0 flex items-center justify-center">
								<Building2 className="w-48 h-48 text-white/20 animate-pulse" />
							</div>
						</div>
					)}
					
					{/* Dynamic Gradient Overlay */}
					<div className="absolute inset-0 bg-gradient-to-t from-slate-900/98 via-slate-900/85 to-slate-900/70" />
					<div className="absolute inset-0 bg-gradient-to-br from-teal-900/40 via-transparent to-cyan-900/40" />
				</div>

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

							{/* Specialty - Display as normal text (not JSON) */}
							<div className="flex items-center gap-4">
								<div className="p-3 bg-white/20 backdrop-blur-md rounded-xl border border-white/30">
									<Stethoscope className="w-8 h-8" />
								</div>
								<div>
									<p className="text-2xl sm:text-3xl font-bold">
										{(() => {
											// Asegurar que todas las especialidades sean strings limpios, no JSON
											const cleanSpecialties = allSpecialties
												.map(s => {
													if (typeof s === 'string') {
														const cleaned = s.trim();
														// Si parece JSON array/object, intentar limpiarlo
														if (cleaned.startsWith('[') || cleaned.startsWith('{')) {
															try {
																const parsed = JSON.parse(cleaned);
																if (Array.isArray(parsed)) {
																	return parsed.map(p => String(p).trim()).filter(p => p && !p.startsWith('[') && !p.startsWith('{'));
																}
																return [String(parsed).trim()];
															} catch {
																// Intentar extraer manualmente
																const extracted = cleaned.replace(/^\[|\]$/g, '').replace(/"/g, '').trim();
																return extracted ? extracted.split(',').map(e => e.trim()) : [];
															}
														}
														return [cleaned];
													}
													return [String(s).trim()];
												})
												.flat()
												.filter(s => s && s.length > 0 && !s.startsWith('[') && !s.startsWith('{') && s !== 'null' && s !== 'undefined');
											
											if (cleanSpecialties.length === 0) return primarySpecialty || 'Medicina General';
											if (cleanSpecialties.length === 1) return cleanSpecialties[0];
											if (cleanSpecialties.length === 2) return `${cleanSpecialties[0]} y ${cleanSpecialties[1]}`;
											if (cleanSpecialties.length === 3) return `${cleanSpecialties[0]}, ${cleanSpecialties[1]} y ${cleanSpecialties[2]}`;
											return cleanSpecialties.slice(0, 3).join(', ') + ` y ${cleanSpecialties.length - 3} especialidad${cleanSpecialties.length - 3 > 1 ? 'es' : ''} más`;
										})()}
									</p>
								</div>
							</div>

							{/* Quick Contact Info & CTA */}
							<div className="flex flex-wrap gap-4 pt-4 items-center">
								{consultorio.phone_mobile && (
									<a href={`tel:${consultorio.phone_mobile}`} className="inline-flex items-center gap-2 px-5 py-3 bg-white/20 backdrop-blur-md rounded-xl hover:bg-white/30 transition border border-white/30 text-white font-medium">
										<Phone className="w-5 h-5" />
										<span>{formatPhone(consultorio.phone_mobile)}</span>
									</a>
								)}
								{consultorio.contact_email && (
									<a href={`mailto:${consultorio.contact_email}`} className="inline-flex items-center gap-2 px-5 py-3 bg-white/20 backdrop-blur-md rounded-xl hover:bg-white/30 transition border border-white/30 text-white font-medium">
										<Mail className="w-5 h-5" />
										<span className="text-sm">{consultorio.contact_email}</span>
									</a>
								)}
								{consultorio.address_operational && (
									<div className="inline-flex items-center gap-2 px-5 py-3 bg-white/20 backdrop-blur-md rounded-xl border border-white/30 text-white">
										<MapPin className="w-5 h-5" />
										<span className="text-sm">{consultorio.address_operational}</span>
									</div>
								)}
								{/* Cashea Status Badge */}
								<div className={`inline-flex items-center gap-2 px-4 py-2 backdrop-blur-md rounded-xl border text-white ${
									consultorio.has_cashea === true 
										? 'bg-gradient-to-r from-teal-500/30 to-cyan-500/30 border-teal-300/50' 
										: consultorio.has_cashea === false
											? 'bg-gradient-to-r from-slate-500/20 to-slate-600/20 border-slate-400/30'
											: 'bg-gradient-to-r from-slate-500/20 to-slate-600/20 border-slate-400/30'
								}`}>
									<Zap className={`w-4 h-4 ${consultorio.has_cashea === true ? 'text-teal-200' : 'text-slate-300'}`} />
									<span className="text-xs font-semibold">
										{consultorio.has_cashea === true 
											? 'Acepta Cashea' 
											: consultorio.has_cashea === false
												? 'No acepta Cashea'
												: 'Información de pago no disponible'
										}
									</span>
								</div>
							</div>

							{/* Hero CTA Buttons */}
							<div className="flex flex-wrap gap-4 pt-6">
								<button
									onClick={() => setIsAppointmentModalOpen(true)}
									className="inline-flex items-center gap-3 px-8 py-4 bg-white text-teal-600 rounded-xl font-bold text-lg shadow-2xl hover:scale-105 transition hover:shadow-3xl group"
								>
									<Calendar className="w-6 h-6 group-hover:scale-110 transition-transform" />
									Agendar Cita Ahora
								</button>
								{consultorio.phone_mobile && (
									<a href={`tel:${consultorio.phone_mobile}`} className="inline-flex items-center gap-3 px-8 py-4 bg-white/20 backdrop-blur-md border-2 border-white/40 text-white rounded-xl font-bold text-lg hover:bg-white/30 transition hover:scale-105 group">
										<Phone className="w-6 h-6 group-hover:scale-110 transition-transform" />
										Llamar Ahora
									</a>
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
						{allSpecialties.length > 0 && (
							<div className="mt-8 pt-8 border-t border-slate-200">
								<h3 className="text-2xl font-bold text-slate-900 mb-4">Nuestras Especialidades</h3>
								<p className="text-lg text-slate-700 leading-relaxed font-medium">
									{(() => {
										// Asegurar que todas las especialidades sean strings limpios
										const cleanSpecialties = allSpecialties
											.map(s => {
												if (typeof s === 'string') {
													const cleaned = s.trim();
													// Si parece JSON, intentar limpiarlo
													if (cleaned.startsWith('[') || cleaned.startsWith('{')) {
														try {
															const parsed = JSON.parse(cleaned);
															if (Array.isArray(parsed)) {
																return parsed.map(p => String(p).trim()).join(', ');
															}
															return String(parsed).trim();
														} catch {
															return cleaned.replace(/^\[|\]$/g, '').replace(/"/g, '').trim();
														}
													}
													return cleaned;
												}
												return String(s).trim();
											})
											.filter(s => s && s.length > 0 && !s.startsWith('[') && !s.startsWith('{') && s !== 'null' && s !== 'undefined');
										
										if (cleanSpecialties.length === 0) return 'Dato no disponible';
										if (cleanSpecialties.length === 1) return cleanSpecialties[0];
										if (cleanSpecialties.length === 2) return `${cleanSpecialties[0]} y ${cleanSpecialties[1]}`;
										return cleanSpecialties.slice(0, -1).join(', ') + ' y ' + cleanSpecialties[cleanSpecialties.length - 1];
									})()}
								</p>
							</div>
						)}
						
						{/* Cashea Status in About Section - Always show */}
						<div className="mt-8 pt-8 border-t border-slate-200">
							<h3 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
								<Zap className="w-6 h-6 text-teal-600" />
								Aceptación de Cashea
							</h3>
							<div className={`p-5 rounded-xl border-2 ${
								consultorio.has_cashea === true 
									? 'bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-300 shadow-md' 
									: consultorio.has_cashea === false
										? 'bg-slate-50 border-slate-300'
										: 'bg-slate-50 border-slate-200'
							}`}>
								<div className="flex items-start gap-4">
									<div className={`p-3 rounded-lg ${
										consultorio.has_cashea === true ? 'bg-teal-100' : 'bg-slate-200'
									}`}>
										<Zap className={`w-6 h-6 ${
											consultorio.has_cashea === true ? 'text-teal-600' : 'text-slate-400'
										}`} />
									</div>
									<div className="flex-1">
										<p className="text-lg font-bold text-slate-900 mb-2">
											{consultorio.has_cashea === true 
												? '✅ Sí, aceptamos Cashea' 
												: consultorio.has_cashea === false
													? '❌ No aceptamos Cashea'
													: '❓ Dato no disponible sobre Cashea'
											}
										</p>
										{consultorio.has_cashea === true && (
											<p className="text-sm text-slate-700 leading-relaxed">Este consultorio acepta pagos a través de Cashea. Puedes realizar tus pagos de forma segura, rápida y conveniente a través de nuestra plataforma digital.</p>
										)}
										{consultorio.has_cashea === false && (
											<p className="text-sm text-slate-600 leading-relaxed">Este consultorio no acepta pagos a través de Cashea en este momento. Por favor, contacta directamente para conocer los métodos de pago disponibles.</p>
										)}
										{consultorio.has_cashea === null || consultorio.has_cashea === undefined && (
											<p className="text-sm text-slate-600 leading-relaxed">No hay información disponible sobre la aceptación de Cashea. Por favor, contacta directamente al consultorio para más información sobre métodos de pago.</p>
										)}
									</div>
								</div>
							</div>
						</div>
					</div>
				</motion.section>

				{/* Offices Section */}
				{officesInfo.length > 0 && (
					<motion.section 
						initial={{ opacity: 0, y: 20 }} 
						whileInView={{ opacity: 1, y: 0 }} 
						viewport={{ once: true }} 
						transition={{ duration: 0.6 }} 
						className="relative"
					>
						<div className="flex items-center gap-4 mb-10">
							<div className="p-4 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-2xl shadow-lg">
								<Building2 className="w-8 h-8 text-white" />
							</div>
							<div>
								<h2 className="text-3xl lg:text-4xl font-bold text-slate-900">Nuestras Sedes</h2>
								<p className="text-slate-600">Encuéntranos en nuestras diferentes ubicaciones</p>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
							{officesInfo.map((office) => (
								<div 
									key={office.id} 
									className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative"
								>
									{/* Decorative badge for mode */}
									<div className="absolute top-0 right-0 p-4">
										<div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
											office.consultationType === 'ORDEN_LLEGADA' 
												? 'bg-amber-100 text-amber-700' 
												: 'bg-teal-100 text-teal-700'
										}`}>
											{office.consultationType === 'ORDEN_LLEGADA' ? (
												<>
													<Zap className="w-3.5 h-3.5" />
													Orden de Llegada
												</>
											) : (
												<>
													<Clock className="w-3.5 h-3.5" />
													Previa Cita
												</>
											)}
										</div>
									</div>

									<h3 className="text-2xl font-bold text-slate-900 mb-4 group-hover:text-teal-600 transition-colors">
										{office.name}
									</h3>
									
									<div className="flex items-start gap-3 mb-6">
										<div className="p-2 bg-slate-50 rounded-lg group-hover:bg-teal-50 transition-colors">
											<MapPin className="w-5 h-5 text-slate-500 group-hover:text-teal-600" />
										</div>
										<p className="text-slate-600 leading-relaxed pt-1">
											{typeof office.location === 'object' ? office.location.address : (office.location || 'Dirección no especificada')}
										</p>
									</div>

									<div className="space-y-4">
										<h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
											<Clock className="w-4 h-4" />
											Horarios de Atención
										</h4>
										<div className="grid grid-cols-1 gap-3">
											{office.schedules && office.schedules.length > 0 ? (
												office.schedules.map((schedule: any, sIdx: number) => (
													<div key={sIdx} className="bg-slate-50 rounded-2xl p-4 flex flex-col gap-2 border border-transparent group-hover:border-teal-100 transition-all">
														<div className="flex flex-wrap gap-1.5">
															{schedule.days?.map((day: string) => (
																<span key={day} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-500 uppercase">
																	{dayNameMap[day] || day}
																</span>
															))}
														</div>
														<div className="flex items-center justify-between mt-1">
															<div className="flex flex-col">
																{office.consultationType === 'ORDEN_LLEGADA' ? (
																	<div className="flex gap-3">
																		{schedule.shifts?.includes('morning') && (
																			<span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
																				<span className="w-2 h-2 rounded-full bg-teal-400" />
																				Mañana
																			</span>
																		)}
																		{schedule.shifts?.includes('afternoon') && (
																			<span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
																				<span className="w-2 h-2 rounded-full bg-blue-400" />
																				Tarde
																			</span>
																		)}
																	</div>
																) : (
																	<div className="text-sm font-bold text-slate-700">
																		{schedule.hours ? (
																			Object.entries(schedule.hours).map(([shiftId, h]: [string, any]) => {
																				if (schedule.shifts?.includes(shiftId)) {
																					return <div key={shiftId}>{h.start} - {h.end}</div>;
																				}
																				return null;
																			})
																		) : 'Consultar horario'}
																	</div>
																)}
															</div>
															<Info className="w-4 h-4 text-slate-300 group-hover:text-teal-400 transition-colors" />
														</div>
													</div>
												))
											) : (
												<p className="text-sm text-slate-400 italic">No hay horarios configurados para esta sede</p>
											)}
										</div>
									</div>
								</div>
							))}
						</div>
					</motion.section>
				)}

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
								// Función helper para parsear y normalizar especialidades del doctor
								const parseDoctorSpecialty = (specialty: any): string => {
									if (!specialty) return 'Médico';
									
									// Si es string, verificar si es JSON
									if (typeof specialty === 'string') {
										const cleaned = specialty.trim();
										// Si parece JSON array, parsearlo
										if (cleaned.startsWith('[')) {
											try {
												const parsed = JSON.parse(cleaned);
												if (Array.isArray(parsed)) {
													return parsed
														.map((s: any) => String(s).trim())
														.filter((s: string) => s && s.length > 0 && !s.startsWith('[') && !s.startsWith('{'))
														.join(', ');
												}
											} catch {
												// Si falla, intentar extraer manualmente
												const extracted = cleaned.replace(/^\[|\]$/g, '').replace(/"/g, '').trim();
												if (extracted) {
													return extracted.split(',').map(s => s.trim()).filter(s => s.length > 0).join(', ');
												}
											}
										}
										// String normal
										return cleaned;
									}
									
									// Si es array
									if (Array.isArray(specialty)) {
										return specialty
											.map((s: any) => String(s).trim())
											.filter((s: string) => s && s.length > 0 && !s.startsWith('[') && !s.startsWith('{'))
											.join(', ');
									}
									
									// Si es objeto
									if (typeof specialty === 'object' && specialty !== null) {
										return String(specialty.name || specialty.label || specialty).trim();
									}
									
									return String(specialty).trim() || 'Médico';
								};
								
								const rawSpecialty = doctor.medic_profile?.private_specialty || doctor.medic_profile?.specialty;
								const specialty = parseDoctorSpecialty(rawSpecialty);
								
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
											<div className="px-4 py-2 bg-teal-50 text-teal-700 rounded-lg font-semibold mb-4 text-center">{specialty}</div>
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

				{/* CTA Section - After About */}
				<motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 rounded-3xl shadow-2xl p-8 lg:p-12 text-center text-white relative overflow-hidden">
					<div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
					<div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full -ml-32 -mb-32 blur-3xl" />
					<div className="relative z-10">
						<h3 className="text-2xl lg:text-3xl font-bold mb-3">¿Buscas atención médica especializada?</h3>
						<p className="text-lg mb-6 opacity-95 max-w-2xl mx-auto">Regístrate ahora y agenda tu cita en minutos. Gestiona tus consultas médicas de forma fácil y segura.</p>
						<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
							<Link href="/register?role=PACIENTE" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-teal-600 rounded-xl font-bold shadow-xl hover:scale-105 transition hover:shadow-2xl">
								<Users className="w-5 h-5" />
								Registrarse Gratis
							</Link>
							{consultorio.contact_email && (
								<a href={`mailto:${consultorio.contact_email}`} className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-xl font-bold hover:bg-white/30 transition">
									<Mail className="w-5 h-5" />
									Enviar Email
								</a>
							)}
						</div>
					</div>
				</motion.section>

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
											servicePrice = service.price !== undefined && service.price !== null ? String(service.price) : '';
											serviceCurrency = (service.currency as 'USD' | 'VES' | 'EUR') || 'USD';
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
													{/* CTA Button for each service */}
													<div className="mt-4 pt-4 border-t border-slate-200">
														<button
															onClick={() => setIsAppointmentModalOpen(true)}
															className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg font-semibold hover:from-teal-700 hover:to-cyan-700 transition shadow-md hover:shadow-lg group"
														>
															<Calendar className="w-4 h-4 group-hover:scale-110 transition-transform" />
															Agendar Este Servicio
														</button>
													</div>
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
													{/* CTA Button for combo */}
													<div className="mt-4 pt-4 border-t border-slate-200">
														<button
															onClick={() => setIsAppointmentModalOpen(true)}
															className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-bold hover:from-amber-600 hover:to-orange-600 transition shadow-lg hover:shadow-xl group"
														>
															<Calendar className="w-5 h-5 group-hover:scale-110 transition-transform" />
															Agendar Combo Ahora
														</button>
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
								<a href={`mailto:${consultorio.contact_email}?subject=Consulta Médica&body=Hola, me gustaría agendar una cita.`} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition group">
									<div className="p-3 bg-teal-100 rounded-lg group-hover:bg-teal-200 transition">
										<Mail className="w-6 h-6 text-teal-600" />
									</div>
									<div className="flex-1">
										<p className="text-sm text-slate-600">Correo Electrónico</p>
										<p className="text-lg font-semibold text-slate-900">{consultorio.contact_email}</p>
									</div>
									<ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-teal-600 transition" />
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

					{/* Complete Clinic Information Section - Simplified (only show if there's relevant info) */}
					{(consultorio.trade_name || consultorio.legal_rif || consultorio.address_operational) && (
						<motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="bg-gradient-to-br from-white to-slate-50 rounded-3xl shadow-xl border border-slate-200 p-8 lg:p-10">
							<div className="flex items-center gap-4 mb-8">
								<div className="p-4 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-2xl shadow-lg">
									<Building2 className="w-8 h-8 text-white" />
								</div>
								<h2 className="text-3xl lg:text-4xl font-bold text-slate-900">Información del Consultorio</h2>
							</div>
							
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								{/* Legal Information - Only show if has data */}
								{(consultorio.trade_name || consultorio.legal_rif) && (
									<div className="space-y-4">
										<h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
											<FileText className="w-5 h-5 text-teal-600" />
											Información Legal
										</h3>
										
										<div className="space-y-3">
											{consultorio.trade_name && (
												<div className="p-3 bg-slate-50 rounded-lg">
													<p className="text-xs text-slate-500 mb-1">Nombre Comercial</p>
													<p className="text-sm font-semibold text-slate-900">{consultorio.trade_name}</p>
												</div>
											)}
											
											{consultorio.legal_rif && (
												<div className="p-3 bg-slate-50 rounded-lg">
													<p className="text-xs text-slate-500 mb-1">RIF</p>
													<p className="text-sm font-semibold text-slate-900">{consultorio.legal_rif}</p>
												</div>
											)}
										</div>
									</div>
								)}
								
								{/* Location Information - Only show if has data */}
								{consultorio.address_operational && (
									<div className="space-y-4">
										<h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
											<MapPin className="w-5 h-5 text-teal-600" />
											Ubicación
										</h3>
										
										<div className="space-y-3">
											<div className="p-3 bg-slate-50 rounded-lg">
												<p className="text-xs text-slate-500 mb-1">Dirección Operacional</p>
												<p className="text-sm font-semibold text-slate-900">{consultorio.address_operational}</p>
											</div>
										</div>
									</div>
								)}
							</div>
						</motion.section>
					)}

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

						{/* Cashea & Payment Methods Section */}
						<div className="mt-8 pt-8 border-t border-slate-200">
							<h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
								<Zap className="w-6 h-6 text-teal-600" />
								Métodos de Pago Disponibles
							</h3>
							{consultorio.has_cashea === true ? (
								<div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-6 border-2 border-teal-200">
									<div className="flex flex-col sm:flex-row items-center gap-4">
										<div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0">
											<Image src="/descarga.png" alt="Cashea" fill className="object-contain" />
										</div>
										<div className="flex-1 text-center sm:text-left">
											<h4 className="text-lg font-bold text-slate-900 mb-2">Sí aceptamos Cashea</h4>
											<p className="text-slate-700 mb-3">Este consultorio acepta pagos a través de Cashea. Puedes realizar tus pagos de forma segura, rápida y conveniente.</p>
											<Link href="/register?role=PACIENTE" className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition shadow-md hover:shadow-lg text-sm">
												<Zap className="w-4 h-4" />
												Regístrate y Paga con Cashea
											</Link>
										</div>
									</div>
								</div>
							) : consultorio.has_cashea === false ? (
								<div className="bg-slate-50 rounded-xl p-6 border-2 border-slate-200">
									<div className="flex items-center gap-3">
										<Zap className="w-6 h-6 text-slate-400" />
										<div>
											<h4 className="text-lg font-bold text-slate-900 mb-1">No aceptamos Cashea</h4>
											<p className="text-slate-600 text-sm">Este consultorio no acepta pagos a través de Cashea en este momento.</p>
										</div>
									</div>
								</div>
							) : (
								<div className="bg-slate-50 rounded-xl p-6 border-2 border-slate-200">
									<div className="flex items-center gap-3">
										<Zap className="w-6 h-6 text-slate-400" />
										<div>
											<h4 className="text-lg font-bold text-slate-900 mb-1">Información de Pago</h4>
											<p className="text-slate-600 text-sm">Dato no disponible sobre métodos de pago. Contacta directamente al consultorio para más información.</p>
										</div>
									</div>
								</div>
							)}
						</div>

						{/* Certifications */}
						{(consultorio.sanitary_license || consultorio.liability_insurance_number) && (
							<div className="mt-8 pt-8 border-t border-slate-200">
								<h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
									<Shield className="w-6 h-6 text-teal-600" />
									Certificaciones y Garantías
								</h3>
								<div className="space-y-3">
									{consultorio.sanitary_license && (
										<div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200 hover:shadow-md transition">
											<div className="p-2 bg-green-100 rounded-lg">
												<Award className="w-5 h-5 text-green-600" />
											</div>
											<div className="flex-1">
												<p className="text-sm font-semibold text-green-800 mb-1">Licencia Sanitaria</p>
												<p className="text-sm text-slate-700">{consultorio.sanitary_license}</p>
											</div>
										</div>
									)}
									{consultorio.liability_insurance_number && (
										<div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200 hover:shadow-md transition">
											<div className="p-2 bg-blue-100 rounded-lg">
												<Shield className="w-5 h-5 text-blue-600" />
											</div>
											<div className="flex-1">
												<p className="text-sm font-semibold text-blue-800 mb-1">Seguro de Responsabilidad Civil</p>
												<p className="text-sm text-slate-700">{consultorio.liability_insurance_number}</p>
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

			{/* Appointment Booking Modal */}
			<AppointmentBookingModal
				isOpen={isAppointmentModalOpen}
				onClose={() => setIsAppointmentModalOpen(false)}
				doctors={consultorio.doctors || []}
				organizationId={consultorio.id}
			/>
		</div>
	);
}
