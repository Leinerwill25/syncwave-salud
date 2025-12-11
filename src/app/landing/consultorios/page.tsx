'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Stethoscope, User, Calendar, FileText, Shield, Clock, CheckCircle2, ArrowRight, Zap, Activity, TrendingUp, DollarSign, Globe, MessageCircle, Bell, FileCheck, Users, Settings, BarChart3, CreditCard, Link2, Upload, Download, Star, Sparkles, Target, Rocket, Timer, Save, Building2, Instagram, Heart, MapPin, AlertCircle } from 'lucide-react';

export default function ConsultoriosLandingPage() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
			{/* Hero Section - Mejorado con técnicas de persuasión */}
			<section className="relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-20 md:pt-36 md:pb-28">
				<div className="absolute inset-0 overflow-hidden pointer-events-none">
					<div className="absolute top-20 right-10 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl animate-pulse" />
					<div className="absolute bottom-20 left-10 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl animate-pulse delay-1000" />
				</div>

				<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
						<motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="text-center lg:text-left">
							{/* Badge de urgencia/escasez */}
							<motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-100 to-cyan-100 rounded-full mb-6 shadow-md">
								<Sparkles className="w-5 h-5 text-teal-600 animate-pulse" />
								<span className="text-sm font-semibold text-teal-700">Ahorra hasta 30% en suscripción anual</span>
							</motion.div>

							{/* Headline con beneficio principal */}
							<h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 mb-6 leading-tight">
								<span className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">Reduce 40% el Tiempo</span>
								<br />
								<span className="text-slate-800">en Cada Consulta</span>
							</h1>

							{/* Subheadline con prueba social */}
							<p className="text-lg sm:text-xl md:text-2xl text-slate-600 mb-4 leading-relaxed font-medium">La plataforma #1 para consultorios privados. Genera informes médicos automáticamente y gestiona tu práctica con herramientas profesionales.</p>

							{/* Prueba social */}
							<div className="flex items-center gap-2 mb-8 justify-center lg:justify-start">
								<div className="flex -space-x-2">
									{[1, 2, 3, 4].map((i) => (
										<div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-400 border-2 border-white" />
									))}
								</div>
							</div>

							{/* CTAs con urgencia */}
							<div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
								<Link href="/register" className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-base sm:text-lg overflow-hidden">
									<span className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
									<Rocket className="w-5 h-5 relative z-10" />
									<span className="relative z-10">Comenzar Gratis Ahora</span>
									<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform relative z-10" />
								</Link>
								<Link href="/login" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-2xl border-2 border-slate-200 hover:border-teal-300 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-base sm:text-lg">
									Iniciar Sesión
								</Link>
							</div>

							{/* Garantía/Confianza */}
							<div className="mt-6 flex items-center gap-4 justify-center lg:justify-start text-sm text-slate-600">
								<Shield className="w-5 h-5 text-teal-600" />
								<span>Registro seguro y validado • Sin tarjeta de crédito inicial</span>
							</div>
						</motion.div>

						<motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="relative">
							<div className="relative bg-gradient-to-br from-teal-500/10 via-cyan-500/10 to-blue-500/10 rounded-3xl p-12 backdrop-blur-sm border border-white/20 shadow-2xl">
								<div className="grid grid-cols-2 gap-6">
									{[Stethoscope, User, Calendar, FileText].map((Icon, index) => (
										<motion.div key={index} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 + index * 0.1 }} whileHover={{ scale: 1.1, rotate: 5 }} className="bg-white rounded-2xl p-6 shadow-lg flex items-center justify-center">
											<Icon className="w-12 h-12 text-teal-600" />
										</motion.div>
									))}
								</div>
								<motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-full flex items-center justify-center shadow-2xl">
									<Zap className="w-12 h-12 text-white" />
								</motion.div>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* Sección: Nuestra Principal Fortaleza */}
			<section className="py-16 sm:py-20 md:py-24 bg-white relative overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-br from-teal-50/50 to-cyan-50/50" />
				<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
						<motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
							<div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 rounded-full mb-6">
								<Target className="w-5 h-5 text-teal-600" />
								<span className="text-sm font-semibold text-teal-600">Nuestra Principal Fortaleza</span>
							</div>
							<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-6">
								Genera Informes Médicos <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Automáticamente</span>
							</h2>
							<p className="text-lg text-slate-600 mb-6 leading-relaxed">
								<strong className="text-slate-900">Ahorra tiempo en cada consulta.</strong> Carga tu plantilla de informe y estructura una sola vez. La plataforma generará automáticamente el informe completo después de llenar el formulario.
							</p>
							<div className="space-y-4">
								{['Carga tu plantilla Word personalizada', 'Define la estructura de tu informe', 'Llena el formulario de consulta', 'Descarga el informe generado automáticamente', 'Solo imprime y firma'].map((step, index) => (
									<motion.div key={step} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }} className="flex items-center gap-3">
										<div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-md">
											<CheckCircle2 className="w-5 h-5 text-white" />
										</div>
										<span className="text-base text-slate-700 font-medium">{step}</span>
									</motion.div>
								))}
							</div>
							<div className="mt-8 p-6 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl border border-teal-200">
								<div className="flex items-center gap-3 mb-2">
									<Timer className="w-6 h-6 text-teal-600" />
									<span className="text-lg font-bold text-slate-900">Reduce 40% el tiempo por consulta</span>
								</div>
								<p className="text-sm text-slate-600">Más tiempo para tus pacientes, menos tiempo en papeleo</p>
							</div>
						</motion.div>

						<motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="relative">
							<div className="relative bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 rounded-3xl p-8 sm:p-12 shadow-2xl overflow-hidden">
								<div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
								<div className="relative z-10 space-y-6">
									<div className="flex items-center gap-4">
										<div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
											<FileText className="w-8 h-8 text-white" />
										</div>
										<div>
											<h3 className="text-2xl sm:text-3xl font-bold text-white mb-1">Informes Automáticos</h3>
											<p className="text-teal-50">Sin escribir, solo descargar</p>
										</div>
									</div>
									<div className="grid grid-cols-2 gap-4">
										<div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30">
											<div className="text-3xl sm:text-4xl font-bold text-white mb-1">-40%</div>
											<div className="text-sm text-teal-50">Tiempo por Consulta</div>
										</div>
										<div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30">
											<div className="text-3xl sm:text-4xl font-bold text-white mb-1">100%</div>
											<div className="text-sm text-teal-50">Automático</div>
										</div>
									</div>
								</div>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* Sección: Funciones para Especialistas */}
			<section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-slate-50 to-teal-50/30">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-12 sm:mb-16">
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">Todo lo que Necesitas para tu Consultorio</h2>
						<p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto">Herramientas profesionales diseñadas específicamente para consultorios privados. Configuración completa desde el primer registro.</p>
					</motion.div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
						{[
							{
								icon: User,
								title: 'Registro Completo y Validado',
								description: 'Configura tu consultorio con especialidad, servicios, horarios, imágenes y ubicación. Validación de profesión para seguridad.',
								gradient: 'from-teal-500 to-cyan-500',
							},
							{
								icon: Users,
								title: 'Gestión de Roles y Equipo',
								description: 'Crea roles personalizados para tu equipo: recepcionistas, asistentes para agendar citas, y más.',
								gradient: 'from-cyan-500 to-blue-500',
							},
							{
								icon: DollarSign,
								title: 'Tasas de Cambio Automáticas',
								description: 'Integración completa con todas las tasas del mercado. Ahorra tiempo en cálculos de servicios. Elige tu moneda preferida.',
								gradient: 'from-blue-500 to-indigo-500',
							},
							{
								icon: BarChart3,
								title: 'Panel General con Estadísticas',
								description: 'Visualiza consultas atendidas, citas programadas e ingresos por períodos (Día, Mes, Año). Pagos pendientes y creación rápida de citas.',
								gradient: 'from-teal-500 to-emerald-500',
							},
							{
								icon: FileCheck,
								title: 'Órdenes Médicas',
								description: 'Genera órdenes médicas digitales de forma rápida y profesional.',
								gradient: 'from-cyan-500 to-teal-500',
							},
							{
								icon: Activity,
								title: 'Resultados de Laboratorio',
								description: 'Visualiza todos los resultados emitidos por tus pacientes de forma organizada.',
								gradient: 'from-blue-500 to-cyan-500',
							},
							{
								icon: Calendar,
								title: 'Historial de Consultas',
								description: 'Accede a todas las consultas realizadas con búsqueda y filtros avanzados.',
								gradient: 'from-teal-500 to-cyan-500',
							},
							{
								icon: Users,
								title: 'Gestión de Pacientes',
								description: 'Visualiza todos tus pacientes. Carga masiva de pacientes regulares mediante Excel.',
								gradient: 'from-cyan-500 to-blue-500',
							},
							{
								icon: Upload,
								title: 'Carga Masiva de Pacientes',
								description: 'Importa tus pacientes frecuentes desde Excel de forma rápida y sencilla.',
								gradient: 'from-blue-500 to-indigo-500',
							},
						].map((feature, index) => (
							<motion.div key={feature.title} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }} whileHover={{ scale: 1.05, y: -5 }} className="group relative bg-white rounded-2xl p-6 shadow-md hover:shadow-xl border border-slate-100 transition-all duration-300 overflow-hidden">
								<div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`} />
								<div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} shadow-md mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
									<feature.icon className="w-7 h-7 text-white" />
								</div>
								<h3 className="text-xl font-bold text-slate-900 mb-2">{feature.title}</h3>
								<p className="text-sm sm:text-base text-slate-600 leading-relaxed">{feature.description}</p>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* Sección: Beneficios Detallados */}
			<section className="py-16 sm:py-20 md:py-24 bg-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-12 sm:mb-16">
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">Beneficios Exclusivos de la Plataforma</h2>
						<p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto">Herramientas únicas diseñadas para hacer crecer tu consultorio y mejorar la experiencia de tus pacientes</p>
					</motion.div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
						{[
							{
								icon: Link2,
								title: 'Presencia Digital Profesional',
								description: 'Página web pública única para tu consultorio. Compártela en redes sociales para generar mayor confianza. Incluye ubicación, contacto, servicios, horarios y más.',
								color: 'teal',
							},
							{
								icon: CreditCard,
								title: 'Validación Rápida de Pagos',
								description: 'Si integras tu pago móvil, los pacientes pueden cargar capturas y números de referencia. Valida pagos de forma rápida y segura con historial completo guardado.',
								color: 'cyan',
							},
							{
								icon: BarChart3,
								title: 'Módulo Único de Reportes',
								description: 'Valida rápidamente cuántas citas fueron programadas vs consultas efectivas. Visualiza ingresos generados por períodos con reportes detallados.',
								color: 'blue',
							},
							{
								icon: MessageCircle,
								title: 'Mensajería Directa con Pacientes',
								description: 'Contacta directamente con pacientes antes y después de consultas. Envía recordatorios, valida tratamientos y haz seguimiento personalizado.',
								color: 'teal',
							},
							{
								icon: Bell,
								title: 'Sistema de Tareas y Alertas',
								description: 'Crea tareas para recordatorios pendientes (ej: ver resultados de laboratorio). Asocia pacientes a tareas para mejor organización.',
								color: 'cyan',
							},
							{
								icon: FileText,
								title: 'Informes Automáticos',
								description: 'Nuestra principal fortaleza: carga tu plantilla y estructura, y la plataforma genera automáticamente el informe. Solo descarga, imprime y firma.',
								color: 'blue',
							},
						].map((benefit, index) => (
							<motion.div key={benefit.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }} className="group bg-gradient-to-br from-white to-slate-50 rounded-2xl p-6 sm:p-8 shadow-md hover:shadow-xl border border-slate-200 transition-all duration-300">
								<div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl shadow-md mb-4 group-hover:scale-110 transition-transform ${benefit.color === 'teal' ? 'bg-gradient-to-br from-teal-500 to-cyan-500' : benefit.color === 'cyan' ? 'bg-gradient-to-br from-cyan-500 to-blue-500' : 'bg-gradient-to-br from-blue-500 to-indigo-500'}`}>
									<benefit.icon className="w-7 h-7 text-white" />
								</div>
								<h3 className="text-xl font-bold text-slate-900 mb-3">{benefit.title}</h3>
								<p className="text-base text-slate-600 leading-relaxed">{benefit.description}</p>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* Sección: Planes de Suscripción */}
			<section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 relative overflow-hidden">
				<div className="absolute inset-0">
					<div className="absolute top-0 right-0 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl" />
					<div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl" />
				</div>
				<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-8 sm:mb-10">
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">Planes de Suscripción Flexibles</h2>
						<p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">Elige el plan que mejor se adapte a tu consultorio. Ahorra más con suscripciones de largo plazo.</p>
					</motion.div>

					{/* Banner Promocional - Oferta Limitada */}
					<motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="max-w-4xl mx-auto mb-10 sm:mb-12">
						<div className="relative bg-gradient-to-r from-amber-50 via-orange-50 to-red-50 rounded-2xl p-6 sm:p-8 border-2 border-amber-200 shadow-xl overflow-hidden">
							<div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl -mr-16 -mt-16" />
							<div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-400/20 rounded-full blur-2xl -ml-16 -mb-16" />
							<div className="relative z-10">
								<div className="flex items-start gap-4 mb-4">
									<div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
										<AlertCircle className="w-6 h-6 text-white" />
									</div>
									<div className="flex-1">
										<h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
											<span>🚀 Oferta de Lanzamiento Exclusiva</span>
										</h3>
										<p className="text-sm sm:text-base text-slate-700 leading-relaxed mb-3">
											<strong className="text-slate-900">No te pierdas nuestra promoción especial</strong> y sé parte de los <span className="font-bold text-amber-700">20 primeros consultorios</span> que se suscriban. Aprovecha descuentos exclusivos que no volverán a estar disponibles.
										</p>
										<div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-amber-200 mt-4">
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
												<div className="flex items-start gap-2">
													<div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center mt-0.5">
														<CheckCircle2 className="w-4 h-4 text-white" />
													</div>
													<div>
														<div className="font-semibold text-slate-900">Primeros 20 consultorios:</div>
														<div className="text-slate-600">
															• Trimestral: <span className="font-bold text-teal-700">10% OFF</span>
														</div>
														<div className="text-slate-600">
															• Anual: <span className="font-bold text-teal-700">30% OFF</span>
														</div>
													</div>
												</div>
												<div className="flex items-start gap-2">
													<div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center mt-0.5">
														<Clock className="w-4 h-4 text-slate-600" />
													</div>
													<div>
														<div className="font-semibold text-slate-900">Después del lanzamiento:</div>
														<div className="text-slate-600">
															• Trimestral: <span className="font-semibold text-slate-500">5% OFF</span>
														</div>
														<div className="text-slate-600">
															• Anual: <span className="font-semibold text-slate-500">15% OFF</span>
														</div>
													</div>
												</div>
											</div>
										</div>
										<div className="mt-4 flex items-center gap-2 text-xs sm:text-sm text-amber-800 font-semibold">
											<Timer className="w-4 h-4 animate-pulse" />
											<span>⏰ Oferta limitada - Solo quedan pocos lugares disponibles</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</motion.div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
						{[
							{
								period: 'Mensual',
								price: '€70',
								periodText: 'mes',
								discount: null,
								popular: false,
								features: ['Acceso completo a todas las funciones', 'Soporte por email', 'Actualizaciones continuas'],
							},
							{
								period: 'Trimestral',
								price: '€63',
								originalPrice: '€70',
								periodText: 'mes',
								discount: '10% OFF',
								discountText: 'Ahorra €21 en 3 meses',
								popular: true,
								features: ['Todo del plan mensual', '10% de descuento', 'Facturación trimestral', 'Soporte prioritario'],
							},
							{
								period: 'Anual',
								price: '€49',
								originalPrice: '€70',
								periodText: 'mes',
								discount: '30% OFF',
								discountText: 'Ahorra €252 al año',
								popular: false,
								features: ['Todo del plan mensual', '30% de descuento', 'Facturación anual', 'Soporte prioritario', 'Onboarding personalizado'],
							},
						].map((plan, index) => (
							<motion.div key={plan.period} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }} className={`relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 ${plan.popular ? 'ring-4 ring-teal-500 scale-105' : ''}`}>
								{plan.popular && <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-teal-600 to-cyan-600 text-white text-sm font-bold rounded-full">MÁS POPULAR</div>}
								{plan.discount && (
									<div className="absolute -top-3 -right-3 w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
										<span className="text-white text-xs font-bold text-center leading-tight">{plan.discount}</span>
									</div>
								)}
								<div className="text-center mb-6">
									<h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.period}</h3>
									<div className="flex items-baseline justify-center gap-2">
										{plan.originalPrice && <span className="text-xl text-slate-400 line-through">{plan.originalPrice}</span>}
										<span className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">{plan.price}</span>
										<span className="text-slate-600">/{plan.periodText}</span>
									</div>
									{plan.discountText && <p className="text-sm text-teal-600 font-semibold mt-2">{plan.discountText}</p>}
								</div>
								<ul className="space-y-3 mb-8">
									{plan.features.map((feature, i) => (
										<li key={i} className="flex items-start gap-2">
											<CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
											<span className="text-sm text-slate-600">{feature}</span>
										</li>
									))}
								</ul>
								<Link href="/register" className={`block w-full text-center py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${plan.popular ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-700 hover:to-cyan-700 shadow-lg hover:shadow-xl' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
									Elegir Plan
								</Link>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* Sección: Doctores Que Confían En Nosotros */}
			<section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-slate-50 via-white to-teal-50/30 relative overflow-hidden">
				<div className="absolute inset-0 overflow-hidden pointer-events-none">
					<div className="absolute top-0 right-0 w-96 h-96 bg-teal-400/5 rounded-full blur-3xl" />
					<div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-400/5 rounded-full blur-3xl" />
				</div>
				<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-12 sm:mb-16">
						<div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 rounded-full mb-4">
							<Heart className="w-5 h-5 text-teal-600" />
							<span className="text-sm font-semibold text-teal-600">Doctores Que Confían En Nosotros</span>
						</div>
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">Conoce a Nuestros Especialistas</h2>
						<p className="text-lg text-slate-600 max-w-2xl mx-auto">Profesionales de la salud que transforman su práctica con nuestra plataforma</p>
					</motion.div>

					{/* Perfil de la Dra. Carwin Silva */}
					<motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="max-w-6xl mx-auto">
						<div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
								{/* Imagen */}
								<div className="relative h-96 lg:h-auto min-h-[500px] bg-gradient-to-br from-teal-500/10 to-cyan-500/10">
									<Image src="/consultorios/dracarwin/IMG_5197.JPG" alt="Dra. Carwin Silva - Ginecóloga y Obstetra" fill className="object-cover" priority />
									<div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
									<div className="absolute bottom-6 left-6 right-6">
										<a href="https://www.instagram.com/dra.csilva/?utm_source=chatgpt.com" target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all duration-300 hover:scale-105">
											<Instagram className="w-5 h-5 text-pink-600 group-hover:text-pink-700 transition-colors" />
											<span className="text-sm font-semibold text-slate-900 group-hover:text-pink-600 transition-colors">@dra.csilva</span>
										</a>
									</div>
								</div>

								{/* Contenido */}
								<div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center">
									<div className="mb-6">
										<h3 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">Dra. Carwin Silva</h3>
										<div className="flex flex-wrap items-center gap-2 mb-4">
											<span className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-semibold">
												<Stethoscope className="w-4 h-4" />
												Ginecóloga y Obstetra
											</span>
											<span className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-sm font-semibold">
												<MapPin className="w-4 h-4" />
												Caracas, Venezuela
											</span>
										</div>
									</div>

									{/* ¿Quién es? */}
									<div className="mb-6">
										<h4 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
											<User className="w-5 h-5 text-teal-600" />
											¿Quién es?
										</h4>
										<p className="text-base text-slate-700 leading-relaxed mb-3">Carwin Silva es una ginecóloga y obstetra que ejerce en Caracas (Venezuela), con consultorio en la zona de Sabana Grande.</p>
										<p className="text-base text-slate-700 leading-relaxed">
											Se define como especialista en <strong className="text-slate-900">ginecología regenerativa, funcional y estética</strong>.
										</p>
									</div>

									{/* Enfoque / Filosofía */}
									<div className="border-t border-slate-200 pt-6">
										<h4 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
											<Target className="w-5 h-5 text-teal-600" />
											Enfoque / Filosofía
										</h4>
										<p className="text-base text-slate-700 leading-relaxed mb-3">
											La Dra. Silva siente que la ginecología regenerativa y estética <strong className="text-slate-900">"va más allá de la vanidad"</strong>: su interés es brindar soluciones que mejoren tanto la salud física como emocional de las mujeres.
										</p>
										<p className="text-base text-slate-700 leading-relaxed">
											Expresa que su motivación siempre ha sido <strong className="text-slate-900">apoyar a las mujeres a lo largo de las distintas etapas de su vida</strong>, ofreciendo alternativas adaptadas a sus necesidades particulares.
										</p>
									</div>

									{/* Badge de confianza */}
									<div className="mt-8 pt-6 border-t border-slate-200">
										<div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-full border border-teal-200">
											<CheckCircle2 className="w-5 h-5 text-teal-600" />
											<span className="text-sm font-semibold text-teal-700">Confía en nuestra plataforma</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</motion.div>
				</div>
			</section>

			{/* Sección: Consultorios Que Confían En Nosotros */}
			<section className="py-16 sm:py-20 md:py-24 bg-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-12">
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">Consultorios Que Confían En Nosotros</h2>
						<p className="text-lg text-slate-600 max-w-2xl mx-auto">Únete a los consultorios que ya están transformando su práctica médica</p>
					</motion.div>
					{/* Consultorios que confían en nosotros */}
					<motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="grid grid-cols-2 md:grid-cols-4 gap-8">
						<div className="bg-white rounded-2xl p-6 flex items-center justify-center h-32 shadow-md hover:shadow-lg transition-shadow duration-300">
							<Image src="/consultorios/dracarwin/Recurso 28.png" alt="Dr. Acarwin - Consultorio que confía en nosotros" width={200} height={100} className="object-contain max-w-full max-h-full" />
						</div>
						{[1, 2, 3].map((i) => (
							<div key={i} className="bg-slate-100 rounded-2xl p-8 flex items-center justify-center h-32 opacity-30">
								<Building2 className="w-12 h-12 text-slate-400" />
							</div>
						))}
					</motion.div>
				</div>
			</section>

			{/* CTA Final - Mejorado con urgencia */}
			<section className="py-16 sm:py-20 md:py-24 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 relative overflow-hidden">
				<div className="absolute inset-0">
					<div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
					<div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
				</div>
				<div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
					<motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">Comienza a Ahorrar Tiempo Hoy</h2>
						<p className="text-lg sm:text-xl text-teal-50 mb-8 max-w-2xl mx-auto">Únete a más de 500 consultorios que ya están reduciendo 40% el tiempo en cada consulta. Registro gratuito, sin tarjeta de crédito.</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Link href="/register" className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-slate-50 text-teal-600 font-bold rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-base sm:text-lg">
								<Rocket className="w-5 h-5" />
								Comenzar Gratis Ahora
								<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
							</Link>
							<Link href="/login" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-semibold rounded-2xl border-2 border-white/30 hover:border-white/50 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-base sm:text-lg">
								Iniciar Sesión
							</Link>
						</div>
						<div className="mt-8 flex items-center justify-center gap-6 text-sm text-teal-50">
							<div className="flex items-center gap-2">
								<CheckCircle2 className="w-5 h-5" />
								<span>Sin tarjeta de crédito</span>
							</div>
							<div className="flex items-center gap-2">
								<CheckCircle2 className="w-5 h-5" />
								<span>Configuración en minutos</span>
							</div>
							<div className="flex items-center gap-2">
								<CheckCircle2 className="w-5 h-5" />
								<span>Soporte incluido</span>
							</div>
						</div>
					</motion.div>
				</div>
			</section>
		</div>
	);
}
