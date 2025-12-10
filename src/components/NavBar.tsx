'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Menu,
	X,
	ChevronDown,
	Building2,
	Stethoscope,
	Pill,
	FlaskConical,
	Users,
	HeartPulse,
	ArrowRight,
	Shield,
	Clock,
	FileText,
	Activity,
	Zap,
	MessageCircle,
	Mail,
	Instagram,
	Home,
} from 'lucide-react';

export default function PublicNavBar() {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [orgMenuOpen, setOrgMenuOpen] = useState(false);
	const [patientMenuOpen, setPatientMenuOpen] = useState(false);
	const [contactMenuOpen, setContactMenuOpen] = useState(false);
	const [mounted, setMounted] = useState(false);
	const [menuPositions, setMenuPositions] = useState<{
		org: { top: number; left: number } | null;
		patient: { top: number; left: number } | null;
		contact: { top: number; left: number } | null;
	}>({ org: null, patient: null, contact: null });
	const mobileMenuRef = useRef<HTMLDivElement | null>(null);
	const orgMenuRef = useRef<HTMLDivElement | null>(null);
	const orgButtonRef = useRef<HTMLButtonElement | null>(null);
	const orgMenuContentRef = useRef<HTMLDivElement | null>(null);
	const patientMenuRef = useRef<HTMLDivElement | null>(null);
	const patientButtonRef = useRef<HTMLButtonElement | null>(null);
	const patientMenuContentRef = useRef<HTMLDivElement | null>(null);
	const contactMenuRef = useRef<HTMLDivElement | null>(null);
	const contactButtonRef = useRef<HTMLButtonElement | null>(null);
	const contactMenuContentRef = useRef<HTMLDivElement | null>(null);

	// Para portales
	useEffect(() => {
		setMounted(true);
	}, []);

	// Calcular posiciones de los menús cuando se abren (desplegándose hacia abajo)
	useEffect(() => {
		if (!mounted || typeof window === 'undefined') return;

		const updatePositions = () => {
			if (orgMenuOpen && orgButtonRef.current) {
				const buttonRect = orgButtonRef.current.getBoundingClientRect();
				setMenuPositions(prev => ({
					...prev,
					org: {
						top: buttonRect.bottom + 8,
						left: buttonRect.left,
					}
				}));
			} else if (!orgMenuOpen) {
				setMenuPositions(prev => ({ ...prev, org: null }));
			}

			if (patientMenuOpen && patientButtonRef.current) {
				const buttonRect = patientButtonRef.current.getBoundingClientRect();
				setMenuPositions(prev => ({
					...prev,
					patient: {
						top: buttonRect.bottom + 8,
						left: buttonRect.left,
					}
				}));
			} else if (!patientMenuOpen) {
				setMenuPositions(prev => ({ ...prev, patient: null }));
			}

			if (contactMenuOpen && contactButtonRef.current) {
				const buttonRect = contactButtonRef.current.getBoundingClientRect();
				setMenuPositions(prev => ({
					...prev,
					contact: {
						top: buttonRect.bottom + 8,
						left: buttonRect.left,
					}
				}));
			} else if (!contactMenuOpen) {
				setMenuPositions(prev => ({ ...prev, contact: null }));
			}
		};

		// Usar requestAnimationFrame para asegurar que el DOM esté actualizado
		const rafId = requestAnimationFrame(() => {
			updatePositions();
		});

		window.addEventListener('resize', updatePositions);
		window.addEventListener('scroll', updatePositions);
		
		return () => {
			cancelAnimationFrame(rafId);
			window.removeEventListener('resize', updatePositions);
			window.removeEventListener('scroll', updatePositions);
		};
	}, [mounted, orgMenuOpen, patientMenuOpen, contactMenuOpen]);

	// Prevenir scroll del body cuando el menú móvil está abierto
	useEffect(() => {
		if (mobileMenuOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = 'unset';
		}
		return () => {
			document.body.style.overflow = 'unset';
		};
	}, [mobileMenuOpen]);

	// Cerrar submenús móviles cuando se cierra el menú principal
	// También cerrar menús del desktop cuando se abre el menú móvil
	useEffect(() => {
		if (!mobileMenuOpen) {
			setOrgMenuOpen(false);
			setPatientMenuOpen(false);
			setContactMenuOpen(false);
		} else {
			// Si se abre el menú móvil, cerrar los menús del desktop
			setOrgMenuOpen(false);
			setPatientMenuOpen(false);
			setContactMenuOpen(false);
		}
	}, [mobileMenuOpen]);

	// Cerrar menú con ESC
	useEffect(() => {
		function handleEscape(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				if (mobileMenuOpen) {
					setMobileMenuOpen(false);
				} else {
					setOrgMenuOpen(false);
					setPatientMenuOpen(false);
					setContactMenuOpen(false);
				}
			}
		}
		document.addEventListener('keydown', handleEscape);
		return () => {
			document.removeEventListener('keydown', handleEscape);
		};
	}, [mobileMenuOpen]);

	const organizations = [
		{
			href: '/landing/clinicas',
			label: 'Clínicas',
			icon: Building2,
			description: 'Administra múltiples especialistas y recursos',
			color: 'from-blue-500 to-indigo-500',
			comingSoon: true,
		},
		{
			href: '/landing/consultorios',
			label: 'Consultorios Privados',
			icon: Stethoscope,
			description: 'Herramientas profesionales para médicos',
			color: 'from-teal-500 to-cyan-500',
			comingSoon: false,
		},
		{
			href: '/landing/farmacias',
			label: 'Farmacias',
			icon: Pill,
			description: 'Integración con el ecosistema de salud',
			color: 'from-purple-500 to-pink-500',
			comingSoon: true,
		},
		{
			href: '/landing/laboratorios',
			label: 'Laboratorios',
			icon: FlaskConical,
			description: 'Gestión digital de órdenes y resultados',
			color: 'from-orange-500 to-red-500',
			comingSoon: true,
		},
	];

	const patientBenefits = [
		{
			icon: Users,
			title: 'Acceso a Profesionales',
			description: 'Conecta con médicos y especialistas',
		},
		{
			icon: FileText,
			title: 'Historial Médico',
			description: 'Tu historial completo en un solo lugar',
		},
		{
			icon: Clock,
			title: 'Citas Online',
			description: 'Agenda citas de forma rápida y sencilla',
		},
		{
			icon: Activity,
			title: 'Monitoreo de Salud',
			description: 'Seguimiento de indicadores importantes',
		},
		{
			icon: Shield,
			title: 'Seguridad Total',
			description: 'Tus datos médicos protegidos',
		},
		{
			icon: Zap,
			title: 'Resultados Inmediatos',
			description: 'Accede a resultados de laboratorio al instante',
		},
	];

	return (
		<header className="sticky top-0 z-[9997] w-full max-w-full">
			{/* Animated gradient halo */}
			<div
				aria-hidden
				className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-0 w-full max-w-[1200px] h-24 -z-10 rounded-3xl blur-3xl opacity-20"
				style={{
					background: 'linear-gradient(90deg, rgba(20,184,166,0.3) 0%, rgba(6,182,212,0.25) 50%, rgba(59,130,246,0.2) 100%)',
				}}
			/>

			{/* Navbar surface */}
			<div className="backdrop-blur-md bg-white/80 border-b border-slate-200/60 shadow-sm w-full max-w-full">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
					<div className="flex h-20 items-center justify-between">
						{/* Logo */}
						<Link href="/" className="flex items-center gap-3 no-underline group" aria-label="Inicio - Syncwave Salud">
							<div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 ring-2 ring-teal-500/20 group-hover:ring-teal-500/40 transition-all">
								<Image src="/3.png" alt="Syncwave" fill sizes="48px" className="object-contain" />
							</div>
							<div className="flex flex-col leading-tight">
								<span className="font-bold text-slate-900 text-base group-hover:text-teal-600 transition-colors">Syncwave</span>
								<span className="text-xs text-slate-500 -mt-0.5">Salud</span>
							</div>
						</Link>

						{/* Desktop Navigation */}
						<nav className="hidden lg:flex lg:items-center lg:gap-1" aria-label="Navegación principal">
							{/* Inicio Link */}
							<Link
								href="/"
								className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 hover:text-teal-600 rounded-lg hover:bg-teal-50/50 transition-all duration-200"
							>
								<Home className="w-4 h-4" />
								<span>Inicio</span>
							</Link>

							{/* Organizaciones Dropdown */}
							<div className="relative" ref={orgMenuRef}>
								<button
									ref={orgButtonRef}
									onClick={() => {
										if (mobileMenuOpen) return; // Prevenir apertura si el menú móvil está abierto
										setOrgMenuOpen(!orgMenuOpen);
										setPatientMenuOpen(false);
										setContactMenuOpen(false);
									}}
									className="group flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 hover:text-teal-600 rounded-lg hover:bg-teal-50/50 transition-all duration-200"
									aria-expanded={orgMenuOpen}
									aria-haspopup="true"
								>
									<span>Organizaciones</span>
									<ChevronDown className={`w-4 h-4 transition-transform duration-200 ${orgMenuOpen ? 'rotate-180' : ''}`} />
								</button>

								{mounted && !mobileMenuOpen && createPortal(
									<AnimatePresence>
										{orgMenuOpen && (
											<>
												<div className="hidden lg:block fixed inset-0 z-[9999]" onClick={() => setOrgMenuOpen(false)} aria-hidden="true" />
												<motion.div
													ref={orgMenuContentRef}
													initial={{ opacity: 0, y: 10, scale: 0.95 }}
													animate={{ opacity: 1, y: 0, scale: 1 }}
													exit={{ opacity: 0, y: 10, scale: 0.95 }}
													transition={{ duration: 0.2 }}
													className="hidden lg:block fixed w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-[10000]"
													style={{
														top: menuPositions.org ? `${menuPositions.org.top}px` : (orgButtonRef.current ? `${orgButtonRef.current.getBoundingClientRect().bottom + 8}px` : '88px'),
														left: menuPositions.org ? `${menuPositions.org.left}px` : (orgButtonRef.current ? `${orgButtonRef.current.getBoundingClientRect().left}px` : '0px'),
													}}
												>
												<div className="p-2">
													{organizations.map((org, index) => (
														<motion.div
															key={org.href}
															initial={{ opacity: 0, x: -10 }}
															animate={{ opacity: 1, x: 0 }}
															transition={{ delay: index * 0.05 }}
														>
															{org.comingSoon ? (
																<div className="group flex items-center gap-3 p-3 rounded-xl bg-slate-50/50 border border-slate-100 cursor-default opacity-75">
																	<div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${org.color} flex items-center justify-center shadow-md opacity-60`}>
																		<org.icon className="w-6 h-6 text-white" />
																	</div>
																	<div className="flex-1 min-w-0">
																		<div className="font-semibold text-slate-600 flex items-center gap-2">
																			{org.label}
																			<span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">Próximamente</span>
																		</div>
																		<div className="text-xs text-slate-400 mt-0.5">{org.description}</div>
																	</div>
																</div>
															) : (
																<Link
																	href={org.href}
																	onClick={() => setOrgMenuOpen(false)}
																	className="group flex items-center gap-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 transition-all duration-200"
																>
																	<div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${org.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
																		<org.icon className="w-6 h-6 text-white" />
																	</div>
																	<div className="flex-1 min-w-0">
																		<div className="font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">{org.label}</div>
																		<div className="text-xs text-slate-500 mt-0.5">{org.description}</div>
																	</div>
																	<ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
																</Link>
															)}
														</motion.div>
													))}
												</div>
												</motion.div>
											</>
										)}
									</AnimatePresence>,
									document.body
								)}
							</div>

							{/* Pacientes Dropdown */}
							<div className="relative" ref={patientMenuRef}>
								<button
									ref={patientButtonRef}
									onClick={() => {
										if (mobileMenuOpen) return; // Prevenir apertura si el menú móvil está abierto
										setPatientMenuOpen(!patientMenuOpen);
										setOrgMenuOpen(false);
										setContactMenuOpen(false);
									}}
									className="group flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 hover:text-teal-600 rounded-lg hover:bg-teal-50/50 transition-all duration-200"
									aria-expanded={patientMenuOpen}
									aria-haspopup="true"
								>
									<span>Para Pacientes</span>
									<ChevronDown className={`w-4 h-4 transition-transform duration-200 ${patientMenuOpen ? 'rotate-180' : ''}`} />
								</button>

								{mounted && !mobileMenuOpen && createPortal(
									<AnimatePresence>
										{patientMenuOpen && (
											<>
												<div className="hidden lg:block fixed inset-0 z-[9999]" onClick={() => setPatientMenuOpen(false)} aria-hidden="true" />
												<motion.div
													ref={patientMenuContentRef}
													initial={{ opacity: 0, y: 10, scale: 0.95 }}
													animate={{ opacity: 1, y: 0, scale: 1 }}
													exit={{ opacity: 0, y: 10, scale: 0.95 }}
													transition={{ duration: 0.2 }}
													className="hidden lg:block fixed w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-[10000]"
													style={{
														top: menuPositions.patient ? `${menuPositions.patient.top}px` : (patientButtonRef.current ? `${patientButtonRef.current.getBoundingClientRect().bottom + 8}px` : '88px'),
														left: menuPositions.patient ? `${menuPositions.patient.left}px` : (patientButtonRef.current ? `${patientButtonRef.current.getBoundingClientRect().left}px` : '0px'),
													}}
												>
												<div className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-slate-200">
													<div className="flex items-center gap-3">
														<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
															<Users className="w-5 h-5 text-white" />
														</div>
														<div>
															<h3 className="font-bold text-slate-900">Beneficios para Pacientes</h3>
															<p className="text-xs text-slate-600">Descubre todo lo que puedes hacer</p>
														</div>
													</div>
												</div>
												<div className="p-3">
													<div className="grid grid-cols-2 gap-2">
														{patientBenefits.map((benefit, index) => (
															<motion.div
																key={benefit.title}
																initial={{ opacity: 0, scale: 0.9 }}
																animate={{ opacity: 1, scale: 1 }}
																transition={{ delay: index * 0.05 }}
															>
																<div className="group flex flex-col gap-2 p-3 rounded-xl bg-slate-50/50 border border-slate-100 cursor-default">
																	<div className="flex items-center gap-2">
																		<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
																			<benefit.icon className="w-4 h-4 text-white" />
																		</div>
																		<span className="text-sm font-semibold text-slate-900">{benefit.title}</span>
																	</div>
																	<p className="text-xs text-slate-600 leading-snug">{benefit.description}</p>
																</div>
															</motion.div>
														))}
													</div>
													<div className="mt-3 pt-3 border-t border-slate-200">
														<Link
															href="/landing/pacientes"
															onClick={() => setPatientMenuOpen(false)}
															className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
														>
															Ver Todos los Beneficios
															<ArrowRight className="w-4 h-4" />
														</Link>
													</div>
												</div>
												</motion.div>
											</>
										)}
									</AnimatePresence>,
									document.body
								)}
							</div>

							{/* Contacto Dropdown */}
							<div className="relative" ref={contactMenuRef}>
								<button
									ref={contactButtonRef}
									onClick={() => {
										if (mobileMenuOpen) return; // Prevenir apertura si el menú móvil está abierto
										setContactMenuOpen(!contactMenuOpen);
										setOrgMenuOpen(false);
										setPatientMenuOpen(false);
									}}
									className="group flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 hover:text-teal-600 rounded-lg hover:bg-teal-50/50 transition-all duration-200"
									aria-expanded={contactMenuOpen}
									aria-haspopup="true"
								>
									<span>Contacto</span>
									<ChevronDown className={`w-4 h-4 transition-transform duration-200 ${contactMenuOpen ? 'rotate-180' : ''}`} />
								</button>

								{mounted && !mobileMenuOpen && createPortal(
									<AnimatePresence>
										{contactMenuOpen && (
											<>
												<div className="hidden lg:block fixed inset-0 z-[9999]" onClick={() => setContactMenuOpen(false)} aria-hidden="true" />
												<motion.div
													ref={contactMenuContentRef}
													initial={{ opacity: 0, y: 10, scale: 0.95 }}
													animate={{ opacity: 1, y: 0, scale: 1 }}
													exit={{ opacity: 0, y: 10, scale: 0.95 }}
													transition={{ duration: 0.2 }}
													className="hidden lg:block fixed w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-[10000]"
													style={{
														top: menuPositions.contact ? `${menuPositions.contact.top}px` : (contactButtonRef.current ? `${contactButtonRef.current.getBoundingClientRect().bottom + 8}px` : '88px'),
														left: menuPositions.contact ? `${menuPositions.contact.left}px` : (contactButtonRef.current ? `${contactButtonRef.current.getBoundingClientRect().left}px` : '0px'),
													}}
												>
												<div className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-slate-200">
													<div className="flex items-center gap-3">
														<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
															<MessageCircle className="w-5 h-5 text-white" />
														</div>
														<div>
															<h3 className="font-bold text-slate-900">Contáctanos</h3>
															<p className="text-xs text-slate-600">Estamos aquí para ayudarte</p>
														</div>
													</div>
												</div>
												<div className="p-3 space-y-2">
													<a
														href="https://wa.me/584242070878"
														target="_blank"
														rel="noopener noreferrer"
														onClick={() => setContactMenuOpen(false)}
														className="group flex items-center gap-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 transition-all duration-200"
													>
														<div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
															<MessageCircle className="w-6 h-6 text-white" />
														</div>
														<div className="flex-1 min-w-0">
															<div className="font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">WhatsApp</div>
															<div className="text-xs text-slate-500 mt-0.5">04242070878</div>
														</div>
													</a>
													<Link
														href="/politicas-privacidad"
														onClick={() => setContactMenuOpen(false)}
														className="group flex items-center gap-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 transition-all duration-200"
													>
														<div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
															<Shield className="w-6 h-6 text-white" />
														</div>
														<div className="flex-1 min-w-0">
															<div className="font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">Políticas de Privacidad</div>
															<div className="text-xs text-slate-500 mt-0.5">Conoce cómo protegemos tus datos</div>
														</div>
													</Link>
													<a
														href="mailto:syncwaveagency@gmail.com"
														onClick={() => setContactMenuOpen(false)}
														className="group flex items-center gap-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 transition-all duration-200"
													>
														<div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
															<Mail className="w-6 h-6 text-white" />
														</div>
														<div className="flex-1 min-w-0">
															<div className="font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">Correo</div>
															<div className="text-xs text-slate-500 mt-0.5">syncwaveagency@gmail.com</div>
														</div>
													</a>
													<a
														href="https://instagram.com/syncwave_agency"
														target="_blank"
														rel="noopener noreferrer"
														onClick={() => setContactMenuOpen(false)}
														className="group flex items-center gap-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 transition-all duration-200"
													>
														<div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
															<Instagram className="w-6 h-6 text-white" />
														</div>
														<div className="flex-1 min-w-0">
															<div className="font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">Instagram</div>
															<div className="text-xs text-slate-500 mt-0.5">@syncwave_agency</div>
														</div>
													</a>
												</div>
												</motion.div>
											</>
										)}
									</AnimatePresence>,
									document.body
								)}
							</div>
						</nav>

						{/* Actions */}
						<div className="flex items-center gap-3">
							<div className="hidden lg:flex lg:items-center lg:gap-3">
								<Link
									href="/login"
									className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:text-teal-600 border border-slate-200 hover:border-teal-300 bg-white hover:bg-teal-50/50 transition-all duration-200 shadow-sm hover:shadow-md"
								>
									Iniciar Sesión
								</Link>
								<Link
									href="/register"
									className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
								>
									Registrarse
									<ArrowRight className="w-4 h-4" />
								</Link>
							</div>

							{/* Mobile menu button */}
							<button
								type="button"
								className="lg:hidden inline-flex items-center justify-center p-2.5 rounded-lg text-slate-700 hover:bg-slate-100 active:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition-all"
								aria-expanded={mobileMenuOpen}
								aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
								aria-controls="mobile-menu"
								onClick={() => setMobileMenuOpen((prev) => !prev)}
							>
								{mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
							</button>
						</div>
					</div>
				</div>

				{/* Mobile Menu */}
				{mounted && createPortal(
					<AnimatePresence mode="wait">
						{mobileMenuOpen && (
							<>
								{/* Overlay */}
								<motion.div
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									transition={{ duration: 0.2 }}
									className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] lg:hidden"
									onClick={() => setMobileMenuOpen(false)}
									aria-hidden="true"
								/>
								{/* Menu Panel */}
								<motion.div
									ref={mobileMenuRef}
									id="mobile-menu"
									initial={{ x: '100%' }}
									animate={{ x: 0 }}
									exit={{ x: '100%' }}
									transition={{ type: 'spring', damping: 25, stiffness: 200 }}
									className="lg:hidden fixed top-0 right-0 h-full w-[85vw] max-w-sm z-[9999] bg-white shadow-2xl overflow-hidden"
									role="dialog"
									aria-modal="true"
									aria-label="Menú de navegación móvil"
								>
									{/* Header del menú móvil */}
									<div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-teal-50 to-cyan-50">
										<div className="flex items-center gap-3">
											<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
												<Menu className="w-5 h-5 text-white" />
											</div>
											<span className="font-bold text-slate-900">Menú</span>
										</div>
										<button
											type="button"
											onClick={() => setMobileMenuOpen(false)}
											className="p-2 rounded-lg hover:bg-white/50 transition-colors"
											aria-label="Cerrar menú"
										>
											<X className="w-5 h-5 text-slate-700" />
										</button>
									</div>

									{/* Contenido del menú */}
									<div className="overflow-y-auto h-[calc(100vh-80px)]">
										<div className="p-4 space-y-2">
											{/* Mobile Inicio Link */}
											<Link
												href="/"
												onClick={() => setMobileMenuOpen(false)}
												className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-slate-700 hover:bg-teal-50 active:bg-teal-100 transition-colors"
											>
												<Home className="w-5 h-5 text-teal-600" />
												<span>Inicio</span>
											</Link>

											{/* Mobile Organizations Menu */}
											<div className="space-y-1">
												<button
													type="button"
													onClick={() => {
														setOrgMenuOpen(!orgMenuOpen);
														setPatientMenuOpen(false);
														setContactMenuOpen(false);
													}}
													className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-base font-medium text-slate-700 hover:bg-teal-50 active:bg-teal-100 transition-colors"
												>
													<span>Organizaciones</span>
													<ChevronDown className={`w-4 h-4 transition-transform duration-200 ${orgMenuOpen ? 'rotate-180' : ''}`} />
												</button>
												<AnimatePresence>
													{orgMenuOpen && (
														<motion.div
															initial={{ height: 0, opacity: 0 }}
															animate={{ height: 'auto', opacity: 1 }}
															exit={{ height: 0, opacity: 0 }}
															transition={{ duration: 0.2 }}
															className="overflow-hidden"
														>
															<div className="pl-4 space-y-1 mt-1">
																{organizations.map((org, index) => (
																	<motion.div
																		key={org.href}
																		initial={{ opacity: 0, x: -10 }}
																		animate={{ opacity: 1, x: 0 }}
																		transition={{ delay: index * 0.05 }}
																	>
																		{org.comingSoon ? (
																			<div className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-slate-400 bg-slate-50/50 border border-slate-100 cursor-default">
																				<div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${org.color} flex items-center justify-center flex-shrink-0 opacity-50`}>
																					<org.icon className="w-4 h-4 text-white" />
																				</div>
																				<span className="flex items-center gap-2">
																					{org.label}
																					<span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">Próximamente</span>
																				</span>
																			</div>
																		) : (
																			<Link
																				href={org.href}
																				onClick={() => {
																					setMobileMenuOpen(false);
																					setOrgMenuOpen(false);
																				}}
																				className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-teal-50 active:bg-teal-100 hover:text-teal-600 transition-colors"
																			>
																				<div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${org.color} flex items-center justify-center flex-shrink-0`}>
																					<org.icon className="w-4 h-4 text-white" />
																				</div>
																				<span>{org.label}</span>
																			</Link>
																		)}
																	</motion.div>
																))}
															</div>
														</motion.div>
													)}
												</AnimatePresence>
											</div>

											{/* Mobile Patients Menu */}
											<div className="space-y-1">
												<button
													type="button"
													onClick={() => {
														setPatientMenuOpen(!patientMenuOpen);
														setOrgMenuOpen(false);
														setContactMenuOpen(false);
													}}
													className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-base font-medium text-slate-700 hover:bg-teal-50 active:bg-teal-100 transition-colors"
												>
													<span>Para Pacientes</span>
													<ChevronDown className={`w-4 h-4 transition-transform duration-200 ${patientMenuOpen ? 'rotate-180' : ''}`} />
												</button>
												<AnimatePresence>
													{patientMenuOpen && (
														<motion.div
															initial={{ height: 0, opacity: 0 }}
															animate={{ height: 'auto', opacity: 1 }}
															exit={{ height: 0, opacity: 0 }}
															transition={{ duration: 0.2 }}
															className="overflow-hidden"
														>
															<div className="pl-4 space-y-1 mt-1">
																<Link
																	href="/landing/pacientes"
																	onClick={() => {
																		setMobileMenuOpen(false);
																		setPatientMenuOpen(false);
																	}}
																	className="block px-4 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-teal-50 active:bg-teal-100 hover:text-teal-600 transition-colors"
																>
																	Ver Todos los Beneficios
																</Link>
															</div>
														</motion.div>
													)}
												</AnimatePresence>
											</div>

											{/* Mobile Contact Menu */}
											<div className="space-y-1">
												<button
													type="button"
													onClick={() => {
														setContactMenuOpen(!contactMenuOpen);
														setOrgMenuOpen(false);
														setPatientMenuOpen(false);
													}}
													className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-base font-medium text-slate-700 hover:bg-teal-50 active:bg-teal-100 transition-colors"
												>
													<span>Contacto</span>
													<ChevronDown className={`w-4 h-4 transition-transform duration-200 ${contactMenuOpen ? 'rotate-180' : ''}`} />
												</button>
												<AnimatePresence>
													{contactMenuOpen && (
														<motion.div
															initial={{ height: 0, opacity: 0 }}
															animate={{ height: 'auto', opacity: 1 }}
															exit={{ height: 0, opacity: 0 }}
															transition={{ duration: 0.2 }}
															className="overflow-hidden"
														>
															<div className="pl-4 space-y-1 mt-1">
																<a
																	href="https://wa.me/584242070878"
																	target="_blank"
																	rel="noopener noreferrer"
																	onClick={() => {
																		setMobileMenuOpen(false);
																		setContactMenuOpen(false);
																	}}
																	className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-teal-50 active:bg-teal-100 hover:text-teal-600 transition-colors"
																>
																	<MessageCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
																	<span>WhatsApp: 04242070878</span>
																</a>
																<a
																	href="mailto:syncwaveagency@gmail.com"
																	onClick={() => {
																		setMobileMenuOpen(false);
																		setContactMenuOpen(false);
																	}}
																	className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-teal-50 active:bg-teal-100 hover:text-teal-600 transition-colors"
																>
																	<Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
																	<span>syncwaveagency@gmail.com</span>
																</a>
																<Link
																	href="/politicas-privacidad"
																	onClick={() => {
																		setMobileMenuOpen(false);
																		setContactMenuOpen(false);
																	}}
																	className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-teal-50 active:bg-teal-100 hover:text-teal-600 transition-colors"
																>
																	<Shield className="w-4 h-4 text-indigo-600 flex-shrink-0" />
																	<span>Políticas de Privacidad</span>
																</Link>
																<a
																	href="https://instagram.com/syncwave_agency"
																	target="_blank"
																	rel="noopener noreferrer"
																	onClick={() => {
																		setMobileMenuOpen(false);
																		setContactMenuOpen(false);
																	}}
																	className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-teal-50 active:bg-teal-100 hover:text-teal-600 transition-colors"
																>
																	<Instagram className="w-4 h-4 text-pink-600 flex-shrink-0" />
																	<span>@syncwave_agency</span>
																</a>
															</div>
														</motion.div>
													)}
												</AnimatePresence>
											</div>

											{/* Mobile Actions */}
											<div className="pt-4 mt-4 border-t border-slate-200 space-y-2">
												<Link
													href="/login"
													onClick={() => setMobileMenuOpen(false)}
													className="block w-full text-center px-4 py-3 rounded-xl text-sm font-medium text-slate-700 border border-slate-200 hover:border-teal-300 hover:bg-teal-50 active:bg-teal-100 transition-all"
												>
													Iniciar Sesión
												</Link>
												<Link
													href="/register"
													onClick={() => setMobileMenuOpen(false)}
													className="block w-full text-center px-4 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 active:from-teal-800 active:to-cyan-800 shadow-lg transition-all"
												>
													Registrarse
												</Link>
											</div>
										</div>
									</div>
								</motion.div>
							</>
						)}
					</AnimatePresence>,
					document.body
				)}
			</div>
		</header>
	);
}
