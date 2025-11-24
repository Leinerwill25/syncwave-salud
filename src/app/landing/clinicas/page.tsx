'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
	Building2,
	Users,
	Calendar,
	FileText,
	Shield,
	BarChart3,
	CheckCircle2,
	ArrowRight,
	Star,
	Zap,
	Clock,
	TrendingUp,
} from 'lucide-react';

export default function ClinicasLandingPage() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
			{/* Hero Section */}
			<section className="relative overflow-hidden pt-24 pb-16 sm:pt-32 sm:pb-20 md:pt-40 md:pb-28">
				<div className="absolute inset-0 overflow-hidden pointer-events-none">
					<div className="absolute top-20 right-10 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
					<div className="absolute bottom-20 left-10 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-pulse delay-1000" />
				</div>

				<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
						<motion.div
							initial={{ opacity: 0, x: -30 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.6 }}
							className="text-center lg:text-left"
						>
							<div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full mb-6">
								<Building2 className="w-5 h-5 text-blue-600" />
								<span className="text-sm font-semibold text-blue-600">Para Clínicas</span>
							</div>
							<h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 mb-6 leading-tight">
								<span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
									Gestión Integral
								</span>
								<br />
								<span className="text-slate-800">para tu Clínica</span>
							</h1>
							<p className="text-lg sm:text-xl md:text-2xl text-slate-600 mb-8 leading-relaxed">
								Administra múltiples especialistas, recursos y servicios desde una plataforma centralizada. 
								Optimiza la operación de tu clínica con herramientas profesionales diseñadas para el sector salud.
							</p>
							<div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
								<Link
									href="/register"
									className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-base sm:text-lg"
								>
									Comenzar Ahora
									<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
								</Link>
								<Link
									href="/login"
									className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-2xl border-2 border-slate-200 hover:border-blue-300 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 text-base sm:text-lg"
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
							<div className="relative bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 rounded-3xl p-12 backdrop-blur-sm border border-white/20">
								<div className="grid grid-cols-2 gap-6">
									{[Building2, Users, Calendar, FileText].map((Icon, index) => (
										<motion.div
											key={index}
											initial={{ opacity: 0, scale: 0.8 }}
											animate={{ opacity: 1, scale: 1 }}
											transition={{ delay: 0.4 + index * 0.1 }}
											whileHover={{ scale: 1.1, rotate: 5 }}
											className="bg-white rounded-2xl p-6 shadow-lg flex items-center justify-center"
										>
											<Icon className="w-12 h-12 text-blue-600" />
										</motion.div>
									))}
								</div>
								<motion.div
									animate={{ rotate: [0, 360] }}
									transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
									className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl"
								>
									<Building2 className="w-12 h-12 text-white" />
								</motion.div>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* Features Section */}
			<section className="py-16 sm:py-20 md:py-24 bg-white/80 backdrop-blur-sm">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
						className="text-center mb-12 sm:mb-16"
					>
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
							Características para Clínicas
						</h2>
						<p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
							Herramientas diseñadas específicamente para la gestión de clínicas médicas
						</p>
					</motion.div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
						{[
							{
								icon: Users,
								title: 'Gestión de Especialistas',
								description: 'Administra múltiples médicos y especialistas desde un panel centralizado.',
								gradient: 'from-blue-500 to-indigo-500',
							},
							{
								icon: Calendar,
								title: 'Agenda Centralizada',
								description: 'Coordina citas de todos los especialistas en un solo sistema.',
								gradient: 'from-indigo-500 to-purple-500',
							},
							{
								icon: BarChart3,
								title: 'Reportes y Analytics',
								description: 'Analiza el rendimiento de tu clínica con reportes detallados.',
								gradient: 'from-purple-500 to-pink-500',
							},
							{
								icon: FileText,
								title: 'Historiales Unificados',
								description: 'Accede al historial completo de pacientes desde cualquier especialista.',
								gradient: 'from-blue-500 to-cyan-500',
							},
							{
								icon: Shield,
								title: 'Seguridad Avanzada',
								description: 'Protección de datos con los más altos estándares de seguridad.',
								gradient: 'from-indigo-500 to-blue-500',
							},
							{
								icon: Zap,
								title: 'Integración Total',
								description: 'Conecta con farmacias y laboratorios para un flujo completo.',
								gradient: 'from-purple-500 to-indigo-500',
							},
						].map((feature, index) => (
							<motion.div
								key={feature.title}
								initial={{ opacity: 0, scale: 0.9 }}
								whileInView={{ opacity: 1, scale: 1 }}
								viewport={{ once: true }}
								transition={{ duration: 0.5, delay: index * 0.1 }}
								whileHover={{ scale: 1.05, y: -5 }}
								className="group relative bg-white rounded-2xl p-6 shadow-md hover:shadow-xl border border-slate-100 transition-all duration-300 overflow-hidden"
							>
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

			{/* Benefits Section */}
			<section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16 items-center">
						<motion.div
							initial={{ opacity: 0, x: -30 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.6 }}
						>
							<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-6">
								Optimiza tu Clínica con Tecnología
							</h2>
							<p className="text-lg sm:text-xl text-slate-600 mb-8 leading-relaxed">
								Syncwave Salud ofrece herramientas especializadas para clínicas que buscan modernizar 
								sus operaciones y mejorar la atención a sus pacientes.
							</p>
							<div className="space-y-4">
								{[
									'Gestión centralizada de especialistas',
									'Coordinación eficiente de citas',
									'Reportes y análisis de rendimiento',
									'Integración con el ecosistema de salud',
									'Seguridad y cumplimiento normativo',
								].map((benefit, index) => (
									<motion.div
										key={benefit}
										initial={{ opacity: 0, x: -20 }}
										whileInView={{ opacity: 1, x: 0 }}
										viewport={{ once: true }}
										transition={{ duration: 0.5, delay: index * 0.1 }}
										className="flex items-center gap-3 group"
									>
										<div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
											<CheckCircle2 className="w-5 h-5 text-white" />
										</div>
										<span className="text-base sm:text-lg text-slate-700 font-medium">{benefit}</span>
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
							<div className="relative bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-3xl p-8 sm:p-12 shadow-2xl overflow-hidden">
								<div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
								<div className="relative z-10 space-y-6">
									<div className="flex items-center gap-4">
										<div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
											<TrendingUp className="w-8 h-8 text-white" />
										</div>
										<div>
											<h3 className="text-2xl sm:text-3xl font-bold text-white mb-1">Eficiencia Mejorada</h3>
											<p className="text-blue-50">Resultados medibles</p>
										</div>
									</div>
									<div className="grid grid-cols-2 gap-4">
										<div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30">
											<div className="text-3xl sm:text-4xl font-bold text-white mb-1">+50%</div>
											<div className="text-sm text-blue-50">Eficiencia</div>
										</div>
										<div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30">
											<div className="text-3xl sm:text-4xl font-bold text-white mb-1">-30%</div>
											<div className="text-sm text-blue-50">Tiempo Admin</div>
										</div>
									</div>
								</div>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-16 sm:py-20 md:py-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
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
							Transforma tu Clínica Hoy
						</h2>
						<p className="text-lg sm:text-xl text-blue-50 mb-8 max-w-2xl mx-auto">
							Únete a las clínicas que ya están modernizando su gestión con Syncwave Salud
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Link
								href="/register"
								className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-slate-50 text-blue-600 font-semibold rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-base sm:text-lg"
							>
								Registrar Clínica
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

