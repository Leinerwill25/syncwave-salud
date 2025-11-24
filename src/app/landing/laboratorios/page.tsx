'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
	FlaskConical,
	FileText,
	Microscope,
	Shield,
	Zap,
	CheckCircle2,
	ArrowRight,
	TrendingUp,
	Clock,
	Activity,
} from 'lucide-react';

export default function LaboratoriosLandingPage() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-amber-50">
			{/* Hero Section */}
			<section className="relative overflow-hidden pt-24 pb-16 sm:pt-32 sm:pb-20 md:pt-40 md:pb-28">
				<div className="absolute inset-0 overflow-hidden pointer-events-none">
					<div className="absolute top-20 right-10 w-96 h-96 bg-orange-400/20 rounded-full blur-3xl animate-pulse" />
					<div className="absolute bottom-20 left-10 w-96 h-96 bg-red-400/20 rounded-full blur-3xl animate-pulse delay-1000" />
				</div>

				<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
						<motion.div
							initial={{ opacity: 0, x: -30 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.6 }}
							className="text-center lg:text-left"
						>
							<div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 rounded-full mb-6">
								<FlaskConical className="w-5 h-5 text-orange-600" />
								<span className="text-sm font-semibold text-orange-600">Para Laboratorios</span>
							</div>
							<h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 mb-6 leading-tight">
								<span className="bg-gradient-to-r from-orange-600 via-red-600 to-amber-600 bg-clip-text text-transparent">
									Gestión Digital
								</span>
								<br />
								<span className="text-slate-800">de Resultados</span>
							</h1>
							<p className="text-lg sm:text-xl md:text-2xl text-slate-600 mb-8 leading-relaxed">
								Gestiona órdenes médicas, procesa análisis y entrega resultados de manera digital y segura. 
								Agiliza todo el proceso de diagnóstico con tecnología avanzada.
							</p>
							<div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
								<Link
									href="/register"
									className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-base sm:text-lg"
								>
									Comenzar Ahora
									<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
								</Link>
								<Link
									href="/login"
									className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-2xl border-2 border-slate-200 hover:border-orange-300 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 text-base sm:text-lg"
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
							<div className="relative bg-gradient-to-br from-orange-500/10 via-red-500/10 to-amber-500/10 rounded-3xl p-12 backdrop-blur-sm border border-white/20">
								<div className="grid grid-cols-2 gap-6">
									{[FlaskConical, Microscope, FileText, Activity].map((Icon, index) => (
										<motion.div
											key={index}
											initial={{ opacity: 0, scale: 0.8 }}
											animate={{ opacity: 1, scale: 1 }}
											transition={{ delay: 0.4 + index * 0.1 }}
											whileHover={{ scale: 1.1, rotate: 5 }}
											className="bg-white rounded-2xl p-6 shadow-lg flex items-center justify-center"
										>
											<Icon className="w-12 h-12 text-orange-600" />
										</motion.div>
									))}
								</div>
								<motion.div
									animate={{ rotate: [0, 360] }}
									transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
									className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center shadow-2xl"
								>
									<FlaskConical className="w-12 h-12 text-white" />
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
							Características para Laboratorios
						</h2>
						<p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
							Herramientas especializadas para la gestión eficiente de análisis clínicos
						</p>
					</motion.div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
						{[
							{
								icon: FileText,
								title: 'Órdenes Médicas',
								description: 'Recibe y gestiona órdenes médicas de forma digital y segura.',
								gradient: 'from-orange-500 to-red-500',
							},
							{
								icon: Microscope,
								title: 'Procesamiento de Análisis',
								description: 'Gestiona el procesamiento de análisis con herramientas especializadas.',
								gradient: 'from-red-500 to-amber-500',
							},
							{
								icon: Activity,
								title: 'Resultados Digitales',
								description: 'Entrega resultados de forma inmediata y segura a médicos y pacientes.',
								gradient: 'from-amber-500 to-orange-500',
							},
							{
								icon: Shield,
								title: 'Seguridad de Datos',
								description: 'Protección avanzada de resultados y datos sensibles de pacientes.',
								gradient: 'from-orange-500 to-red-600',
							},
							{
								icon: Zap,
								title: 'Entrega Inmediata',
								description: 'Notificaciones automáticas cuando los resultados están listos.',
								gradient: 'from-red-500 to-orange-500',
							},
							{
								icon: Clock,
								title: 'Trazabilidad Completa',
								description: 'Rastrea cada orden desde la recepción hasta la entrega de resultados.',
								gradient: 'from-amber-500 to-red-500',
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
			<section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-orange-50 via-red-50 to-amber-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16 items-center">
						<motion.div
							initial={{ opacity: 0, x: -30 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.6 }}
						>
							<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-6">
								Optimiza tu Laboratorio
							</h2>
							<p className="text-lg sm:text-xl text-slate-600 mb-8 leading-relaxed">
								Digitaliza todos los procesos de tu laboratorio y mejora la eficiencia en la entrega de resultados.
							</p>
							<div className="space-y-4">
								{[
									'Gestión digital de órdenes médicas',
									'Procesamiento eficiente de análisis',
									'Entrega inmediata de resultados',
									'Trazabilidad completa del proceso',
									'Integración con médicos y pacientes',
								].map((benefit, index) => (
									<motion.div
										key={benefit}
										initial={{ opacity: 0, x: -20 }}
										whileInView={{ opacity: 1, x: 0 }}
										viewport={{ once: true }}
										transition={{ duration: 0.5, delay: index * 0.1 }}
										className="flex items-center gap-3 group"
									>
										<div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
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
							<div className="relative bg-gradient-to-br from-orange-500 via-red-500 to-amber-500 rounded-3xl p-8 sm:p-12 shadow-2xl overflow-hidden">
								<div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
								<div className="relative z-10 space-y-6">
									<div className="flex items-center gap-4">
										<div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
											<TrendingUp className="w-8 h-8 text-white" />
										</div>
										<div>
											<h3 className="text-2xl sm:text-3xl font-bold text-white mb-1">Velocidad</h3>
											<p className="text-orange-50">Resultados más rápidos</p>
										</div>
									</div>
									<div className="grid grid-cols-2 gap-4">
										<div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30">
											<div className="text-3xl sm:text-4xl font-bold text-white mb-1">-50%</div>
											<div className="text-sm text-orange-50">Tiempo Entrega</div>
										</div>
										<div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30">
											<div className="text-3xl sm:text-4xl font-bold text-white mb-1">+40%</div>
											<div className="text-sm text-orange-50">Eficiencia</div>
										</div>
									</div>
								</div>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-16 sm:py-20 md:py-24 bg-gradient-to-r from-orange-600 via-red-600 to-amber-600 relative overflow-hidden">
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
							Digitaliza tu Laboratorio
						</h2>
						<p className="text-lg sm:text-xl text-orange-50 mb-8 max-w-2xl mx-auto">
							Únete a los laboratorios que están transformando la entrega de resultados
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Link
								href="/register"
								className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-slate-50 text-orange-600 font-semibold rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-base sm:text-lg"
							>
								Registrar Laboratorio
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

