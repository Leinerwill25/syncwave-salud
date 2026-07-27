'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  HeartPulse, Stethoscope, Pill, FlaskConical, Building2, Users,
  ArrowRight, Sparkles, BarChart3, ChevronDown, ChevronRight,
} from 'lucide-react';

import { FadeUp, StatCounter, C, dotGrid, heroGradient, sectionAlt } from '@/components/landing/shared';
import PulseLine from '@/components/landing/PulseLine';
import MarqueeTrust from '@/components/landing/MarqueeTrust';
import HeroVisual from '@/components/landing/HeroVisual';
import OriginStory from '@/components/landing/OriginStory';
import ProfileSelector from '@/components/landing/ProfileSelector';
import Roadmap from '@/components/landing/Roadmap';
import LandingFooter from '@/components/landing/LandingFooter';
import {
  tractionStats,
  companyFaqs,
  ecosystemLinks,
  ASHIRA_WHATSAPP,
} from '@/config/ashira-content';

const heroVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const heroItem = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

const ecosystemIcons = {
  consultorios: Stethoscope,
  clinicas: Building2,
  enfermeros: HeartPulse,
  farmacias: Pill,
  laboratorios: FlaskConical,
  pacientes: Users,
  analytics: BarChart3,
} as const;

const ecosystemColors: Record<string, string> = {
  consultorios: C.teal,
  clinicas: C.blue,
  enfermeros: '#EC4899',
  farmacias: '#A78BFA',
  laboratorios: '#FB923C',
  pacientes: C.tealDark,
  analytics: C.blue2,
};

