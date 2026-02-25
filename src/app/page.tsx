'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  HeartPulse, Stethoscope, Pill, FlaskConical, Building2, Users, Shield,
  Clock, FileText, CheckCircle2, ArrowRight, Activity, TrendingUp, Sparkles,
  BarChart3, Smartphone, BadgeCheck, ChevronDown, ChevronRight,
  Check, Zap, Bell, Award,
} from 'lucide-react';

/* ─── HELPERS ──────────────────────────────────────────────────────────────── */
function FadeUp({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 28 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

function StatCounter({ target, suffix = '', label }: { target: number; suffix?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const duration = 1600;
    const step = (ts: number, start: number) => {
      const prog = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - prog, 3);
      setCount(Math.floor(ease * target));
      if (prog < 1) requestAnimationFrame(t => step(t, start));
    };
    requestAnimationFrame(t => step(t, t));
  }, [inView, target]);
  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl sm:text-5xl font-extrabold text-teal-600 tabular-nums">{count}{suffix}</div>
      <div className="text-sm sm:text-base text-slate-500 font-medium mt-1">{label}</div>
    </div>
  );
}

/* ─── JSON-LD ───────────────────────────────────────────────────────────────── */
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': ['SoftwareApplication', 'MedicalOrganization'],
      name: 'ASHIRA',
      url: 'https://ashira.click',
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Web, Android, iOS',
      description: 'Plataforma de salud digital para Venezuela. Historial médico digital, citas online, recetas electrónicas y resultados de laboratorio. Gestión integral para consultorios, clínicas, farmacias y laboratorios.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', description: 'Plan gratuito para pacientes' },
      aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.9', ratingCount: '240', reviewCount: '240' },
      availableLanguage: 'es',
      areaServed: { '@type': 'Country', name: 'Venezuela' },
    },
    {
      '@type': 'Person',
      name: 'Dra. Carwin Silva',
      jobTitle: 'Ginecóloga Especialista — Embajadora Oficial ASHIRA',
      description: 'Doctora Carwin Silva, ginecóloga especialista en ginecología regenerativa, funcional y estética en Venezuela.',
      image: 'https://ashira.click/consultorios/dracarwin/IMG_5189.JPG',
      knowsAbout: ['Ginecología', 'Ginecología Regenerativa', 'Ginecología Funcional', 'Ginecología Estética', 'Salud Femenina'],
      worksFor: { '@type': 'Organization', name: 'ASHIRA', url: 'https://ashira.click' },
    },
  ],
};

