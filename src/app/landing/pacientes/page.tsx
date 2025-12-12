'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
	Users,
	FileText,
	Clock,
	Activity,
	Shield,
	Zap,
	CheckCircle2,
	ArrowRight,
	HeartPulse,
	Calendar,
	Pill,
	FlaskConical,
	MessageCircle,
	TrendingUp,
	Star,
} from 'lucide-react';

export default function PacientesLandingPage() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
			{/* Hero Section */}
			<section className="relative overflow-hidden pt-24 pb-16 sm:pt-32 sm:pb-20 md:pt-40 md:pb-28">
				<div className="absolute inset-0 overflow-hidden pointer-events-none">
					<div className="absolute top-20 right-10 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-pulse" />
					<div className="absolute bottom-20 left-10 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse delay-1000" />
				</div>

				<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
						<motion.div
							initial={{ opacity: 0, x: -30 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.6 }}
							className="text-center lg:text-left"
						>
							<div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 rounded-full mb-6">
								<HeartPulse className="w-5 h-5 text-indigo-600" />
								<span className="text-sm font-semibold text-indigo-600">Para Pacientes</span>
							</div>
							<h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 mb-6 leading-tight">
								<span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
									Tu Salud
								</span>
								<br />
								<span className="text-slate-800">en un Solo Lugar</span>
							</h1>
							<p className="text-lg sm:text-xl md:text-2xl text-slate-600 mb-8 leading-relaxed">
								Accede a profesionales de la salud, gestiona tu historial médico completo, agenda citas 
								y recibe resultados de forma rápida y segura. Todo desde una plataforma única.
							</p>
							<div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
								<Link
									href="/register"
									className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-base sm:text-lg"
								>
									Crear Cuenta Gratis
									<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
								</Link>
								<Link
									href="/login"
									className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-2xl border-2 border-slate-200 hover:border-indigo-300 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 text-base sm:text-lg"
								>
									Iniciar Sesión
								</Link>
							</div>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, x: 30 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.6, delay: 0.2 }}
							className="relative"
						>
							<div className="relative bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl p-12 backdrop-blur-sm border border-white/20">
								<div className="grid grid-cols-2 gap-6">
									{[Users, Calendar, FileText, Activity].map((Icon, index) => (
										<motion.div
											key={index}
											initial={{ opacity: 0, scale: 0.8 }}
											animate={{ opacity: 1, scale: 1 }}
											transition={{ delay: 0.4 + index * 0.1 }}
											whileHover={{ scale: 1.1, rotate: 5 }}
											className="bg-white rounded-2xl p-6 shadow-lg flex items-center justify-center"
										>
											<Icon className="w-12 h-12 text-indigo-600" />
										</motion.div>
									))}
								</div>
								<motion.div
									animate={{ rotate: [0, 360] }}
									transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
									className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center shadow-2xl"
								>
									<HeartPulse className="w-12 h-12 text-white" />
								</motion.div>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* Benefits Section */}
			<section className="py-16 sm:py-20 md:py-24 bg-white/80 backdrop-blur-sm">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
						className="text-center mb-12 sm:mb-16"
					>
						<div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full mb-4">
							<Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
							<span className="text-sm font-semibold text-indigo-600">Beneficios Exclusivos</span>
						</div>
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
							Todo lo que Necesitas para tu Salud
						</h2>
						<p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
							Descubre todos los beneficios que KAVIRA ofrece a los pacientes
						</p>
					</motion.div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
						{[
							{
								icon: Users,
								title: 'Acceso a Profesionales',
								description: 'Conecta con médicos y especialistas de confianza en toda Venezuela.',
								gradient: 'from-indigo-500 to-purple-500',
							},
							{
								icon: FileText,
								title: 'Historial Médico Completo',
								description: 'Tu historial médico completo, seguro y accesible desde cualquier lugar.',
								gradient: 'from-purple-500 to-pink-500',
							},
							{
								icon: Calendar,
								title: 'Citas Online',
								description: 'Agenda citas con diferentes especialistas de forma rápida y sencilla.',
								gradient: 'from-pink-500 to-rose-500',
							},
							{
								icon: FlaskConical,
								title: 'Resultados de Laboratorio',
								description: 'Accede a tus resultados de análisis de forma inmediata y segura.',
								gradient: 'from-indigo-500 to-blue-500',
							},
							{
								icon: Pill,
								title: 'Recetas Digitales',
								description: 'Recibe y gestiona tus recetas médicas de forma digital.',
								gradient: 'from-purple-500 to-indigo-500',
							},
							{
								icon: Activity,
								title: 'Monitoreo de Salud',
								description: 'Sigue tus indicadores de salud y recibe alertas importantes.',
								gradient: 'from-pink-500 to-purple-500',
							},
							{
								icon: MessageCircle,
								title: 'Comunicación Directa',
								description: 'Mantén comunicación directa con tus médicos cuando lo necesites.',
								gradient: 'from-indigo-500 to-pink-500',
							},
							{
								icon: Shield,
								title: 'Privacidad Garantizada',
								description: 'Tus datos médicos protegidos con los más altos estándares de seguridad.',
								gradient: 'from-purple-500 to-pink-500',
							},
							{
								icon: Zap,
								title: 'Acceso 24/7',
								description: 'Accede a tu información médica en cualquier momento y desde cualquier lugar.',
								gradient: 'from-pink-500 to-indigo-500',
							},
						].map((benefit, index) => (
							<motion.div
								key={benefit.title}
								initial={{ opacity: 0, scale: 0.9 }}
								whileInView={{ opacity: 1, scale: 1 }}
								viewport={{ once: true }}
								transition={{ duration: 0.5, delay: index * 0.1 }}
								whileHover={{ scale: 1.05, y: -5 }}
								className="group relative bg-white rounded-2xl p-6 shadow-md hover:shadow-xl border border-slate-100 transition-all duration-300 overflow-hidden"
							>
								<div className={`absolute inset-0 bg-gradient-to-br ${benefit.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`} />
								<div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${benefit.gradient} shadow-md mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
									<benefit.icon className="w-7 h-7 text-white" />
								</div>
								<h3 className="text-xl font-bold text-slate-900 mb-2">{benefit.title}</h3>
								<p className="text-sm sm:text-base text-slate-600 leading-relaxed">{benefit.description}</p>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* Why Choose Section */}
			<section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16 items-center">
						<motion.div
							initial={{ opacity: 0, x: -30 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.6 }}
						>
							<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-6">
								¿Por qué Elegir KAVIRA?
							</h2>
							<p className="text-lg sm:text-xl text-slate-600 mb-8 leading-relaxed">
								Somos la plataforma más completa para gestionar tu salud en Venezuela. 
								Conectamos todo el ecosistema de salud para brindarte la mejor experiencia.
							</p>
							<div className="space-y-4">
								{[
									'Acceso gratuito para pacientes',
									'Historial médico unificado',
									'Coordinación entre especialistas',
									'Resultados y recetas digitales',
									'Seguridad y privacidad garantizadas',
								].map((reason, index) => (
									<motion.div
										key={reason}
										initial={{ opacity: 0, x: -20 }}
										whileInView={{ opacity: 1, x: 0 }}
										viewport={{ once: true }}
										transition={{ duration: 0.5, delay: index * 0.1 }}
										className="flex items-center gap-3 group"
									>
										<div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
											<CheckCircle2 className="w-5 h-5 text-white" />
										</div>
										<span className="text-base sm:text-lg text-slate-700 font-medium">{reason}</span>
									</motion.div>
								))}
							</div>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, x: 30 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.6 }}
							className="relative"
						>
							<div className="relative bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-8 sm:p-12 shadow-2xl overflow-hidden">
								<div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
								<div className="relative z-10 space-y-6">
									<div className="flex items-center gap-4">
										<div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
											<HeartPulse className="w-8 h-8 text-white" />
										</div>
										<div>
											<h3 className="text-2xl sm:text-3xl font-bold text-white mb-1">100% Gratis</h3>
											<p className="text-indigo-50">Para pacientes</p>
										</div>
									</div>
									<div className="grid grid-cols-2 gap-4">
										<div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30">
											<div className="text-3xl sm:text-4xl font-bold text-white mb-1">24/7</div>
											<div className="text-sm text-indigo-50">Disponible</div>
										</div>
										<div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30">
											<div className="text-3xl sm:text-4xl font-bold text-white mb-1">100%</div>
											<div className="text-sm text-indigo-50">Seguro</div>
										</div>
									</div>
									<div className="flex items-center gap-2 text-white">
										<TrendingUp className="w-5 h-5" />
										<span className="text-sm sm:text-base">Crecimiento continuo del ecosistema</span>
									</div>
								</div>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-16 sm:py-20 md:py-24 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 relative overflow-hidden">
				<div className="absolute inset-0">
					<div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
					<div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
				</div>
				<div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
					>
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
							Comienza a Gestionar tu Salud Hoy
						</h2>
						<p className="text-lg sm:text-xl text-indigo-50 mb-8 max-w-2xl mx-auto">
							Regístrate gratis y comienza a disfrutar de todos los beneficios de KAVIRA
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Link
								href="/register"
								className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-slate-50 text-indigo-600 font-semibold rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-base sm:text-lg"
							>
								Crear Cuenta Gratis
								<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
							</Link>
							<Link
								href="/login"
								className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-semibold rounded-2xl border-2 border-white/30 hover:border-white/50 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-base sm:text-lg"
							>
								Iniciar Sesión
							</Link>
						</div>
					</motion.div>
				</div>
			</section>
		</div>
	);
}