export default function HomePage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen overflow-x-hidden font-body" style={{ background: C.white, color: C.ink }}>
      {/* ═══ HERO ══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden pt-24 pb-16 sm:pt-32 sm:pb-24" style={{ background: heroGradient }}>
        <div className={`absolute inset-0 ${dotGrid} pointer-events-none`} />
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none opacity-20" style={{ background: C.teal }} />
        <div className="absolute -bottom-20 -right-20 w-[450px] h-[450px] rounded-full blur-3xl pointer-events-none opacity-15" style={{ background: C.blue }} />
        <PulseLine variant="hero" className="absolute top-36 left-0 right-0 w-full h-20 opacity-50 hidden lg:block" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div variants={reduceMotion ? undefined : heroVariants} initial={reduceMotion ? false : 'hidden'} animate={reduceMotion ? undefined : 'visible'}>
              <motion.div variants={reduceMotion ? undefined : heroItem}>
                <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-sm font-semibold">
                  <span className="relative flex h-2 w-2">
                    {!reduceMotion && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />}
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400" />
                  </span>
                  Plataforma activa en Venezuela · {tractionStats.patientsLabel}
                </div>
              </motion.div>

              <motion.h1 variants={reduceMotion ? undefined : heroItem} className="font-display text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold leading-[1.08] mb-4 tracking-tight" style={{ color: C.ink }}>
                El ecosistema de salud digital para Venezuela.
              </motion.h1>
              <motion.div variants={reduceMotion ? undefined : heroItem} className="mb-6">
                <span className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight block" style={{ color: C.tealDark }}>
                  ASHIRA
                </span>
              </motion.div>

              <motion.p variants={reduceMotion ? undefined : heroItem} className="text-lg sm:text-xl mb-8 leading-relaxed" style={{ color: C.inkMuted }}>
                Conectamos consultorios, clínicas, enfermería y pacientes en una sola plataforma. Elige tu perfil y descubre la experiencia hecha para ti.
              </motion.p>

              <motion.div variants={reduceMotion ? undefined : heroItem} className="flex flex-col sm:flex-row gap-3 mb-8">
                <a
                  href="#perfiles"
                  className="group flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-white text-base shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 hover:scale-[1.02] transition-all focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.blue})` }}
                >
                  Elegir mi perfil
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
                <Link
                  href="/register"
                  className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-base border border-slate-300 bg-white hover:border-teal-400 hover:bg-teal-50 transition-all focus-visible:ring-2 focus-visible:ring-teal-400"
                  style={{ color: C.ink }}
                >
                  Crear cuenta gratis
                </Link>
              </motion.div>

              <motion.div variants={reduceMotion ? undefined : heroItem} className="flex flex-wrap items-center gap-4">
                <div className="flex -space-x-2">
                  {['S', 'F', 'B'].map((l, i) => (
                    <div
                      key={l}
                      className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.blue})`, zIndex: 3 - i }}
                    >
                      {l}
                    </div>
                  ))}
                </div>
                <span className="text-sm font-medium" style={{ color: C.inkMuted }}>
                  Validado en producción real, no en demo.
                </span>
              </motion.div>
            </motion.div>

            <motion.div variants={reduceMotion ? undefined : heroItem} initial={reduceMotion ? false : 'hidden'} animate={reduceMotion ? undefined : 'visible'} transition={{ delay: 0.45 }}>
              <HeroVisual />
            </motion.div>
          </div>

          <div className="mt-16 sm:mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 max-w-4xl mx-auto">
            <StatCounter target={tractionStats.patientsInProduction} prefix="+" label="Pacientes en producción" />
            <StatCounter target={tractionStats.aiModulesLive} label="Módulos IA activos" />
            <StatCounter target={tractionStats.hoursSavedPerDay} suffix="h" label="Ahorradas al día" />
            <StatCounter target={tractionStats.roiMultiple} suffix="x" label="ROI documentado" />
          </div>
        </div>
      </section>

      {/* Enrutamiento por audiencia — corazón de la home */}
      <ProfileSelector />

      <MarqueeTrust />

      {/* Historia corta del ecosistema */}
      <OriginStory />

      {/* Ecosistema — links reales, sin profundidad de venta */}
      <section className="py-16 sm:py-20" style={{ background: sectionAlt }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold uppercase tracking-wider">
              Ecosistema ASHIRA
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight mb-4" style={{ color: C.ink }}>
              Un actor, una página. Profundidad donde corresponde.
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: C.inkMuted }}>
              Explora la landing de tu rol para ver funcionalidades, precios y casos reales.
            </p>
          </FadeUp>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ecosystemLinks.map((e, i) => {
              const Icon = ecosystemIcons[e.id as keyof typeof ecosystemIcons] ?? Building2;
              const color = ecosystemColors[e.id] ?? C.teal;
              const isExternal = e.href.startsWith('http');
              return (
                <FadeUp key={e.id} delay={i * 0.05}>
                  {isExternal ? (
                    <a
                      href={e.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full no-underline"
                    >
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4" style={{ background: `${color}15` }}>
                        <Icon className="w-7 h-7" style={{ color }} />
                      </div>
                      <h3 className="font-display text-lg font-extrabold mb-2" style={{ color: C.ink }}>{e.title}</h3>
                      <p className="text-sm leading-relaxed mb-4" style={{ color: C.inkMuted }}>{e.desc}</p>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold group-hover:gap-2 transition-all" style={{ color }}>
                        Conocer más <ChevronRight className="w-4 h-4" />
                      </span>
                    </a>
                  ) : (
                    <Link
                      href={e.href}
                      className="group block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full no-underline"
                    >
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4" style={{ background: `${color}15` }}>
                        <Icon className="w-7 h-7" style={{ color }} />
                      </div>
                      <h3 className="font-display text-lg font-extrabold mb-2" style={{ color: C.ink }}>{e.title}</h3>
                      <p className="text-sm leading-relaxed mb-4" style={{ color: C.inkMuted }}>{e.desc}</p>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold group-hover:gap-2 transition-all" style={{ color }}>
                        Conocer más <ChevronRight className="w-4 h-4" />
                      </span>
                    </Link>
                  )}
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      <Roadmap />

      {/* FAQ empresa */}
      <section className="py-20 sm:py-28" style={{ background: sectionAlt }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
              Preguntas frecuentes
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: C.ink }}>
              Todo lo que necesitas saber
            </h2>
          </FadeUp>
          <div className="space-y-3">
            {companyFaqs.map((f, i) => (
              <FadeUp key={i} delay={i * 0.05}>
                <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                    className="w-full text-left px-6 py-4 flex items-center justify-between gap-4 text-sm font-bold hover:text-teal-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500"
                    style={{ color: C.ink }}
                    aria-expanded={faqOpen === i}
                  >
                    {f.q}
                    <ChevronDown className={`w-5 h-5 shrink-0 transition-transform duration-300 ${faqOpen === i ? 'rotate-180 text-teal-500' : 'text-slate-400'}`} />
                  </button>
                  <AnimatePresence>
                    {faqOpen === i && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                        <div className="px-6 pb-4 text-sm leading-relaxed border-t border-slate-100 pt-3" style={{ color: C.inkMuted }}>{f.a}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 sm:py-28 relative overflow-hidden border-t border-slate-200" style={{ background: heroGradient }}>
        <div className={`absolute inset-0 ${dotGrid} pointer-events-none`} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full blur-3xl opacity-25 pointer-events-none" style={{ background: `radial-gradient(ellipse, ${C.teal}30, transparent)` }} />
        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-full max-w-2xl opacity-60">
          <PulseLine variant="separator" className="w-full h-12" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeUp>
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-sm font-semibold">
              <Sparkles className="w-4 h-4" /> Únete hoy — Es gratis para pacientes
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold mb-6 leading-tight tracking-tight" style={{ color: C.ink }}>
              Comienza hoy.<br />
              <span style={{ color: C.tealDark }}>Tu lugar en el ecosistema te espera.</span>
            </h2>
            <p className="text-lg mb-10 max-w-xl mx-auto leading-relaxed" style={{ color: C.inkMuted }}>
              Configuración en minutos. Validado en producción real con {tractionStats.patientsLabel.replace('en producción', '').trim()}.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Link
                href="/register"
                className="group flex items-center gap-2 px-10 py-5 rounded-2xl font-extrabold text-white text-lg shadow-lg shadow-teal-500/30 hover:shadow-xl hover:scale-[1.02] transition-all"
                style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.blue})` }}
              >
                Crear cuenta gratuita
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href={ASHIRA_WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-8 py-5 rounded-2xl font-bold text-base border border-slate-300 bg-white hover:border-teal-400 hover:bg-teal-50 transition-all focus-visible:ring-2 focus-visible:ring-teal-400"
                style={{ color: C.ink }}
              >
                Hablar con ventas
              </a>
            </div>
            <p className="text-sm" style={{ color: C.inkMuted }}>Sin tarjeta · Configuración en minutos · Soporte en español</p>
          </FadeUp>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
