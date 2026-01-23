'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { HeartPulse, Stethoscope, Pill, FlaskConical, Building2, Users, Shield, Zap, Clock, FileText, CheckCircle2, ArrowRight, Activity, Globe, TrendingUp, Sparkles, Star, BarChart3, Smartphone, Cloud, Lock, Database, Network, Target, Award, BadgeCheck, UserCircle } from 'lucide-react';

export default function HomePage() {
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: 0.1,
			},
		},
	};

	const itemVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: {
				duration: 0.6,
				ease: [0.4, 0, 0.2, 1] as const, // easeOut curve
			},
		},
	};

	// JSON-LD para SEO
	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: 'ASHIRA',
		applicationCategory: 'HealthApplication',
		operatingSystem: 'Web',
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'EUR',
		},
		description: 'Plataforma integral de salud digital que conecta consultorios privados, clínicas, farmacias y laboratorios en Venezuela.',
		aggregateRating: {
			'@type': 'AggregateRating',
			ratingValue: '4.8',
			ratingCount: '150',
		},
	};

	return (
		<div className="min-h-screen overflow-x-hidden w-full max-w-full" style={{ background: 'linear-gradient(to bottom right, #f8fafc, #eff6ff, #f0fdfa)' }}>
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
			{/* Hero Section */}
			<section className="relative overflow-hidden pt-20 pb-16 sm:pt-24 sm:pb-20 md:pt-32 md:pb-28">
				{/* Animated Background Elements */}
				<div className="absolute inset-0 overflow-hidden pointer-events-none">
					<div className="absolute top-20 left-10 w-72 h-72 bg-teal-400/20 rounded-full blur-3xl animate-pulse" />
					<div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl animate-pulse delay-1000" />
					<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-3xl" />
					{/* Grid Pattern */}
					<div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
				</div>

				<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
						{/* Left: Content */}
						<motion.div variants={containerVariants} initial="hidden" animate="visible" className="text-center lg:text-left">
							<motion.div variants={itemVariants} className="mb-6 flex justify-center lg:justify-start">
								<div className="relative inline-flex items-center justify-center">
									<div className="absolute inset-0 rounded-3xl blur-xl opacity-50 animate-pulse" style={{ background: 'linear-gradient(to right, #0d9488, #06b6d4)' }} />
									<div className="relative inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-3xl shadow-2xl" style={{ background: 'linear-gradient(to bottom right, #0d9488, #06b6d4, #2563eb)' }}>
										<HeartPulse className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
									</div>
								</div>
							</motion.div>

							<motion.h1 variants={itemVariants} className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight" style={{ color: '#0f172a' }}>
								<span style={{ background: 'linear-gradient(to right, #0d9488, #06b6d4, #2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>ASHIRA</span>
								<br />
								<span style={{ color: '#1e293b' }}>Plataforma Integral de Salud Digital para Venezuela</span>
							</motion.h1>

							<motion.p variants={itemVariants} className="text-lg sm:text-xl md:text-2xl text-slate-600 mb-8 leading-relaxed">
								La plataforma tecnológica líder que conecta consultorios privados, clínicas, farmacias y laboratorios en un ecosistema unificado. Gestión integral de pacientes, historial médico digital, citas online y recetas electrónicas para transformar la atención médica en Venezuela.
							</motion.p>

							<motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
								<Link href="/register" className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-base sm:text-lg" style={{ background: 'linear-gradient(to right, #0d9488, #06b6d4)' }}>
									Comenzar Ahora
									<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
								</Link>
								<Link href="/login" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white rounded-2xl border-2 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 text-base sm:text-lg" style={{ color: '#334155', borderColor: '#e2e8f0' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#5eead4'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
									Iniciar Sesión
								</Link>
							</motion.div>

							{/* Stats */}
							<motion.div variants={itemVariants} className="mt-12 grid grid-cols-3 gap-6 sm:gap-8">
								{[
									{ value: '100%', label: 'Digital' },
									{ value: '24/7', label: 'Disponible' },
									{ value: '100%', label: 'Seguro' },
								].map((stat, index) => (
									<motion.div key={stat.label} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8 + index * 0.1 }} className="text-center">
										<div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">{stat.value}</div>
										<div className="text-xs sm:text-sm text-slate-600 mt-1">{stat.label}</div>
									</motion.div>
								))}
							</motion.div>
						</motion.div>

						{/* Right: Image/Illustration */}
						<motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="relative hidden lg:block">
							<div className="relative">
								{/* Floating Cards */}
								<motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} className="absolute -top-10 -left-10 bg-white rounded-2xl p-4 shadow-xl border border-slate-200 z-10">
									<div className="flex items-center gap-3">
										<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
											<Users className="w-6 h-6 text-white" />
										</div>
										<div>
											<div className="text-sm font-bold text-slate-900">Pacientes</div>
											<div className="text-xs text-slate-600">Gestionados</div>
										</div>
									</div>
								</motion.div>

								<motion.div animate={{ y: [0, 20, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }} className="absolute -bottom-10 -right-10 bg-white rounded-2xl p-4 shadow-xl border border-slate-200 z-10">
									<div className="flex items-center gap-3">
										<div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #2563eb, #6366f1)' }}>
											<Activity className="w-6 h-6 text-white" />
										</div>
										<div>
											<div className="text-sm font-bold text-slate-900">Monitoreo</div>
											<div className="text-xs text-slate-600">En Tiempo Real</div>
										</div>
									</div>
								</motion.div>

								{/* Main Illustration Container */}
								<div className="relative rounded-3xl p-12 backdrop-blur-sm border border-white/20" style={{ background: 'linear-gradient(to bottom right, rgba(13, 148, 136, 0.1), rgba(6, 182, 212, 0.1), rgba(37, 99, 235, 0.1))' }}>
									<div className="grid grid-cols-2 gap-6">
										{/* Medical Icons Grid */}
										{[Stethoscope, Pill, FlaskConical, Building2].map((Icon, index) => (
											<motion.div key={index} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + index * 0.1 }} whileHover={{ scale: 1.1, rotate: 5 }} className="bg-white rounded-2xl p-6 shadow-lg flex items-center justify-center">
												<Icon className="w-12 h-12" style={{ color: '#0d9488' }} />
											</motion.div>
										))}
									</div>
									{/* Central Icon */}
									<motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full flex items-center justify-center shadow-2xl" style={{ background: 'linear-gradient(to bottom right, #0d9488, #06b6d4)' }}>
										<HeartPulse className="w-12 h-12 text-white" />
									</motion.div>
								</div>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* Services Section */}
			<section className="py-16 sm:py-20 md:py-24 bg-white/80 backdrop-blur-sm relative">
				{/* Decorative Elements */}
				<div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />

				<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-12 sm:mb-16">
						<div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 rounded-full mb-4">
							<Sparkles className="w-4 h-4 text-teal-600" />
							<span className="text-sm font-semibold text-teal-600">Ecosistema Completo</span>
						</div>
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">Solución Integral para el Sector Salud</h2>
						<p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto">ASHIRA conecta todos los actores del sector salud venezolano - consultorios privados, clínicas, farmacias y laboratorios - en una plataforma unificada que optimiza procesos, mejora la coordinación y eleva la calidad de la atención médica.</p>
					</motion.div>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
						{[
							{
								icon: Stethoscope,
								title: 'Consultorios Privados',
								description: 'Gestiona tu consultorio de manera eficiente con herramientas profesionales para médicos independientes.',
								color: 'from-teal-500 to-cyan-500',
								bgColor: 'bg-teal-50',
							},
							{
								icon: Building2,
								title: 'Clínicas',
								description: 'Administra múltiples especialistas, citas y recursos de tu clínica desde una plataforma centralizada.',
								color: 'from-blue-500 to-indigo-500',
								bgColor: 'bg-blue-50',
							},
							{
								icon: Pill,
								title: 'Farmacias',
								description: 'Integra tu farmacia al ecosistema de salud para facilitar la dispensación de medicamentos recetados.',
								color: 'from-purple-500 to-pink-500',
								bgColor: 'bg-purple-50',
							},
							{
								icon: FlaskConical,
								title: 'Laboratorios',
								description: 'Gestiona órdenes médicas, resultados de análisis y reportes de manera digital y segura.',
								color: 'from-orange-500 to-red-500',
								bgColor: 'bg-orange-50',
							},
						].map((service, index) => (
							<motion.div key={service.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: index * 0.1 }} whileHover={{ y: -12, scale: 1.03 }} className="group relative bg-white rounded-3xl p-6 sm:p-8 shadow-lg hover:shadow-2xl border border-slate-100 transition-all duration-300 overflow-hidden">
								{/* Background Gradient on Hover */}
								<div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-5 rounded-3xl transition-opacity duration-300`} />

								{/* Icon Container */}
								<div className="relative mb-6">
									<div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-20 rounded-2xl blur-xl group-hover:opacity-30 transition-opacity`} />
									<div className={`relative inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${service.color} shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
										<service.icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
									</div>
								</div>

								<h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3 relative z-10">{service.title}</h3>
								<p className="text-sm sm:text-base text-slate-600 leading-relaxed relative z-10">{service.description}</p>

								{/* Decorative Corner */}
								<div className={`absolute top-0 right-0 w-32 h-32 ${service.bgColor} rounded-bl-full opacity-50`} />
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* Features Section */}
			<section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 relative overflow-hidden">
				{/* Background Pattern */}
				<div className="absolute inset-0 opacity-30">
					<div className="absolute top-0 left-0 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl" />
					<div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl" />
				</div>

				<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-12 sm:mb-16">
						<div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full mb-4 shadow-sm">
							<Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
							<span className="text-sm font-semibold text-slate-700">Características Destacadas</span>
						</div>
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">Tecnología Avanzada para la Gestión Médica</h2>
						<p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto">ASHIRA ofrece un conjunto completo de herramientas profesionales diseñadas específicamente para las necesidades del sector salud venezolano, facilitando la gestión diaria y mejorando los resultados clínicos.</p>
					</motion.div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
						{[
							{
								icon: Users,
								title: 'Gestión de Pacientes',
								description: 'Historial médico completo, acceso seguro y coordinación entre profesionales de la salud.',
								gradient: 'from-teal-500 to-cyan-500',
							},
							{
								icon: Clock,
								title: 'Agenda Inteligente',
								description: 'Sistema de citas automatizado que optimiza la disponibilidad y reduce tiempos de espera.',
								gradient: 'from-blue-500 to-indigo-500',
							},
							{
								icon: FileText,
								title: 'Historial Digital',
								description: 'Registros médicos electrónicos accesibles, seguros y disponibles 24/7.',
								gradient: 'from-purple-500 to-pink-500',
							},
							{
								icon: Shield,
								title: 'Seguridad y Privacidad',
								description: 'Protección de datos médicos con los más altos estándares de seguridad y cumplimiento.',
								gradient: 'from-emerald-500 to-teal-500',
							},
							{
								icon: Zap,
								title: 'Integración Total',
								description: 'Conecta consultorios, clínicas, farmacias y laboratorios en un solo ecosistema.',
								gradient: 'from-orange-500 to-red-500',
							},
							{
								icon: Activity,
								title: 'Monitoreo en Tiempo Real',
								description: 'Seguimiento de indicadores de salud y alertas automáticas para atención oportuna.',
								gradient: 'from-rose-500 to-pink-500',
							},
						].map((feature, index) => (
							<motion.div key={feature.title} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }} whileHover={{ scale: 1.05, y: -5 }} className="group relative bg-white rounded-2xl p-6 shadow-md hover:shadow-xl border border-slate-100 transition-all duration-300 overflow-hidden">
								{/* Gradient Background on Hover */}
								<div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`} />

								<div className="relative z-10">
									<div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} shadow-md mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
										<feature.icon className="w-7 h-7 text-white" />
									</div>
									<h3 className="text-xl font-bold text-slate-900 mb-2">{feature.title}</h3>
									<p className="text-sm sm:text-base text-slate-600 leading-relaxed">{feature.description}</p>
								</div>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* Benefits Section with Image */}
			<section className="py-16 sm:py-20 md:py-24 bg-white relative overflow-hidden">
				<div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />

				<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16 items-center">
						<motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
							<div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 rounded-full mb-6">
								<CheckCircle2 className="w-4 h-4 text-teal-600" />
								<span className="text-sm font-semibold text-teal-600">Beneficios para Pacientes</span>
							</div>
							<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-6">Experiencia Integral para Pacientes</h2>
							<p className="text-lg sm:text-xl text-slate-600 mb-8 leading-relaxed">ASHIRA transforma la experiencia del paciente en Venezuela, ofreciendo acceso centralizado a su historial médico completo, agendamiento de citas con múltiples especialistas, seguimiento de tratamientos y acceso inmediato a resultados de laboratorio y recetas digitales desde cualquier dispositivo.</p>
							<div className="space-y-4">
								{['Acceso rápido a profesionales de la salud', 'Gestión centralizada de historial médico', 'Coordinación entre diferentes especialistas', 'Resultados de laboratorio y recetas digitales', 'Recordatorios y seguimiento de tratamientos'].map((benefit, index) => (
									<motion.div key={benefit} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }} className="flex items-center gap-3 group">
										<div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
											<CheckCircle2 className="w-5 h-5 text-white" />
										</div>
										<span className="text-base sm:text-lg text-slate-700 font-medium">{benefit}</span>
									</motion.div>
								))}
							</div>
						</motion.div>

						<motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="relative">
							{/* Illustration Container */}
							<div className="relative bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 rounded-3xl p-8 sm:p-12 shadow-2xl overflow-hidden">
								{/* Animated Background */}
								<div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
								<div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
								<div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

								<div className="relative z-10 space-y-6">
									<div className="flex items-center gap-4">
										<div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg">
											<Globe className="w-8 h-8 text-white" />
										</div>
										<div>
											<h3 className="text-2xl sm:text-3xl font-bold text-white mb-1">Ecosistema Unificado</h3>
											<p className="text-teal-50">Todo en un solo lugar</p>
										</div>
									</div>

									{/* Stats Grid */}
									<div className="grid grid-cols-2 gap-4">
										<motion.div whileHover={{ scale: 1.05 }} className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30">
											<div className="text-3xl sm:text-4xl font-bold text-white mb-1">100%</div>
											<div className="text-sm text-teal-50">Digital</div>
										</motion.div>
										<motion.div whileHover={{ scale: 1.05 }} className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30">
											<div className="text-3xl sm:text-4xl font-bold text-white mb-1">24/7</div>
											<div className="text-sm text-teal-50">Disponible</div>
										</motion.div>
									</div>

									{/* Feature Icons */}
									<div className="flex items-center gap-4 pt-4">
										<div className="flex -space-x-2">
											{[Smartphone, Cloud, Lock].map((Icon, i) => (
												<motion.div key={i} initial={{ opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.8 + i * 0.1 }} whileHover={{ scale: 1.2, zIndex: 10 }} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center">
													<Icon className="w-5 h-5 text-white" />
												</motion.div>
											))}
										</div>
										<div className="flex-1">
											<div className="flex items-center gap-2 text-white">
												<TrendingUp className="w-5 h-5" />
												<span className="text-sm sm:text-base">Crecimiento continuo</span>
											</div>
										</div>
									</div>
								</div>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* Dra. Carwin Silva - Embajadora Oficial - Optimizado para SEO */}
			<article itemScope itemType="https://schema.org/Person" className="relative py-20 sm:py-28 md:py-32 bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-600 overflow-hidden">
				{/* Structured Data JSON-LD for SEO */}
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify({
							'@context': 'https://schema.org',
							'@type': 'Person',
							name: 'Dra. Carwin Silva',
							alternateName: ['Doctora Carwin Silva', 'Carwin Silva Ginecóloga', 'Dra. Carwin Silva Ginecóloga'],
							jobTitle: 'Ginecóloga Especialista en Ginecología Regenerativa, Funcional y Estética',
							description: 'Dra. Carwin Silva es ginecóloga especialista en ginecología regenerativa, funcional y estética en Venezuela. Embajadora oficial de ASHIRA, pionera en salud digital y líder en salud femenina. Consulta ginecológica, ginecología estética, medicina funcional.',
							url: 'https://ashira.com',
							image: 'https://ashira.com/consultorios/dracarwin/IMG_5189.JPG',
							sameAs: [
								// Aquí se pueden agregar links a redes sociales cuando estén disponibles
								// 'https://www.instagram.com/dracarwinsilva',
								// 'https://www.facebook.com/dracarwinsilva',
							],
							knowsAbout: ['Ginecología', 'Ginecología Regenerativa', 'Ginecología Funcional', 'Ginecología Estética', 'Salud Femenina', 'Medicina Funcional', 'Salud Digital', 'Telemedicina'],
							alumniOf: {
								'@type': 'EducationalOrganization',
								name: 'Universidad de Medicina',
							},
							hasCredential: {
								'@type': 'EducationalOccupationalCredential',
								credentialCategory: 'Médico Especialista en Ginecología',
							},
							memberOf: {
								'@type': 'Organization',
								name: 'ASHIRA',
								description: 'Plataforma Integral de Salud Digital para Venezuela',
								url: 'https://ashira.com',
							},
							hasOccupation: {
								'@type': 'Occupation',
								occupationLocation: {
									'@type': 'Country',
									name: 'Venezuela',
								},
								occupationalCategory: 'Ginecólogo',
								skills: ['Ginecología Regenerativa', 'Ginecología Funcional', 'Ginecología Estética', 'Salud Femenina Digital'],
							},
						}),
					}}
				/>

				{/* Premium Background Effects */}
				<div className="absolute inset-0">
					<div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-white/15 rounded-full blur-3xl animate-pulse" />
					<div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-300/20 rounded-full blur-3xl" />
					<div className="absolute top-1/2 left-0 w-72 h-72 bg-teal-300/15 rounded-full blur-3xl" />
					<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.2),transparent_60%)]" />
					<div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.05)_100%)]" />
				</div>

				<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					{/* Header Section - Optimizado para SEO */}
					<header className="text-center mb-16 sm:mb-20">
						<motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
							<motion.div initial={{ scale: 0.8, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }} className="inline-flex items-center gap-3 px-6 py-3 bg-white/20 backdrop-blur-xl rounded-full mb-8 shadow-2xl border border-white/30">
								<BadgeCheck className="w-5 h-5 text-white" />
								<span className="text-sm font-bold text-white tracking-wide uppercase">Alianza Estratégica</span>
								<Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
							</motion.div>
							<h1 itemProp="name" className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight">
								<span className="block mb-2">Dra. Carwin Silva</span>
								<span className="block text-teal-100 text-3xl sm:text-4xl md:text-5xl lg:text-6xl">Ginecóloga en Venezuela</span>
								<span className="block text-xl sm:text-2xl md:text-3xl text-teal-100 mt-4 font-normal">Embajadora Oficial de ASHIRA</span>
							</h1>
							<p itemProp="description" className="text-xl sm:text-2xl text-white/90 max-w-4xl mx-auto leading-relaxed font-light mb-4">
								<strong className="font-bold">Doctora Carwin Silva</strong> - Especialista en <strong>Ginecología Regenerativa, Funcional y Estética</strong> en Venezuela. Líder en salud femenina, pionera de la transformación digital médica y embajadora oficial de ASHIRA. Consulta ginecológica de excelencia en salud digital.
							</p>
							<p className="text-lg sm:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
								Ginecóloga especializada en <strong>ginecología estética</strong>, <strong>medicina funcional</strong> y <strong>salud femenina digital</strong>. Primera especialista en adoptar ASHIRA para la gestión de consultorios privados en Venezuela.
							</p>
						</motion.div>
					</header>

					{/* Main Content */}
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
						{/* Left: Premium Profile Section */}
						<motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2 }} className="lg:col-span-5 relative">
							{/* Premium Card with Glassmorphism */}
							<div className="relative bg-white/15 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-2xl border-2 border-white/30 overflow-hidden">
								{/* Shimmer Effect */}
								<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full" style={{ animation: 'shimmer 3s infinite' }} />

								{/* Badge - Premium */}
								<div className="flex justify-center mb-8">
									<div className="relative inline-flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 rounded-full shadow-2xl transform hover:scale-105 transition-transform">
										<div className="absolute inset-0 bg-white/30 rounded-full blur-xl" />
										<Award className="w-5 h-5 text-white relative z-10" />
										<span className="text-sm font-bold text-white relative z-10 tracking-wide">Pionera de ASHIRA</span>
										<div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-300 rounded-full animate-ping" />
									</div>
								</div>

								{/* Premium Image Frame - Optimizado para SEO */}
								<div className="flex justify-center mb-8">
									<div className="relative group">
										{/* Outer Glow */}
										<div className="absolute -inset-4 bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-400 rounded-full opacity-75 blur-2xl group-hover:opacity-100 transition-opacity duration-500 animate-pulse" />
										{/* Middle Glow */}
										<div className="absolute -inset-2 bg-gradient-to-br from-white/40 to-transparent rounded-3xl blur-xl" />
										{/* Image Container */}
										<div itemProp="image" className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden border-4 border-white/40 shadow-2xl transform group-hover:scale-105 transition-transform duration-500">
											<Image src="/consultorios/dracarwin/IMG_5189.JPG" alt="Dra. Carwin Silva - Ginecóloga Especialista en Ginecología Regenerativa, Funcional y Estética en Venezuela | Embajadora Oficial ASHIRA" title="Doctora Carwin Silva - Ginecóloga en Venezuela | ASHIRA" width={288} height={288} className="w-full h-full object-cover" priority itemProp="image" />
											{/* Overlay Gradient */}
											<div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
										</div>
										{/* Decorative Corner Accents */}
										<div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-yellow-300 rounded-tl-lg" />
										<div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-cyan-300 rounded-br-lg" />
									</div>
								</div>

								{/* Name & Title - Centered & Elegant - Optimizado para SEO */}
								<div className="text-center mb-8">
									<h2 itemProp="name" className="text-4xl sm:text-5xl font-extrabold text-white mb-3 tracking-tight">
										Dra. Carwin Silva
									</h2>
									<div itemProp="jobTitle" className="inline-block px-5 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-4 border border-white/30">
										<p className="text-lg sm:text-xl text-white font-semibold">Ginecóloga Especialista</p>
										<p className="text-base text-teal-100 font-medium">Ginecología Regenerativa • Ginecología Funcional • Ginecología Estética</p>
									</div>
									<div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-white/25 to-white/15 backdrop-blur-md rounded-full border border-white/40 shadow-lg">
										<UserCircle className="w-5 h-5 text-white" />
										<span className="text-sm font-bold text-white uppercase tracking-wider">Embajadora Oficial ASHIRA</span>
									</div>
									<p className="mt-4 text-base text-white/90 max-w-md mx-auto">
										Consulta ginecológica especializada en <strong>Venezuela</strong>. Ginecóloga experta en salud femenina, medicina funcional y salud digital.
									</p>
								</div>

								{/* Achievements - Refined - Optimizado para SEO */}
								<div className="space-y-4 pt-6 border-t border-white/20">
									{[
										{
											icon: CheckCircle2,
											text: 'Primera ginecóloga en adoptar ASHIRA para gestión de consultorios privados en Venezuela',
											highlight: true,
										},
										{
											icon: TrendingUp,
											text: 'Alta reputación como ginecóloga especialista en ginecología regenerativa, funcional y estética en Venezuela',
										},
										{
											icon: Users,
											text: 'Comunidad sólida y activa - Ginecóloga reconocida en redes sociales y plataformas digitales',
										},
										{
											icon: Sparkles,
											text: 'Contribuye activamente con mejoras a los módulos de salud femenina y ginecología digital en ASHIRA',
										},
									].map((achievement, index) => (
										<motion.div key={index} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }} className={`flex items-start gap-4 p-3 rounded-xl transition-all duration-300 ${achievement.highlight ? 'bg-white/10 backdrop-blur-sm border border-white/20' : 'hover:bg-white/5'}`}>
											<div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${achievement.highlight ? 'bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg' : 'bg-white/20 backdrop-blur-sm'}`}>
												<achievement.icon className="w-5 h-5 text-white" />
											</div>
											<span className="text-base sm:text-lg text-white leading-relaxed font-medium pt-0.5">{achievement.text}</span>
										</motion.div>
									))}
								</div>

								{/* Keywords adicionales para SEO - Oculto visualmente pero presente para motores de búsqueda */}
								<div className="sr-only">
									<p>
										<strong>Búsquedas relacionadas:</strong> Ginecólogo en Venezuela, Ginecología Caracas, Doctora Ginecóloga, Consulta Ginecológica, Ginecología Estética Venezuela, Salud Femenina Digital, Medicina Funcional Ginecología
									</p>
								</div>
							</div>
						</motion.div>

						{/* Right: Partnership Content - Enhanced */}
						<motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.4 }} className="lg:col-span-7 space-y-8">
							{/* Main Partnership Card */}
							<div className="relative bg-white/15 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 lg:p-12 shadow-2xl border-2 border-white/30 overflow-hidden">
								{/* Header */}
								<div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/20">
									<div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-xl">
										<Sparkles className="w-8 h-8 text-white" />
									</div>
									<div>
										<h3 className="text-3xl sm:text-4xl font-extrabold text-white mb-1">Alianza Estratégica</h3>
										<p className="text-teal-100 font-medium">ASHIRA × Dra. Carwin Silva</p>
									</div>
								</div>

								{/* Description - Optimizado para SEO */}
								<div className="mb-10 space-y-4">
									<p className="text-lg sm:text-xl text-white/95 leading-relaxed font-light">
										La <strong className="font-bold text-white">Dra. Carwin Silva</strong>, <strong>ginecóloga especialista en Venezuela</strong>, es nuestra Embajadora Oficial para Consultorios Privados, liderando la transformación digital de la salud privada. Su expertise excepcional en <strong>ginecología regenerativa, ginecología funcional y ginecología estética</strong> la posiciona como una de las principales referentes en <strong>salud femenina</strong> y <strong>medicina funcional</strong> en Venezuela.
									</p>
									<p className="text-base sm:text-lg text-white/90 leading-relaxed">
										Como <strong>doctora ginecóloga</strong> pionera en la adopción de tecnología digital, la <strong>Dra. Carwin Silva</strong> utiliza ASHIRA para ofrecer consultas ginecológicas de excelencia, gestionar su consultorio privado y proporcionar atención médica especializada en <strong>ginecología</strong>. Su compromiso con la innovación médica fortalece nuestra misión de modernizar la atención en salud femenina en todo el país.
									</p>
									<p className="text-base text-white/85 leading-relaxed">
										Si buscas una <strong>ginecóloga en Venezuela</strong>, una <strong>consulta ginecológica especializada</strong> o información sobre <strong>ginecología estética, ginecología regenerativa o ginecología funcional</strong>, la <strong>Dra. Carwin Silva</strong> es tu especialista de confianza. Primera en adoptar ASHIRA para la gestión digital de consultorios médicos.
									</p>
								</div>

								{/* Enhanced Benefits Grid */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
									{[
										{
											icon: HeartPulse,
											title: 'Advisor en Salud Femenina Digital',
											description: 'Participación activa en desarrollo de módulos especializados',
											gradient: 'from-rose-400 to-pink-500',
										},
										{
											icon: TrendingUp,
											title: 'Líder Médico Digital Nacional',
											description: 'Reconocimiento como pionera de la salud digital',
											gradient: 'from-blue-400 to-cyan-500',
										},
									].map((benefit, index) => (
										<motion.div key={index} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }} whileHover={{ scale: 1.03, y: -4 }} className="group relative bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:border-white/40 hover:bg-white/15 transition-all duration-300 overflow-hidden">
											{/* Gradient Background on Hover */}
											<div className={`absolute inset-0 bg-gradient-to-br ${benefit.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
											<div className="relative z-10">
												<div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${benefit.gradient} shadow-lg mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
													<benefit.icon className="w-6 h-6 text-white" />
												</div>
												<h4 className="text-base sm:text-lg font-bold text-white mb-2">{benefit.title}</h4>
												<p className="text-sm text-white/80 leading-relaxed">{benefit.description}</p>
											</div>
										</motion.div>
									))}
								</div>

								{/* Impact Statement */}
								<div className="relative bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/30 overflow-hidden">
									<div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
									<div className="relative z-10">
										<div className="flex items-center gap-3 mb-4">
											<Target className="w-6 h-6 text-yellow-300" />
											<h4 className="text-xl sm:text-2xl font-bold text-white">Impacto de la Alianza</h4>
										</div>
										<p className="text-base sm:text-lg text-white/95 leading-relaxed mb-6">Esta colaboración estratégica impulsa la modernización de la salud privada en Venezuela, estableciendo nuevos estándares de excelencia médica a través de la integración de tecnología de vanguardia con expertise clínico de clase mundial.</p>
										<div className="flex flex-wrap gap-3">
											{['Pionera Digital', 'Líder en Salud Femenina', 'Innovación Médica', 'Transformación Digital'].map((tag, idx) => (
												<span key={idx} className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold text-white border border-white/30">
													{tag}
												</span>
											))}
										</div>
									</div>
								</div>
							</div>
						</motion.div>
					</div>

					{/* Keywords ocultas solo para SEO */}
					<div className="sr-only">
						<p>
							<strong>Palabras clave relacionadas:</strong> Ginecólogo Venezuela, Ginecóloga Caracas, Doctora Carwin Silva, Consulta Ginecológica, Ginecología Estética, Ginecología Regenerativa, Ginecología Funcional, Salud Femenina, Medicina Funcional Ginecología, Ginecólogo Especialista Venezuela, Ginecología Digital, Telemedicina Ginecología
						</p>
					</div>
				</div>
			</article>

			{/* Ecosistema y Automatización */}
			<section className="py-16 sm:py-20 md:py-24 bg-slate-900 text-white relative overflow-hidden">
				<div className="absolute inset-0">
					<div className="absolute top-0 left-0 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl" />
					<div className="absolute bottom-0 right-0 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl" />
				</div>
				<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-12">
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">Ecosistema Completo de Salud Digital</h2>
						<p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto">ASHIRA integra todos los módulos necesarios para una gestión médica integral, desde la atención primaria hasta el seguimiento completo del paciente.</p>
					</motion.div>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 items-stretch">
						{/* Módulos del Ecosistema */}
						<div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl backdrop-blur-md">
							<div className="flex items-center gap-3 mb-4">
								<div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg">
									<Building2 className="w-6 h-6 text-white" />
								</div>
								<h3 className="text-xl sm:text-2xl font-bold">Módulos del Ecosistema</h3>
							</div>
							<p className="text-sm sm:text-base text-slate-200 mb-6">ASHIRA ofrece un ecosistema completo que integra todos los actores del sector salud en Venezuela, facilitando la coordinación y optimizando los procesos médicos.</p>
							<div className="grid grid-cols-2 gap-3 text-sm sm:text-base">
								<div className="flex items-center gap-2">
									<div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
										<Stethoscope className="w-4 h-4 text-emerald-300" />
									</div>
									<span>Módulo Médico</span>
								</div>
								<div className="flex items-center gap-2">
									<div className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center">
										<Building2 className="w-4 h-4 text-cyan-300" />
									</div>
									<span>Clínicas</span>
								</div>
								<div className="flex items-center gap-2">
									<div className="w-6 h-6 rounded-lg bg-teal-500/20 flex items-center justify-center">
										<Users className="w-4 h-4 text-teal-300" />
									</div>
									<span>Portal del Paciente</span>
								</div>
								<div className="flex items-center gap-2">
									<div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center">
										<Pill className="w-4 h-4 text-purple-200" />
									</div>
									<span>Farmacias</span>
								</div>
								<div className="flex items-center gap-2">
									<div className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center">
										<FlaskConical className="w-4 h-4 text-orange-200" />
									</div>
									<span>Laboratorios</span>
								</div>
								<div className="flex items-center gap-2">
									<div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
										<BarChart3 className="w-4 h-4 text-blue-200" />
									</div>
									<span>Reportes &amp; Gestión</span>
								</div>
							</div>
						</div>

						{/* Automatización y Flujos */}
						<div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl backdrop-blur-md">
							<div className="flex items-center gap-3 mb-4">
								<div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
									<Zap className="w-6 h-6 text-white" />
								</div>
								<h3 className="text-xl sm:text-2xl font-bold">Automatización Clínica Inteligente</h3>
							</div>
							<p className="text-sm sm:text-base text-slate-200 mb-6">ASHIRA automatiza los flujos clínicos más importantes, permitiendo que los profesionales de la salud se concentren en lo esencial: brindar atención médica de calidad a sus pacientes.</p>
							<ul className="space-y-3 text-sm sm:text-base">
								<li className="flex items-start gap-2">
									<div className="mt-1 w-5 h-5 rounded-full bg-emerald-500/30 flex items-center justify-center">
										<CheckCircle2 className="w-3 h-3 text-white" />
									</div>
									<span>Notificaciones automáticas de citas, pagos pendientes y resultados listos.</span>
								</li>
								<li className="flex items-start gap-2">
									<div className="mt-1 w-5 h-5 rounded-full bg-cyan-500/30 flex items-center justify-center">
										<CheckCircle2 className="w-3 h-3 text-white" />
									</div>
									<span>Recetas electrónicas conectadas con farmacias adheridas.</span>
								</li>
								<li className="flex items-start gap-2">
									<div className="mt-1 w-5 h-5 rounded-full bg-blue-500/30 flex items-center justify-center">
										<CheckCircle2 className="w-3 h-3 text-white" />
									</div>
									<span>Resultados de laboratorio enviados automáticamente a médicos y pacientes.</span>
								</li>
							</ul>
						</div>
					</div>
				</div>
			</section>

			{/* Stats Section */}
			<section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-slate-900 via-blue-900 to-teal-900 text-white relative overflow-hidden">
				<div className="absolute inset-0">
					<div className="absolute top-0 left-0 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl" />
					<div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
				</div>

				<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-12">
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">Comprometidos con la Excelencia en Salud Digital</h2>
						<p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto">ASHIRA se compromete a ofrecer la mejor plataforma tecnológica para el sector salud venezolano, con estándares de calidad, seguridad y disponibilidad que garantizan una experiencia óptima para profesionales y pacientes.</p>
					</motion.div>

					<div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
						{[
							{ value: '100%', label: 'Digital', icon: Smartphone },
							{ value: '24/7', label: 'Disponible', icon: Clock },
							{ value: '100%', label: 'Seguro', icon: Shield },
							{ value: '∞', label: 'Escalable', icon: TrendingUp },
						].map((stat, index) => (
							<motion.div key={stat.label} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: index * 0.1 }} whileHover={{ scale: 1.1, y: -5 }} className="text-center bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
								<div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 mb-4">
									<stat.icon className="w-6 h-6 text-white" />
								</div>
								<div className="text-3xl sm:text-4xl font-bold mb-2">{stat.value}</div>
								<div className="text-sm sm:text-base text-slate-300">{stat.label}</div>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* FAQ & Planes Simples */}
			<section className="py-16 sm:py-20 md:py-24 bg-white relative overflow-hidden">
				<div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
				<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-10 sm:gap-12 items-start">
						{/* Planes / CTA simple */}
						<div className="lg:col-span-1 bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100">
							<div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 rounded-full mb-4">
								<Sparkles className="w-4 h-4 text-teal-600" />
								<span className="text-xs sm:text-sm font-semibold text-teal-700">Planes Simples</span>
							</div>
							<h3 className="text-2xl font-bold text-slate-900 mb-3">Planes Flexibles Adaptados a tus Necesidades</h3>
							<p className="text-sm sm:text-base text-slate-600 mb-5">ASHIRA ofrece modelos de suscripción diseñados para cada tipo de usuario del ecosistema de salud. Desde acceso gratuito para pacientes hasta planes empresariales para grandes organizaciones, nuestra plataforma se adapta a tus necesidades específicas.</p>
							<ul className="space-y-3 text-sm sm:text-base">
								<li>
									<strong className="text-slate-900">Pacientes:</strong> <span className="text-emerald-600 font-semibold">Acceso gratuito</span> al portal del paciente.
								</li>
								<li>
									<strong className="text-slate-900">Médico Individual / Consultorio:</strong> modelo de suscripción simple, pensado para consultorios privados.
								</li>
								<li>
									<strong className="text-slate-900">Clínicas, Farmacias y Laboratorios:</strong> planes personalizados según volumen y necesidades de integración.
								</li>
							</ul>
							<div className="mt-6 flex flex-col gap-3">
								<Link href="/register" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 text-sm sm:text-base">
									Crear cuenta gratuita
									<ArrowRight className="w-4 h-4" />
								</Link>
								<p className="text-xs text-slate-500">Para organizaciones (clínicas, farmacias, laboratorios), contáctanos para recibir una propuesta adaptada.</p>
							</div>
						</div>

						{/* FAQ */}
						<div className="lg:col-span-2">
							<div className="mb-6 sm:mb-8">
								<h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Preguntas Frecuentes</h3>
								<p className="text-sm sm:text-base text-slate-600">Resolvemos las dudas más comunes antes de que des el siguiente paso.</p>
							</div>
							<div className="space-y-4">
								<div className="bg-white rounded-2xl p-4 sm:p-5 shadow-md border border-slate-100">
									<h4 className="text-sm sm:text-base font-semibold text-slate-900 mb-1">¿ASHIRA es gratis para pacientes?</h4>
									<p className="text-xs sm:text-sm text-slate-600">Sí. El portal del paciente está pensado para ser accesible de forma gratuita, permitiendo que cualquier persona gestione su salud digital sin barreras de entrada.</p>
								</div>
								<div className="bg-white rounded-2xl p-4 sm:p-5 shadow-md border border-slate-100">
									<h4 className="text-sm sm:text-base font-semibold text-slate-900 mb-1">¿Necesito instalar algo en mi computadora?</h4>
									<p className="text-xs sm:text-sm text-slate-600">No. ASHIRA es una plataforma 100% web. Solo necesitas un navegador moderno y conexión a internet, desde computadora, tablet o teléfono.</p>
								</div>
								<div className="bg-white rounded-2xl p-4 sm:p-5 shadow-md border border-slate-100">
									<h4 className="text-sm sm:text-base font-semibold text-slate-900 mb-1">¿Cómo se protegen mis datos y mi historial médico?</h4>
									<p className="text-xs sm:text-sm text-slate-600">Utilizamos cifrado, controles de acceso por rol y auditoría de acciones. Solo los profesionales autorizados y tú pueden acceder a tu información, siguiendo criterios similares a marcos como GDPR.</p>
								</div>
								<div className="bg-white rounded-2xl p-4 sm:p-5 shadow-md border border-slate-100">
									<h4 className="text-sm sm:text-base font-semibold text-slate-900 mb-1">Soy clínica / farmacia / laboratorio, ¿cómo empiezo?</h4>
									<p className="text-xs sm:text-sm text-slate-600">Puedes iniciar el registro directamente desde la plataforma y luego coordinaremos contigo para adaptar la configuración y la integración según tus procesos internos.</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-16 sm:py-20 md:py-24 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 relative overflow-hidden">
				<div className="absolute inset-0">
					<div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
					<div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
				</div>
				<div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
					<motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
						<motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-6">
							<Sparkles className="w-10 h-10 text-white" />
						</motion.div>
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">Únete a la Transformación Digital de la Salud</h2>
						<p className="text-lg sm:text-xl text-teal-50 mb-8 max-w-3xl mx-auto">ASHIRA está revolucionando la forma en que se gestiona y se accede a la atención médica en Venezuela. Únete a cientos de profesionales de la salud que ya están transformando sus prácticas con nuestra plataforma integral. Regístrate hoy y comienza a experimentar los beneficios de la salud digital.</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Link href="/register" className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-slate-50 text-teal-600 font-semibold rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-base sm:text-lg">
								Crear Cuenta Gratis
								<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
							</Link>
							<Link href="/login" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-semibold rounded-2xl border-2 border-white/30 hover:border-white/50 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-base sm:text-lg">
								Iniciar Sesión
							</Link>
						</div>
					</motion.div>
				</div>
			</section>

			{/* Beneficios Profesionales Section */}
			<section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-slate-50 to-blue-50 relative overflow-hidden">
				<div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
				<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-12 sm:mb-16">
						<div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full mb-4 shadow-sm">
							<Target className="w-4 h-4 text-teal-600" />
							<span className="text-sm font-semibold text-teal-600">Ventajas Competitivas</span>
						</div>
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">¿Por Qué Elegir ASHIRA?</h2>
						<p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto">Descubre las ventajas que hacen de ASHIRA la plataforma preferida por profesionales de la salud en Venezuela</p>
					</motion.div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
						{[
							{
								icon: Database,
								title: 'Historial Médico Centralizado',
								description: 'Acceso completo y seguro al historial médico del paciente desde cualquier punto del ecosistema, facilitando diagnósticos precisos y tratamientos coordinados.',
								gradient: 'from-teal-500 to-cyan-500',
							},
							{
								icon: Network,
								title: 'Integración Total del Ecosistema',
								description: 'Conecta consultorios, clínicas, farmacias y laboratorios en tiempo real, eliminando barreras y optimizando la comunicación entre profesionales.',
								gradient: 'from-blue-500 to-indigo-500',
							},
							{
								icon: Shield,
								title: 'Seguridad y Cumplimiento Normativo',
								description: 'Protección de datos médicos con encriptación de nivel empresarial y cumplimiento de estándares internacionales de privacidad y seguridad.',
								gradient: 'from-emerald-500 to-teal-500',
							},
							{
								icon: Zap,
								title: 'Automatización Inteligente',
								description: 'Reduce tareas administrativas repetitivas con automatización de citas, notificaciones, recordatorios y flujos clínicos, aumentando la productividad.',
								gradient: 'from-orange-500 to-red-500',
							},
							{
								icon: BarChart3,
								title: 'Analítica y Reportes Avanzados',
								description: 'Dashboards intuitivos y reportes detallados que te permiten tomar decisiones informadas basadas en datos reales de tu práctica médica.',
								gradient: 'from-purple-500 to-pink-500',
							},
							{
								icon: Cloud,
								title: 'Acceso desde Cualquier Lugar',
								description: 'Plataforma 100% en la nube, accesible desde cualquier dispositivo con conexión a internet, sin necesidad de instalaciones complejas.',
								gradient: 'from-cyan-500 to-blue-500',
							},
						].map((benefit, index) => (
							<motion.div key={benefit.title} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }} whileHover={{ scale: 1.05, y: -5 }} className="group relative bg-white rounded-2xl p-6 shadow-md hover:shadow-xl border border-slate-100 transition-all duration-300 overflow-hidden">
								<div className={`absolute inset-0 bg-gradient-to-br ${benefit.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`} />
								<div className="relative z-10">
									<div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${benefit.gradient} shadow-md mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
										<benefit.icon className="w-7 h-7 text-white" />
									</div>
									<h3 className="text-xl font-bold text-slate-900 mb-2">{benefit.title}</h3>
									<p className="text-sm sm:text-base text-slate-600 leading-relaxed">{benefit.description}</p>
								</div>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* SEO Content Section */}
			<section className="py-16 sm:py-20 md:py-24 bg-white relative">
				<div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />

				<div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
					<motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="prose prose-lg sm:prose-xl max-w-none bg-gradient-to-br from-slate-50 to-blue-50 rounded-3xl p-8 sm:p-12 shadow-lg border border-slate-200">
						<div className="flex items-center gap-3 mb-6">
							<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
								<FileText className="w-6 h-6 text-white" />
							</div>
							<h2 className="text-3xl sm:text-4xl font-bold text-slate-900 m-0">ASHIRA: La Plataforma Integral de Salud Digital para Venezuela</h2>
						</div>
						<div className="space-y-6 text-slate-700 leading-relaxed">
							<p className="text-base sm:text-lg">
								<strong>ASHIRA</strong> es la plataforma tecnológica líder diseñada específicamente para unificar, modernizar y optimizar el ecosistema de salud en Venezuela. Nuestra misión es conectar todos los actores del sector salud - desde consultorios privados y clínicas hasta farmacias y laboratorios - en un sistema integrado que mejore significativamente la calidad, eficiencia y accesibilidad de la atención médica para todos los venezolanos.
							</p>
							<h3 className="text-2xl font-bold text-slate-900 mt-8 mb-4">Solución Completa para Profesionales de la Salud</h3>
							<p className="text-base sm:text-lg">
								Para <strong>médicos y especialistas independientes</strong>, ASHIRA ofrece una suite completa de herramientas que permiten gestionar consultorios privados de manera eficiente. La plataforma incluye gestión de historiales médicos digitales completos, sistema de agendamiento de citas inteligente, emisión de recetas y órdenes médicas electrónicas, y comunicación segura con pacientes. Todo esto desde una interfaz intuitiva que reduce el tiempo administrativo y permite enfocarse en la atención clínica.
							</p>
							<p className="text-base sm:text-lg">
								Las <strong>clínicas y centros médicos</strong> encuentran en ASHIRA una solución empresarial robusta con herramientas de administración avanzadas. La plataforma permite gestionar múltiples especialistas, coordinar recursos, administrar horarios complejos, generar reportes financieros y operativos, y mantener un control centralizado de todas las operaciones clínicas desde un único dashboard.
							</p>
							<h3 className="text-2xl font-bold text-slate-900 mt-8 mb-4">Integración con Farmacias y Laboratorios</h3>
							<p className="text-base sm:text-lg">
								Las <strong>farmacias integradas</strong> pueden recibir recetas digitales directamente de los médicos a través de ASHIRA, facilitando la dispensación de medicamentos, mejorando la trazabilidad, reduciendo errores y agilizando el proceso de entrega. Los pacientes pueden verificar la disponibilidad de medicamentos y recibir notificaciones cuando sus recetas están listas.
							</p>
							<p className="text-base sm:text-lg">
								Los <strong>laboratorios clínicos</strong> pueden gestionar órdenes médicas digitales, procesar análisis, entregar resultados de manera inmediata y segura tanto a médicos como a pacientes, y mantener un registro completo de todos los estudios realizados. Esto agiliza significativamente el proceso de diagnóstico y tratamiento.
							</p>
							<h3 className="text-2xl font-bold text-slate-900 mt-8 mb-4">Portal del Paciente: Acceso Gratuito y Completo</h3>
							<p className="text-base sm:text-lg">
								Para los <strong>pacientes</strong>, ASHIRA ofrece un portal completamente gratuito que proporciona acceso a su historial médico completo, la posibilidad de agendar citas con diferentes especialistas, recibir recordatorios automáticos de tratamientos y citas, acceder instantáneamente a resultados de laboratorio y recetas digitales, y mantener comunicación directa con sus profesionales de la salud. Todo desde una única plataforma segura, fácil de usar y accesible desde cualquier dispositivo.
							</p>
							<h3 className="text-2xl font-bold text-slate-900 mt-8 mb-4">Tecnología de Vanguardia y Seguridad</h3>
							<p className="text-base sm:text-lg">ASHIRA utiliza tecnología de última generación con arquitectura en la nube, garantizando alta disponibilidad, escalabilidad y respaldo automático de datos. La plataforma cumple con los más altos estándares de seguridad, utilizando encriptación de extremo a extremo, autenticación de múltiples factores y controles de acceso basados en roles. Todos los datos médicos están protegidos según estándares internacionales similares a GDPR y HIPAA.</p>
							<p className="text-base sm:text-lg">
								Con <strong>ASHIRA</strong>, estamos construyendo el futuro de la atención médica en Venezuela, donde la tecnología y la innovación se unen para brindar una experiencia de salud más accesible, eficiente, coordinada y de mayor calidad para profesionales y pacientes por igual.
							</p>
						</div>
					</motion.div>
				</div>
			</section>
		</div>
	);
}
