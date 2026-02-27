'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { 
  Stethoscope, User, Calendar, FileText, Shield, Clock, CheckCircle2, 
  ArrowRight, Zap, Activity, TrendingUp, DollarSign, Globe, MessageCircle, 
  Bell, FileCheck, Users, Settings, BarChart3, CreditCard, Link2, Upload, 
  Download, Star, Sparkles, Target, Rocket, Timer, Save, Building2, 
  Instagram, Heart, MapPin, AlertCircle, Play, ChevronDown, ChevronRight,
  Menu, X, Mic, Wand2, BrainCircuit, FileJson, LayoutGrid, Network, 
  Files, PieChart, Lock, UserPlus, Receipt
} from 'lucide-react';
import Head from 'next/head';
import { VoiceDemo } from './VoiceDemo';
import { MultiSedeCalculator } from './MultiSedeCalculator';
import { MultiSedeExplainer } from './MultiSedeExplainer';

// --- SEO & Schema Components ---
const SEOMetadata = () => (
    <>
        <title>ASHIRA para Clínicas | Centro de Comando Médico Unificado</title>
        <meta name="description" content="Unifica la gestión de todos tus especialistas en un solo panel. Agendas centralizadas, historias clínicas compartidas y control financiero total. La plataforma #1 para clínicas en Latinoamérica." />
        <meta name="keywords" content="software clínica venezuela, sistema gestión clínica multiprofesional, historia clínica unificada, software médico administrativo" />
        <link rel="canonical" href="https://ashira.click/landing/clinicas" />
        <meta property="og:title" content="ASHIRA — Centro de Comando para Clínicas" />
        <meta property="og:description" content="¿Tu clínica es un caos de agendas separadas? Unifica todo en un solo sistema inteligente." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://ashira.click/landing/clinicas" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="ASHIRA — Software Integral para Clínicas" />
        <meta name="twitter:description" content="Control total para directores médicos y gerentes." />
    </>
);

const SchemaJSON = () => {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "ASHIRA Clinic",
        "applicationCategory": "HealthApplication",
        "operatingSystem": "Web",
        "description": "Sistema de gestión integral para clínicas y centros médicos multiprofesionales.",
        "offers": {
            "@type": "AggregateOffer",
            "lowPrice": "56",
            "priceCurrency": "EUR"
        },
         "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "reviewCount": "120"
        }
    };
    
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
                setTimeout(() => setIsDeleting(true), 2000);
            } else if (isDeleting && currentText === '') {
                setIsDeleting(false);
                setCurrentTextIndex((prev) => (prev + 1) % texts.length);
            }
        }, isDeleting ? 30 : 50);

        return () => clearTimeout(timeout);
    }, [currentText, isDeleting, currentTextIndex, texts]);

    return (
        <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
            {currentText}
            <span className="animate-blink text-purple-600">|</span>
        </span>
    );
};

const CountUpAnimation = ({ end, duration = 2000, suffix = "" }: { end: number, duration?: number, suffix?: string }) => {
    const [count, setCount] = useState(0);
    const nodeRef = React.useRef(null);
    const isInView = useInView(nodeRef, { once: true });

    useEffect(() => {
        if (!isInView) return;

        let startTime: number | null = null;
        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);
            
            setCount(Math.floor(end * percentage));

            if (progress < duration) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }, [end, duration, isInView]);

    return <span ref={nodeRef}>{count}{suffix}</span>;
}

// Helper hook for Intersection Observer
import { useRef } from "react";
function useInView(ref: React.RefObject<any>, options: { once?: boolean } = {}) {
    const [isInView, setIsInView] = useState(false);
    
    useEffect(() => {
        if (!ref.current) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsInView(true);
                if (options.once) observer.disconnect();
            } else if (!options.once) {
                setIsInView(false);
            }
        });
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [ref, options.once]);

    return isInView;
}


// --- Main Page Component ---

