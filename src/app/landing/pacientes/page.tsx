'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { DM_Sans, Playfair_Display } from 'next/font/google';
import { 
  Users, FileText, Activity, Shield, Zap, CheckCircle2, ArrowRight, 
  HeartPulse, Calendar, Pill, FlaskConical, MessageCircle, TrendingUp, 
  Star, Link2, Image as ImageIcon, FileCheck, Stethoscope, Notebook, 
  Mail, MessageSquare, Eye, Download, Share2, UserPlus, Baby, 
  UsersRound, Heart, Sparkles, Lock, Clock, Globe, ChevronDown, ChevronUp 
} from 'lucide-react';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-body',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
});

function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 h-[3px] z-[100] origin-left bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500"
    />
  );
}

export default function PacientesLandingPage() {
	const shouldReduceMotion = useReducedMotion();
	
	// Estados para interactividad
	const [activeFamilyTab, setActiveFamilyTab] = useState<string>('hijos');
	const [activeFeatureTab, setActiveFeatureTab] = useState<number>(0);
	const [activeFamilyBenefit, setActiveFamilyBenefit] = useState<number | null>(null);
	const [activeBenefit, setActiveBenefit] = useState<number | null>(null);

	const variants = {
		fadeUp: {
			hidden: { opacity: 0, y: 40 },
			visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
		},
		fromLeft: {
			hidden: { opacity: 0, x: -40 },
			visible: { opacity: 1, x: 0, transition: { duration: 0.6 } }
		},
		fromRight: {
			hidden: { opacity: 0, x: 40 },
			visible: { opacity: 1, x: 0, transition: { duration: 0.6 } }
		},
		stagger: {
			visible: { transition: { staggerChildren: 0.08 } }
		},
		scaleIn: {
			hidden: { opacity: 0, scale: 0.85 },
			visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } }
		}
	};

	const consultaFeatures = [
		{
			icon: FileCheck,
			title: 'Informes Médicos Digitales',
			description: 'Accede a todos tus informes médicos completos, diagnósticos clínicos y evaluaciones médicas en formato digital. Descarga, visualiza o comparte con otros especialistas cuando lo necesites.',
			gradient: 'from-indigo-500 to-purple-500',
		},
		{
			icon: ImageIcon,
			title: 'Imágenes de Exámenes Médicos',
			description: 'Visualiza Rayos X, ecografías, resonancias magnéticas y cualquier estudio de imagen médica en alta calidad desde cualquier dispositivo. Compatible con múltiples formatos de imágenes diagnósticas.',
			gradient: 'from-purple-500 to-pink-500',
		},
		{
			icon: Pill,
			title: 'Recetas Médicas Electrónicas',
			description: 'Todas las recetas médicas relacionadas con tu consulta, con detalles completos de medicamentos, dosis precisas, indicaciones del médico y frecuencia de administración.',
			gradient: 'from-pink-500 to-rose-500',
		},
		{
			icon: Stethoscope,
			title: 'Diagnóstico Médico Completo',
			description: 'El diagnóstico detallado de tu especialista, explicaciones médicas comprensibles, recomendaciones de tratamiento y plan de seguimiento personalizado.',
			gradient: 'from-indigo-500 to-blue-500',
		},
		{
			icon: Notebook,
			title: 'Notas y Observaciones Médicas',
			description: 'Observaciones clínicas, seguimientos de tratamiento, recomendaciones personalizadas del médico y cualquier información relevante de tu consulta médica.',
			gradient: 'from-blue-500 to-cyan-500',
		},
	];

	const benefits = [
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
	];

	const familyMembers = [
		{
			id: 'hijos',
			icon: Baby,
			shortLabel: 'Hijos',
			title: 'Salud de tus Hijos',
			description: 'Gestiona la salud de tus hijos menores de edad. Accede a sus consultas pediátricas, registros de vacunación, exámenes médicos y recetas. Todo en un lugar seguro y controlado por ti.',
			color: 'from-blue-400 to-cyan-500',
		},
		{
			id: 'discapacidad',
			icon: Heart,
			shortLabel: 'Discapacidad',
			title: 'Familiares con Discapacidad',
			description: 'Brinda apoyo a familiares que necesitan asistencia médica. Tú puedes gestionar toda su información médica, asegurando que reciban el mejor cuidado y seguimiento profesional posible.',
			color: 'from-purple-400 to-pink-500',
		},
		{
			id: 'mayores',
			icon: Users,
			shortLabel: 'Mayores',
			title: 'Padres y Adultos Mayores',
			description: 'Cuida de tus padres mayores. Accede a sus consultas médicas, medicamentos, exámenes y tratamientos. Mantente al día con su salud y asegúrate de que sigan sus tratamientos correctamente.',
			color: 'from-rose-400 to-orange-500',
		},
		{
			id: 'otros',
			icon: UserPlus,
			shortLabel: 'Otros',
			title: 'Cualquier Miembro de la Familia',
			description: 'Incluye a cualquier miembro de tu familia que necesite tu apoyo médico. Todos merecen atención de calidad, y tú puedes ser su apoyo en la gestión de su salud con ASHIRA.',
			color: 'from-indigo-400 to-purple-500',
		},
	];

	const familyBenefits = [
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
	];

	const features = [
		{
			id: 'consultas',
			shortTitle: 'Consultas',
			title: 'Gestión Integral de Consultas Médicas',
			description: 'Centraliza toda la información de tus consultas médicas. Inicia sesión para validar los datos registrados por tu médico o sube tus propios documentos.',
			features: ['Acceso inmediato al historial de consultas', 'Validación de información médica por el paciente', 'Historial clínico completo y centralizado', 'Carga de documentos e imágenes manual'],
			icon: Calendar,
			gradient: 'from-indigo-500 to-purple-500',
		},
		{
			id: 'informes',
			shortTitle: 'Informes',
			title: 'Informes Médicos Digitales y Descargables',
			description: 'Visualiza, descarga e imprime todos tus informes médicos desde cualquier dispositivo. Compatible con múltiples formatos y optimizado para visualización móvil.',
			features: ['Informes médicos en formato digital de alta calidad', 'Descarga en PDF cuando lo necesites', 'Visualización optimizada para dispositivos móviles', 'Historial completo de todos tus informes médicos'],
			icon: FileText,
			gradient: 'from-purple-500 to-pink-500',
		},
		{
			id: 'imagenes',
			shortTitle: 'Imágenes',
			title: 'Archivos de Exámenes Médicos e Imágenes',
			description: 'Guarda y visualiza todas tus imágenes médicas: Rayos X, ecografías, resonancias magnéticas y más. Herramientas profesionales de visualización incluidas.',
			features: ['Visualización de imágenes médicas en alta resolución', 'Soporte para múltiples formatos de imágenes diagnósticas', 'Zoom y herramientas profesionales de visualización', 'Comparte estudios médicos con otros especialistas fácilmente'],
			icon: ImageIcon,
			gradient: 'from-pink-500 to-rose-500',
		},
		{
			id: 'recetas',
			shortTitle: 'Recetas',
			title: 'Recetas Médicas Electrónicas Digitales',
			description: 'Gestiona todas tus recetas médicas en un solo lugar, con información detallada de medicamentos, dosis, indicaciones y frecuencia de administración.',
			features: ['Recetas médicas asociadas a cada consulta', 'Información completa de medicamentos y tratamientos', 'Dosis precisas e indicaciones médicas claras', 'Historial completo de tratamientos anteriores'],
			icon: Pill,
			gradient: 'from-indigo-500 to-blue-500',
		},
		{
			id: 'diagnosticos',
			shortTitle: 'Diagnósticos',
			title: 'Diagnósticos Médicos y Notas Clínicas',
			description: 'Accede a diagnósticos médicos completos, notas del doctor, recomendaciones de tratamiento y planes de seguimiento personalizados.',
			features: ['Diagnósticos médicos detallados de especialistas', 'Notas clínicas adicionales y observaciones médicas', 'Recomendaciones de seguimiento y tratamiento', 'Explicaciones médicas claras y comprensibles'],
			icon: Stethoscope,
			gradient: 'from-blue-500 to-cyan-500',
		},
		{
			id: 'acceso',
			shortTitle: 'Acceso',
			title: 'Acceso Seguro y Compartir de Información Médica',
			description: 'Accede desde cualquier lugar en Venezuela y comparte información médica con otros especialistas de forma segura y controlada.',
			features: ['Acceso desde cualquier dispositivo y ubicación', 'Acceso seguro a tu historial completo', 'Control total sobre la privacidad de tu información médica', 'Sincronización automática en la nube'],
			icon: Shield,
			gradient: 'from-cyan-500 to-teal-500',
		},
	];

	const reasons = [
		'Acceso 100% gratuito para pacientes',
		'Historial médico digital unificado y completo',
		'Historial centralizado y validado por ti',
		'Imágenes, informes, recetas y diagnósticos en un solo lugar',
		'Coordinación automática entre especialistas médicos',
		'Resultados de laboratorio y recetas digitales instantáneos',
		'Seguridad y privacidad médica garantizadas',
		'Sin necesidad de correo electrónico o WhatsApp'
	];

	return (
		<div className={`${playfairDisplay.variable} ${dmSans.variable} font-body bg-white min-h-screen text-[#0A0F1E]`} style={{ fontFamily: 'var(--font-body)' }}>
			<ScrollProgressBar />

			{/* 1. HERO SECTION */}
			<section className="relative min-h-screen flex flex-col items-center justify-start pt-24 sm:pt-32 bg-[#F7F8FC] overflow-hidden">
				{/* Orb de fondo */}
				<div className="absolute inset-0 pointer-events-none overflow-hidden">
					<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 bg-[radial-gradient(ellipse,#818cf8_0%,transparent_70%)]" />
				</div>

				<div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
					{/* Badge */}
					<motion.div variants={variants.scaleIn} initial="hidden" animate="visible" className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-white border border-indigo-100 shadow-sm">
						<HeartPulse className="w-4 h-4 text-indigo-600" />
						<span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">
							Plataforma de Salud Digital · Venezuela
						</span>
					</motion.div>

					{/* H1 — Instrument Serif */}
					<motion.h1 variants={variants.fadeUp} initial="hidden" animate="visible" style={{ fontFamily: 'var(--font-display)' }} className="text-5xl sm:text-6xl md:text-7xl text-[#0A0F1E] mb-6 leading-[1.1]">
						Tu{' '}
						<span className="italic bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
							Historial Médico
						</span>
						<br />
						Digital y Seguro
					</motion.h1>

					{/* Subtítulo */}
					<motion.p variants={variants.fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.1 }} className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
						Gestiona tu salud de forma integral con la plataforma digital más completa de Venezuela. Accede a profesionales, agenda citas y mantén tu historial organizado.
					</motion.p>

					{/* CTAs */}
					<motion.div variants={variants.fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.2 }} className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
						<Link href="/register" className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold text-white overflow-hidden bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300">
							Registrarse Gratis
							<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
						</Link>

						<Link href="/login" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold text-slate-700 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 shadow-sm hover:shadow-md transition-all duration-300">
							Iniciar Sesión
						</Link>
					</motion.div>

					{/* Trust indicators */}
					<motion.div variants={variants.stagger} initial="hidden" animate="visible" className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
						{[
							{ icon: Shield, label: 'Seguridad Garantizada' },
							{ icon: Zap, label: 'Acceso 24/7' },
							{ icon: Globe, label: 'Disponible en Todo Venezuela' },
						].map(({ icon: Icon, label }) => (
							<motion.div key={label} variants={variants.scaleIn} className="flex items-center gap-2">
								<Icon className="w-4 h-4 text-indigo-500" />
								<span className="font-medium">{label}</span>
							</motion.div>
						))}
					</motion.div>
				</div>

				{/* Scroll cue */}
				<motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
					<span className="text-xs text-slate-400 font-medium tracking-widest uppercase">
						Descubre más
					</span>
					<div className="w-6 h-10 rounded-full border-2 border-slate-300 flex items-start justify-center pt-2">
						<div className="w-1.5 h-3 rounded-full bg-indigo-500 animate-[scrollDot_2s_ease-in-out_infinite]" />
					</div>
				</motion.div>
			</section>

			{/* 2. PAIN POINTS */}
			<section className="py-20 sm:py-28 bg-white">
				<div className="max-w-5xl mx-auto px-6">
					<motion.p variants={variants.fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} className="text-center text-sm font-semibold text-indigo-600 uppercase tracking-widest mb-4">
						¿Te suena familiar?
					</motion.p>

					<motion.h2 variants={variants.fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} style={{ fontFamily: 'var(--font-display)' }} className="text-4xl sm:text-5xl text-center text-[#0A0F1E] mb-16">
						El problema de gestionar tu salud hoy
					</motion.h2>

					<div className="space-y-6">
						{[
							{
								icon: MessageSquare,
								direction: 'left',
								pain: '¿Buscas la receta que te mandaron por WhatsApp hace 3 meses?',
								sub: 'La información médica dispersa en chats hace imposible llevar un historial real.',
							},
							{
								icon: FileText,
								direction: 'right',
								pain: '¿Perdiste el papel del informe médico de tu hijo?',
								sub: 'Los documentos físicos se pierden, se dañan, o simplemente no están cuando más los necesitas.',
							},
							{
								icon: Stethoscope,
								direction: 'left',
								pain: '¿No recuerdas qué te dijo el especialista en la última consulta?',
								sub: 'Sin registro digital, dependes de la memoria para tomar decisiones de salud importantes.',
							},
						].map((item) => (
							<motion.div
								key={item.pain}
								variants={item.direction === 'left' ? variants.fromLeft : variants.fromRight}
								initial="hidden"
								whileInView="visible"
								viewport={{ once: true, margin: '-60px' }}
								className={`flex items-start gap-5 p-6 sm:p-8 rounded-2xl border border-slate-100 bg-slate-50 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all duration-300 group ${item.direction === 'right' ? 'sm:flex-row-reverse sm:text-right' : ''}`}
							>
								<div className="shrink-0 w-12 h-12 rounded-xl bg-white border border-slate-200 group-hover:border-indigo-200 group-hover:bg-indigo-50 flex items-center justify-center shadow-sm transition-all duration-300">
									<item.icon className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 transition-colors" />
								</div>
								<div>
									<p className="text-lg sm:text-xl font-bold text-[#0A0F1E] mb-1">{item.pain}</p>
									<p className="text-slate-500 leading-relaxed">{item.sub}</p>
								</div>
							</motion.div>
						))}
					</div>

					<motion.div variants={variants.fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} className="mt-12 text-center">
						<p style={{ fontFamily: 'var(--font-display)' }} className="text-2xl sm:text-3xl text-indigo-600 italic">
							Con ASHIRA, eso se acabó.
						</p>
						<motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="mt-4 flex justify-center">
							<ArrowRight className="w-6 h-6 text-indigo-400 rotate-90" />
						</motion.div>
					</motion.div>
				</div>
			</section>

			{/* 3. CÓMO FUNCIONA */}
			<section className="py-20 sm:py-28 bg-[#F7F8FC]">
				<div className="max-w-5xl mx-auto px-6">
					<motion.h2 variants={variants.fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} style={{ fontFamily: 'var(--font-display)' }} className="text-4xl sm:text-5xl text-center text-[#0A0F1E] mb-4">
						¿Cómo funciona?
					</motion.h2>
					<motion.p variants={variants.fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} className="text-center text-slate-500 mb-16 max-w-xl mx-auto">
						Tres pasos simples separan al paciente de tener toda su información médica organizada.
					</motion.p>

					<div className="relative">
						{/* Línea conectora desktop */}
						<div className="hidden md:block absolute top-[52px] left-[calc(16.666%+32px)] right-[calc(16.666%+32px)] h-[2px] bg-slate-200">
							<motion.div
								initial={{ scaleX: 0 }}
								whileInView={{ scaleX: 1 }}
								viewport={{ once: true, margin: '-100px' }}
								transition={{ duration: 1.2 }}
								className="absolute inset-0 origin-left bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500"
							/>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
							{[
								{
									number: '01',
									icon: Stethoscope,
									title: 'Tu médico registra la consulta',
									description: 'El especialista documenta tu consulta en ASHIRA con todos los detalles: diagnóstico, receta, imágenes y notas clínicas.',
									gradient: 'from-indigo-500 to-purple-500',
								},
								{
									number: '02',
									icon: Lock,
									title: 'Inicia sesión y accede',
									description: 'Inicia sesión para ver y validar la información de tu consulta. Si tu doctor no usa ASHIRA, puedes subir fotos de tus documentos.',
									gradient: 'from-purple-500 to-pink-500',
								},
								{
									number: '03',
									icon: HeartPulse,
									title: 'Accede desde cualquier lugar',
									description: 'Consulta, descarga o comparte tu información médica desde tu teléfono, tablet o computador, cuando lo necesites.',
									gradient: 'from-pink-500 to-rose-500',
								},
							].map((step, index) => (
								<motion.div
									key={step.number}
									variants={variants.fadeUp}
									initial="hidden"
									whileInView="visible"
									viewport={{ once: true, margin: '-60px' }}
									transition={{ delay: index * 0.15 }}
									className="relative flex flex-col items-center text-center"
								>
									<div className="relative mb-6">
										<div className={`w-16 h-16 rounded-2xl bg-linear-to-br ${step.gradient} flex items-center justify-center shadow-lg shadow-indigo-500/20`}>
											<step.icon className="w-8 h-8 text-white" />
										</div>
										<div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border-2 border-indigo-200 flex items-center justify-center text-[10px] font-bold text-indigo-600">
											{step.number}
										</div>
									</div>

									<h3 className="text-xl font-bold text-[#0A0F1E] mb-3">{step.title}</h3>
									<p className="text-slate-500 leading-relaxed">{step.description}</p>
								</motion.div>
							))}
						</div>
					</div>
				</div>
			</section>

			{/* 4. LINK DE CONSULTA */}
			<section className="py-20 sm:py-28 bg-[#0F1729] overflow-hidden">
				<div className="max-w-7xl mx-auto px-6">
					<motion.div variants={variants.fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} className="mb-12">
						<div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-white/10 border border-white/20">
							<Link2 className="w-4 h-4 text-indigo-300" />
							<span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
								Funcionalidad Exclusiva para Pacientes
							</span>
						</div>
						<h2 style={{ fontFamily: 'var(--font-display)' }} className="text-4xl sm:text-5xl md:text-6xl text-white mb-4 max-w-3xl">
							Historial Médico{' '}
							<span className="italic text-indigo-300">Centralizado</span>
						</h2>
						<p className="text-lg text-white/60 max-w-2xl">
							ASHIRA centraliza toda tu información médica en un solo lugar. Inicia sesión para validar tus consultas o sube imágenes de tus documentos si tu doctor no usa la plataforma.
						</p>
					</motion.div>

					<div className="relative">
						<div className="flex items-center gap-2 mb-6 text-white/40 text-sm">
							<ArrowRight className="w-4 h-4" />
							<span>Desliza para explorar</span>
						</div>

						<div className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-6 -mx-6 px-6 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none]">
							{consultaFeatures.map((feature, index) => (
								<motion.div
									key={feature.title}
									variants={variants.scaleIn}
									initial="hidden"
									whileInView="visible"
									viewport={{ once: true, margin: '-60px' }}
									transition={{ delay: index * 0.08 }}
									className="flex-none w-[280px] sm:w-[320px] snap-start bg-white/5 hover:bg-white/10 rounded-2xl p-6 sm:p-8 border border-white/10 hover:border-white/20 transition-all duration-300 group cursor-pointer"
								>
									<div className={`w-12 h-12 rounded-xl bg-linear-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
										<feature.icon className="w-6 h-6 text-white" />
									</div>
									<h3 className="text-lg font-bold text-white mb-3">{feature.title}</h3>
									<p className="text-white/60 text-sm leading-relaxed">{feature.description}</p>
								</motion.div>
							))}
						</div>

						<div className="absolute right-0 top-0 bottom-6 w-20 bg-linear-to-l from-[#0F1729] to-transparent pointer-events-none" />
					</div>

					<motion.div variants={variants.stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} className="mt-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
						{[
							{ icon: Mail, text: 'No más correos electrónicos perdidos', color: 'text-red-300' },
							{ icon: MessageSquare, text: 'Sin cadenas interminables de WhatsApp', color: 'text-green-300' },
							{ icon: Eye, text: 'Toda tu información visible en una página', color: 'text-blue-300' },
							{ icon: Download, text: 'Descarga tus documentos cuando necesites', color: 'text-purple-300' },
							{ icon: Share2, text: 'Comparte con otros especialistas de forma segura', color: 'text-pink-300' },
						].map((benefit) => (
							<motion.div key={benefit.text} variants={variants.fadeUp} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
								<benefit.icon className={`w-5 h-5 ${benefit.color} shrink-0`} />
								<span className="text-white/70 text-sm font-medium">{benefit.text}</span>
							</motion.div>
						))}
					</motion.div>
				</div>
			</section>

			{/* 5. BENEFICIOS */}
			<section className="py-20 sm:py-28 bg-white">
				<div className="max-w-6xl mx-auto px-6">
					<motion.div variants={variants.fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} className="text-center mb-16">
						<div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-indigo-50 border border-indigo-100">
							<Star className="w-4 h-4 text-indigo-600 fill-indigo-600" />
							<span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">
								Beneficios Exclusivos para Pacientes
							</span>
						</div>
						<h2 style={{ fontFamily: 'var(--font-display)' }} className="text-4xl sm:text-5xl text-[#0A0F1E] mb-4">
							Plataforma Integral de Salud Digital
						</h2>
						<p className="text-lg text-slate-500 max-w-2xl mx-auto">
							Descubre cómo ASHIRA transforma la gestión de tu salud con herramientas digitales diseñadas para pacientes venezolanos.
						</p>
					</motion.div>

					<motion.div variants={variants.stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
						{benefits.map((benefit, index) => (
							<motion.div
								key={benefit.title}
								variants={variants.fadeUp}
								whileHover="hover"
								onClick={() => setActiveBenefit(activeBenefit === index ? null : index)}
								className={`group relative rounded-2xl border overflow-hidden transition-all duration-300 cursor-pointer shadow-sm hover:shadow-lg hover:shadow-indigo-500/10 ${activeBenefit === index ? 'border-indigo-200 bg-indigo-50/10' : 'border-slate-100 bg-white hover:border-indigo-200'}`}
							>
								<div className="p-6 sm:p-8">
									<div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-linear-to-br ${benefit.gradient} mb-5 shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
										<benefit.icon className="w-6 h-6 text-white" />
									</div>
									<div className="flex items-center justify-between gap-2">
										<h3 className="text-lg font-bold text-[#0A0F1E]">{benefit.title}</h3>
										{activeBenefit === index ? (
											<ChevronUp className="w-4 h-4 text-slate-400 lg:hidden shrink-0" />
										) : (
											<motion.div
												whileInView={{ y: [0, -5, 0, -2, 0] }}
												viewport={{ once: true }}
												transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
												className="lg:hidden shrink-0"
											>
												<ChevronDown className="w-4 h-4 text-slate-400" />
											</motion.div>
										)}
									</div>

									<p className={`text-slate-500 text-sm leading-relaxed overflow-hidden transition-all duration-500 ease-in-out ${activeBenefit === index ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0 lg:group-hover:max-h-40 lg:group-hover:opacity-100 lg:group-hover:mt-2'}`}>
										{benefit.description}
									</p>
								</div>

								<div className={`absolute bottom-0 left-0 right-0 h-[3px] bg-linear-to-r ${benefit.gradient} scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300 ${activeBenefit === index ? 'scale-x-100' : ''}`} />
							</motion.div>
						))}
					</motion.div>
				</div>
			</section>

			{/* 6. GRUPOS FAMILIARES */}
			<section className="py-20 sm:py-28 bg-[#F7F8FC]">
				<div className="max-w-6xl mx-auto px-6">
					<motion.div variants={variants.fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} className="text-center mb-16">
						<div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-rose-50 border border-rose-100">
							<Heart className="w-4 h-4 text-rose-500" />
							<span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
								Gestión Familiar de Salud
							</span>
						</div>
						<h2 style={{ fontFamily: 'var(--font-display)' }} className="text-4xl sm:text-5xl text-[#0A0F1E] mb-4">
							Cuida la Salud de tu Familia
						</h2>
						<p className="text-lg text-slate-500 max-w-2xl mx-auto">
							Grupos Familiares — Gestiona la salud de hasta 4 miembros desde una sola cuenta.
						</p>
					</motion.div>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
						{/* Izquierda: Tabs */}
						<motion.div variants={variants.fromLeft} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
							<div className="flex flex-wrap gap-2 mb-6">
								{familyMembers.map((member) => (
									<button key={member.id} onClick={() => setActiveFamilyTab(member.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${activeFamilyTab === member.id ? `bg-linear-to-br ${member.color} text-white shadow-md` : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
										<member.icon className="w-4 h-4" />
										{member.shortLabel}
									</button>
								))}
							</div>

							<AnimatePresence mode="wait">
								{familyMembers.map((member) =>
									activeFamilyTab === member.id ? (
										<motion.div key={member.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="flex items-start gap-5">
											<div className={`shrink-0 w-14 h-14 rounded-2xl bg-linear-to-br ${member.color} flex items-center justify-center shadow-md`}>
												<member.icon className="w-7 h-7 text-white" />
											</div>
											<div>
												<h4 className="text-xl font-bold text-[#0A0F1E] mb-2">{member.title}</h4>
												<p className="text-slate-500 leading-relaxed">{member.description}</p>
											</div>
										</motion.div>
									) : null
								)}
							</AnimatePresence>
						</motion.div>

						{/* Derecha: Benefits + CTA */}
						<motion.div variants={variants.fromRight} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} className="bg-linear-to-br from-rose-500 via-pink-500 to-purple-500 rounded-3xl p-8 text-white">
							<div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
								<Sparkles className="w-8 h-8 text-white" />
							</div>
							<h3 style={{ fontFamily: 'var(--font-display)' }} className="text-3xl text-white mb-3">
								Mejora la Calidad de Vida
							</h3>
							<p className="text-white/80 mb-8 leading-relaxed">
								ASHIRA está diseñado para que cada paciente reciba la atención médica que merece.
							</p>

							<div className="space-y-2 mb-8">
								{familyBenefits.map((benefit, index) => (
									<div key={benefit.title} className="border-b border-white/20 last:border-0 pb-2">
										<button
											onClick={() => setActiveFamilyBenefit(activeFamilyBenefit === index ? null : index)}
											className="w-full flex items-center justify-between py-2 text-left focus:outline-none"
										>
											<div className="flex items-center gap-3">
												<CheckCircle2 className="w-5 h-5 text-white shrink-0" />
												<p className="font-semibold text-white">{benefit.title}</p>
											</div>
											{activeFamilyBenefit === index ? (
												<ChevronUp className="w-4 h-4 text-white/70" />
											) : (
												<ChevronDown className="w-4 h-4 text-white/70" />
											)}
										</button>
										<AnimatePresence initial={false}>
											{activeFamilyBenefit === index && (
												<motion.div
													initial={{ height: 0, opacity: 0 }}
													animate={{ height: 'auto', opacity: 1 }}
													exit={{ height: 0, opacity: 0 }}
													transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
													className="overflow-hidden"
												>
													<p className="text-sm text-white/80 mt-1 ml-8 pb-2">
														{benefit.description}
													</p>
												</motion.div>
											)}
										</AnimatePresence>
									</div>
								))}
							</div>

							<Link href="/register" className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-white hover:bg-rose-50 text-rose-600 font-bold rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300">
								Crear Grupo Familiar
								<ArrowRight className="w-5 h-5" />
							</Link>
						</motion.div>
					</div>

					{/* Testimonial */}
					<motion.blockquote variants={variants.fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} className="mt-12 max-w-3xl mx-auto text-center">
						<Heart className="w-8 h-8 text-rose-400 mx-auto mb-4" />
						<p style={{ fontFamily: 'var(--font-display)' }} className="text-xl sm:text-2xl text-[#0A0F1E] italic mb-6 leading-relaxed">
							"La salud de mi familia es lo más importante. Con ASHIRA puedo estar al día con las consultas médicas de mis hijos y mis padres mayores, todo desde un solo lugar. Me da mucha tranquilidad saber que tengo toda su información médica organizada y accesible."
						</p>
						<div className="flex items-center justify-center gap-3">
							<div className="w-10 h-10 rounded-full bg-linear-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
								MG
							</div>
							<div className="text-left">
								<p className="font-semibold text-slate-800 text-sm">María González</p>
								<p className="text-xs text-slate-400">Paciente de ASHIRA · Caracas</p>
							</div>
						</div>
					</motion.blockquote>
				</div>
			</section>

			{/* 7. FUNCIONALIDADES AVANZADAS */}
			<section className="py-20 sm:py-28 bg-white">
				<div className="max-w-6xl mx-auto px-6">
					<motion.h2 variants={variants.fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} style={{ fontFamily: 'var(--font-display)' }} className="text-4xl sm:text-5xl text-[#0A0F1E] text-center mb-4">
						Funcionalidades Avanzadas
					</motion.h2>
					<motion.p variants={variants.fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} className="text-lg text-slate-500 text-center max-w-2xl mx-auto mb-12">
						Conoce en detalle todas las herramientas que ASHIRA ofrece para gestionar tu salud.
					</motion.p>

					<motion.div variants={variants.fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}>
						<div className="flex gap-2 overflow-x-auto pb-2 mb-8 snap-x scrollbar-none [scrollbar-width:none]">
							{features.map((feature, index) => (
								<button key={feature.title} onClick={() => setActiveFeatureTab(index)} className={`flex-none snap-start flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${activeFeatureTab === index ? `bg-linear-to-br ${feature.gradient} text-white shadow-md` : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
									<feature.icon className="w-4 h-4" />
									{feature.shortTitle}
								</button>
							))}
						</div>

						<AnimatePresence mode="wait">
							<motion.div
								key={activeFeatureTab}
								initial={{ opacity: 0, y: 15 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -15 }}
								transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
								className="bg-slate-50 rounded-3xl p-8 sm:p-10 border border-slate-100"
							>
								<div className="flex flex-col md:flex-row gap-8 items-start">
									<div className={`shrink-0 w-16 h-16 rounded-2xl bg-linear-to-br ${features[activeFeatureTab].gradient} flex items-center justify-center shadow-lg`}>
										{React.createElement(features[activeFeatureTab].icon, { className: 'w-8 h-8 text-white' })}
									</div>
									<div className="flex-1">
										<h3 className="text-2xl sm:text-3xl font-bold text-[#0A0F1E] mb-4">
											{features[activeFeatureTab].title}
										</h3>
										<p className="text-slate-500 leading-relaxed mb-6">
											{features[activeFeatureTab].description}
										</p>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
											{features[activeFeatureTab].features.map((item, idx) => (
												<div key={idx} className="flex items-start gap-3">
													<CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
													<span className="text-slate-700 text-sm">{item}</span>
												</div>
											))}
										</div>
									</div>
								</div>
							</motion.div>
						</AnimatePresence>

						<div className="flex justify-between items-center mt-6 md:hidden">
							<button onClick={() => setActiveFeatureTab(Math.max(0, activeFeatureTab - 1))} disabled={activeFeatureTab === 0} className="flex items-center gap-2 text-sm font-semibold text-slate-500 disabled:opacity-30 hover:text-indigo-600 transition-colors">
								<ArrowRight className="w-4 h-4 rotate-180" /> Anterior
							</button>
							<span className="text-xs text-slate-400">
								{activeFeatureTab + 1} / {features.length}
							</span>
							<button onClick={() => setActiveFeatureTab(Math.min(features.length - 1, activeFeatureTab + 1))} disabled={activeFeatureTab === features.length - 1} className="flex items-center gap-2 text-sm font-semibold text-slate-500 disabled:opacity-30 hover:text-indigo-600 transition-colors">
								Siguiente <ArrowRight className="w-4 h-4" />
							</button>
						</div>
					</motion.div>
				</div>
			</section>

			{/* 7.5 SEGURIDAD Y PRIVACIDAD */}
			<section className="py-20 sm:py-28 bg-[#F7F8FC]">
				<div className="max-w-6xl mx-auto px-6">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
						{/* Izquierda: Texto */}
						<motion.div variants={variants.fromLeft} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}>
							<div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-green-50 border border-green-100">
								<Shield className="w-4 h-4 text-green-600" />
								<span className="text-xs font-semibold text-green-700 uppercase tracking-wider">
									Seguridad y Privacidad
								</span>
							</div>
							<h2 style={{ fontFamily: 'var(--font-display)' }} className="text-4xl sm:text-5xl text-[#0A0F1E] mb-6">
								Tus datos, siempre protegidos
							</h2>
							<p className="text-lg text-slate-500 mb-8 leading-relaxed">
								En ASHIRA, la privacidad de tu información médica es nuestra máxima prioridad. Implementamos los más altos estándares de seguridad para que estés tranquilo.
							</p>

							<div className="space-y-6">
								<div className="flex items-start gap-4">
									<div className="shrink-0 w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
										<Lock className="w-5 h-5 text-green-600" />
									</div>
									<div>
										<h3 className="text-lg font-bold text-[#0A0F1E] mb-1">¿Cómo resguardamos tu información?</h3>
										<p className="text-slate-500 text-sm leading-relaxed">
											Utilizamos encriptación avanzada para asegurar que tus datos médicos estén a salvo de accesos no autorizados. Tu historial se guarda en servidores seguros con copias de seguridad automáticas.
										</p>
									</div>
								</div>

								<div className="flex items-start gap-4">
									<div className="shrink-0 w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
										<Users className="w-5 h-5 text-blue-600" />
									</div>
									<div>
										<h3 className="text-lg font-bold text-[#0A0F1E] mb-1">¿Quién puede acceder?</h3>
										<p className="text-slate-500 text-sm leading-relaxed">
											Solo tú tienes acceso completo a tu cuenta. Los médicos solo pueden ver la información que tú valides o autorices explícitamente en el sistema. Nadie más puede ver tus datos.
										</p>
									</div>
								</div>
							</div>
						</motion.div>

						{/* Derecha: Ilustración o Card visual */}
						<motion.div variants={variants.fromRight} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} className="relative bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50">
							<div className="absolute -top-6 -right-6 w-24 h-24 bg-linear-to-br from-green-400 to-emerald-500 rounded-3xl flex items-center justify-center shadow-lg shadow-green-500/20 transform rotate-12">
								<Shield className="w-12 h-12 text-white" />
							</div>
							
							<div className="space-y-4">
								<div className="flex items-center gap-3 pb-4 border-b border-slate-100">
									<div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
										<Globe className="w-6 h-6 text-slate-500" />
									</div>
									<div>
										<p className="font-semibold text-[#0A0F1E]">Acceso Seguro</p>
										<p className="text-xs text-slate-400">Validado por el paciente</p>
									</div>
									<div className="ml-auto px-3 py-1 rounded-full bg-green-50 text-green-600 text-xs font-bold">
										Activo
									</div>
								</div>

								<div className="space-y-2">
									<div className="flex justify-between text-sm">
										<span className="text-slate-500">Nivel de Encriptación</span>
										<span className="font-semibold text-slate-700">AES-256</span>
									</div>
									<div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
										<div className="w-full h-full bg-linear-to-r from-green-400 to-emerald-500" />
									</div>
								</div>

								<p className="text-sm text-slate-500 pt-2">
									"ASHIRA cumple con las normativas internacionales de protección de datos de salud (HIPAA compliant), asegurando que tu privacidad esté garantizada."
								</p>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* 8. POR QUÉ ASHIRA */}
			<section className="py-20 sm:py-28 overflow-hidden">
				<div className="max-w-6xl mx-auto px-6">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
						{/* Izquierda */}
						<motion.div variants={variants.fromLeft} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} className="bg-[#F7F8FC] rounded-3xl p-8 sm:p-12 border border-slate-100">
							<h2 style={{ fontFamily: 'var(--font-display)' }} className="text-4xl sm:text-5xl text-[#0A0F1E] mb-4">
								¿Por qué elegir ASHIRA?
							</h2>
							<p className="text-slate-500 mb-8 leading-relaxed">
								Somos la plataforma de salud digital más completa para pacientes en Venezuela.
							</p>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
								{reasons.map((reason, index) => (
									<motion.div key={reason} variants={variants.fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} transition={{ delay: index * 0.05 }} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 transition-all duration-200 group">
										<div className="shrink-0 w-6 h-6 rounded-full bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center transition-colors mt-0.5">
											<CheckCircle2 className="w-4 h-4 text-indigo-600" />
										</div>
										<span className="text-sm text-slate-700 font-medium">{reason}</span>
									</motion.div>
								))}
							</div>

							<Link href="/register" className="group inline-flex items-center gap-2 px-8 py-4 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-xl transition-all duration-300">
								Registrarse Gratis Ahora
								<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
							</Link>
						</motion.div>

						{/* Derecha */}
						<motion.div variants={variants.fromRight} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} className="bg-[#0F1729] rounded-3xl p-8 sm:p-12 flex flex-col justify-between">
							<div className="flex items-center gap-4 mb-8">
								<div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
									<HeartPulse className="w-8 h-8 text-indigo-300" />
								</div>
								<div>
									<h3 style={{ fontFamily: 'var(--font-display)' }} className="text-3xl text-white">100% Gratis</h3>
									<p className="text-indigo-300 text-sm">Para pacientes en Venezuela</p>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4 mb-8">
								{[
									{ value: '24/7', label: 'Disponible' },
									{ value: '100%', label: 'Seguro' },
								].map(({ value, label }) => (
									<div key={label} className="bg-white/5 rounded-2xl p-6 border border-white/10">
										<div style={{ fontFamily: 'var(--font-display)' }} className="text-5xl text-white mb-1">{value}</div>
										<div className="text-sm text-indigo-300 font-medium">{label}</div>
									</div>
								))}
							</div>

							<div className="space-y-3">
								{[
									{ icon: Shield, text: 'Datos cifrados y protegidos' },
									{ icon: Globe, text: 'Disponible en todo Venezuela' },
									{ icon: TrendingUp, text: 'Ecosistema médico en crecimiento' },
								].map(({ icon: Icon, text }) => (
									<div key={text} className="flex items-center gap-3 text-white/60">
										<Icon className="w-5 h-5 shrink-0 text-indigo-400" />
										<span className="text-sm">{text}</span>
									</div>
								))}
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* 9. CTA FINAL */}
			<section className="py-20 sm:py-28 bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 relative overflow-hidden">
				<div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
				<div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />

				<div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
					<motion.div variants={variants.fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} className="space-y-8">
						<h2 style={{ fontFamily: 'var(--font-display)' }} className="text-4xl sm:text-5xl md:text-6xl text-white leading-tight">
							Comienza a Gestionar tu Salud Digital Hoy
						</h2>

						<p className="text-lg text-indigo-100 max-w-xl mx-auto">
							Regístrate gratis y accede a todos los beneficios de ASHIRA. Tu historial médico, tus citas y tu salud, en un solo lugar.
						</p>

						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Link href="/register" className="group inline-flex items-center justify-center gap-2 px-10 py-5 bg-white hover:bg-slate-50 text-indigo-600 font-bold rounded-2xl shadow-2xl hover:shadow-3xl transform hover:scale-[1.02] transition-all duration-300 text-lg">
								Crear Cuenta Gratuita
								<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
							</Link>
							<Link href="/login" className="inline-flex items-center justify-center px-10 py-5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-2xl border-2 border-white/30 hover:border-white/50 transition-all duration-300 text-lg">
								Iniciar Sesión
							</Link>
						</div>
					</motion.div>
				</div>
			</section>
		</div>
	);
}
