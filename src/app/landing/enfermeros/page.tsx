'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Files, PieChart, Lock, UserPlus, Receipt, ClipboardList, Thermometer,
  WifiOff, Minus, Plus, ShieldCheck
} from 'lucide-react';
import Head from 'next/head';

// --- SEO & Schema Components ---
const SEOMetadata = () => (
    <>
        <title>ASHIRA para Enfermería | Gestión Clínica Profesional e Independiente</title>
        <meta name="description" content="La plataforma #1 para enfermeros independientes y equipos de clínica. Reportes de turno automáticos, control de medicamentos (MAR) y triaje digital en tiempo real." />
        <meta name="keywords" content="software enfermería, gestión pacientes enfermeros, reporte de turno digital, MAR enfermería, triaje digital" />
        <link rel="canonical" href="https://ashira.click/landing/enfermeros" />
    </>
);

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
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.disconnect();
            }
        });
        if (nodeRef.current) observer.observe(nodeRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isVisible) return;

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
    }, [end, duration, isVisible]);

    return <span ref={nodeRef}>{count}{suffix}</span>;
}

// --- Layout Components ---

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/90 backdrop-blur-md border-b border-slate-200 py-3' : 'bg-transparent py-6'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-[0_0_15px_rgba(147,51,234,0.3)] group-hover:shadow-[0_0_25px_rgba(147,51,234,0.5)] transition-all">
                            A
                        </div>
                        <span className="text-2xl font-bold text-slate-800 tracking-tight">ASHIRA</span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-8">
                        <Link href="#perfiles" className="text-sm font-medium text-slate-600 hover:text-purple-600 transition-colors">Perfiles</Link>
                        <Link href="#funcionalidades" className="text-sm font-medium text-slate-600 hover:text-purple-600 transition-colors">Funcionalidades</Link>
                        <Link href="#precios" className="text-sm font-medium text-slate-600 hover:text-purple-600 transition-colors">Precios</Link>
                        <Link href="#faq" className="text-sm font-medium text-slate-600 hover:text-purple-600 transition-colors">FAQ</Link>
                    </nav>

                    <div className="hidden md:flex items-center gap-4">
                        <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-purple-700 px-4 py-2">
                            Login
                        </Link>
                        <Link 
                            href="/register?role=ENFERMERO"
                            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
                        >
                            Empezar Gratis
                        </Link>
                    </div>

                    <button className="md:hidden p-2 text-slate-600" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-white border-b border-slate-200 overflow-hidden"
                    >
                        <div className="px-4 py-6 space-y-4">
                            <Link href="#perfiles" className="block text-slate-600 py-2" onClick={() => setIsMenuOpen(false)}>Perfiles</Link>
                            <Link href="#funcionalidades" className="block text-slate-600 py-2" onClick={() => setIsMenuOpen(false)}>Funcionalidades</Link>
                            <Link href="#precios" className="block text-slate-600 py-2" onClick={() => setIsMenuOpen(false)}>Precios</Link>
                            <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                                <Link href="/login" className="w-full py-3 text-center text-slate-600 font-semibold border border-slate-200 rounded-xl">Inicia Sesión</Link>
                                <Link href="/register?role=ENFERMERO" className="w-full py-3 text-center bg-slate-900 text-white font-bold rounded-xl">Empezar Gratis</Link>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};

// --- Sections ---

