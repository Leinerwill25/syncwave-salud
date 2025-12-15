'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Users, FileText, Activity, Shield, Zap, CheckCircle2, ArrowRight, HeartPulse, Calendar, Pill, FlaskConical, MessageCircle, TrendingUp, Star, Link2, Image as ImageIcon, FileCheck, Stethoscope, Notebook, Mail, MessageSquare, Eye, Download, Share2, UserPlus, Baby, UsersRound, Heart, Sparkles, Lock, Clock, Globe } from 'lucide-react';

export default function PacientesLandingPage() {
	const { scrollY } = useScroll();
	const heroY = useTransform(scrollY, [0, 500], [0, 150]);
	const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);

	return (
		<div className="min-h-screen bg-white">
			{/* Hero Section - Rediseñado y Optimizado SEO */}
			<section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-linear-to-br from-indigo-50 via-white to-purple-50">
				{/* Efectos de fondo sofisticados */}
				<div className="absolute inset-0 overflow-hidden pointer-events-none">
					<motion.div style={{ y: heroY, opacity: heroOpacity }} className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-400/10 rounded-full blur-3xl" />
					<motion.div style={{ y: heroY, opacity: heroOpacity }} className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-400/10 rounded-full blur-3xl" />
					<div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px]" />
				</div>

				<div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
						{/* Contenido Principal */}
						<motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.6, -0.05, 0.01, 0.99] }} className="text-center lg:text-left space-y-8">
							<motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.5 }} className="inline-flex items-center gap-3 px-5 py-2.5 bg-indigo-100/80 backdrop-blur-sm rounded-full border border-indigo-200/50 shadow-sm">
								<HeartPulse className="w-5 h-5 text-indigo-600" />
								<span className="text-sm font-semibold text-indigo-700">Plataforma de Salud Digital en Venezuela</span>
							</motion.div>

							<motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }} className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold leading-[1.1] tracking-tight">
								<span className="block text-slate-900 mb-2">
									Tu <span className="bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Historial Médico</span>
								</span>
								<span className="block text-slate-800">Digital y Seguro</span>
							</motion.h1>

							<motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }} className="text-xl sm:text-2xl text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
								<strong className="font-semibold text-slate-800">Gestiona tu salud de forma integral</strong> con la plataforma digital más completa de Venezuela. Accede a profesionales de la salud, agenda citas médicas online, visualiza resultados de laboratorio y mantén tu historial clínico organizado.
							</motion.p>

							<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
								<Link href="/register" className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 text-base sm:text-lg overflow-hidden">
									<span className="absolute inset-0 bg-linear-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
									<span className="relative z-10 flex items-center gap-2">
										Registrarse Gratis
										<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
									</span>
								</Link>
								<Link href="/login" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl border-2 border-slate-200 hover:border-indigo-300 shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 text-base sm:text-lg">
									Iniciar Sesión
								</Link>
							</motion.div>

							{/* Trust Indicators */}
							<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.6 }} className="flex flex-wrap items-center gap-6 justify-center lg:justify-start pt-8 text-sm text-slate-600">
								<div className="flex items-center gap-2">
									<Shield className="w-5 h-5 text-indigo-600" />
									<span className="font-medium">Seguridad Garantizada</span>
								</div>
								<div className="flex items-center gap-2">
									<Zap className="w-5 h-5 text-purple-600" />
									<span className="font-medium">Acceso 24/7</span>
								</div>
								<div className="flex items-center gap-2">
									<Globe className="w-5 h-5 text-pink-600" />
									<span className="font-medium">Disponible en Todo Venezuela</span>
								</div>
							</motion.div>
						</motion.div>

						{/* Visual Hero */}
						<motion.div initial={{ opacity: 0, scale: 0.95, rotateY: -15 }} animate={{ opacity: 1, scale: 1, rotateY: 0 }} transition={{ delay: 0.4, duration: 0.8 }} className="relative">
							<div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-200/50">
								<div className="grid grid-cols-2 gap-4">
									{[Users, Calendar, FileText, Activity].map((Icon, index) => (
										<motion.div key={index} initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }} whileHover={{ scale: 1.05, rotate: 3 }} className="bg-linear-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 shadow-lg border border-indigo-100/50 flex items-center justify-center group cursor-pointer">
											<Icon className="w-12 h-12 text-indigo-600 group-hover:text-purple-600 transition-colors" />
										</motion.div>
									))}
								</div>
								<motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-linear-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center shadow-2xl border-4 border-white">
									<HeartPulse className="w-16 h-16 text-white" />
								</motion.div>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* Featured Functionality - Links por Consulta - Rediseñado */}
			<section className="relative py-24 sm:py-32 bg-linear-to-br from-indigo-600 via-purple-600 to-pink-600 overflow-hidden">
				<div className="absolute inset-0">
					<div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white/5 rounded-full blur-3xl" />
					<div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-white/5 rounded-full blur-3xl" />
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-size-[50px_50px]" />
				</div>

				<div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.8 }} className="text-center mb-16">
						<motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full mb-8 border border-white/30">
							<Link2 className="w-5 h-5 text-white" />
							<span className="text-sm font-bold text-white">Funcionalidad Exclusiva para Pacientes</span>
						</motion.div>
						<h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight">Link Único por Consulta Médica</h2>
						<p className="text-xl sm:text-2xl text-white/95 max-w-4xl mx-auto leading-relaxed mb-4">
							<strong className="font-bold">Gestiona toda tu información médica en un solo lugar</strong>. Cada consulta genera un enlace personalizado con todos tus datos médicos, sin necesidad de correos electrónicos ni mensajería instantánea.
						</p>
						<p className="text-lg text-white/80 max-w-3xl mx-auto">Plataforma de telemedicina y gestión de salud digital diseñada para simplificar tu experiencia médica.</p>
					</motion.div>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mb-16">
						{/* Contenido del Link */}
						<motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.8, delay: 0.2 }} className="space-y-6">
							<div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 sm:p-10 border border-white/20 shadow-2xl">
								<h3 className="text-3xl font-bold text-white mb-8">Todo lo que Incluye tu Enlace de Consulta</h3>
								<div className="space-y-6">
									{[
										{
											icon: FileCheck,
											title: 'Informes Médicos Digitales',
											description: 'Accede a todos tus informes médicos completos, diagnósticos clínicos y evaluaciones médicas en formato digital. Descarga, visualiza o comparte con otros especialistas cuando lo necesites.',
										},
										{
											icon: ImageIcon,
											title: 'Imágenes de Exámenes Médicos',
											description: 'Visualiza Rayos X, ecografías, resonancias magnéticas y cualquier estudio de imagen médica en alta calidad desde cualquier dispositivo. Compatible con múltiples formatos de imágenes diagnósticas.',
										},
										{
											icon: Pill,
											title: 'Recetas Médicas Electrónicas',
											description: 'Todas las recetas médicas relacionadas con tu consulta, con detalles completos de medicamentos, dosis precisas, indicaciones del médico y frecuencia de administración.',
										},
										{
											icon: Stethoscope,
											title: 'Diagnóstico Médico Completo',
											description: 'El diagnóstico detallado de tu especialista, explicaciones médicas comprensibles, recomendaciones de tratamiento y plan de seguimiento personalizado.',
										},
										{
											icon: Notebook,
											title: 'Notas y Observaciones Médicas',
											description: 'Observaciones clínicas, seguimientos de tratamiento, recomendaciones personalizadas del médico y cualquier información relevante de tu consulta médica.',
										},
									].map((item, index) => (
										<motion.div key={item.title} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: index * 0.1 }} className="flex items-start gap-5 p-5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 hover:border-white/20 transition-all group">
											<div className="shrink-0 w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
												<item.icon className="w-7 h-7 text-white" />
											</div>
											<div>
												<h4 className="text-xl font-bold text-white mb-2">{item.title}</h4>
												<p className="text-white/85 leading-relaxed">{item.description}</p>
											</div>
										</motion.div>
									))}
								</div>
							</div>
						</motion.div>

						{/* Beneficios */}
						<motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.8, delay: 0.4 }} className="space-y-6">
							<div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 sm:p-10 border border-white/20 shadow-2xl">
								<div className="text-center mb-10">
									<div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/20 backdrop-blur-md mb-6 shadow-xl">
										<Sparkles className="w-12 h-12 text-white" />
									</div>
									<h3 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">Simplifica tu Gestión Médica</h3>
									<p className="text-white/90 text-lg leading-relaxed">Olvídate de buscar información médica en múltiples lugares. Todo tu historial clínico en una plataforma segura y accesible.</p>
								</div>

								<div className="space-y-4 mb-10">
									{[
										{ icon: Mail, text: 'No más correos electrónicos perdidos o spam médico', color: 'text-red-200' },
										{ icon: MessageSquare, text: 'Sin cadenas interminables de WhatsApp', color: 'text-green-200' },
										{ icon: Eye, text: 'Toda tu información médica visible en una sola página', color: 'text-blue-200' },
										{ icon: Download, text: 'Descarga tus documentos médicos cuando lo necesites', color: 'text-purple-200' },
										{
											icon: Share2,
											text: 'Comparte tu información médica con otros especialistas de forma segura',
											color: 'text-pink-200',
										},
									].map((benefit, index) => (
										<motion.div key={benefit.text} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }} className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all">
											<benefit.icon className={`w-6 h-6 ${benefit.color} shrink-0`} />
											<span className="text-white font-medium">{benefit.text}</span>
										</motion.div>
									))}
								</div>

								<motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 1 }} className="pt-6 border-t border-white/20">
									<Link href="/register" className="w-full group inline-flex items-center justify-center gap-2 px-6 py-4 bg-white hover:bg-indigo-50 text-indigo-600 font-bold rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300">
										Crear Cuenta Gratuita
										<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
									</Link>
								</motion.div>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* Benefits Section - Rediseñado con SEO */}
			<section className="relative py-24 sm:py-32 bg-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.8 }} className="text-center mb-16">
						<div className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-50 rounded-full mb-6 border border-indigo-100">
							<Star className="w-5 h-5 text-indigo-600 fill-indigo-600" />
							<span className="text-sm font-semibold text-indigo-700">Beneficios Exclusivos para Pacientes</span>
						</div>
						<h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 mb-6 leading-tight">Plataforma Integral de Salud Digital</h2>
						<p className="text-xl sm:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed">Descubre cómo ASHIRA transforma la gestión de tu salud con herramientas digitales avanzadas diseñadas para pacientes venezolanos.</p>
					</motion.div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
						{[
							{
								icon: Users,
								title: 'Acceso a Profesionales de la Salud',
								description: 'Conecta con médicos especialistas y profesionales de la salud certificados en toda Venezuela. Encuentra el especialista que necesitas fácilmente.',
								gradient: 'from-indigo-500 to-purple-500',
							},
							{
								icon: FileText,
								title: 'Historial Médico Digital Completo',
								description: 'Tu historial clínico completo, seguro y accesible desde cualquier dispositivo. Mantén un registro organizado de todas tus consultas médicas.',
								gradient: 'from-purple-500 to-pink-500',
							},
							{
								icon: Calendar,
								title: 'Agenda de Citas Médicas Online',
								description: 'Agenda citas médicas con diferentes especialistas de forma rápida y sencilla. Recibe recordatorios y gestiona tus citas desde un solo lugar.',
								gradient: 'from-pink-500 to-rose-500',
							},
							{
								icon: FlaskConical,
								title: 'Resultados de Laboratorio Digitales',
								description: 'Accede a tus resultados de análisis clínicos y de laboratorio de forma inmediata y segura. Visualiza y descarga tus exámenes médicos cuando lo necesites.',
								gradient: 'from-indigo-500 to-blue-500',
							},
							{
								icon: Pill,
								title: 'Recetas Médicas Electrónicas',
								description: 'Recibe y gestiona tus recetas médicas de forma digital. Ten acceso a tu historial de medicamentos y tratamientos desde cualquier lugar.',
								gradient: 'from-purple-500 to-indigo-500',
							},
							{
								icon: Activity,
								title: 'Monitoreo de Indicadores de Salud',
								description: 'Sigue tus indicadores de salud, valores de laboratorio y recibe alertas importantes. Mantén un control continuo de tu bienestar.',
								gradient: 'from-pink-500 to-purple-500',
							},
							{
								icon: MessageCircle,
								title: 'Comunicación Directa con Médicos',
								description: 'Mantén comunicación directa y segura con tus médicos cuando lo necesites. Consulta dudas y recibe respuestas profesionales.',
								gradient: 'from-indigo-500 to-pink-500',
							},
							{
								icon: Shield,
								title: 'Privacidad y Seguridad Garantizada',
								description: 'Tus datos médicos protegidos con los más altos estándares de seguridad y encriptación. Cumplimiento total con normativas de protección de datos.',
								gradient: 'from-purple-500 to-pink-500',
							},
							{
								icon: Zap,
								title: 'Acceso 24/7 desde Cualquier Lugar',
								description: 'Accede a tu información médica en cualquier momento y desde cualquier lugar en Venezuela. Plataforma disponible las 24 horas del día.',
								gradient: 'from-pink-500 to-indigo-500',
							},
						].map((benefit, index) => (
							<motion.div key={benefit.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }} transition={{ duration: 0.6, delay: index * 0.1 }} whileHover={{ y: -8, scale: 1.02 }} className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl border border-slate-100 transition-all duration-300 overflow-hidden">
								<div className={`absolute inset-0 bg-linear-to-br ${benefit.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`} />
								<div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-br ${benefit.gradient} shadow-lg mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
									<benefit.icon className="w-8 h-8 text-white" />
								</div>
								<h3 className="text-xl font-bold text-slate-900 mb-3">{benefit.title}</h3>
								<p className="text-slate-600 leading-relaxed">{benefit.description}</p>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* Family Groups Section - Rediseñado */}
			<section className="relative py-24 sm:py-32 bg-linear-to-br from-rose-50 via-pink-50 to-purple-50 overflow-hidden">
				<div className="absolute inset-0">
					<div className="absolute top-0 right-0 w-[600px] h-[600px] bg-rose-200/20 rounded-full blur-3xl" />
					<div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-200/20 rounded-full blur-3xl" />
				</div>

				<div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.8 }} className="text-center mb-16">
						<div className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-100 rounded-full mb-8 border border-rose-200">
							<Heart className="w-5 h-5 text-rose-600" />
							<span className="text-sm font-bold text-rose-700">Gestión Familiar de Salud</span>
						</div>
						<h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 mb-6 leading-tight">Cuida la Salud de tu Familia</h2>
						<p className="text-xl sm:text-2xl text-slate-700 max-w-4xl mx-auto leading-relaxed mb-4">
							<strong className="font-bold text-rose-600">Grupos Familiares</strong> - Gestiona la salud de hasta 4 miembros de tu familia desde una sola cuenta
						</p>
						<p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto">Porque cada miembro de tu familia merece la mejor atención médica, sin importar su edad o condición de salud.</p>
					</motion.div>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mb-16">
						<motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.8, delay: 0.2 }} className="space-y-6">
							<div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 sm:p-10 shadow-2xl border border-rose-100">
								<div className="flex items-center gap-4 mb-8">
									<div className="w-20 h-20 rounded-2xl bg-linear-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
										<UsersRound className="w-10 h-10 text-white" />
									</div>
									<div>
										<h3 className="text-3xl font-bold text-slate-900 mb-1">Hasta 4 Personas</h3>
										<p className="text-slate-600">En un solo grupo familiar</p>
									</div>
								</div>

								<p className="text-lg text-slate-700 mb-8 leading-relaxed">
									<strong className="font-bold text-slate-900">Crea un grupo familiar</strong> y gestiona la salud de tus seres queridos desde tu cuenta. Ideal para cuidar de aquellos que más te importan y que necesitan de tu apoyo para gestionar su salud y atención médica.
								</p>

								<div className="space-y-6">
									{[
										{
											icon: Baby,
											title: 'Salud de tus Hijos',
											description: 'Gestiona la salud de tus hijos menores de edad. Accede a sus consultas pediátricas, registros de vacunación, exámenes médicos y recetas. Todo en un lugar seguro y controlado por ti.',
											color: 'from-blue-400 to-cyan-500',
										},
										{
											icon: Heart,
											title: 'Familiares con Discapacidad',
											description: 'Brinda apoyo a familiares que necesitan asistencia médica. Tú puedes gestionar toda su información médica, asegurando que reciban el mejor cuidado y seguimiento profesional posible.',
											color: 'from-purple-400 to-pink-500',
										},
										{
											icon: Users,
											title: 'Padres y Adultos Mayores',
											description: 'Cuida de tus padres mayores. Accede a sus consultas médicas, medicamentos, exámenes y tratamientos. Mantente al día con su salud y asegúrate de que sigan sus tratamientos correctamente.',
											color: 'from-rose-400 to-orange-500',
										},
										{
											icon: UserPlus,
											title: 'Cualquier Miembro de la Familia',
											description: 'Incluye a cualquier miembro de tu familia que necesite tu apoyo médico. Todos merecen atención de calidad, y tú puedes ser su apoyo en la gestión de su salud con ASHIRA.',
											color: 'from-indigo-400 to-purple-500',
										},
									].map((member, index) => (
										<motion.div key={member.title} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }} className="flex items-start gap-5 p-6 bg-linear-to-r from-white to-rose-50/50 rounded-2xl border border-rose-100 hover:border-rose-200 hover:shadow-lg transition-all">
											<div className={`shrink-0 w-16 h-16 rounded-xl bg-linear-to-br ${member.color} flex items-center justify-center shadow-md`}>
												<member.icon className="w-8 h-8 text-white" />
											</div>
											<div>
												<h4 className="text-xl font-bold text-slate-900 mb-2">{member.title}</h4>
												<p className="text-slate-600 leading-relaxed">{member.description}</p>
											</div>
										</motion.div>
									))}
								</div>
							</div>
						</motion.div>

						<motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.8, delay: 0.4 }} className="space-y-6">
							<div className="bg-linear-to-br from-rose-500 via-pink-500 to-purple-500 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
								<div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
								<div className="relative z-10">
									<div className="text-center mb-10">
										<div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/20 backdrop-blur-md mb-6 shadow-xl">
											<Sparkles className="w-12 h-12 text-white" />
										</div>
										<h3 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">Mejora la Calidad de Vida</h3>
										<p className="text-lg text-white/95 leading-relaxed">ASHIRA está diseñado para que cada paciente reciba la atención médica que merece, sin importar su condición de salud o edad.</p>
									</div>

									<div className="space-y-6 mb-10">
										{[
											{
												title: 'Atención Médica Personalizada',
												description: 'Cada miembro de tu familia tiene su propio perfil médico completo, con toda su información clínica organizada y accesible.',
											},
											{
												title: 'Control Total y Seguridad',
												description: 'Tú decides quién puede ver qué información médica. Mantén el control total sobre la privacidad de cada familiar.',
											},
											{
												title: 'Gestión Médica Simplificada',
												description: 'Gestiona citas médicas, medicamentos, exámenes y consultas de todos tus familiares desde una sola plataforma digital.',
											},
											{
												title: 'Tranquilidad y Paz Mental',
												description: 'Saber que tienes toda la información médica de tus seres queridos organizada y al alcance te da tranquilidad y seguridad.',
											},
										].map((benefit, index) => (
											<motion.div key={benefit.title} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }} className="bg-white/20 backdrop-blur-md rounded-xl p-6 border border-white/30">
												<h4 className="text-xl font-bold text-white mb-2">{benefit.title}</h4>
												<p className="text-white/90 leading-relaxed">{benefit.description}</p>
											</motion.div>
										))}
									</div>

									<div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 border border-white/30 mb-8">
										<p className="text-white text-center mb-4 font-bold text-xl">💝 Cuidar es Nuestra Prioridad</p>
										<p className="text-white/90 text-center leading-relaxed">En ASHIRA entendemos que la salud es un tema familiar. Por eso, te damos las herramientas digitales para que puedas brindar el mejor cuidado médico a quienes más te importan.</p>
									</div>

									<motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 1 }}>
										<Link href="/register" className="w-full group inline-flex items-center justify-center gap-2 px-6 py-4 bg-white hover:bg-rose-50 text-rose-600 font-bold rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300">
											Crear Grupo Familiar
											<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
										</Link>
									</motion.div>
								</div>
							</div>
						</motion.div>
					</div>

					{/* Testimonial */}
					<motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.8, delay: 0.3 }} className="max-w-4xl mx-auto">
						<div className="bg-white/90 backdrop-blur-xl rounded-3xl p-10 sm:p-12 shadow-2xl border border-rose-100 text-center">
							<Heart className="w-14 h-14 text-rose-500 mx-auto mb-6" />
							<blockquote className="text-2xl sm:text-3xl text-slate-800 font-medium mb-6 leading-relaxed">"La salud de mi familia es lo más importante. Con ASHIRA puedo estar al día con las consultas médicas de mis hijos y mis padres mayores, todo desde un solo lugar. Me da mucha tranquilidad saber que tengo toda su información médica organizada y accesible."</blockquote>
							<p className="text-slate-600 font-semibold text-lg">- Paciente de ASHIRA</p>
						</div>
					</motion.div>
				</div>
			</section>

			{/* Detailed Features Section - Rediseñado */}
			<section className="relative py-24 sm:py-32 bg-slate-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.8 }} className="text-center mb-16">
						<h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 mb-6 leading-tight">Funcionalidades Avanzadas de Salud Digital</h2>
						<p className="text-xl sm:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed">Conoce en detalle todas las herramientas que ASHIRA ofrece para gestionar tu salud de forma profesional y eficiente.</p>
					</motion.div>

					<div className="space-y-8">
						{[
							{
								title: 'Gestión Integral de Consultas Médicas',
								description: 'Cada consulta médica genera un enlace único y personalizado que contiene toda la información relevante de tu visita. Accede a tu historial médico completo desde cualquier dispositivo.',
								features: ['Acceso inmediato después de cada consulta médica', 'Enlace único y seguro para cada visita al especialista', 'Historial clínico completo de todas tus consultas', 'Búsqueda avanzada por fecha, médico o especialidad médica'],
								icon: Calendar,
								gradient: 'from-indigo-500 to-purple-500',
							},
							{
								title: 'Informes Médicos Digitales y Descargables',
								description: 'Visualiza, descarga e imprime todos tus informes médicos desde cualquier dispositivo. Compatible con múltiples formatos y optimizado para visualización móvil.',
								features: ['Informes médicos en formato digital de alta calidad', 'Descarga en PDF cuando lo necesites', 'Visualización optimizada para dispositivos móviles', 'Historial completo de todos tus informes médicos'],
								icon: FileText,
								gradient: 'from-purple-500 to-pink-500',
							},
							{
								title: 'Archivos de Exámenes Médicos e Imágenes',
								description: 'Guarda y visualiza todas tus imágenes médicas: Rayos X, ecografías, resonancias magnéticas y más. Herramientas profesionales de visualización incluidas.',
								features: ['Visualización de imágenes médicas en alta resolución', 'Soporte para múltiples formatos de imágenes diagnósticas', 'Zoom y herramientas profesionales de visualización', 'Comparte estudios médicos con otros especialistas fácilmente'],
								icon: ImageIcon,
								gradient: 'from-pink-500 to-rose-500',
							},
							{
								title: 'Recetas Médicas Electrónicas Digitales',
								description: 'Gestiona todas tus recetas médicas en un solo lugar, con información detallada de medicamentos, dosis, indicaciones y frecuencia de administración.',
								features: ['Recetas médicas asociadas a cada consulta', 'Información completa de medicamentos y tratamientos', 'Dosis precisas e indicaciones médicas claras', 'Historial completo de tratamientos anteriores'],
								icon: Pill,
								gradient: 'from-indigo-500 to-blue-500',
							},
							{
								title: 'Diagnósticos Médicos y Notas Clínicas',
								description: 'Accede a diagnósticos médicos completos, notas del doctor, recomendaciones de tratamiento y planes de seguimiento personalizados.',
								features: ['Diagnósticos médicos detallados de especialistas', 'Notas clínicas adicionales y observaciones médicas', 'Recomendaciones de seguimiento y tratamiento', 'Explicaciones médicas claras y comprensibles'],
								icon: Stethoscope,
								gradient: 'from-blue-500 to-cyan-500',
							},
							{
								title: 'Acceso Seguro y Compartir de Información Médica',
								description: 'Accede desde cualquier lugar en Venezuela y comparte información médica con otros especialistas de forma segura y controlada.',
								features: ['Acceso desde cualquier dispositivo y ubicación', 'Comparte enlaces seguros con otros médicos especialistas', 'Control total sobre la privacidad de tu información médica', 'Sincronización automática en la nube'],
								icon: Shield,
								gradient: 'from-cyan-500 to-teal-500',
							},
						].map((feature, index) => (
							<motion.div key={feature.title} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }} transition={{ duration: 0.6, delay: index * 0.1 }} className="bg-white rounded-3xl p-10 shadow-xl hover:shadow-2xl border border-slate-100 transition-all duration-300">
								<div className="flex flex-col md:flex-row gap-8 items-start">
									<div className={`shrink-0 w-20 h-20 rounded-2xl bg-linear-to-br ${feature.gradient} flex items-center justify-center shadow-lg`}>
										<feature.icon className="w-10 h-10 text-white" />
									</div>
									<div className="flex-1">
										<h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">{feature.title}</h3>
										<p className="text-lg text-slate-600 mb-6 leading-relaxed">{feature.description}</p>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											{feature.features.map((item, idx) => (
												<div key={idx} className="flex items-start gap-3">
													<CheckCircle2 className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
													<span className="text-slate-700">{item}</span>
												</div>
											))}
										</div>
									</div>
								</div>
							</motion.div>
						))}
					</div>

					<motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.6, delay: 0.8 }} className="text-center mt-16">
						<Link href="/register" className="group inline-flex items-center justify-center gap-3 px-10 py-5 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 text-lg sm:text-xl">
							Comienza a Gestionar tu Salud Digitalmente
							<ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
						</Link>
					</motion.div>
				</div>
			</section>

			{/* Why Choose Section - Rediseñado con SEO */}
			<section className="relative py-24 sm:py-32 bg-linear-to-br from-indigo-50 via-purple-50 to-pink-50 overflow-hidden">
				<div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-size-[24px_24px]" />
				<div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
						<motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.8 }} className="space-y-8">
							<div>
								<h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 mb-6 leading-tight">¿Por qué Elegir ASHIRA?</h2>
								<p className="text-xl sm:text-2xl text-slate-600 mb-8 leading-relaxed">Somos la plataforma de salud digital más completa para pacientes en Venezuela. Conectamos todo el ecosistema médico para brindarte la mejor experiencia de gestión de salud.</p>
								<p className="text-lg text-slate-700 leading-relaxed">
									<strong className="font-bold text-slate-900">Todo en un solo lugar, sin complicaciones, sin correos perdidos, sin cadenas de WhatsApp.</strong> Tu salud digital gestionada de forma profesional y segura.
								</p>
							</div>

							<div className="space-y-4">
								{['Acceso 100% gratuito para pacientes', 'Historial médico digital unificado y completo', 'Enlace único por cada consulta con toda la información médica', 'Imágenes, informes, recetas y diagnósticos en un solo lugar', 'Coordinación automática entre especialistas médicos', 'Resultados de laboratorio y recetas digitales instantáneos', 'Seguridad y privacidad médica garantizadas', 'Sin necesidad de correo electrónico o WhatsApp'].map((reason, index) => (
									<motion.div key={reason} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-50px' }} transition={{ duration: 0.5, delay: index * 0.1 }} className="flex items-center gap-4 group">
										<div className="shrink-0 w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
											<CheckCircle2 className="w-6 h-6 text-white" />
										</div>
										<span className="text-lg sm:text-xl text-slate-700 font-medium">{reason}</span>
									</motion.div>
								))}
							</div>

							<Link href="/register" className="group inline-flex items-center justify-center gap-3 px-10 py-5 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 text-lg">
								Registrarse Gratis Ahora
								<ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
							</Link>
						</motion.div>

						<motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.8 }} className="relative">
							<div className="relative bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-10 sm:p-14 shadow-2xl overflow-hidden">
								<div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
								<div className="relative z-10 space-y-8">
									<div className="flex items-center gap-5">
										<div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
											<HeartPulse className="w-10 h-10 text-white" />
										</div>
										<div>
											<h3 className="text-3xl sm:text-4xl font-bold text-white mb-2">100% Gratis</h3>
											<p className="text-indigo-50 text-lg">Para pacientes en Venezuela</p>
										</div>
									</div>
									<div className="grid grid-cols-2 gap-4">
										<div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 border border-white/30">
											<div className="text-4xl sm:text-5xl font-bold text-white mb-2">24/7</div>
											<div className="text-sm text-indigo-50 font-medium">Disponible</div>
										</div>
										<div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 border border-white/30">
											<div className="text-4xl sm:text-5xl font-bold text-white mb-2">100%</div>
											<div className="text-sm text-indigo-50 font-medium">Seguro</div>
										</div>
									</div>
									<div className="flex items-center gap-3 text-white">
										<TrendingUp className="w-6 h-6" />
										<span className="text-base sm:text-lg font-medium">Ecosistema médico en crecimiento continuo</span>
									</div>
								</div>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* Final CTA Section - Rediseñado */}
			<section className="relative py-24 sm:py-32 bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 overflow-hidden">
				<div className="absolute inset-0">
					<div className="absolute top-0 left-0 w-[800px] h-[800px] bg-white/10 rounded-full blur-3xl" />
					<div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-white/10 rounded-full blur-3xl" />
				</div>
				<div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
					<motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.8 }} className="space-y-8">
						<h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight">Comienza a Gestionar tu Salud Digital Hoy</h2>
						<p className="text-xl sm:text-2xl text-indigo-50 mb-10 max-w-3xl mx-auto leading-relaxed">Regístrate gratis y comienza a disfrutar de todos los beneficios de la plataforma de salud digital más completa de Venezuela. Tu historial médico, tus citas y tu salud en un solo lugar.</p>
						<div className="flex flex-col sm:flex-row gap-5 justify-center">
							<Link href="/register" className="group inline-flex items-center justify-center gap-3 px-10 py-5 bg-white hover:bg-slate-50 text-indigo-600 font-bold rounded-xl shadow-2xl hover:shadow-3xl transform hover:scale-[1.02] transition-all duration-300 text-lg sm:text-xl">
								Crear Cuenta Gratuita
								<ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
							</Link>
							<Link href="/login" className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-semibold rounded-xl border-2 border-white/30 hover:border-white/50 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 text-lg sm:text-xl">
								Iniciar Sesión
							</Link>
						</div>
					</motion.div>
				</div>
			</section>
		</div>
	);
}