/* ─── PAGE ─────────────────────────────────────────────────────────────────── */
export default function HomePage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const faqs = [
    { q: '¿Necesito instalar algo para usar ASHIRA?', a: 'No. ASHIRA es 100% web. Funciona en cualquier navegador moderno desde tu teléfono, tablet o computadora, sin instalar nada.' },
    { q: '¿Cuánto tiempo toma configurar mi consultorio?', a: 'La configuración básica de tu consultorio toma menos de 10 minutos. Puedes empezar a atender pacientes el mismo día.' },
    { q: '¿Cómo se protegen mis datos médicos?', a: 'Todos los datos viajan cifrados con los más altos estándares internacionales. Solo tú y los profesionales que autorices pueden ver tu información.' },
    { q: '¿Funciona con conectividad limitada en Venezuela?', a: 'ASHIRA está optimizada para conexiones variables y trabaja de manera eficiente incluso con ancho de banda reducido.' },
    { q: '¿Cuál es la diferencia entre el plan de médico y el de clínicas?', a: 'El plan de médico está pensado para consultorios individuales. El plan de clínicas incluye múltiples especialistas, sedes y analytics empresarial.' },
    { q: '¿Puedo exportar mis datos si decido cancelar?', a: 'Sí. Tu información siempre es tuya. Puedes exportarla en cualquier momento en formatos estándar sin ningún costo adicional.' },
  ];

  const steps = [
    { n: '1', emoji: '🖊️', title: 'Regístrate en minutos', desc: 'Crea tu cuenta sin formularios complicados. Sin tarjeta de crédito, sin burocracia.' },
    { n: '2', emoji: '⚙️', title: 'Configura tu espacio', desc: 'Personaliza tu consultorio o clínica: horarios, especialidades, plantillas y servicios.' },
    { n: '3', emoji: '🚀', title: 'Atiende con excelencia', desc: 'Historial digital, recetas electrónicas, agenda inteligente y más, desde cualquier dispositivo.' },
  ];

  const ecosystem = [
    { icon: Stethoscope, title: 'Consultorios Privados', desc: 'Agenda inteligente, historial médico completo, recetas electrónicas y facturación integrada.', iconCls: 'text-teal-600', bgCls: 'bg-teal-50', borderCls: 'border-teal-100', href: '/landing/consultorios' },
    { icon: Building2, title: 'Clínicas', desc: 'Gestión multi-especialista, múltiples sedes y reportes unificados en tiempo real.', iconCls: 'text-blue-600', bgCls: 'bg-blue-50', borderCls: 'border-blue-100', href: '/landing/clinicas' },
    { icon: HeartPulse, title: 'Enfermería', desc: 'Gestión de turnos, asignación de pacientes, notas de enfermería y comunicación directa con el equipo médico.', iconCls: 'text-rose-600', bgCls: 'bg-rose-50', borderCls: 'border-rose-100', href: '/landing/enfermeros' },
    { icon: Pill, title: 'Farmacias', desc: 'Recepción y validación de recetas electrónicas. Conectadas directamente con los médicos.', iconCls: 'text-purple-600', bgCls: 'bg-purple-50', borderCls: 'border-purple-100', href: '#' },
    { icon: FlaskConical, title: 'Laboratorios', desc: 'Gestión digital de órdenes médicas. Resultados entregados automáticamente al médico y paciente.', iconCls: 'text-orange-600', bgCls: 'bg-orange-50', borderCls: 'border-orange-100', href: '#' },
    { icon: Users, title: 'Portal del Paciente', desc: 'Acceso gratuito a tu historial, citas, recetas y resultados de laboratorio desde cualquier dispositivo.', iconCls: 'text-green-600', bgCls: 'bg-green-50', borderCls: 'border-green-100', href: '/landing/pacientes' },
    { icon: BarChart3, title: 'Analytics y Reportes', desc: 'Dashboards, KPIs, reportes exportables y analítica avanzada de tu negocio médico.', iconCls: 'text-cyan-600', bgCls: 'bg-cyan-50', borderCls: 'border-cyan-100', href: '#' },
  ];

  const features = [
    { icon: FileText, title: 'Historial Médico Digital', desc: 'Expedientes electrónicos completos, organizados, seguros y accesibles en cualquier momento.', tag: 'Core' },
    { icon: Clock, title: 'Agenda Inteligente', desc: 'Citas online con confirmación automática, recordatorios y gestión de disponibilidad.', tag: 'Productividad' },
    { icon: Activity, title: 'Receta Electrónica', desc: 'Genera, firma y envía recetas a farmacias aliadas. Trazabilidad completa del tratamiento.', tag: 'Esencial' },
    { icon: Shield, title: 'Seguridad de Grado Médico', desc: 'Cifrado de datos, acceso controlado por roles y cumplimiento con estándares internacionales.', tag: 'Seguridad' },
    { icon: Zap, title: 'Automatización Clínica', desc: 'Notificaciones, recordatorios y flujos automáticos para liberar tu tiempo valioso.', tag: 'IA & Auto' },
    { icon: Smartphone, title: 'Multi-dispositivo', desc: 'Web, móvil o tablet. ASHIRA funciona en cualquier pantalla sin instalar nada.', tag: 'Acceso' },
  ];

  const plans = [
    {
      name: 'Pacientes', price: 'Gratis', period: 'para siempre',
      desc: 'Portal personal con acceso completo a tu historial, citas y recetas.',
      highlight: false, cta: 'Registrarse Gratis', href: '/register',
      features: ['Historial médico completo', 'Agenda de citas online', 'Recetas electrónicas', 'Resultados de laboratorio', 'Sin costo, sin límites'],
    },
    {
      name: 'Médico / Consultorio', price: 'A consultar', period: 'planes flexibles',
      desc: 'Gestión total de tu consultorio: agenda, consultas, recetas, reportes y facturación.',
      highlight: true, cta: 'Comenzar Ahora', href: '/register',
      features: ['Todo lo de Pacientes', 'Módulo de consultas', 'Recetas y prescripciones', 'Dashboard de pacientes', 'Facturación integrada', 'Soporte prioritario'],
    },
    {
      name: 'Organizaciones', price: 'Personalizado', period: 'según volumen',
      desc: 'Para clínicas, farmacias y laboratorios. Plan a medida con integraciones dedicadas.',
      highlight: false, cta: 'Hablar con Ventas', href: 'https://wa.me/584124885623',
      features: ['Todo lo de Médico', 'Multi-especialista', 'Múltiples sedes', 'Integraciones avanzadas', 'Analytics empresarial', 'Account Manager dedicado'],
    },
  ];

  const automations = [
    { icon: Bell, text: 'Notificaciones automáticas de citas y pagos pendientes' },
    { icon: Activity, text: 'Recetas enviadas directamente a farmacias aliadas' },
    { icon: FlaskConical, text: 'Resultados de laboratorio directo al médico y paciente' },
    { icon: Clock, text: 'Recordatorios de seguimiento de tratamientos activos' },
  ];

  const terminalLines = [
    { time: '→ [09:00]', msg: 'Cita confirmada: María G. — WhatsApp ✓', cls: 'text-emerald-400' },
    { time: '→ [09:15]', msg: 'Receta enviada a Farmacia Central ✓', cls: 'text-sky-400' },
    { time: '→ [09:45]', msg: 'Resultado Lab recibido · Dr. Ramírez notificado', cls: 'text-teal-400' },
    { time: '→ [10:00]', msg: 'Pago registrado · Factura generada automáticamente', cls: 'text-purple-400' },
    { time: '→ [10:30]', msg: 'Recordatorio: Tratamiento de Ana M. (día 15/30)', cls: 'text-amber-400' },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-white overflow-x-hidden">

        {/* ═══ HERO ══════════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-24" style={{ background: 'linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 40%, #f8fafc 100%)' }}>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0d948808_1px,transparent_1px),linear-gradient(to_bottom,#0d948808_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-teal-300/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-cyan-300/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

              {/* Copy */}
              <div>
                <FadeUp delay={0}>
                  <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-sm font-semibold shadow-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-600" />
                    </span>
                    Plataforma activa · Médicos en Venezuela confían en ASHIRA
                  </div>
                </FadeUp>

                <FadeUp delay={0.1}>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
                    La plataforma médica que{' '}
                    <span className="relative inline-block">
                      <span className="relative z-10 text-teal-600">Venezuela</span>
                      <span className="absolute bottom-1 left-0 w-full h-3 bg-teal-100 rounded-full -z-0" />
                    </span>{' '}necesita.
                  </h1>
                </FadeUp>

                <FadeUp delay={0.2}>
                  <p className="text-lg sm:text-xl text-slate-600 mb-8 leading-relaxed">
                    Historial médico digital, citas online, recetas electrónicas y resultados de laboratorio — todo en una sola plataforma diseñada para la realidad venezolana.
                  </p>
                </FadeUp>

                <FadeUp delay={0.3}>
                  <div className="flex flex-col sm:flex-row gap-3 mb-10">
                    <Link href="/register" className="group flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-white text-base shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300" style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}>
                      Comenzar Gratis — Sin tarjeta
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link href="/login" className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-slate-700 text-base border-2 border-slate-200 hover:border-teal-300 hover:bg-teal-50 transition-all duration-300">
                      Iniciar Sesión
                    </Link>
                  </div>
                </FadeUp>

                <FadeUp delay={0.4}>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    {['100% Digital', 'Sin instalación', 'Soporte en español', '99.9% Uptime'].map((t) => (
                      <span key={t} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-teal-500" /> {t}
                      </span>
                    ))}
                  </div>
                </FadeUp>
              </div>

              {/* Dashboard mockup */}
              <div className="hidden lg:block relative">
                <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }} className="absolute -top-6 -left-8 z-20 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0d9488,#0891b2)' }}><HeartPulse className="w-5 h-5 text-white" /></div>
                  <div><div className="text-xs font-bold text-slate-800">Consulta Completada</div><div className="text-xs text-slate-500">hace 2 minutos</div></div>
                </motion.div>
                <motion.div animate={{ y: [0, 12, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }} className="absolute -bottom-6 -right-8 z-20 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-green-600" /></div>
                  <div><div className="text-xs font-bold text-slate-800">+28 pacientes este mes</div><div className="text-xs text-green-500">↑ 12% vs mes anterior</div></div>
                </motion.div>

                <div className="relative rounded-3xl p-8 shadow-2xl border border-slate-100/80 bg-white/90 backdrop-blur-sm overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-teal-50 rounded-bl-full opacity-70" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <div className="text-xs text-slate-400 font-medium">Buenos días</div>
                        <div className="text-lg font-bold text-slate-800">Dr. Ramírez 👋</div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold border border-teal-100">
                        <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" /> En línea
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      {[{ v: '12', l: 'Citas hoy', c: 'text-teal-600' }, { v: '3', l: 'Pendientes', c: 'text-amber-500' }, { v: '98', l: 'Pacientes', c: 'text-blue-600' }].map(s => (
                        <div key={s.l} className="bg-slate-50 rounded-xl p-3 text-center">
                          <div className={`text-2xl font-extrabold ${s.c}`}>{s.v}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{s.l}</div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Próximas citas</div>
                      <div className="space-y-2">
                        {[
                          { name: 'María González', time: '10:00 AM', type: 'Consulta general' },
                          { name: 'Carlos Pérez', time: '11:30 AM', type: 'Control mensual' },
                          { name: 'Ana Martínez', time: '01:00 PM', type: 'Primera consulta' },
                        ].map(a => (
                          <div key={a.name} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg,#0d9488,#0891b2)' }}>{a.name[0]}</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-slate-800 truncate">{a.name}</div>
                              <div className="text-xs text-slate-500">{a.type}</div>
                            </div>
                            <div className="text-xs font-medium text-slate-600">{a.time}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats bar */}
            <div className="mt-16 sm:mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 max-w-4xl mx-auto">
              <StatCounter target={500} suffix="+" label="Consultas Digitales" />
              <StatCounter target={100} suffix="%" label="Sin Papel" />
              <StatCounter target={99} suffix="%" label="Uptime Garantizado" />
              <StatCounter target={24} suffix="/7" label="Disponible Siempre" />
            </div>
          </div>
        </section>

        {/* ═══ SOCIAL PROOF STRIP ═══════════════════════════════════════════ */}
        <div className="py-10 border-y border-slate-100 bg-slate-50/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mb-6">Confiado por profesionales de salud en Venezuela</p>
            <div className="flex flex-wrap justify-center gap-3">
              {['🏥 Consultorios Privados', '🏢 Clínicas Multi-especialista', '💊 Farmacias', '🔬 Laboratorios Clínicos', '👤 Pacientes'].map(b => (
                <span key={b} className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-600 text-sm font-medium shadow-sm">{b}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ THE PROBLEM ══════════════════════════════════════════════════ */}
        <section className="py-24 sm:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <FadeUp>
                <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold uppercase tracking-wider">
                  El Diagnóstico
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-6 leading-tight">
                  La medicina venezolana merece tecnología de clase mundial.
                </h2>
                <p className="text-slate-600 text-lg leading-relaxed mb-8">
                  Los médicos venezolanos pierden horas preciosas en burocracia, llamadas y papeles. Cada hora perdida en administración es una hora que no fue dedicada a los pacientes.
                </p>
                <Link href="/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all" style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}>
                  Ver Cómo ASHIRA Lo Soluciona <ArrowRight className="w-4 h-4" />
                </Link>
              </FadeUp>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { emoji: '📋', title: 'Expedientes en papel', desc: 'Historias clínicas que se pierden, deterioran o son ilegibles.' },
                  { emoji: '📅', title: 'Agendas sin control', desc: 'Citas duplicadas, sin confirmación y con tiempo del médico desperdiciado.' },
                  { emoji: '💊', title: 'Recetas sin trazabilidad', desc: 'Sin conexión con farmacias ni certeza de que el tratamiento se siga.' },
                  { emoji: '🔬', title: 'Resultados lentos', desc: 'Días esperando resultados de laboratorio que deberían llegar en horas.' },
                ].map((p, i) => (
                  <FadeUp key={p.title} delay={i * 0.1}>
                    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-red-100 transition-all duration-300 h-full">
                      <div className="flex items-start gap-3 mb-3">
                        <span className="text-2xl">{p.emoji}</span>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm mb-1">{p.title}</h3>
                          <p className="text-xs text-slate-500 leading-relaxed">{p.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-red-500 font-semibold">
                        <span className="text-red-400">✗</span> Sin ASHIRA
                      </div>
                    </div>
                  </FadeUp>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ HOW IT WORKS ═════════════════════════════════════════════════ */}
        <section className="py-24 sm:py-32 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeUp className="text-center mb-16">
              <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider">Cómo Funciona</div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">Empieza en menos de 10 minutos.</h2>
              <p className="text-slate-500 max-w-xl mx-auto text-lg">Sin contratos, sin instalación, sin fricción. Solo entra y comienza.</p>
            </FadeUp>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-16 left-[30%] right-[30%] h-0.5 bg-gradient-to-r from-teal-200 via-teal-400 to-teal-200" />
              {steps.map((s, i) => (
                <FadeUp key={s.title} delay={i * 0.15}>
                  <div className="bg-white rounded-2xl p-8 shadow-md border border-slate-100 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 text-3xl" style={{ background: 'linear-gradient(135deg, #f0fdfa, #e0f2fe)' }}>
                      {s.emoji}
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-extrabold flex items-center justify-center">{s.n}</span>
                    </div>
                    <h3 className="font-extrabold text-slate-800 text-lg mb-2">{s.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
                  </div>
                </FadeUp>
              ))}
            </div>

            <FadeUp delay={0.4} className="text-center mt-12">
              <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300" style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}>
                Empezar Gratis Ahora <ArrowRight className="w-5 h-5" />
              </Link>
              <p className="text-slate-400 text-sm mt-3">Sin tarjeta de crédito · Configuración en minutos</p>
            </FadeUp>
          </div>
        </section>

        {/* ═══ ECOSYSTEM ════════════════════════════════════════════════════ */}
        <section id="ecosystem" className="py-24 sm:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeUp className="text-center mb-16">
              <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold uppercase tracking-wider">Ecosistema ASHIRA</div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">Un ecosistema. Cuatro actores. Cero fricción.</h2>
              <p className="text-slate-500 max-w-2xl mx-auto text-lg">Conectamos todos los actores del sector salud venezolano en una sola plataforma unificada.</p>
            </FadeUp>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {ecosystem.map((e, i) => (
                <FadeUp key={e.title} delay={i * 0.08}>
                  <div className={`group rounded-2xl border p-6 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full ${e.borderCls}`}>
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4 ${e.bgCls}`}>
                      <e.icon className={`w-7 h-7 ${e.iconCls}`} />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-800 mb-2">{e.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-4">{e.desc}</p>
                    {e.href !== '#' && (
                      <a href={e.href} className={`inline-flex items-center gap-1 text-sm font-semibold ${e.iconCls} hover:gap-2 transition-all`}>
                        Conocer más <ChevronRight className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ FEATURES ═════════════════════════════════════════════════════ */}
        <section className="py-24 sm:py-32" style={{ background: 'linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeUp className="text-center mb-16">
              <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-white border border-teal-200 text-teal-700 text-xs font-bold uppercase tracking-wider shadow-sm">Características</div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">Tecnología que transforma tu práctica médica</h2>
              <p className="text-slate-500 max-w-2xl mx-auto text-lg">Cada función fue diseñada pensando en los médicos venezolanos y sus necesidades reales.</p>
            </FadeUp>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f, i) => (
                <FadeUp key={f.title} delay={i * 0.08}>
                  <div className="group bg-white rounded-2xl p-6 shadow-md border border-white hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f0fdfa, #e0f2fe)' }}>
                        <f.icon className="w-6 h-6 text-teal-600" />
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-600 border border-teal-100">{f.tag}</span>
                    </div>
                    <h3 className="font-extrabold text-slate-800 text-base mb-2">{f.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                    <div className="mt-4 h-0.5 w-0 group-hover:w-full transition-all duration-500 rounded-full" style={{ background: 'linear-gradient(90deg, #0d9488, #0891b2)' }} />
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ AUTOMATION ═══════════════════════════════════════════════════ */}
        <section className="py-24 sm:py-32 bg-slate-900 overflow-hidden relative">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:32px_32px]" />
          <div className="absolute top-0 right-0 w-80 h-80 bg-teal-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <FadeUp>
                <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  Automatización Inteligente
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-6 leading-tight">
                  Tu clínica trabajando sola.<br />Tú, enfocado en el paciente.
                </h2>
                <p className="text-slate-400 text-lg leading-relaxed mb-8">
                  ASHIRA automatiza los flujos más repetitivos para que cada minuto de tu jornada sea productivo y clínicamente valioso.
                </p>
                <ul className="space-y-4 mb-10">
                  {automations.map((item, i) => (
                    <FadeUp key={i} delay={i * 0.1}>
                      <li className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <item.icon className="w-4 h-4 text-emerald-400" />
                        </div>
                        <span className="text-slate-300 text-sm leading-relaxed">{item.text}</span>
                      </li>
                    </FadeUp>
                  ))}
                </ul>
                <Link href="/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white text-sm shadow-lg hover:scale-105 transition-all" style={{ background: 'linear-gradient(135deg, #10b981, #0d9488)' }}>
                  Activar Automatizaciones <ArrowRight className="w-4 h-4" />
                </Link>
              </FadeUp>

              <FadeUp delay={0.2}>
                <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-sm p-6 font-mono text-sm overflow-hidden shadow-2xl">
                  <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/10">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    <span className="ml-2 text-slate-600 text-xs">ashira.automations — activo</span>
                  </div>
                  <div className="space-y-3 text-xs sm:text-sm">
                    {terminalLines.map((line, i) => (
                      <div key={i} className={`flex gap-2 ${line.cls}`}>
                        <span className="text-slate-600 flex-shrink-0">{line.time}</span>
                        <span>{line.msg}</span>
                      </div>
                    ))}
                    <div className="text-slate-500 mt-3 flex items-center gap-1.5">
                      <span className="w-2 h-4 bg-slate-500 animate-pulse rounded-sm inline-block" />
                      Sistema activo 24/7...
                    </div>
                  </div>
                </div>
              </FadeUp>
            </div>
          </div>
        </section>

        {/* ═══ DRA. CARWIN ══════════════════════════════════════════════════ */}
        <section className="py-24 sm:py-32 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0891b2 50%, #1d4ed8 100%)' }}>
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <FadeUp className="lg:col-span-5 flex flex-col items-center lg:items-start">
                <div className="relative mb-6">
                  <div className="absolute -inset-3 rounded-3xl opacity-60 blur-2xl" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.1))' }} />
                  <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden border-4 border-white/30 shadow-2xl">
                    <Image src="/consultorios/dracarwin/IMG_5189.JPG" alt="Dra. Carwin Silva — Ginecóloga Especialista en Venezuela · Embajadora Oficial ASHIRA" width={288} height={288} className="w-full h-full object-cover" priority />
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-amber-300/50 bg-amber-400/20 text-amber-200">
                  <Award className="w-4 h-4" /> Embajadora Oficial ASHIRA
                </div>
              </FadeUp>

              <FadeUp delay={0.2} className="lg:col-span-7">
                <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-white/20 border border-white/30 text-white text-xs font-bold uppercase tracking-wider">
                  <BadgeCheck className="w-4 h-4" /> Alianza Estratégica
                </div>
                <blockquote className="mb-6">
                  <p className="text-2xl sm:text-3xl font-bold text-white leading-snug mb-4">
                    &ldquo;ASHIRA transformó la forma en que gestiono mi consultorio. Mis pacientes reciben atención de primer nivel y yo dedico más tiempo a lo que amo: la medicina.&rdquo;
                  </p>
                  <footer>
                    <div className="font-extrabold text-white text-xl">Dra. Carwin Silva</div>
                    <div className="text-teal-100 text-sm mt-0.5">Ginecóloga Especialista · Ginecología Regenerativa, Funcional y Estética</div>
                  </footer>
                </blockquote>
                <div className="flex flex-wrap gap-2 mb-6">
                  {['Pionera Digital', 'Ginecología Regenerativa', 'Ginecología Funcional', 'Ginecología Estética'].map(t => (
                    <span key={t} className="px-3 py-1 rounded-full text-xs font-semibold border border-white/30 bg-white/15 text-white">{t}</span>
                  ))}
                </div>
                <p className="text-teal-100 text-sm leading-relaxed">
                  Primera especialista en adoptar ASHIRA para la gestión integral de consultorios médicos privados en Venezuela. Asesora activa de los módulos de salud femenina y referente nacional en ginecología innovadora.
                </p>
              </FadeUp>
            </div>
          </div>
        </section>

        {/* ═══ PRICING ══════════════════════════════════════════════════════ */}
        <section id="planes" className="py-24 sm:py-32 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeUp className="text-center mb-16">
              <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold uppercase tracking-wider">Planes</div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">Elige cómo crecer con ASHIRA.</h2>
              <p className="text-slate-500 max-w-xl mx-auto text-lg">Sin contratos. Sin costos ocultos. Empieza gratis y escala cuando lo necesites.</p>
            </FadeUp>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((p, i) => (
                <FadeUp key={p.name} delay={i * 0.12}>
                  <div className={`relative rounded-2xl p-8 flex flex-col h-full transition-all duration-300 hover:-translate-y-1 ${
                    p.highlight
                      ? 'text-white shadow-2xl shadow-teal-200'
                      : 'bg-white border border-slate-100 shadow-md hover:shadow-xl'
                  }`} style={p.highlight ? { background: 'linear-gradient(135deg, #0d9488, #0891b2)' } : {}}>
                    {p.highlight && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold bg-amber-400 text-slate-900 shadow-lg whitespace-nowrap">
                        ⭐ Más Popular
                      </div>
                    )}
                    <h3 className={`text-lg font-extrabold mb-1 ${p.highlight ? 'text-white' : 'text-slate-800'}`}>{p.name}</h3>
                    <div className={`text-3xl font-extrabold mb-0.5 ${p.highlight ? 'text-white' : 'text-teal-600'}`}>{p.price}</div>
                    <div className={`text-xs mb-4 ${p.highlight ? 'text-teal-100' : 'text-slate-400'}`}>{p.period}</div>
                    <p className={`text-sm leading-relaxed mb-6 ${p.highlight ? 'text-teal-50' : 'text-slate-500'}`}>{p.desc}</p>
                    <ul className="space-y-2.5 mb-8 flex-1">
                      {p.features.map(f => (
                        <li key={f} className={`flex items-center gap-2 text-sm ${p.highlight ? 'text-white' : 'text-slate-700'}`}>
                          <Check className={`w-4 h-4 flex-shrink-0 ${p.highlight ? 'text-emerald-300' : 'text-teal-500'}`} /> {f}
                        </li>
                      ))}
                    </ul>
                    <Link href={p.href} className={`block w-full text-center py-3.5 rounded-xl font-bold text-sm transition-all duration-300 hover:scale-105 ${
                      p.highlight
                        ? 'bg-white text-teal-700 hover:bg-teal-50 shadow-lg'
                        : 'text-white shadow-lg hover:shadow-xl'
                    }`} style={p.highlight ? {} : { background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}>
                      {p.cta}
                    </Link>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ FAQ ══════════════════════════════════════════════════════════ */}
        <section className="py-24 sm:py-32">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeUp className="text-center mb-12">
              <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">Preguntas Frecuentes</div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Todo lo que necesitas saber</h2>
            </FadeUp>
            <div className="space-y-3">
              {faqs.map((f, i) => (
                <FadeUp key={i} delay={i * 0.06}>
                  <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                    <button onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                      className="w-full text-left px-6 py-4 flex items-center justify-between gap-4 text-sm font-bold text-slate-800 hover:text-teal-600 transition-colors"
                      aria-expanded={faqOpen === i}>
                      {f.q}
                      <ChevronDown className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 text-slate-400 ${faqOpen === i ? 'rotate-180 text-teal-500' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {faqOpen === i && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: 'easeInOut' }} className="overflow-hidden">
                          <div className="px-6 pb-4 text-sm text-slate-500 leading-relaxed border-t border-slate-50 pt-3">{f.a}</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ FINAL CTA ════════════════════════════════════════════════════ */}
        <section className="py-24 sm:py-32 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 50%, #eff6ff 100%)' }}>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0d948810_1px,transparent_1px),linear-gradient(to_bottom,#0d948810_1px,transparent_1px)] bg-[size:32px_32px]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-40 opacity-30 blur-3xl" style={{ background: 'radial-gradient(ellipse at center, #0d9488, transparent)' }} />

          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <FadeUp>
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-sm font-semibold shadow-sm">
                <Sparkles className="w-4 h-4" /> Únete hoy — Es gratis para pacientes
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 mb-6 leading-tight">
                Comienza hoy.<br />
                <span className="text-teal-600">Tu consultorio digital te está esperando.</span>
              </h2>
              <p className="text-slate-500 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
                Únete a los profesionales de salud que ya transformaron su práctica médica con ASHIRA. Configuración en minutos, resultados desde el primer día.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                <Link href="/register" className="group flex items-center gap-2 px-10 py-5 rounded-2xl font-extrabold text-white text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300" style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}>
                  Crear Cuenta Gratuita
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a href="https://wa.me/584124885623" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-8 py-5 rounded-2xl font-bold text-slate-700 text-base border-2 border-slate-200 hover:border-teal-300 hover:bg-teal-50 transition-all duration-300">
                  💬 Hablar con Ventas
                </a>
              </div>
              <p className="text-slate-400 text-sm">Sin tarjeta de crédito · Cancela cuando quieras · Soporte en español</p>
            </FadeUp>
          </div>
        </section>

      </div>
    </>
  );
}