const Hero = () => {
    return (
        <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-32 overflow-hidden bg-white">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-100/40 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-50/60 rounded-full blur-[100px] -translate-x-1/4 pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="flex flex-col lg:flex-row items-center gap-16">
                    <div className="flex-1 text-center lg:text-left">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-8"
                        >
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">Para Profesionales de la Salud</span>
                        </motion.div>

                        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-slate-900 leading-[1.1] mb-6 tracking-tight">
                            Digitaliza tu atención, <br className="hidden lg:block"/>
                            <TypewriterEffect texts={["sin complicaciones.", "con precisión.", "con elegancia."]} />
                        </h1>

                        <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                            Diseñado para enfermeros que buscan excelencia. Registra signos vitales, gestiona medicamentos y genera reportes de turno profesionales — <strong className="text-slate-900">todo en una sola app.</strong>
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
                            <Link 
                                href="/register?role=ENFERMERO"
                                className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-purple-500/20 transition-all transform hover:-translate-y-1"
                            >
                                <Rocket className="w-5 h-5" />
                                Empezar Gratis Ahora
                            </Link>
                            <Link 
                                href="#funcionalidades"
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-700 font-semibold border border-slate-200 rounded-2xl hover:border-purple-300 hover:bg-purple-50 transition-all shadow-sm"
                            >
                                Ver Funcionalidades
                            </Link>
                        </div>

                        <div className="grid grid-cols-3 gap-8 border-t border-slate-100 pt-8 max-w-lg mx-auto lg:mx-0">
                            {[
                                { val: 24, suffix: "h", label: "Control Total" },
                                { val: 60, suffix: "%", label: "Más veloz" },
                                { val: 100, suffix: "%", label: "Digital" },
                            ].map((stat, i) => (
                                <div key={i} className="text-left">
                                    <div className="text-2xl font-bold text-slate-900 mb-0.5">
                                        <CountUpAnimation end={stat.val} suffix={stat.suffix} />
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <motion.div 
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="flex-1 w-full max-w-[500px] lg:max-w-none relative"
                    >
                        <div className="relative bg-slate-100 rounded-[32px] p-3 shadow-2xl overflow-hidden border border-white">
                             {/* Simulated app screen */}
                             <div className="bg-white rounded-[24px] overflow-hidden aspect-[9/16] relative shadow-inner">
                                <div className="absolute top-0 left-0 right-0 h-16 bg-white border-b border-slate-50 flex items-center justify-between px-6">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs">A</div>
                                    <div className="h-4 w-24 bg-slate-100 rounded-full"></div>
                                    <Bell size={18} className="text-slate-400" />
                                </div>
                                <div className="p-6 space-y-6 pt-20">
                                    <div className="space-y-2">
                                        <div className="h-3 w-20 bg-slate-100 rounded-full"></div>
                                        <div className="h-8 w-48 bg-slate-800 rounded-xl"></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="h-24 rounded-2xl bg-purple-50 border border-purple-100 p-4 space-y-2">
                                            <Activity size={16} className="text-purple-600" />
                                            <div className="h-2 w-16 bg-purple-200 rounded-full"></div>
                                            <div className="h-4 w-12 bg-purple-800 rounded-lg"></div>
                                        </div>
                                        <div className="h-24 rounded-2xl bg-indigo-50 border border-indigo-100 p-4 space-y-2">
                                            <Thermometer size={16} className="text-indigo-600" />
                                            <div className="h-2 w-16 bg-indigo-200 rounded-full"></div>
                                            <div className="h-4 w-12 bg-indigo-800 rounded-lg"></div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="h-3 w-32 bg-slate-100 rounded-full"></div>
                                        {[1,2,3].map(i => (
                                            <div key={i} className="h-16 rounded-2xl bg-white border border-slate-100 p-4 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50"></div>
                                                <div className="space-y-1.5 flex-1">
                                                    <div className="h-2 w-24 bg-slate-100 rounded-full"></div>
                                                    <div className="h-1.5 w-16 bg-slate-50 rounded-full"></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                             </div>
                             {/* Floating decorative elements */}
                             <motion.div 
                                animate={{ y: [-10, 10, -10] }}
                                transition={{ duration: 5, repeat: Infinity }}
                                className="absolute top-20 -right-6 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3"
                             >
                                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                                    <ShieldCheck size={20} />
                                </div>
                                <div className="text-xs font-bold text-slate-800">Cifrado de grado médico</div>
                             </motion.div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

const ProfilesSection = () => {
    const [activeTab, setActiveTab] = useState<'independent' | 'clinic'>('independent');

    return (
        <section id="perfiles" className="py-24 bg-slate-50 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-6">Tu profesión, <br className="sm:hidden" /> evolucionada</h2>
                    <p className="text-slate-600 text-lg max-w-2xl mx-auto">
                        Ya prestes servicios a domicilio o trabajes en un gran centro médico, ASHIRA se adapta a tu flujo de trabajo.
                    </p>
                </div>

                <div className="flex justify-center mb-16">
                    <div className="inline-flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
                        <button 
                            onClick={() => setActiveTab('independent')}
                            className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'independent' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Enfermero Independiente
                        </button>
                        <button 
                            onClick={() => setActiveTab('clinic')}
                            className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'clinic' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Equipo de Clínica
                        </button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <AnimatePresence mode="wait">
                        <motion.div 
                            key={activeTab}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-8"
                        >
                            {activeTab === 'independent' ? (
                                <>
                                    <h3 className="text-4xl font-extrabold text-slate-900 leading-tight">
                                        Lleva tu consultorio <br className="hidden sm:block" />
                                        <span className="text-purple-600">en el bolsillo.</span>
                                    </h3>
                                    <p className="text-lg text-slate-600 leading-relaxed">
                                        Atiende a tus pacientes particulares con la tecnología de una gran clínica. Organiza tu agenda, lleva historias clínicas completas y emite reportes que los médicos agradecerán.
                                    </p>
                                    <ul className="grid sm:grid-cols-2 gap-6">
                                        {[
                                            { icon: Users, title: "Gestión de Pacientes", desc: "Base de datos digital propia." },
                                            { icon: ClipboardList, title: "MAR Personal", desc: "Control total de medicación." },
                                            { icon: Globe, title: "Red ASHIRA", desc: "Accede a historial compartido." },
                                            { icon: Star, title: "Imagen Profesional", desc: "Reportes impecables en PDF." }
                                        ].map((item, i) => (
                                            <li key={i} className="flex gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                                                    <item.icon className="w-5 h-5 text-purple-600" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 text-sm mb-1">{item.title}</div>
                                                    <div className="text-xs text-slate-500">{item.desc}</div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-4xl font-extrabold text-slate-900 leading-tight">
                                        Sincronización total <br className="hidden sm:block" />
                                        <span className="text-indigo-600">para tu institución.</span>
                                    </h3>
                                    <p className="text-lg text-slate-600 leading-relaxed">
                                        Conecta a tu staff de enfermería con médicos, farmacia y administración. Elimina el ruido en la entrega de turno y garantiza la seguridad del paciente.
                                    </p>
                                    <ul className="grid sm:grid-cols-2 gap-6">
                                        {[
                                            { icon: LayoutGrid, title: "Cola de Atención", desc: "Gestión de pacientes hoy." },
                                            { icon: Bell, title: "Alertas MAR", desc: "Notificaciones en tiempo real." },
                                            { icon: FileCheck, title: "Autorizaciones", desc: "Flujo directo con médicos." },
                                            { icon: BarChart3, title: "Dashboard Admin", desc: "Métricas de todo el equipo." }
                                        ].map((item, i) => (
                                            <li key={i} className="flex gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                                                    <item.icon className="w-5 h-5 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 text-sm mb-1">{item.title}</div>
                                                    <div className="text-xs text-slate-500">{item.desc}</div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                            <div className="pt-4">
                                <Link 
                                    href="/register?role=ENFERMERO"
                                    className="inline-flex items-center gap-2 font-bold text-slate-900 group"
                                >
                                    Abrir mi cuenta gratis 
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-tr from-purple-200 to-indigo-200 rounded-3xl blur-[60px] opacity-30"></div>
                        <div className="relative bg-white border border-slate-200 rounded-[32px] p-8 shadow-xl">
                            <AnimatePresence mode="wait">
                                <motion.div 
                                    key={activeTab}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="space-y-6"
                                >
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                        <div className="font-bold text-slate-900">{activeTab === 'independent' ? 'Panel Independiente' : 'Panel de Clínica'}</div>
                                        <div className="flex gap-2">
                                            <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                                            <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400"><User size={20} /></div>
                                            <div className="flex-1 space-y-1">
                                                <div className="h-2 w-24 bg-slate-200 rounded-full text-[0px]">Pacientes hoy</div>
                                                <div className="h-1.5 w-16 bg-slate-100 rounded-full"></div>
                                            </div>
                                            <div className="text-xs font-bold text-purple-600">8 pacientes</div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center gap-4 shadow-sm">
                                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Clock size={20} /></div>
                                            <div className="flex-1 space-y-1">
                                                <div className="h-2 w-32 bg-slate-100 rounded-full"></div>
                                                <div className="h-1.5 w-20 bg-slate-50 rounded-full"></div>
                                            </div>
                                            <div className="px-2 py-0.5 rounded-full bg-emerald-50 text-[8px] font-bold text-emerald-600 border border-emerald-100 uppercase tracking-widest">En Turno</div>
                                        </div>
                                    </div>
                                    <div className="h-32 bg-slate-50 rounded-2xl border border-slate-100 p-4 relative overflow-hidden">
                                        <div className="absolute top-4 left-4 h-2 w-24 bg-slate-200 rounded-full"></div>
                                        <div className="absolute bottom-4 left-4 right-4 h-16 flex items-end gap-1">
                                            {[40, 70, 45, 90, 65, 80, 50, 85].map((h, i) => (
                                                <div key={i} className="flex-1 bg-purple-100 rounded-t-sm" style={{ height: `${h}%` }}></div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

const FeaturesGrid = () => {
    return (
        <section id="funcionalidades" className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-6">Cada herramienta para <br className="hidden sm:block" /> la precisión clínica.</h2>
                    <p className="text-slate-600 max-w-2xl mx-auto text-lg">
                        Olvídate del papel. ASHIRA digitaliza los procesos críticos con una interfaz diseñada para ser usada bajo presión.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[
                        { 
                            icon: Activity, 
                            title: "Triaje y Signos Vitales", 
                            desc: "Registro instantáneo con detección de rangos críticos y clasificación por semáforo médico.",
                            features: ["Alertas visuales", "Histórico de gráficas", "Calculadoras IMC"]
                        },
                        { 
                            icon: ClipboardList, 
                            title: "Control MAR Seguro", 
                            desc: "Administración de medicamentos con verificación de dosis, vía y hora para evitar errores.",
                            features: ["Notificaciones push", "Registro de firma", "Inventario dinámico"]
                        },
                        { 
                            icon: FileCheck, 
                            title: "Reportes de Turno", 
                            desc: "Genera el reporte de entrega al finalizar tu jornada con un solo clic. Profesional, firmado y claro.",
                            features: ["Formato PDF/Digital", "Notas de evolución", "Resumen de cuidados"]
                        },
                        { 
                            icon: Wand2, 
                            title: "Dictado por Voz IA", 
                            desc: "No pierdas tiempo escribiendo. Nuestra IA transcribe tus notas clínicas con terminología técnica correcta.",
                            features: ["Terminología médica", "Ahorro de tiempo", "Plantillas rápidas"]
                        },
                        { 
                            icon: WifiOff, 
                            title: "Modo Offline", 
                            desc: "¿Sin señal en el domicilio? Registra todo y ASHIRA sincronizará automáticamente al volver a tener internet.",
                            features: ["Cuidado continuo", "Sincronización segura", "Cero pérdida datos"]
                        },
                        { 
                            icon: Shield, 
                            title: "Privacidad Total", 
                            desc: "Cumplimiento estricto de seguridad de datos. Solo el personal autorizado accede a la información sensible.",
                            features: ["Permisos granulares", "Logs de actividad", "Backups automáticos"]
                        }
                    ].map((feat, i) => (
                        <motion.div 
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-slate-50 border border-slate-100 p-8 rounded-[32px] hover:border-purple-200 hover:bg-white group transition-all duration-300 hover:shadow-2xl hover:shadow-purple-900/5"
                        >
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-slate-100 group-hover:border-purple-100 transition-colors">
                                <feat.icon className="w-7 h-7 text-purple-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-3">{feat.title}</h3>
                            <p className="text-slate-600 mb-6 leading-relaxed text-sm min-h-[60px]">{feat.desc}</p>
                            
                            <ul className="space-y-3 pt-6 border-t border-slate-100">
                                {feat.features.map((f, index) => (
                                    <li key={index} className="flex items-center gap-2 text-xs font-bold text-slate-400 group-hover:text-slate-600 transition-colors uppercase tracking-wider">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const Pricing = () => {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

    return (
        <section id="precios" className="py-24 bg-white relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-6">Tu inversión en excelencia</h2>
                    <p className="text-slate-600 text-lg mb-10 max-w-2xl mx-auto">Comienza ahora sin costo y escala según el tamaño de tu práctica clínica.</p>
                    
                    <div className="inline-flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                        <button 
                            onClick={() => setBillingCycle('monthly')}
                            className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            Mensual
                        </button>
                        <button 
                            onClick={() => setBillingCycle('annual')}
                            className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all relative ${billingCycle === 'annual' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            Anual (-30%)
                            {billingCycle === 'annual' && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span></span>}
                        </button>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {[
                        {
                            name: "Plan Profesional",
                            desc: "Ideal para enfermeros independientes.",
                            price: billingCycle === 'annual' ? 14 : 20, 
                            isFree: false,
                            badge: "Por tiempo limitado",
                            features: [
                                "Hasta 30 pacientes activos/mes",
                                "Triaje y signos vitales digitales",
                                "MAR (Control de medicamentos)",
                                "Reportes PDF de turno ilimitados",
                                "Modo Offline completo",
                                "Historial propio e interoperable",
                                "Soporte técnico estrella"
                            ],
                            cta: "Empezar Plan Profesional",
                            popular: false
                        },
                        {
                            name: "Plan Clínico",
                            desc: "Para instituciones y equipos coordinados.",
                            price: billingCycle === 'annual' ? "130 + 14" : "130 + 20",
                            isFree: false,
                            badge: "Más Popular",
                            features: [
                                "Enfermeros e invitados ilimitados",
                                "Panel Administrativo Maestro",
                                "Cola de pacientes en tiempo real",
                                "Mapa de camas y observación",
                                "Inventario e Insumos por sede",
                                "Integración con médicos y farmacia",
                                "Reportes avanzados por organización"
                            ],
                            cta: "Contactar Ventas",
                            popular: true
                        }
                    ].map((plan, i) => (
                        <div 
                            key={i} 
                            className={`relative bg-white rounded-[40px] p-10 border transition-all ${plan.popular ? 'border-purple-600 shadow-2xl shadow-purple-900/10 scale-105 z-10' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                            {plan.popular && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-purple-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                                    {plan.badge}
                                </div>
                            )}
                            <div className="mb-8">
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                                <p className="text-slate-500 text-sm">{plan.desc}</p>
                            </div>
                            <div className="mb-8">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-5xl font-extrabold text-slate-900 tracking-tighter">{plan.isFree ? 'FREE' : `€${plan.price}`}</span>
                                    {!plan.isFree && <span className="text-slate-400 font-bold text-sm">/especialista/mes</span>}
                                </div>
                                {plan.badge && !plan.popular && (
                                    <div className="text-xs font-bold text-purple-600 mt-2 uppercase tracking-widest">
                                        {plan.badge}
                                    </div>
                                )}
                            </div>
                            <ul className="space-y-4 mb-10 overflow-hidden">
                                {plan.features.map((f, index) => (
                                    <li key={index} className="flex items-center gap-3 text-sm text-slate-600">
                                        <CheckCircle2 size={18} className={plan.popular ? 'text-purple-600' : 'text-slate-400'} />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <Link 
                                href={plan.isFree ? "/register?role=ENFERMERO" : "https://wa.me/584124885623"}
                                className={`w-full block text-center py-4 rounded-2xl font-bold transition-all ${plan.popular ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                {plan.cta}
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const FAQ = () => {
    const faqs = [
        { q: "¿Necesito estar en una clínica para usar ASHIRA?", a: "No. Puedes registrarte hoy mismo como enfermero independiente y empezar a digitalizar tus atenciones particulares de forma autónoma." },
        { q: "¿Mis datos están seguros y privados?", a: "Absolutamente. Utilizamos Supabase con Row Level Security para garantizar que solo tú y los profesionales que autorices puedan ver los datos clínicos." },
        { q: "¿Qué pasa si no tengo internet en una visita?", a: "ASHIRA tiene modo offline diseñado para estos casos. Puedes registrar signos vitales y MAR; una vez recuperes señal, la app sincronizará todo automáticamente." },
        { q: "¿Los reportes se pueden descargar?", a: "Sí. ASHIRA genera un reporte de turno profesional en formato digital/PDF con todos los datos agregados, notas y firmas, listo para compartir o imprimir." }
    ];

    return (
        <section id="faq" className="py-24 bg-slate-50">
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
                <h2 className="text-3xl font-bold text-slate-900 text-center mb-16 underline decoration-purple-600/30 decoration-8 underline-offset-4">Preguntas Frecuentes</h2>
                <div className="space-y-4">
                    {faqs.map((faq, i) => (
                        <FAQItem key={i} q={faq.q} a={faq.a} />
                    ))}
                </div>
            </div>
        </section>
    );
};

const FAQItem = ({ q, a }: { q: string, a: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-8 py-6 flex justify-between items-center text-left hover:bg-slate-50 transition-colors"
            >
                <span className="font-bold text-slate-800">{q}</span>
                {isOpen ? <Minus size={20} className="text-purple-600" /> : <Plus size={20} className="text-purple-600" />}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-8 pb-6 text-slate-600 text-sm leading-relaxed"
                    >
                        {a}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const Footer = () => {
    return (
        <footer className="bg-white border-t border-slate-100 pt-24 pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row justify-between gap-16 mb-20">
                    <div className="max-w-xs space-y-6">
                        <Link href="/" className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md">
                                A
                            </div>
                            <span className="text-2xl font-bold text-slate-800 tracking-tight">ASHIRA</span>
                        </Link>
                        <p className="text-slate-500 text-sm leading-relaxed">
                            Elevando los estándares de la enfermería en Latinoamérica a través de tecnología precisa e innovadora.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-12 lg:gap-24">
                        <div className="space-y-6">
                            <h4 className="font-bold text-slate-900 text-sm uppercase tracking-widest">Plataforma</h4>
                            <ul className="space-y-4 text-sm font-medium text-slate-500">
                                <li><Link href="#funcionalidades" className="hover:text-purple-600 transition-colors">Funcionalidades</Link></li>
                                <li><Link href="#precios" className="hover:text-purple-600 transition-colors">Precios</Link></li>
                                <li><Link href="/login" className="hover:text-purple-600 transition-colors">Login</Link></li>
                            </ul>
                        </div>
                        <div className="space-y-6">
                            <h4 className="font-bold text-slate-900 text-sm uppercase tracking-widest">Compañía</h4>
                            <ul className="space-y-4 text-sm font-medium text-slate-500">
                                <li><Link href="#" className="hover:text-purple-600 transition-colors">Nosotros</Link></li>
                                <li><Link href="#" className="hover:text-purple-600 transition-colors">Contacto</Link></li>
                                <li><Link href="#" className="hover:text-purple-600 transition-colors">Blog</Link></li>
                            </ul>
                        </div>
                        <div className="space-y-6">
                            <h4 className="font-bold text-slate-900 text-sm uppercase tracking-widest">Legales</h4>
                            <ul className="space-y-4 text-sm font-medium text-slate-500">
                                <li><Link href="#" className="hover:text-purple-600 transition-colors">Privacidad</Link></li>
                                <li><Link href="#" className="hover:text-purple-600 transition-colors">Términos</Link></li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
                        © 2025 ASHIRA Software · Professional Health Systems
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Hecho con <Heart size={10} className="text-red-400 fill-red-400" /> para profesionales
                    </div>
                </div>
            </div>
        </footer>
    );
};

// --- Main Page ---

export default function NurseLandingPage() {
    return (
        <div className="min-h-screen bg-white font-sans text-slate-600 selection:bg-purple-100 selection:text-purple-700">
            <Head>
                <SEOMetadata />
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');
                    
                    @keyframes blink {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0; }
                    }
                    .animate-blink {
                        animation: blink 1s step-end infinite;
                    }
                `}</style>
            </Head>
            
            <Navbar />
            <main>
                <Hero />
                <section className="py-12 bg-white flex justify-center border-y border-slate-50">
                    <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center items-center gap-8 lg:gap-24 opacity-30 grayscale hover:grayscale-0 transition-all duration-500">
                         {/* Replace with real/generic health logos if needed */}
                         <div className="text-xl font-bold font-syne tracking-tighter">MED-SYNC</div>
                         <div className="text-xl font-bold font-syne tracking-tighter uppercase">HealthLink</div>
                         <div className="text-xl font-bold font-syne tracking-tighter">NursePro</div>
                         <div className="text-xl font-bold font-syne tracking-tighter uppercase">ClinicCore</div>
                         <div className="text-xl font-bold font-syne tracking-tighter">VitaCare</div>
                    </div>
                </section>
                <ProfilesSection />
                <FeaturesGrid />
                <Pricing />
                <FAQ />
                
                {/* Final CTA */}
                <section className="py-24 bg-slate-900 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>
                    <div className="max-w-4xl mx-auto px-4 text-center relative z-10 space-y-10">
                        <h2 className="text-4xl sm:text-6xl font-extrabold text-white leading-tight">
                            Eleva tu práctica clínica <br className="hidden sm:block" />
                            <span className="text-purple-400">al siguiente nivel.</span>
                        </h2>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
                            Únete hoy a los enfermeros que están transformando la atención en salud con ASHIRA. Registro gratuito, sin tarjetas de crédito.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-6 justify-center">
                            <Link 
                                href="/register?role=ENFERMERO"
                                className="px-12 py-5 bg-white text-slate-900 font-bold rounded-2xl text-xl shadow-xl hover:scale-105 transition-all"
                            >
                                Registrarme Gratis
                            </Link>
                            <Link 
                                href="https://wa.me/584124885623"
                                className="px-12 py-5 border-2 border-white/20 text-white font-bold rounded-2xl text-xl hover:bg-white/5 transition-all"
                            >
                                Consultar para Hospital
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
