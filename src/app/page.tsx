'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
	HeartPulse, 
	Stethoscope, 
	Pill, 
	FlaskConical, 
	Building2, 
	Users, 
	Shield, 
	Zap, 
	Clock, 
	FileText,
	CheckCircle2,
	ArrowRight,
	Activity,
	Globe,
	TrendingUp,
	Sparkles,
	Star,
	BarChart3,
	Smartphone,
	Cloud,
	Lock
} from 'lucide-react';

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
				ease: 'easeOut',
			},
		},
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 overflow-hidden">
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
						<motion.div
							variants={containerVariants}
							initial="hidden"
							animate="visible"
							className="text-center lg:text-left"
						>
							<motion.div variants={itemVariants} className="mb-6 flex justify-center lg:justify-start">
								<div className="relative inline-flex items-center justify-center">
									<div className="absolute inset-0 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-3xl blur-xl opacity-50 animate-pulse" />
									<div className="relative inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-600 shadow-2xl">
										<HeartPulse className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
									</div>
								</div>
							</motion.div>

							<motion.h1
								variants={itemVariants}
								className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 mb-6 leading-tight"
							>
								<span className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
									Syncwave Salud
								</span>
								<br />
								<span className="text-slate-800">Uniendo el Ecosistema de Salud en Venezuela</span>
							</motion.h1>

							<motion.p
								variants={itemVariants}
								className="text-lg sm:text-xl md:text-2xl text-slate-600 mb-8 leading-relaxed"
							>
								La plataforma integral que conecta farmacias, laboratorios, consultorios privados y clínicas 
								para brindar una atención médica más eficiente, accesible y de calidad a todos los venezolanos.
							</motion.p>

							<motion.div
								variants={itemVariants}
								className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
							>
								<Link
									href="/register"
									className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-base sm:text-lg"
								>
									Comenzar Ahora
									<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
								</Link>
								<Link
									href="/login"
									className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-2xl border-2 border-slate-200 hover:border-teal-300 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 text-base sm:text-lg"
								>
									Iniciar Sesión
								</Link>
							</motion.div>

							{/* Stats */}
							<motion.div
								variants={itemVariants}
								className="mt-12 grid grid-cols-3 gap-6 sm:gap-8"
							>
								{[
									{ value: '100%', label: 'Digital' },
									{ value: '24/7', label: 'Disponible' },
									{ value: '100%', label: 'Seguro' },
								].map((stat, index) => (
									<motion.div
										key={stat.label}
										initial={{ opacity: 0, scale: 0.8 }}
										animate={{ opacity: 1, scale: 1 }}
										transition={{ delay: 0.8 + index * 0.1 }}
										className="text-center"
									>
										<div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
											{stat.value}
										</div>
										<div className="text-xs sm:text-sm text-slate-600 mt-1">{stat.label}</div>
									</motion.div>
								))}
							</motion.div>
						</motion.div>

						{/* Right: Image/Illustration */}
						<motion.div
							initial={{ opacity: 0, x: 50 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.8, delay: 0.3 }}
							className="relative hidden lg:block"
						>
							<div className="relative">
								{/* Floating Cards */}
								<motion.div
									animate={{ y: [0, -20, 0] }}
									transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
									className="absolute -top-10 -left-10 bg-white rounded-2xl p-4 shadow-xl border border-slate-200 z-10"
								>
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

								<motion.div
									animate={{ y: [0, 20, 0] }}
									transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
									className="absolute -bottom-10 -right-10 bg-white rounded-2xl p-4 shadow-xl border border-slate-200 z-10"
								>
									<div className="flex items-center gap-3">
										<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
											<Activity className="w-6 h-6 text-white" />
										</div>
										<div>
											<div className="text-sm font-bold text-slate-900">Monitoreo</div>
											<div className="text-xs text-slate-600">En Tiempo Real</div>
										</div>
									</div>
								</motion.div>

								{/* Main Illustration Container */}
								<div className="relative bg-gradient-to-br from-teal-500/10 via-cyan-500/10 to-blue-500/10 rounded-3xl p-12 backdrop-blur-sm border border-white/20">
									<div className="grid grid-cols-2 gap-6">
										{/* Medical Icons Grid */}
										{[Stethoscope, Pill, FlaskConical, Building2].map((Icon, index) => (
											<motion.div
												key={index}
												initial={{ opacity: 0, scale: 0.8 }}
												animate={{ opacity: 1, scale: 1 }}
												transition={{ delay: 0.5 + index * 0.1 }}
												whileHover={{ scale: 1.1, rotate: 5 }}
												className="bg-white rounded-2xl p-6 shadow-lg flex items-center justify-center"
											>
												<Icon className="w-12 h-12 text-teal-600" />
											</motion.div>
										))}
									</div>
									{/* Central Icon */}
									<motion.div
										animate={{ rotate: [0, 360] }}
										transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
										className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-full flex items-center justify-center shadow-2xl"
									>
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
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
						className="text-center mb-12 sm:mb-16"
					>
						<div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 rounded-full mb-4">
							<Sparkles className="w-4 h-4 text-teal-600" />
							<span className="text-sm font-semibold text-teal-600">Ecosistema Completo</span>
						</div>
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
							Un Ecosistema Completo de Salud
						</h2>
						<p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
							Conectamos todos los actores del sector salud para ofrecer una experiencia integral y coordinada
						</p>
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
							<motion.div
								key={service.title}
								initial={{ opacity: 0, y: 30 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.6, delay: index * 0.1 }}
								whileHover={{ y: -12, scale: 1.03 }}
								className="group relative bg-white rounded-3xl p-6 sm:p-8 shadow-lg hover:shadow-2xl border border-slate-100 transition-all duration-300 overflow-hidden"
							>
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
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
						className="text-center mb-12 sm:mb-16"
					>
						<div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full mb-4 shadow-sm">
							<Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
							<span className="text-sm font-semibold text-slate-700">Características Destacadas</span>
						</div>
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
							Herramientas Poderosas
						</h2>
						<p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
							Diseñadas para transformar la atención médica en Venezuela
						</p>
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
							<motion.div
								key={feature.title}
								initial={{ opacity: 0, scale: 0.9 }}
								whileInView={{ opacity: 1, scale: 1 }}
								viewport={{ once: true }}
								transition={{ duration: 0.5, delay: index * 0.1 }}
								whileHover={{ scale: 1.05, y: -5 }}
								className="group relative bg-white rounded-2xl p-6 shadow-md hover:shadow-xl border border-slate-100 transition-all duration-300 overflow-hidden"
							>
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
						<motion.div
							initial={{ opacity: 0, x: -30 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.6 }}
						>
							<div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 rounded-full mb-6">
								<CheckCircle2 className="w-4 h-4 text-teal-600" />
								<span className="text-sm font-semibold text-teal-600">Beneficios para Pacientes</span>
							</div>
							<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-6">
								Mejor Atención para los Pacientes
							</h2>
							<p className="text-lg sm:text-xl text-slate-600 mb-8 leading-relaxed">
								Syncwave Salud revoluciona la forma en que los venezolanos acceden a servicios de salud, 
								ofreciendo una experiencia integrada que conecta todos los aspectos del cuidado médico.
							</p>
							<div className="space-y-4">
								{[
									'Acceso rápido a profesionales de la salud',
									'Gestión centralizada de historial médico',
									'Coordinación entre diferentes especialistas',
									'Resultados de laboratorio y recetas digitales',
									'Recordatorios y seguimiento de tratamientos',
								].map((benefit, index) => (
									<motion.div
										key={benefit}
										initial={{ opacity: 0, x: -20 }}
										whileInView={{ opacity: 1, x: 0 }}
										viewport={{ once: true }}
										transition={{ duration: 0.5, delay: index * 0.1 }}
										className="flex items-center gap-3 group"
									>
										<div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
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
										<motion.div 
											whileHover={{ scale: 1.05 }}
											className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30"
										>
											<div className="text-3xl sm:text-4xl font-bold text-white mb-1">100%</div>
											<div className="text-sm text-teal-50">Digital</div>
										</motion.div>
										<motion.div 
											whileHover={{ scale: 1.05 }}
											className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30"
										>
											<div className="text-3xl sm:text-4xl font-bold text-white mb-1">24/7</div>
											<div className="text-sm text-teal-50">Disponible</div>
										</motion.div>
									</div>
									
									{/* Feature Icons */}
									<div className="flex items-center gap-4 pt-4">
										<div className="flex -space-x-2">
											{[Smartphone, Cloud, Lock].map((Icon, i) => (
												<motion.div
													key={i}
													initial={{ opacity: 0, scale: 0 }}
													whileInView={{ opacity: 1, scale: 1 }}
													viewport={{ once: true }}
													transition={{ delay: 0.8 + i * 0.1 }}
													whileHover={{ scale: 1.2, zIndex: 10 }}
													className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center"
												>
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

			{/* Stats Section */}
			<section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-slate-900 via-blue-900 to-teal-900 text-white relative overflow-hidden">
				<div className="absolute inset-0">
					<div className="absolute top-0 left-0 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl" />
					<div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
				</div>
				
				<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
						className="text-center mb-12"
					>
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
							Transformando la Salud en Venezuela
						</h2>
						<p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto">
							Números que demuestran nuestro compromiso con la excelencia
						</p>
					</motion.div>

					<div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
						{[
							{ value: '100%', label: 'Digital', icon: Smartphone },
							{ value: '24/7', label: 'Disponible', icon: Clock },
							{ value: '100%', label: 'Seguro', icon: Shield },
							{ value: '∞', label: 'Escalable', icon: TrendingUp },
						].map((stat, index) => (
							<motion.div
								key={stat.label}
								initial={{ opacity: 0, y: 30 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.6, delay: index * 0.1 }}
								whileHover={{ scale: 1.1, y: -5 }}
								className="text-center bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
							>
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

			{/* CTA Section */}
			<section className="py-16 sm:py-20 md:py-24 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 relative overflow-hidden">
				<div className="absolute inset-0">
					<div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
					<div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
				</div>
				<div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
					>
						<motion.div
							animate={{ rotate: [0, 360] }}
							transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
							className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-6"
						>
							<Sparkles className="w-10 h-10 text-white" />
						</motion.div>
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
							Únete a la Revolución de la Salud Digital
						</h2>
						<p className="text-lg sm:text-xl text-teal-50 mb-8 max-w-2xl mx-auto">
							Forma parte del ecosistema que está transformando la atención médica en Venezuela. 
							Regístrate hoy y comienza a disfrutar de los beneficios.
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Link
								href="/register"
								className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-slate-50 text-teal-600 font-semibold rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-base sm:text-lg"
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

			{/* SEO Content Section */}
			<section className="py-16 sm:py-20 md:py-24 bg-slate-50 relative">
				<div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
				
				<div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
						className="prose prose-lg sm:prose-xl max-w-none bg-white rounded-3xl p-8 sm:p-12 shadow-lg"
					>
						<div className="flex items-center gap-3 mb-6">
							<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
								<FileText className="w-6 h-6 text-white" />
							</div>
							<h2 className="text-3xl sm:text-4xl font-bold text-slate-900 m-0">
								Plataforma Integral de Salud para Venezuela
							</h2>
						</div>
						<div className="space-y-6 text-slate-700 leading-relaxed">
							<p className="text-base sm:text-lg">
								<strong>Syncwave Salud</strong> es la plataforma tecnológica diseñada específicamente para 
								unificar y modernizar el ecosistema de salud en Venezuela. Nuestra misión es conectar 
								todos los actores del sector salud - desde consultorios privados y clínicas hasta farmacias 
								y laboratorios - en un sistema integrado que mejore significativamente la calidad de la 
								atención médica para todos los venezolanos.
							</p>
							<p className="text-base sm:text-lg">
								La plataforma permite a los <strong>médicos y especialistas</strong> gestionar sus consultorios 
								privados de manera eficiente, mantener historiales médicos digitales completos, coordinar 
								citas con pacientes, y emitir recetas y órdenes médicas de forma segura y digital. Para las 
								<strong> clínicas</strong>, ofrecemos herramientas de administración avanzadas que permiten 
								gestionar múltiples especialistas, recursos y servicios desde una plataforma centralizada.
							</p>
							<p className="text-base sm:text-lg">
								Las <strong>farmacias</strong> integradas pueden recibir recetas digitales directamente de los 
								médicos, facilitando la dispensación de medicamentos y mejorando la trazabilidad. Los 
								<strong> laboratorios</strong> pueden gestionar órdenes médicas, procesar análisis y entregar 
								resultados de manera digital, agilizando todo el proceso de diagnóstico.
							</p>
							<p className="text-base sm:text-lg">
								Para los <strong>pacientes</strong>, Syncwave Salud ofrece acceso a su historial médico completo, 
								la posibilidad de agendar citas con diferentes especialistas, recibir recordatorios de tratamientos, 
								acceder a resultados de laboratorio y recetas digitales, todo desde una única plataforma segura 
								y fácil de usar.
							</p>
							<p className="text-base sm:text-lg">
								Con <strong>Syncwave Salud</strong>, estamos construyendo el futuro de la atención médica en 
								Venezuela, donde la tecnología y la innovación se unen para brindar una experiencia de salud 
								más accesible, eficiente y de mayor calidad para todos.
							</p>
						</div>
					</motion.div>
				</div>
			</section>
		</div>
	);
}
