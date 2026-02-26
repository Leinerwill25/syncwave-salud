'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform, AnimatePresence, useInView } from 'framer-motion';
import { 
  Stethoscope, User, Calendar, FileText, Shield, Clock, CheckCircle2, 
  ArrowRight, Zap, Activity, TrendingUp, DollarSign, Globe, MessageCircle, 
  Bell, FileCheck, Users, Settings, BarChart3, CreditCard, Link2, Upload, 
  Download, Star, Sparkles, Target, Rocket, Timer, Save, Building2, 
  Instagram, Heart, MapPin, AlertCircle, Play, ChevronDown, ChevronRight,
  Menu, X, Mic, Wand2, BrainCircuit, FileJson
} from 'lucide-react';
import Head from 'next/head';
import { VoiceDemo } from './VoiceDemo';

// --- SEO & Schema Components ---
const SEOMetadata = () => (
    <>
        <title>ASHIRA | Plataforma Digital para Consultorios Médicos</title>
        <meta name="description" content="ASHIRA es la plataforma médica #1 para consultorios privados. Genera informes automáticos, gestiona citas, pacientes e ingresos. Reduce 40% el tiempo en cada consulta." />
        <meta name="keywords" content="software médico consultorios Venezuela, plataforma gestión médica, informes médicos automáticos, historia clínica digital" />
        <link rel="canonical" href="https://ashira.click/landing/consultorios" />
        <meta property="og:title" content="ASHIRA — Plataforma Médica para Consultorios Privados" />
        <meta property="og:description" content="Reduce 40% el tiempo en cada consulta. Genera informes automáticos, gestiona pacientes y citas." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://ashira.click/landing/consultorios" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="ASHIRA — Software Médico para Consultorios" />
        <meta name="twitter:description" content="Plataforma #1 para consultorios privados en Latinoamérica." />
    </>
);

const SchemaJSON = () => {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "ASHIRA",
        "applicationCategory": "HealthApplication",
        "operatingSystem": "Web",
        "description": "Plataforma integral de salud digital para consultorios médicos privados.",
        "offers": {
            "@type": "Offer",
            "price": "70",
            "priceCurrency": "EUR"
        },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "reviewCount": "500"
        }
    };
    
    const faqLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "¿Qué es ASHIRA?",
          "acceptedAnswer": { "@type": "Answer", "text": "ASHIRA es una plataforma digital de gestión médica para consultorios privados." }
        },
        {
          "@type": "Question",
          "name": "¿Cómo genera informes automáticos?",
          "acceptedAnswer": { "@type": "Answer", "text": "Carga tu plantilla Word, define la estructura y ASHIRA la llena automáticamente con los datos de la consulta." }
        }
      ]
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, faqLd]) }}
        />
    );
};

// --- Sub-components ---