export default function ClinicasLandingPage() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly' | 'annual'>('annual');

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-600 selection:bg-purple-100 selection:text-purple-700">
            <Head>
                <SEOMetadata />
            </Head>
            <SchemaJSON />

            {/* --- Navigation --- */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-[0_0_15px_rgba(147,51,234,0.3)] group-hover:shadow-[0_0_25px_rgba(147,51,234,0.5)] transition-all">
                                A
                            </div>
                            <span className="text-2xl font-bold text-slate-800 tracking-tight">ASHIRA</span>
                        </Link>

                        {/* Desktop Nav */}
                        <nav className="hidden md:flex items-center gap-8">
                            <Link href="/landing/consultorios" className="text-sm font-medium text-slate-600 hover:text-purple-600 transition-colors">Para Consultorios</Link>
                            <Link href="#funcionalidades" className="text-sm font-medium text-slate-600 hover:text-purple-600 transition-colors">Funcionalidades</Link>
                            <Link href="#precios" className="text-sm font-medium text-slate-600 hover:text-purple-600 transition-colors">Precios</Link>
                            <Link href="#faq" className="text-sm font-medium text-slate-600 hover:text-purple-600 transition-colors">FAQ</Link>
                        </nav>

                        {/* CTAs Desktop */}
                        <div className="hidden md:flex items-center gap-4">
                            <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-purple-700 px-4 py-2">
                                Login
                            </Link>
                            <Link 
                                href="https://wa.me/584124885623" target="_blank"
                                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
                            >
                                Solicitar Demo
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
                            className="md:hidden bg-white border-b border-slate-200 overflow-hidden"
                        >
                            <div className="px-4 py-6 space-y-4">
                                <Link href="/landing/consultorios" className="block text-slate-600 hover:text-purple-600" onClick={() => setIsMenuOpen(false)}>Para Consultorios</Link>
                                <Link href="#funcionalidades" className="block text-slate-600 hover:text-purple-600" onClick={() => setIsMenuOpen(false)}>Funcionalidades</Link>
                                <Link href="#precios" className="block text-slate-600 hover:text-purple-600" onClick={() => setIsMenuOpen(false)}>Precios</Link>
                                <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                                    <Link href="/login" className="w-full py-3 text-center text-slate-600 font-semibold border border-slate-200 rounded-xl">Inicia Sesión</Link>
                                    <Link href="https://wa.me/584124885623" className="w-full py-3 text-center bg-slate-900 text-white font-bold rounded-xl">Solicitar Demo</Link>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            <main>
                {/* 
                  ══════════════════════════════════════════════
                  SECCIÓN 1 — HERO: "El Dolor y la Promesa"
                  ══════════════════════════════════════════════
                */}
                <section className="relative pt-28 pb-32 lg:pt-32 lg:pb-40 overflow-hidden bg-white">
                    {/* Background Effects */}
                    <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03] pointer-events-none"></div>
                    <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-purple-200/40 rounded-full blur-[100px] pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-200/40 rounded-full blur-[100px] pointer-events-none"></div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="flex flex-col lg:flex-row items-center gap-16">
                            
                            {/* Text Content */}
                            <div className="flex-1 text-center lg:text-left">
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-50 border border-purple-100 rounded-full mb-8 backdrop-blur-sm shadow-sm"
                                >
                                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                                    <span className="text-sm font-semibold text-purple-700 tracking-wide uppercase">Para Clínicas de 2 a 200+ Especialistas</span>
                                </motion.div>

                                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1] mb-6">
                                    ¿Cuánto pierde tu clínica cada día por falta de <br className="hidden lg:block"/>
                                    <TypewriterEffect texts={[
                                        "control real?",
                                        "datos unificados?",
                                        "integración?"
                                    ]} />
                                </h1>

                                <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                                    ASHIRA unifica a todos tus especialistas en un solo panel. Agenda, pacientes, transacciones, laboratorio y comunicación — <strong className="text-slate-900">todo centralizado, en tiempo real.</strong>
                                </p>

                                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
                                    <a 
                                        href="https://wa.me/584124885623?text=Hola,%20me%20interesa%20una%20demo%20de%20ASHIRA%20para%20mi%20cl%C3%ADnica." 
                                        target="_blank"
                                        className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-[0_10px_20px_rgba(147,51,234,0.25)] hover:shadow-[0_15px_30px_rgba(147,51,234,0.4)] transition-all transform hover:-translate-y-1"
                                    >
                                        <Building2 className="w-5 h-5" />
                                        Solicitar Demo Personalizada
                                    </a>
                                    <Link 
                                        href="#funcionalidades"
                                        className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-700 font-semibold border border-slate-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all shadow-sm hover:shadow-md"
                                    >
                                        Ver Funcionalidades
                                    </Link>
                                </div>

                                {/* Animated Stats */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 border-t border-slate-100 pt-8">
                                    {[
                                        { val: 500, suffix: "+", label: "Médicos Activos" },
                                        { val: 40, suffix: "%", label: "Menos Carga Admin" },
                                        { val: 1, suffix: "", label: "Solo Panel Unificado" },
                                    ].map((stat, i) => (
                                        <div key={i} className="text-left">
                                            <div className="text-3xl font-bold text-slate-900 mb-1">
                                                <CountUpAnimation end={stat.val} suffix={stat.suffix} />
                                            </div>
                                            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">{stat.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Dashboard Mockup (CSS/HTML Simulated) */}
                            <motion.div 
                                className="flex-1 w-full max-w-[600px] lg:max-w-none perspective-1000"
                                initial={{ opacity: 0, rotateY: -10, x: 50 }}
                                animate={{ opacity: 1, rotateY: 0, x: 0 }}
                                transition={{ duration: 1 }}
                            >
                                <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-purple-900/10 overflow-hidden aspect-[16/10] group hover:border-purple-200 transition-colors duration-500">
                                    {/* Sidebar */}
                                    <div className="absolute top-0 bottom-0 left-0 w-16 sm:w-20 bg-slate-50 border-r border-slate-100 flex flex-col items-center py-6 gap-6">
                                        <div className="w-8 h-8 bg-purple-600 rounded-lg shadow-lg shadow-purple-200"></div>
                                        <div className="space-y-4 w-full px-4">
                                            {[1,2,3,4,5].map(i => (
                                                <div key={i} className={`h-8 w-full rounded-lg ${i===1 ? 'bg-white border-l-2 border-purple-500 shadow-sm' : 'bg-slate-200/50'} `}></div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Topbar */}
                                    <div className="absolute top-0 left-16 sm:left-20 right-0 h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6">
                                        <div className="h-4 w-32 bg-slate-100 rounded"></div>
                                        <div className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100"></div>
                                            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-xs font-bold border border-purple-100">JD</div>
                                        </div>
                                    </div>

                                    {/* Main Content Area */}
                                    <div className="absolute top-16 left-16 sm:left-20 right-0 bottom-0 p-6 bg-slate-50/50">
                                        {/* Mock KPI Cards */}
                                        <div className="grid grid-cols-3 gap-4 mb-6">
                                            {[
                                                { label: "Esp. Activos", val: "12 / 30", color: "text-purple-600", bg: "bg-purple-50 border-purple-100" },
                                                { label: "Citas Hoy", val: "84", color: "text-slate-900", bg: "bg-white border-slate-200" },
                                                { label: "Ingresos (Est)", val: "$4,200", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
                                            ].map((kpi, i) => (
                                                <div key={i} className={`border p-4 rounded-xl shadow-sm ${kpi.bg}`}>
                                                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">{kpi.label}</div>
                                                    <div className={`text-xl font-bold ${kpi.color}`}>{kpi.val}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Mock Table */}
                                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                            <div className="p-3 border-b border-slate-100 flex gap-4 text-xs font-bold text-slate-500 uppercase bg-slate-50">
                                                <div className="w-1/3">Especialista</div>
                                                <div className="w-1/3">Estado</div>
                                                <div className="w-1/3 text-right">Pacientes</div>
                                            </div>
                                            {[
                                                { name: "Dr. Pérez", spec: "Cardiología", status: "En Consulta", stColor: "bg-emerald-500", pts: 12 },
                                                { name: "Dra. Silva", spec: "Ginecología", status: "Disponible", stColor: "bg-blue-500", pts: 8 },
                                                { name: "Dr. Gómez", spec: "Pediatría", status: "En Consulta", stColor: "bg-emerald-500", pts: 15 },
                                                { name: "Dra. Rojo", spec: "Nutrición", status: "Descanso", stColor: "bg-slate-400", pts: 0 },
                                            ].map((row, i) => (
                                                <div key={i} className="p-3 border-b border-slate-50 flex items-center gap-4 text-sm hover:bg-slate-50 transition-colors">
                                                    <div className="w-1/3">
                                                        <div className="text-slate-900 font-medium">{row.name}</div>
                                                        <div className="text-xs text-slate-500">{row.spec}</div>
                                                    </div>
                                                    <div className="w-1/3">
                                                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-600">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${row.stColor} animate-pulse`}></div>
                                                            {row.status}
                                                        </div>
                                                    </div>
                                                    <div className="w-1/3 text-right text-slate-500 font-mono">{row.pts}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Glass Overlay Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 to-transparent pointer-events-none"></div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* 
                  ══════════════════════════════════════════════
                  SECCIÓN 2 — EL PROBLEMA (Cards Interactivas)
                  ══════════════════════════════════════════════
                */}
                <section className="py-24 bg-slate-50 relative">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Sabemos cómo se ve una clínica sin sistema central</h2>
                            <p className="text-slate-600">¿Te suenan familiares estos problemas?</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[
                                { icon: User, title: "Pacientes en el Limbo", desc: "Tus especialistas manejan sus propias agendas. Si uno falta, nadie más sabe a quién contactar." },
                                { icon: DollarSign, title: "Finanzas Ciegas", desc: "No sabes cuánto generó cada especialidad este mes sin revisar 10 hojas de cálculo distintas." },
                                { icon: Files, title: "Historiales Fragmentados", desc: "Un paciente visto por 3 especialistas tiene 3 expedientes distintos. Ineficiente y peligroso." },
                                { icon: MessageCircle, title: "Caos en Recepción", desc: "Tu equipo gestiona todo por WhatsApp y cuadernos. Errores humanos garantizados a diario." },
                                { icon: UserPlus, title: "Fuga de Información", desc: "Cuando un especialista se va de la clínica, se lleva los datos de sus pacientes con él." },
                            ].map((pain, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="group bg-white p-8 rounded-2xl border border-red-100 hover:border-purple-200 transition-all duration-500 hover:-translate-y-2 relative overflow-hidden shadow-sm hover:shadow-xl hover:shadow-purple-900/5"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-transparent group-hover:from-purple-50/50 transition-colors duration-500"></div>
                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-6 border border-slate-100 shadow-sm group-hover:border-purple-100 group-hover:shadow-[0_0_15px_rgba(147,51,234,0.15)] transition-all">
                                        <pain.icon className="w-6 h-6 text-red-500 group-hover:text-purple-600 transition-colors duration-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-purple-700 transition-colors">{pain.title}</h3>
                                    <p className="text-slate-600 leading-relaxed text-sm">{pain.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 
                  ══════════════════════════════════════════════
                  SECCIÓN 3 — SOLUCIÓN (Split Screen + Mockup)
                  ══════════════════════════════════════════════
                */}
                <section className="py-24 overflow-hidden relative bg-white">
                    <div className="absolute top-1/2 left-0 w-[800px] h-[800px] bg-indigo-50 rounded-full blur-[120px] -translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
                            
                            {/* Content */}
                            <div className="order-2 lg:order-1">
                                <div className="inline-block px-3 py-1 bg-purple-50 border border-purple-100 rounded-full text-purple-600 text-xs font-bold uppercase tracking-widest mb-6">
                                    Centro de Comando Unificado
                                </div>
                                <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-8 leading-tight">
                                    No son 30 consultorios digitales. <br/>
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">Es UNA clínica inteligente.</span>
                                </h2>
                                
                                <div className="space-y-8">
                                    {[
                                        { title: "Control Total", desc: "Desde la recepción hasta el consultorio, todos trabajan en la misma plataforma sincronizada." },
                                        { title: "Decisiones con Datos", desc: "Reportes automáticos de rendimiento por médico, especialidad y sede." },
                                        { title: "Escalable", desc: "Añade nuevos especialistas, sedes o servicios en segundos, sin complicaciones técnicas." }
                                    ].map((feat, i) => (
                                        <div key={i} className="flex gap-4">
                                            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 shadow-sm">
                                                <CheckCircle2 className="w-5 h-5 text-purple-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-900 mb-2">{feat.title}</h3>
                                                <p className="text-slate-600 leading-relaxed">{feat.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Mockup Animation */}
                            <div className="order-1 lg:order-2">
                                <motion.div 
                                    className="relative"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.8 }}
                                >
                                    <div className="absolute inset-0 bg-purple-200 rounded-3xl blur-[60px] opacity-40"></div>
                                    <div className="relative bg-white border border-slate-200 rounded-3xl p-2 shadow-2xl">
                                        <Image 
                                            src="/referencia/Captura de pantalla 2026-02-11 131316.png" // Use your actual asset path
                                            alt="Dashboard Admin" 
                                            width={800} 
                                            height={600} 
                                            className="rounded-2xl w-full h-auto"
                                        />
                                        
                                        {/* Floating Badge */}
                                        <motion.div 
                                            animate={{ y: [0, -10, 0] }}
                                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                            className="absolute -bottom-6 -left-6 bg-white border border-slate-200 p-4 rounded-xl shadow-xl flex items-center gap-4"
                                        >
                                            <div className="bg-emerald-50 p-2 rounded-lg">
                                                <TrendingUp className="w-6 h-6 text-emerald-600" />
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-500 uppercase font-bold">Ingresos Mensuales</div>
                                                <div className="text-xl font-bold text-slate-900">+24% vs mes anterior</div>
                                            </div>
                                        </motion.div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 
                  ══════════════════════════════════════════════
                  SECCIÓN 4 — FUNCIONALIDADES CLAVE (Bento)
                  ══════════════════════════════════════════════
                */}
                <section id="funcionalidades" className="py-24 bg-slate-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-6">Un sistema operativo completo</h2>
                            <p className="text-slate-600 max-w-2xl mx-auto text-lg">
                                Cada herramienta diseñada específicamente para coordinar equipos médicos de alto rendimiento.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[
                                { 
                                    icon: LayoutGrid, 
                                    title: "Centro de Mando", 
                                    desc: "Visualiza especialistas activos, ocupación de consultorios y flujo de pacientes en tiempo real.",
                                    features: ["Panel unificado", "Vista por sede", "KPIs en vivo"]
                                },
                                { 
                                    icon: Files, 
                                    title: "Historial Clínico Único", 
                                    desc: "Un paciente, un expediente. Accesible por ginecología, pediatría y medicina interna simultáneamente.",
                                    features: ["Sin duplicados", "Permisos por rol", "Adjuntos ilimitados"]
                                },
                                { 
                                    icon: Calendar, 
                                    title: "Agenda Inteligente", 
                                    desc: "Tu recepción ve de un vistazo quién tiene cupo. Sugerencia automática de huecos disponibles.",
                                    features: ["Multi-especialista", "Recordatorios WhatsApp", "Lista de espera"]
                                },
                                { 
                                    icon: Receipt, 
                                    title: "Reporte de Ingresos", 
                                    desc: "Registro detallado de transacciones por médico. Soporte multimoneda (USD/Bs) referencial.",
                                    features: ["Registro de pagos", "Honorarios médicos", "Histórico de cobros"]
                                },
                                { 
                                    icon: Wand2, 
                                    title: "IA Médica (LLaMA 3)", 
                                    desc: "Tus médicos dictan, ASHIRA escribe. Reduce el tiempo de documentación de 15 min a 45 seg.",
                                    features: ["Dictado de voz", "Plantillas propias", "Respeto de contexto"]
                                },
                                { 
                                    icon: Shield, 
                                    title: "Gestión Segura", 
                                    desc: "Roles estrictos para Recepción y Administración. Nadie ve datos clínicos sin autorización.",
                                    features: ["Logs de auditoría", "Roles granulares", "Backups diarios"]
                                }
                            ].map((block, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-white rounded-3xl p-8 border border-slate-200 hover:border-purple-300 group transition-all duration-300 hover:shadow-2xl hover:shadow-purple-900/10"
                                >
                                    <div className="w-14 h-14 bg-slate-50 group-hover:bg-purple-50 rounded-2xl flex items-center justify-center mb-6 transition-colors border border-slate-100 group-hover:border-purple-200">
                                        <block.icon className="w-7 h-7 text-purple-600" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-3">{block.title}</h3>
                                    <p className="text-slate-600 mb-6 leading-relaxed min-h-[72px]">{block.desc}</p>
                                    
                                    <ul className="space-y-3 pt-6 border-t border-slate-100">
                                        {block.features.map((f, index) => (
                                            <li key={index} className="flex items-center gap-2 text-sm text-slate-500 group-hover:text-slate-700">
                                                <CheckCircle2 className="w-4 h-4 text-purple-300 group-hover:text-purple-500" />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 
                  ══════════════════════════════════════════════
                  SECCIÓN 5 — PLANES Y PRECIOS
                  ══════════════════════════════════════════════
                */}
                <section id="precios" className="py-24 relative overflow-hidden bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-6">Precios justos por volumen</h2>
                            <p className="text-slate-600 text-lg mb-8">Elige el plan según el tamaño de tu equipo médico.</p>
                            
                            {/* Toggle */}
                            <div className="inline-flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                                {['monthly', 'quarterly', 'annual'].map((period) => (
                                    <button 
                                        key={period}
                                        onClick={() => setBillingCycle(period as any)}
                                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all relative ${billingCycle === period ? 'bg-white text-purple-700 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-900'}`}
                                    >
                                        {period === 'monthly' && 'Mensual'}
                                        {period === 'quarterly' && 'Trimestral (-10%)'}
                                        {period === 'annual' && 'Anual (-30%)'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 lg:items-end">
                            {[
                                { name: "Starter", tier: "Grupos Pequeños", range: "2–10 Especialistas", price: 56, limit: "1.500", highlight: false },
                                { name: "Clínica", tier: "Centros Medianos", range: "11–30 Especialistas", price: 49, limit: "5.000", highlight: true },
                                { name: "Pro", tier: "Clínicas Tipo B", range: "31–80 Especialistas", price: 42, limit: "15.000", highlight: false },
                                { name: "Enterprise", tier: "Grandes Inst.", range: "81–200 Especialistas", price: 35, limit: "40.000", highlight: false },
                            ].map((plan, i) => {
                                const basePrice = plan.price;
                                const discount = billingCycle === 'quarterly' ? 0.9 : billingCycle === 'annual' ? 0.7 : 1;
                                const finalPrice = Math.round(basePrice * discount);

                                return (
                                    <motion.div 
                                        key={i}
                                        initial={{ opacity: 0, y: 30 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className={`relative bg-white rounded-2xl p-6 border flex flex-col ${plan.highlight ? 'border-purple-500 shadow-xl shadow-purple-900/10 z-10 scale-105 ring-4 ring-purple-50' : 'border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all'}`}
                                    >
                                        {plan.highlight && (
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-purple-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                                                Más Popular
                                            </div>
                                        )}
                                        <div className="mb-4">
                                            <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                                            <div className="text-xs text-slate-500 font-medium uppercase">{plan.tier}</div>
                                        </div>
                                        <div className="mb-6">
                                            <div className="flex items-end gap-1">
                                                <span className="text-3xl font-bold text-slate-900">€{finalPrice}</span>
                                                <span className="text-xs text-slate-500 mb-1">/especialista/mes</span>
                                            </div>
                                            <div className="text-xs text-purple-600 mt-1 font-medium">{plan.range}</div>
                                        </div>
                                        <div className="space-y-3 mb-6 flex-1">
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <Users className="w-3 h-3 text-slate-400" />
                                                <span>Hasta <strong>{plan.limit}</strong> pacientes</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <CheckCircle2 className="w-3 h-3 text-slate-400" />
                                                <span>Soporte Prioritario</span>
                                            </div>
                                        </div>
                                        <Link href="/register?role=ADMIN" className={`w-full py-3 rounded-lg text-sm font-bold text-center transition-all ${plan.highlight ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                            Elegir Plan
                                        </Link>
                                    </motion.div>
                                );
                            })}

                            {/* Custom Plan Card */}
                            <motion.div 
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700 flex flex-col justify-center text-center h-full shadow-lg"
                            >
                                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                                    <Building2 className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">Personalizado</h3>
                                <p className="text-xs text-slate-300 mb-6">Para instituciones de 200+ especialistas.</p>
                                <a href="https://wa.me/584124885623" target="_blank" className="w-full py-3 border border-white/20 hover:bg-white/10 rounded-lg text-sm font-bold text-white transition-all">
                                    Contactar
                                </a>
                            </motion.div>
                        </div>
                        
                        <p className="text-center text-xs text-slate-500 mt-8 mb-16">
                            *Precios en Euros. Facturación disponible en moneda local al cambio BCV del día.
                        </p>

                        {/* --- ADD-ON SEDES TABLE --- */}
                        <div className="max-w-4xl mx-auto mb-16">
                            <h3 className="text-xl font-bold text-slate-900 text-center mb-6">Add-on Multi-Sede — Para instituciones con sucursales</h3>
                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                            <tr>
                                                <th className="px-6 py-4"># de Sedes</th>
                                                <th className="px-6 py-4">Costo por sede adicional</th>
                                                <th className="px-6 py-4">Incluye</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            <tr>
                                                <td className="px-6 py-4 font-bold text-slate-900">1ª Sede</td>
                                                <td className="px-6 py-4 text-emerald-600 font-bold">Incluida siempre</td>
                                                <td className="px-6 py-4 text-slate-600">Configuración completa</td>
                                            </tr>
                                            <tr>
                                                <td className="px-6 py-4 font-bold text-slate-900">2ª – 4ª Sede</td>
                                                <td className="px-6 py-4 font-medium">+€45 <span className="text-slate-400 text-xs text-normal">/sede/mes</span></td>
                                                <td className="px-6 py-4 text-slate-600">Agenda, staff y caja propia</td>
                                            </tr>
                                            <tr>
                                                <td className="px-6 py-4 font-bold text-slate-900">5ª – 10ª Sede</td>
                                                <td className="px-6 py-4 font-medium">+€30 <span className="text-slate-400 text-xs text-normal">/sede/mes</span></td>
                                                <td className="px-6 py-4 text-slate-600">Todo lo anterior + descuento volumen</td>
                                            </tr>
                                            <tr>
                                                <td className="px-6 py-4 font-bold text-slate-900">11+ Sedes</td>
                                                <td className="px-6 py-4 font-medium text-purple-600">Cotización directa</td>
                                                <td className="px-6 py-4 text-slate-600">Plan institucional personalizado</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <p className="text-center text-[10px] text-slate-400 mt-4 max-w-2xl mx-auto">
                                El plan base se determina por el TOTAL de especialistas en todas tus sedes combinadas, no por sede individual. Los descuentos trimestrales y anuales aplican sobre el total completo (plan + sedes).
                            </p>
                        </div>
                    </div>
                </section>

                {/* --- CALCULATOR SECTION --- */}
                <MultiSedeCalculator />

                {/* --- EXPLAINER SECTION --- */}
                <MultiSedeExplainer />

                {/* 
                  ══════════════════════════════════════════════
                  SECCIÓN 6 — COMPARATIVA
                  ══════════════════════════════════════════════
                */}
                <section className="py-24 bg-slate-50">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h2 className="text-3xl font-bold text-slate-900 text-center mb-16">¿Por qué ASHIRA?</h2>
                        
                        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="grid grid-cols-4 bg-slate-50 p-4 border-b border-slate-200 text-sm font-bold text-slate-700">
                                <div className="col-span-2">Criterio</div>
                                <div className="text-center text-slate-500">Genérico</div>
                                <div className="text-center text-purple-600">ASHIRA</div>
                            </div>
                            
                            {[
                                "Historial clínico unificado entre especialistas",
                                "Soporte nativo Multimoneda (BCV/Paralelo)",
                                "IA generativa para informes médicos (LLaMA 3)",
                                "Chat interno seguro para el equipo",
                                "Migración de datos históricos incluida",
                            ].map((item, i) => (
                                <div key={i} className="grid grid-cols-4 p-5 border-b border-slate-100 items-center hover:bg-slate-50 transition-colors">
                                    <div className="col-span-2 text-slate-600 text-sm font-medium">{item}</div>
                                    <div className="text-center flex justify-center"><X className="w-5 h-5 text-red-500/30" /></div>
                                    <div className="text-center flex justify-center"><CheckCircle2 className="w-5 h-5 text-purple-600" /></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 
                  ══════════════════════════════════════════════
                  SECCIÓN 7 — TIMELINE DE IMPLEMENTACIÓN
                  ══════════════════════════════════════════════
                */}
                <section className="py-24 relative bg-white">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold text-slate-900 mb-4">Tu clínica operativa en 5 días</h2>
                            <p className="text-slate-500">Sin detener tu operación actual.</p>
                        </div>

                        <div className="relative">
                            {/* Line */}
                            <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 hidden md:block"></div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                {[
                                    { day: "Día 1", title: "Demo", desc: "Análisis de necesidades", icon: MessageCircle },
                                    { day: "Día 2-3", title: "Config", desc: "Carga de datos y roles", icon: Settings },
                                    { day: "Día 4", title: "Capacitación", desc: "Entrenamiento al staff", icon: Users },
                                    { day: "Día 5", title: "Go Live", desc: "Inicio de operaciones", icon: Rocket, color: "purple" },
                                ].map((step, i) => (
                                    <motion.div 
                                        key={i}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.2 }}
                                        className="relative bg-white p-6 rounded-2xl border border-slate-200 z-10 text-center group hover:border-purple-300 transition-colors shadow-sm"
                                    >
                                        <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4 border-4 border-white ${step.color === 'purple' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'bg-slate-100 text-slate-500'}`}>
                                            <step.icon className="w-5 h-5" />
                                        </div>
                                        <div className="text-xs font-bold text-purple-600 uppercase mb-1">{step.day}</div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                                        <p className="text-sm text-slate-500">{step.desc}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* 
                  ══════════════════════════════════════════════
                  SECCIÓN 8 — TESTIMONIOS Y FAQ
                  ══════════════════════════════════════════════
                */}
                <section id="faq" className="py-24 bg-slate-50">
                    <div className="max-w-3xl mx-auto px-4">
                        <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Preguntas de Directores Médicos</h2>
                        <div className="space-y-4">
                            {[
                                { q: "¿Se mezcla la información de mis pacientes entre médicos?", a: "No. El sistema tiene 'silos' de privacidad por defecto. Un médico solo ve sus pacientes, a menos que el director o el paciente autoricen una interconsulta compartida." },
                                { q: "¿Qué pasa si se va el internet en la clínica?", a: "ASHIRA es ligera y funciona con datos móviles básicos. Además, los datos se guardan en tiempo real, así que nunca pierdes información si se corta la conexión." },
                                { q: "¿Cómo se calcula el precio si mi clínica tiene varias sedes?", a: "El plan base se determina por el total de especialistas en todas tus sedes sumadas. Por ejemplo: si tienes 60 especialistas en Sede A y 30 en Sede B, el total es 90 → Plan Enterprise. Luego, la primera sede es gratis y cada sede adicional tiene un costo fijo mensual (€45 para sedes 2–4, €30 para sedes 5–10). Usa nuestra calculadora arriba para ver tu precio exacto." },
                                { q: "¿Cada sede puede tener su propia agenda, precios y personal?", a: "Sí, completamente. Cada sede se configura de forma independiente: horarios, modalidad de atención (turnos o llegada), métodos de pago, staff asignado y página pública propia. Todo se gestiona desde un único panel central para el director médico." },
                                { q: "¿Qué pasa si en una sede no hay cupo para un paciente?", a: "ASHIRA activa automáticamente el Smart Switching: si un paciente intenta agendar en una sede sin disponibilidad, el sistema detecta cupo en otra sede del mismo especialista ese mismo día y le ofrece el cambio con un solo clic." },
                                { q: "¿Puedo tener múltiples sedes?", a: "Sí, es nativo. Puedes asignar médicos y horarios específicos a cada sede (Ej: Dr. Pérez está Lunes en Sede A y Martes en Sede B)." },
                                { q: "¿Dan factura fiscal?", a: "Sí, emitimos factura fiscal válida en Venezuela o invoice internacional por la suscripción al software." }
                            ].map((item, i) => (
                                <details key={i} className="group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                    <summary className="flex items-center justify-between p-5 cursor-pointer font-medium text-slate-700 hover:bg-slate-50 transition-colors list-none">
                                        {item.q}
                                        <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
                                    </summary>
                                    <div className="px-5 pb-5 pt-0 text-slate-500 text-sm leading-relaxed">
                                        {item.a}
                                    </div>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 
                  ══════════════════════════════════════════════
                  SECCIÓN 10 — CTA FINAL
                  ══════════════════════════════════════════════
                */}
                <section className="py-24 relative overflow-hidden bg-slate-900">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 to-slate-900"></div>
                    <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
                        <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">Tu clínica merece un sistema a su altura</h2>
                        <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                            Deja de perder tiempo en gestión y empieza a crecer. Agenda una demo de 30 minutos con nuestro equipo senior.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <a 
                                href="https://wa.me/584124885623?text=Hola,%20quisiera%20agendar%20una%20demo%20para%20mi%20cl%C3%ADnica" 
                                target="_blank"
                                className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-[0_0_30px_rgba(147,51,234,0.4)] transition-all hover:scale-105"
                            >
                                Solicitar Demo por WhatsApp
                            </a>
                            <Link 
                                href="/register?role=ADMIN"
                                className="px-8 py-4 bg-transparent border border-slate-600 text-white font-bold rounded-xl hover:bg-white/5 transition-all"
                            >
                                Crear Cuenta Gratis
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
