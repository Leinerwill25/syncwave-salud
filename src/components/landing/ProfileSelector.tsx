'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Stethoscope, Building2, HeartPulse, Users, ArrowRight, Check } from 'lucide-react';
import { FadeUp, GlassCard, C, heroGradient, dotGrid } from './shared';
import { audienceRoutes, consultorioPricing, tractionStats, ASHIRA_WHATSAPP } from '@/config/ashira-content';

type ProfileId = 'medico' | 'clinica' | 'enfermero' | 'paciente';

const profiles = [
  {
    id: 'medico' as ProfileId,
    label: audienceRoutes[0].label,
    icon: Stethoscope,
    accent: C.teal,
    benefits: [
      'Dictado por voz → informe en un clic',
      'Historial sin cambiar tu informe clínico',
      'Recetas con directorio FarmaTuya',
    ],
    plan: `Médico / Consultorio — $${consultorioPricing.monthlyUsd}/mes`,
    planNote: `ROI ${tractionStats.roiMultiple}x documentado`,
    cta: 'Ver página para consultorios',
    href: '/landing/consultorios',
  },
  {
    id: 'clinica' as ProfileId,
    label: audienceRoutes[1].label,
    icon: Building2,
    accent: C.blue,
    benefits: [
      'Multi-especialista y multi-sede',
      'SafeCare como referencia en configuración',
      'Analytics empresarial',
    ],
    plan: 'Organizaciones — personalizado',
    planNote: 'Planes por especialista en USD',
    cta: 'Ver página para clínicas',
    href: '/landing/clinicas',
  },
  {
    id: 'enfermero' as ProfileId,
    label: audienceRoutes[2].label,
    icon: HeartPulse,
    accent: '#EC4899',
    benefits: [
      'Triaje, MAR y reportes de turno',
      'Dictado por IA y modo offline',
      'Independiente o equipo de clínica',
    ],
    plan: 'Profesional o Clínico — desde $20/mes',
    planNote: 'Precios en USD',
    cta: 'Ver página para enfermería',
    href: '/landing/enfermeros',
  },
  {
    id: 'paciente' as ProfileId,
    label: audienceRoutes[3].label,
    icon: Users,
    accent: C.tealDark,
    benefits: [
      'Historial portátil en toda la red',
      'Plan Familiar y ASHIRA Salud+',
      '100% gratis para siempre',
    ],
    plan: 'Pacientes — Gratis',
    planNote: 'Sin costo, sin límites',
    cta: 'Ver portal del paciente',
    href: '/landing/pacientes',
  },
];

export default function ProfileSelector() {
  const [active, setActive] = useState<ProfileId>('medico');
  const reduceMotion = useReducedMotion();
  const current = profiles.find((p) => p.id === active) ?? profiles[0];

  return (
    <section id="perfiles" className="relative py-20 sm:py-28 overflow-hidden" style={{ background: heroGradient }}>
      <div className={`absolute inset-0 ${dotGrid} pointer-events-none`} />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp className="text-center mb-10">
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight mb-3" style={{ color: C.ink }}>
            ¿Qué tipo de profesional eres?
          </h2>
          <p style={{ color: C.inkMuted }}>Elige tu perfil y te llevamos a la página hecha para ti.</p>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-8 p-1.5 rounded-2xl bg-white border border-slate-200 shadow-sm"
            role="radiogroup"
            aria-label="Tipo de profesional"
          >
            {profiles.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={active === p.id}
                onClick={() => setActive(p.id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
                  active === p.id
                    ? 'bg-teal-50 border border-teal-300 shadow-sm'
                    : 'border border-transparent hover:bg-slate-50'
                }`}
              >
                <p.icon className="w-6 h-6" style={{ color: active === p.id ? p.accent : C.inkMuted }} />
                <span className="text-xs sm:text-sm font-semibold leading-tight" style={{ color: C.ink }}>
                  {p.label}
                </span>
              </button>
            ))}
          </div>
        </FadeUp>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard highlight className="p-6 sm:p-8">
              <ul className="space-y-3 mb-8">
                {current.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm sm:text-base" style={{ color: C.ink }}>
                    <Check className="w-5 h-5 shrink-0 mt-0.5" style={{ color: C.teal }} />
                    {b}
                  </li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t border-slate-200">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: C.inkMuted }}>
                    Plan sugerido
                  </div>
                  <div className="font-display font-extrabold text-xl" style={{ color: C.tealDark }}>
                    {current.plan}
                  </div>
                  <div className="text-sm" style={{ color: C.inkMuted }}>
                    {current.planNote}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Link
                    href={current.href}
                    className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-white text-sm shadow-lg shadow-teal-500/20 hover:scale-[1.02] transition-all"
                    style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.blue})` }}
                  >
                    {current.cta}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  {current.id === 'clinica' && (
                    <a
                      href={ASHIRA_WHATSAPP}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm border border-slate-200 bg-white hover:border-teal-300 transition-all"
                      style={{ color: C.ink }}
                    >
                      Hablar con ventas
                    </a>
                  )}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