const TypewriterEffect = ({ texts }: { texts: string[] }) => {
    const [currentTextIndex, setCurrentTextIndex] = useState(0);
    const [currentText, setCurrentText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    
    useEffect(() => {
        const timeout = setTimeout(() => {
            const fullText = texts[currentTextIndex];
            
            if (isDeleting) {
                setCurrentText(fullText.substring(0, currentText.length - 1));
            } else {
                setCurrentText(fullText.substring(0, currentText.length + 1));
            }

            if (!isDeleting && currentText === fullText) {
                setTimeout(() => setIsDeleting(true), 1500);
            } else if (isDeleting && currentText === '') {
                setIsDeleting(false);
                setCurrentTextIndex((prev) => (prev + 1) % texts.length);
            }
        }, isDeleting ? 50 : 100);

        return () => clearTimeout(timeout);
    }, [currentText, isDeleting, currentTextIndex, texts]);

    return (
        <span className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
            {currentText}
            <span className="animate-blink text-teal-600">|</span>
        </span>
    );
};

// --- Main Page Component ---

export default function ConsultoriosLandingPage() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [videoPlaying, setVideoPlaying] = useState(false);
    const [currentVideo, setCurrentVideo] = useState("JGCgfmCcL3o");

    const videos = [
        { id: "JGCgfmCcL3o", title: "Ecosistema Digital Completo" },
        { id: "6mZpUJz3eA4", title: "Gestión con Inteligencia Artificial" },
        { id: "wCbTPgVuJDQ", title: "Revolución Operativa Médica" },
        { id: "_AYjVb7ZDJA", title: "Demo Integral de la Plataforma" }
    ];

    // Scroll progress for floating nav/elements
    const { scrollYProgress } = useScroll();
    const headerOpacity = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-teal-100 selection:text-teal-900">
            <Head>  {/* Next.js 13+ usually uses metadata API, but sticking to standard structure for client component */}
                <SEOMetadata />
            </Head>
            <SchemaJSON />

            {/* --- Navigation --- */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16 sm:h-20">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg">
                                A
                            </div>
                            <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">ASHIRA</span>
                        </Link>

                        {/* Desktop Nav */}
                        <nav className="hidden md:flex items-center gap-8">
                            {['Funcionalidades', 'Testimonios', 'Precios', 'FAQ'].map((item) => (
                                <Link 
                                    key={item} 
                                    href={`#${item.toLowerCase()}`}
                                    className="text-sm font-medium text-slate-600 hover:text-teal-600 transition-colors"
                                >
                                    {item}
                                </Link>
                            ))}
                        </nav>

                        {/* CTAs Desktop */}
                        <div className="hidden md:flex items-center gap-4">
                            <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-4 py-2">
                                Iniciar Sesión
                            </Link>
                            <Link 
                                href="/register?utm_source=landing&utm_medium=nav_cta" 
                                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
                            >
                                Registrarse Gratis
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <button 
                            className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? <X /> : <Menu />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                <AnimatePresence>
                    {isMenuOpen && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="md:hidden bg-white border-b border-slate-100 overflow-hidden"
                        >
                            <div className="px-4 py-6 space-y-4">
                                {['Funcionalidades', 'Testimonios', 'Precios', 'FAQ'].map((item) => (
                                    <Link 
                                        key={item} 
                                        href={`#${item.toLowerCase()}`}
                                        className="block text-base font-medium text-slate-600 hover:text-teal-600"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        {item}
                                    </Link>
                                ))}
                                <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                                    <Link href="/login" className="w-full py-3 text-center text-slate-600 font-semibold border border-slate-200 rounded-xl">
                                        Iniciar Sesión
                                    </Link>
                                    <Link href="/register" className="w-full py-3 text-center bg-teal-600 text-white font-bold rounded-xl shadow-md">
                                        Comenzar Gratis
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            <main>
                {/* 
                  ══════════════════════════════════════════════
                  ETAPA 1 — CAPTURA DE ATENCIÓN (Hero Section)
                  ══════════════════════════════════════════════
                */}
                <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
                    {/* Animated background elements */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <motion.div 
                            animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-20 right-[10%] w-[500px] h-[500px] bg-teal-400/10 rounded-full blur-3xl"
                        />
                         <motion.div 
                            animate={{ y: [0, 20, 0], opacity: [0.2, 0.5, 0.2] }}
                            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                            className="absolute bottom-0 left-[5%] w-[400px] h-[400px] bg-blue-400/10 rounded-full blur-3xl"
                        />
                    </div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                            
                            {/* Text Content */}
                            <div className="flex-1 text-center lg:text-left">
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-teal-200 rounded-full shadow-sm mb-8"
                                >
                                    <Sparkles className="w-4 h-4 text-teal-600 animate-pulse" />
                                    <span className="text-sm font-semibold text-slate-700">Ahorra hasta <span className="text-teal-600">30%</span> con suscripción anual</span>
                                </motion.div>

                                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.15] mb-6 min-h-[160px] sm:min-h-[120px] lg:min-h-[180px]">
                                    <TypewriterEffect texts={[
                                        "Reduce 40% el Tiempo en Cada Consulta",
                                        "Genera Informes Médicos en Segundos",
                                        "Tu Consultorio, Digitalizado y Eficiente"
                                    ]} />
                                </h1>

                                <p className="text-lg sm:text-xl text-slate-600 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                                    La plataforma #1 para consultorios privados en Latinoamérica. Sin complicaciones, sin papel, sin perder tiempo.
                                </p>

                                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
                                    <Link href="/register?utm_source=landing&utm_medium=hero_cta" className="group relative overflow-hidden inline-flex items-center justify-center gap-2 px-8 py-4 bg-teal-600 text-white font-bold rounded-xl shadow-xl hover:shadow-2xl hover:bg-teal-700 transition-all transform hover:-translate-y-1">
                                        <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                        <Rocket className="w-5 h-5 relative z-10" />
                                        <span className="relative z-10">Comenzar Gratis Ahora</span>
                                    </Link>
                                    <button 
                                        onClick={() => document.getElementById('video-demo')?.scrollIntoView({ behavior: 'smooth' })}
                                        className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-700 font-semibold border-2 border-slate-200 rounded-xl hover:border-teal-400 hover:text-teal-700 transition-all shadow-sm hover:shadow-md"
                                    >
                                        <Play className="w-5 h-5 fill-current" />
                                        Ver Demo Video
                                    </button>
                                </div>

                                {/* Trust Bar */}
                                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 text-sm font-medium text-slate-500">
                                    {['Registro seguro', 'Sin tarjeta de crédito', 'Soporte incluido'].map((item) => (
                                        <div key={item} className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-teal-500" />
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Floating Mockup */}
                            <motion.div 
                                className="flex-1 relative w-full max-w-[600px] lg:max-w-none"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8 }}
                            >
                                <motion.div
                                    animate={{ y: [0, -20, 0] }}
                                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                    className="relative z-10"
                                >
                                    {/* Mockup Container */}
                                    <div className="relative bg-white rounded-2xl shadow-2xl border-4 border-slate-900/5 overflow-hidden aspect-[4/3] rotate-1 lg:rotate-2 hover:rotate-0 transition-transform duration-500">
                                        <Image 
                                            src="/referencia/Captura de pantalla 2026-02-11 131316.png" // Placeholder or existing image
                                            alt="Dashboard ASHIRA" 
                                            fill
                                            className="object-cover bg-slate-100" // Fallback color
                                        /> 
                                        
                                        {/* Overlay simulated UI if image missing */}
                                        <div className="absolute inset-0 bg-slate-50 p-6 flex flex-col gap-4">
                                            <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
                                            <div className="flex gap-4">
                                                <div className="flex-1 h-32 bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                                                    <div className="w-8 h-8 bg-teal-100 rounded mb-2"></div>
                                                    <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                                                </div>
                                                <div className="flex-1 h-32 bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                                                    <div className="w-8 h-8 bg-blue-100 rounded mb-2"></div>
                                                    <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                                                </div>
                                            </div>
                                            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                                                <div className="space-y-3">
                                                    {[1,2,3].map(i => (
                                                        <div key={i} className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                                                            <div className="flex-1 h-3 bg-slate-100 rounded"></div>
                                                            <div className="w-16 h-3 bg-slate-100 rounded"></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Floating Badge on Dashboard */}
                                        <motion.div 
                                            className="absolute bottom-6 right-6 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-bold flex items-center gap-2"
                                            animate={{ scale: [1, 1.05, 1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        >
                                            <Users className="w-4 h-4 text-teal-400" />
                                            500+ Pacientes
                                        </motion.div>
                                    </div>
                                    
                                    {/* Abstract background blobs for mockup */}
                                    <div className="absolute -z-10 top-10 -right-10 w-full h-full bg-gradient-to-br from-teal-400 to-blue-500 rounded-2xl blur-2xl opacity-20 transform rotate-6"></div>
                                </motion.div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* 
                  ══════════════════════════════════════════════
                  ETAPA 2 — VIDEO EXPLICATIVO (Pain → Solution)
                  ══════════════════════════════════════════════
                */}
                <section id="video-demo" className="py-20 bg-slate-900 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5"></div>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl sm:text-4xl font-bold mb-4">¿Cuánto tiempo pierdes en papeleo cada día?</h2>
                            <p className="text-lg text-slate-300">Mira cómo ASHIRA transforma una consulta médica en segundos</p>
                        </div>

                        {/* Video Container */}
                        <div className="max-w-5xl mx-auto mb-12">
                            <div className="bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 aspect-video relative group">
                                {!videoPlaying ? (
                                    <div onClick={() => setVideoPlaying(true)} className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/30 transition-colors cursor-pointer z-10">
                                        <Image 
                                            src={`https://img.youtube.com/vi/${currentVideo}/maxresdefault.jpg`} 
                                            alt="Video Cover" 
                                            fill
                                            className="object-cover opacity-50"
                                        />
                                        <div className="w-20 h-20 bg-teal-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform relative z-20">
                                            <Play className="w-8 h-8 fill-white ml-1" />
                                        </div>
                                        <div className="absolute bottom-6 text-sm font-medium tracking-wider uppercase z-20">Ver Demo (Clic para reproducir)</div>
                                    </div>
                                ) : (
                                    <iframe 
                                        src={`https://www.youtube.com/embed/${currentVideo}?autoplay=1&rel=0`} 
                                        className="w-full h-full" 
                                        allow="autoplay; encrypted-media" 
                                        allowFullScreen
                                        title="ASHIRA Demo"
                                    ></iframe>
                                )}
                            </div>

                            {/* Thumbnail Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                                {videos.map((video) => (
                                    <button 
                                        key={video.id}
                                        onClick={() => {
                                            setCurrentVideo(video.id);
                                            setVideoPlaying(true);
                                        }}
                                        className={`group relative rounded-xl overflow-hidden aspect-video border-2 transition-all ${currentVideo === video.id ? 'border-teal-500 ring-2 ring-teal-500/20' : 'border-slate-700 hover:border-slate-500'}`}
                                    >
                                        <div className="absolute inset-0 bg-slate-900/40 group-hover:bg-transparent transition-colors z-10" />
                                        <Image 
                                            src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`} 
                                            alt={video.title} 
                                            fill
                                            className="object-cover"
                                        />
                                        <div className={`absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent text-xs font-bold text-white z-20 truncate ${currentVideo === video.id ? 'text-teal-300' : ''}`}>
                                            {video.title}
                                        </div>
                                        {currentVideo === video.id && (
                                            <div className="absolute inset-0 flex items-center justify-center z-20">
                                                <div className="w-8 h-8 bg-teal-600/80 rounded-full flex items-center justify-center">
                                                    <Play className="w-4 h-4 fill-white ml-0.5" />
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Animated Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mt-16 border-t border-slate-800 pt-12">
                            {[
                                { val: "-40%", label: "Tiempo por consulta" },
                                { val: "+500", label: "Consultorios en línea" },
                                { val: "100%", label: "Automatización" }
                            ].map((stat, i) => (
                                <div key={i} className="text-center">
                                    <div className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-teal-300 to-teal-500 mb-2">
                                        {stat.val}
                                    </div>
                                    <div className="text-sm text-slate-400 font-medium uppercase tracking-wide">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 
                  ══════════════════════════════════════════════
                  ETAPA 3 — PROBLEMA Y SOLUCIÓN (Storytelling)
                  ══════════════════════════════════════════════
                */}
                <section className="py-24 bg-white overflow-hidden">
                     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                            
                            {/* Problem Side */}
                            <motion.div 
                                initial={{ opacity: 0, x: -30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6 }}
                            >
                                <div className="inline-block px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                                    El Problema
                                </div>
                                <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">Sabemos lo que sientes cada día</h2>
                                <div className="space-y-6">
                                    {[
                                        "Pierdes 2+ horas al día escribiendo informes a mano",
                                        "Tu agenda está en un cuaderno que cualquiera puede perder",
                                        "No sabes cuánto ingresaste este mes realmente",
                                        "Tus pacientes te escriben por WhatsApp sin orden ni control",
                                        "Sientes que la tecnología es complicada y costosa"
                                    ].map((pain, i) => (
                                        <motion.div 
                                            key={i}
                                            initial={{ opacity: 0, x: -20 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: i * 0.1 }}
                                            className="flex items-start gap-4 p-4 rounded-xl hover:bg-red-50/50 transition-colors"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                                <span className="text-lg">😤</span>
                                            </div>
                                            <p className="text-slate-700 font-medium pt-2">{pain}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Solution Side */}
                            <motion.div 
                                initial={{ opacity: 0, x: 30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6 }}
                                className="relative lg:pl-10"
                            >
                                {/* Connector Line (Desktop) */}
                                <div className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10">
                                    <div className="w-12 h-12 bg-white rounded-full shadow-lg border-4 border-teal-500 flex items-center justify-center">
                                        <ArrowRight className="w-6 h-6 text-teal-600" />
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-3xl p-8 sm:p-10 border border-teal-100 shadow-xl relative">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-200/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                    
                                    <div className="inline-block px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                                        La Solución ASHIRA
                                    </div>
                                    <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6">ASHIRA lo resuelve desde el primer día</h3>
                                    
                                    <div className="space-y-4">
                                        {[
                                            { title: "Informes Automáticos", desc: "Generados en segundos con tus plantillas.", icon: Zap },
                                            { title: "Agenda Digital", desc: "Centralizada, segura y accesible desde cualquier lugar.", icon: Calendar },
                                            { title: "Control Financiero", desc: "Reportes de ingresos y gastos en tiempo real.", icon: BarChart3 },
                                            { title: "Portal de Pacientes", desc: "Imagen profesional y comunicación organizada.", icon: Globe },
                                        ].map((sol, i) => (
                                            <div key={i} className="flex items-start gap-4 bg-white p-4 rounded-xl un-shadow-sm border border-slate-100">
                                                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                                    <sol.icon className="w-5 h-5 text-teal-600" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900">{sol.title}</h4>
                                                    <p className="text-sm text-slate-600">{sol.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                     </div>
                </section>

                {/* 
                  ══════════════════════════════════════════════
                  ETAPA 4 — CARACTERÍSTICA ESTRELLA (Feature Hero)
                  ══════════════════════════════════════════════
                */}
                <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
                    {/* Background Elements */}
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] -ml-20 -mb-20"></div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="text-center mb-20">
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0 }}
                                whileInView={{ scale: 1, opacity: 1 }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-teal-500/20 border border-teal-500/30 rounded-full text-teal-300 text-sm font-bold uppercase tracking-widest mb-6"
                            >
                                <Wand2 className="w-4 h-4 fill-current animate-pulse" />
                                Nueva Tecnología LLaMA 3
                            </motion.div>
                            <h2 className="text-4xl sm:text-6xl font-extrabold mb-8 tracking-tight">
                                Tu Voz es la Nueva Pluma: <br className="hidden md:block"/>
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-purple-400">Informes Médicos con IA</span>
                            </h2>
                            <p className="text-slate-300 max-w-3xl mx-auto text-xl leading-relaxed">
                                Dicta 30 segundos y obtén un informe perfecto. ASHIRA entiende el contexto médico, estructura la información y rellena <span className="text-white font-bold underline decoration-teal-500 underline-offset-4">TU propia plantilla de Word</span>.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
                            
                            {/* Interactive Demo Visualization */}

                            <div className="relative z-10">
                                <VoiceDemo />
                            </div>


                            {/* Features List */}
                            <div className="space-y-8">
                                {[
                                    {
                                        title: "Dictado Natural e Inteligente",
                                        desc: "No hables como robot. Di 'me duele la panza' y ASHIRA escribirá 'Dolor Abdominal' en el campo correcto.",
                                        icon: Mic
                                    },
                                    {
                                        title: "Tu Plantilla, Tu Estilo",
                                        desc: "No te obligamos a cambiar. La IA analiza TU archivo Word actual y rellena los datos donde corresponden.",
                                        icon: FileJson
                                    },
                                    {
                                        title: "Velocidad Supersónica",
                                        desc: "Lo que antes te tomaba 15 minutos en la computadora, ahora te toma 45 segundos de dictado.",
                                        icon: Zap
                                    }
                                ].map((feat, i) => (
                                    <motion.div 
                                        key={i}
                                        initial={{ opacity: 0, x: 50 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.2 }}
                                        className="flex gap-4 group"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:border-teal-500 transition-colors shrink-0">
                                            <feat.icon className="w-6 h-6 text-teal-400 group-hover:scale-110 transition-transform" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-teal-300 transition-colors">{feat.title}</h3>
                                            <p className="text-slate-400 leading-relaxed">{feat.desc}</p>
                                        </div>
                                    </motion.div>
                                ))}

                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    whileInView={{ opacity: 1 }}
                                    className="pt-8"
                                >
                                    <Link href="/register" className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-xl font-bold text-lg hover:shadow-[0_0_20px_rgba(20,184,166,0.4)] transition-all hover:-translate-y-1">
                                        Regístrate para generar informes con tu plantilla
                                        <ArrowRight className="w-5 h-5" />
                                    </Link>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 
                  ══════════════════════════════════════════════
                  ETAPA 5 — CARRUSEL DE FUNCIONALIDADES
                  ══════════════════════════════════════════════
                */}
                {/* 
                  ══════════════════════════════════════════════
                  ETAPA 5 — BENTO GRID DE FUNCIONALIDADES
                  ══════════════════════════════════════════════
                */}
                <section id="funcionalidades" className="py-24 bg-slate-50 relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5"></div>
                    
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 border border-teal-100 rounded-full text-teal-600 text-sm font-bold uppercase tracking-widest mb-6"
                            >
                                <Sparkles className="w-4 h-4" />
                                Ecosistema Digital
                            </motion.div>
                            <motion.h2 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.1 }}
                                className="text-3xl sm:text-5xl font-bold text-slate-900 mb-6 tracking-tight"
                            >
                                Todo lo que necesitas, <span className="text-teal-600">perfectamente integrado</span>
                            </motion.h2>
                            <motion.p 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2 }}
                                className="text-lg text-slate-600 leading-relaxed"
                            >
                                ASHIRA no es solo software, es tu centro de comando. Cada herramienta está diseñada para trabajar en armonía y potenciar tu práctica médica.
                            </motion.p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 auto-rows-[300px] gap-6">
                            {/* Card 1: Historial Clínico (Hero - 2x2) */}
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                whileHover={{ y: -5 }}
                                className="md:col-span-2 md:row-span-2 relative group rounded-3xl overflow-hidden shadow-2xl border border-slate-200 bg-white"
                            >
                                <Image 
                                    src="/referencia/Historial.png" 
                                    alt="Historia Clínica" 
                                    fill 
                                    className="object-cover group-hover:scale-105 transition-transform duration-700" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity"></div>
                                <div className="absolute bottom-0 left-0 p-8 sm:p-10 w-full">
                                    <div className="w-14 h-14 bg-teal-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-teal-500/30 group-hover:scale-110 transition-transform">
                                        <FileCheck className="w-7 h-7 text-white" />
                                    </div>
                                    <h3 className="text-2xl sm:text-4xl font-bold text-white mb-3">Historia Clínica Centralizada</h3>
                                    <p className="text-slate-300 text-lg sm:text-xl max-w-lg leading-relaxed">
                                        Accede a antecedentes, alergias, evoluciones y archivos adjuntos al instante. Todo el historial de tu paciente en una vista unificada y elegante.
                                    </p>
                                </div>
                            </motion.div>

                            {/* Card 2: Gestión de Citas */}
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2 }}
                                whileHover={{ y: -5 }}
                                className="relative group rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-white"
                            >
                                <Image 
                                    src="/referencia/Captura de pantalla 2026-02-11 131316.png" 
                                    alt="Citas" 
                                    fill 
                                    className="object-cover group-hover:scale-105 transition-transform duration-700" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 to-transparent opacity-90"></div>
                                <div className="absolute bottom-0 left-0 p-6">
                                    <div className="flex justify-between items-end mb-2">
                                        <Calendar className="w-8 h-8 text-blue-400 mb-2" />
                                        <div className="bg-white/10 backdrop-blur-sm px-2 py-1 rounded text-xs text-white font-mono">AGENDA</div>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-1">Agenda Inteligente</h3>
                                    <p className="text-blue-100 text-sm">Gestiona citas, lista de espera y recordatorios automáticos.</p>
                                </div>
                            </motion.div>

                            {/* Card 3: Chat Pacientes */}
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.3 }}
                                whileHover={{ y: -5 }}
                                className="relative group rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-white"
                            >
                                <Image 
                                    src="/referencia/Captura de pantalla 2026-02-11 131727.png" 
                                    alt="Chat" 
                                    fill 
                                    className="object-cover group-hover:scale-105 transition-transform duration-700" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-purple-900/90 to-transparent opacity-90"></div>
                                <div className="absolute bottom-0 left-0 p-6">
                                    <div className="flex justify-between items-end mb-2">
                                        <MessageCircle className="w-8 h-8 text-purple-400 mb-2" />
                                        <div className="bg-white/10 backdrop-blur-sm px-2 py-1 rounded text-xs text-white font-mono">COMUNICACIÓN</div>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-1">Chat Seguro</h3>
                                    <p className="text-purple-100 text-sm">Comunicación directa con pacientes sin dar tu número personal.</p>
                                </div>
                            </motion.div>

                            {/* Card 4: Resultados Laboratorio */}
                             <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.4 }}
                                whileHover={{ y: -5 }}
                                className="relative group rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-white"
                            >
                                <Image 
                                    src="/referencia/Laboratorio.png" 
                                    alt="Laboratorio" 
                                    fill 
                                    className="object-cover group-hover:scale-105 transition-transform duration-700" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-red-900/90 to-transparent opacity-90"></div>
                                <div className="absolute bottom-0 left-0 p-6">
                                    <Activity className="w-8 h-8 text-red-400 mb-3" />
                                    <h3 className="text-xl font-bold text-white mb-1">Laboratorio Integrado</h3>
                                    <p className="text-red-100 text-sm">Resultados y exámenes adjuntos directamente al expediente.</p>
                                </div>
                            </motion.div>

                             {/* Card 5: Tasas de Cambio */}
                             <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.5 }}
                                whileHover={{ y: -5 }}
                                className="relative group rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-white"
                            >
                                <Image 
                                    src="/referencia/Moneda.png" 
                                    alt="Tasas" 
                                    fill 
                                    className="object-cover group-hover:scale-105 transition-transform duration-700" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-green-900/90 to-transparent opacity-90"></div>
                                <div className="absolute bottom-0 left-0 p-6">
                                    <DollarSign className="w-8 h-8 text-green-400 mb-3" />
                                    <h3 className="text-xl font-bold text-white mb-1">Multimoneda</h3>
                                    <p className="text-green-100 text-sm">Tasa del día (BCV/Paralelo) actualizada automáticamente.</p>
                                </div>
                            </motion.div>

                             {/* Card 6: Pagos */}
                             <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.6 }}
                                whileHover={{ y: -5 }}
                                className="relative group rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-white"
                            >
                                <Image 
                                    src="/referencia/Pagos.png" 
                                    alt="Pagos" 
                                    fill 
                                    className="object-cover group-hover:scale-105 transition-transform duration-700" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-amber-900/90 to-transparent opacity-90"></div>
                                <div className="absolute bottom-0 left-0 p-6">
                                    <CreditCard className="w-8 h-8 text-amber-400 mb-3" />
                                    <h3 className="text-xl font-bold text-white mb-1">Control de Pagos</h3>
                                    <p className="text-amber-100 text-sm">Valida transferencias, reporta ingresos y controla caja.</p>
                                </div>
                            </motion.div>
                        </div>
                        
                        <div className="mt-16 text-center">
                            <Link href="/register" className="inline-flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 hover:scale-105 transition-all shadow-xl hover:shadow-2xl">
                                <span>Explorar todas las funcionalidades</span>
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* 
                  ══════════════════════════════════════════════
                  ETAPA 6 — SOCIAL PROOF
                  ══════════════════════════════════════════════
                */}
                <section id="testimonios" className="py-24 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Médicos que ya transformaron su práctica</h2>
                        </div>

                        {/* Testimonials Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Card 1: Dra. Carwin Silva */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="relative bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
                            >
                                <div className="absolute top-0 right-0 p-6 opacity-20">
                                    <Image 
                                        src="/consultorios/dracarwin/Recurso 26.png" 
                                        alt="NovaFem Logo" 
                                        width={120} 
                                        height={60} 
                                        className="object-contain grayscale invert"
                                    />
                                </div>
                                <div className="relative h-80 w-full">
                                    <Image 
                                        src="/consultorios/dracarwin/IMG_5189.JPG" 
                                        alt="Dra. Carwin Silva" 
                                        fill 
                                        className="object-cover object-center"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
                                </div>
                                <div className="p-8 pt-2 flex-1 flex flex-col justify-between">
                                    <blockquote className="text-xl font-medium text-slate-200 leading-relaxed mb-6">
                                        "Veo un potencial inmenso en ASHIRA. Es la herramienta que los médicos hemos estado esperando para modernizar nuestra gestión diaria sin complicaciones."
                                    </blockquote>
                                    <div>
                                        <cite className="not-italic font-bold text-lg text-white block">Dra. Carwin Silva</cite>
                                        <span className="text-teal-400 text-sm font-medium">Ginecóloga y Obstetra • Embajadora ASHIRA</span>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Card 2: Dra. Lisangela Utrera */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2 }}
                                className="relative bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-xl flex flex-col"
                            >
                                <div className="p-8 flex-1 flex flex-col">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-teal-50 shadow-md relative">
                                            <Image 
                                                src="/consultorios/dralisangela/lisangela.jpeg" 
                                                alt="Dra. Lisangela Utrera" 
                                                fill 
                                                className="object-cover"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex text-amber-500 mb-1">
                                                {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-current" />)}
                                            </div>
                                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Verificado</span>
                                        </div>
                                    </div>
                                    <blockquote className="text-lg text-slate-600 leading-relaxed mb-8 flex-1">
                                        "Lo que más valoro es que <span className="text-slate-900 font-bold bg-teal-50 px-1">respeta mi plantilla de Word de siempre</span>, a diferencia de otros softwares genéricos. Además, grabar la consulta me ahorra muchísimo tiempo."
                                    </blockquote>
                                    <div className="border-t border-slate-100 pt-6">
                                        <cite className="not-italic font-bold text-lg text-slate-900 block">Dra. Lisangela Utrera</cite>
                                        <span className="text-slate-500 text-sm">Ginecóloga y Obstetra</span>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Stats Strip */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 border-t border-slate-100 pt-10">
                            {[
                                { n: "500+", t: "Consultorios" },
                                { n: "40%", t: "Ahorro de Tiempo" },
                                { n: "98%", t: "Satisfacción" },
                                { n: "3 min", t: "Setup Inicial" },
                            ].map((stat, i) => (
                                <div key={i} className="text-center">
                                    <div className="text-3xl font-bold text-slate-900">{stat.n}</div>
                                    <div className="text-sm text-slate-500 font-medium">{stat.t}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 
                  ══════════════════════════════════════════════
                  ETAPA 7 — PRICING & CTA (Cierre)
                  ══════════════════════════════════════════════
                */}
                <section id="precios" className="py-24 bg-slate-50 relative">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Elige tu plan y empieza hoy mismo</h2>
                            
                            {/* Urgency Bar */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-100 inline-block w-full max-w-md">
                                <div className="flex justify-between text-sm font-bold text-orange-700 mb-2">
                                    <span>⚠️ Oferta de Lanzamiento</span>
                                    <span>17 de 20 cupos tomados</span>
                                </div>
                                <div className="h-3 bg-orange-100 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        whileInView={{ width: '85%' }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                        className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Pricing Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
                            {[
                                { 
                                    name: "Mensual", 
                                    price: "70", 
                                    period: "/mes", 
                                    desc: "Facturado mensualmente", 
                                    feats: [
                                        "Historia Clínica Ilimitada",
                                        "Agenda Inteligente (Citas/Llegada)",
                                        "Informes con IA (LLaMA 3)",
                                        "Recetas Digitales e Impresas",
                                        "Recordatorios WhatsApp/Email",
                                        "Control de Ingresos y Gastos",
                                        "Panel de Analíticas",
                                        "Gestión de Pacientes",
                                        "Resultados de Laboratorio",
                                        "Roles (Doctor/Asistente)",
                                        "Acceso Multi-dispositivo",
                                        "Soporte Técnico Estándar"
                                    ] 
                                },
                                { 
                                    name: "Trimestral", 
                                    price: "63", 
                                    period: "/mes", 
                                    desc: "Ahorra 10% (Pago único de €189)", 
                                    popular: true,
                                    feats: [
                                        "Historia Clínica Ilimitada",
                                        "Agenda Inteligente (Citas/Llegada)",
                                        "Informes con IA (LLaMA 3)",
                                        "Recetas Digitales e Impresas",
                                        "Recordatorios WhatsApp/Email",
                                        "Control de Ingresos y Gastos",
                                        "Panel de Analíticas",
                                        "Gestión de Pacientes",
                                        "Resultados de Laboratorio",
                                        "Roles (Doctor/Asistente)",
                                        "Acceso Multi-dispositivo",
                                        "Migración de Datos Gratis",
                                        "Soporte Prioritario VIP"
                                    ]
                                },
                                { 
                                    name: "Anual", 
                                    price: "49", 
                                    period: "/mes", 
                                    desc: "Ahorra 30% (Mejor Inversión)", 
                                    bestValue: true,
                                    feats: [
                                        "TODO lo del plan Trimestral",
                                        "Ahorras €252 al año",
                                        "Configuración Asistida (Zoom)",
                                        "Capacitación a Personal",
                                        "Auditoría Anual de Datos",
                                        "Prioridad en Nuevas Funciones"
                                    ] 
                                },
                            ].map((plan, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className={`relative bg-white rounded-3xl p-8 shadow-xl border-2 flex flex-col ${plan.popular ? 'border-teal-500 scale-105 z-10 ring-4 ring-teal-500/10' : 'border-transparent hover:border-slate-200'} transition-all duration-300`}
                                >
                                    {plan.popular && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-teal-600 text-white px-6 py-1.5 rounded-full text-sm font-bold shadow-lg tracking-wide uppercase">MÁS ELEGIDO</div>}
                                    {plan.bestValue && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-1.5 rounded-full text-sm font-bold shadow-lg tracking-wide uppercase">MEJOR VALOR</div>}
                                    
                                    <div className="mb-6 text-center border-b border-slate-100 pb-6">
                                        <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                                        <div className="flex items-center justify-center gap-1 mb-2">
                                            <span className="text-5xl font-extrabold text-slate-900 tracking-tight">€{plan.price}</span>
                                            <span className="text-slate-500 font-medium self-end mb-2">{plan.period}</span>
                                        </div>
                                        <p className={`text-sm font-medium ${plan.bestValue ? 'text-green-600' : 'text-slate-500'}`}>{plan.desc}</p>
                                    </div>

                                    <div className="flex-1 mb-8">
                                        <ul className="space-y-3">
                                            {plan.feats.map((feat, f) => (
                                                <li key={f} className="flex items-start gap-3 text-sm text-slate-600 leading-snug">
                                                    <CheckCircle2 className={`w-5 h-5 shrink-0 ${plan.popular || plan.bestValue ? 'text-teal-500' : 'text-slate-400'}`} />
                                                    {feat}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <Link 
                                        href="/register" 
                                        className={`w-full py-4 rounded-xl font-bold text-center transition-all transform hover:-translate-y-1 ${
                                            plan.popular 
                                            ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-lg hover:shadow-teal-500/30' 
                                            : plan.bestValue
                                            ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                        }`}
                                    >
                                        Elegir Plan {plan.name}
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* FAQ Section */}
                <section id="faq" className="py-20 bg-white">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">Preguntas Frecuentes</h2>
                        <div className="space-y-4">
                            {[
                                { q: "¿Necesito tarjeta de crédito para registrarme?", a: "No. Puedes registrarte y configurar tu consultorio totalmente gratis. Solo pagas cuando estés listo para suscribirte a un plan." },
                                {
                                    q: "¿Necesito instalar algo en mi computadora?",
                                    a: "No. ASHIRA funciona 100% en la nube. Solo necesitas un navegador (Chrome, Safari, Edge) y conexión a internet."
                                },
                                {
                                    q: "¿Mis datos están seguros?",
                                    a: "Absolutamente. Usamos encriptación de grado bancario y copias de seguridad automáticas diarias."
                                },
                                {
                                    q: "¿Funciona con internet lento?",
                                    a: "Sí. ASHIRA está optimizada para cargar rápido incluso en conexiones inestables."
                                }
                            ].map((item, i) => (
                                <details key={i} className="group bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                                    <summary className="flex items-center justify-between p-4 cursor-pointer font-medium text-slate-900 hover:bg-slate-100 transition-colors list-none">
                                        {item.q}
                                        <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
                                    </summary>
                                    <div className="px-4 pb-4 pt-0 text-slate-600 text-sm leading-relaxed">
                                        {item.a}
                                    </div>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Final CTA Hero */}
                <section className="py-20 bg-teal-600 text-white text-center relative overflow-hidden">
                     <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
                     <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="max-w-4xl mx-auto px-4 relative z-10"
                    >
                        <h2 className="text-3xl sm:text-5xl font-bold mb-6">Comienza a ahorrar tiempo hoy mismo</h2>
                        <p className="text-teal-100 text-lg sm:text-xl mb-8 max-w-2xl mx-auto">
                            Únete a los 500+ consultorios que ya digitalizaron su práctica médica con ASHIRA.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/register" className="px-8 py-4 bg-white text-teal-700 font-bold rounded-xl shadow-xl hover:shadow-2xl hover:bg-teal-50 transition-all transform hover:-translate-y-1">
                                Comenzar Gratis
                            </Link>
                            <a href="https://wa.me/584124885623" target="_blank" className="px-8 py-4 bg-teal-700 text-white font-bold rounded-xl border border-teal-500 hover:bg-teal-800 transition-all flex items-center justify-center gap-2">
                                <MessageCircle className="w-5 h-5" />
                                Contactar Ventas
                            </a>
                        </div>
                     </motion.div>
                </section>
            </main>

            {/* Sticky Mobile CTA */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-2xl md:hidden z-40 flex items-center gap-3">
                 <Link href="/register" className="flex-1 bg-teal-600 text-white font-bold py-3 rounded-lg text-center shadow-md">
                    Comenzar Gratis
                 </Link>
                 <a href="https://wa.me/584124885623" className="p-3 bg-green-500 text-white rounded-lg shadow-md">
                    <MessageCircle className="w-6 h-6" />
                 </a>
            </div>

            {/* Floating WhatsApp Button (Desktop) */}
            <a 
                href="https://wa.me/584124885623" 
                target="_blank" 
                className="hidden md:flex fixed bottom-8 right-8 z-50 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-2xl transition-transform hover:scale-110 items-center justify-center group"
            >
                <MessageCircle className="w-8 h-8" />
                <span className="absolute right-full mr-4 bg-white text-slate-800 px-3 py-1 rounded-lg shadow-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    ¡Hablemos por WhatsApp!
                </span>
            </a>
        </div>
    );
}
