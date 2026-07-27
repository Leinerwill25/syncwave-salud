'use client';

import {
  Stethoscope, Brain, Globe, Pill, Building2, Users, ArrowRight,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { FadeUp, GlassCard, C, dotGrid, sectionBg } from './shared';
import { differentiators as diffs } from '@/config/ashira-content';

const silos = [
  { label: 'Agenda', scope: 'Solo para el médico' },
  { label: 'Expediente', scope: 'Una función aislada' },
  { label: 'Facturación', scope: 'Otro proveedor' },
  { label: 'Portal paciente', scope: 'Sin historial unificado' },
];

const integratedLayers = [
  { icon: Stethoscope, label: 'Médico y consulta' },
  { icon: Building2, label: 'Recepción y administración' },
  { icon: Users, label: 'Portal del paciente' },
  { icon: Brain, label: 'IA clínica' },
  { icon: Globe, label: 'Página pública' },
  { icon: Pill, label: 'Red farmacéutica' },
];

function ComparisonVisual() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1.15fr]">
        <div className="p-6 sm:p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/50">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: C.inkLight }}>
            Sistemas genéricos
          </p>
          <h3 className="font-display font-bold text-lg mb-1" style={{ color: C.inkMuted }}>
            Una función. Un actor.
          </h3>
          <p className="text-xs mb-8 max-w-xs" style={{ color: C.inkLight }}>
            Herramientas del mercado que no hablan entre sí.
          </p>

          <div className="space-y-3 max-w-sm mx-auto lg:mx-0">
            {silos.map((silo, i) => (
              <motion.div
                key={silo.label}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: reduceMotion ? 0 : i * 0.08 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white">
                  <div className="w-1 h-8 rounded-full bg-slate-300 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold" style={{ color: C.inkMuted }}>{silo.label}</div>
                    <div className="text-[11px] mt-0.5 truncate" style={{ color: C.inkLight }}>{silo.scope}</div>
                  </div>
                </div>
                {i < silos.length - 1 && (
                  <div className="flex justify-center py-1.5" aria-hidden>
                    <div className="w-px h-3 border-l border-dashed border-slate-300" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          <p className="mt-8 text-xs text-center lg:text-left" style={{ color: C.inkLight }}>
            Datos aislados · Sin continuidad clínica
          </p>
        </div>

        <div className="hidden lg:flex flex-col items-center justify-center px-4 py-10 border-r border-slate-200">
          <motion.div
            className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center bg-white shadow-sm"
            animate={reduceMotion ? {} : { opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            <ArrowRight className="w-4 h-4" style={{ color: C.teal }} />
          </motion.div>
        </div>

        <div className="lg:hidden flex items-center justify-center py-4 border-b border-slate-200">
          <div className="flex items-center gap-2 text-xs font-medium" style={{ color: C.inkMuted }}>
            <span className="w-8 h-px bg-slate-300" />
            se convierte en
            <span className="w-8 h-px bg-teal-300" />
          </div>
        </div>

        <div
          className="relative p-6 sm:p-8 lg:p-10 overflow-hidden"
          style={{ background: `linear-gradient(160deg, ${C.teal}08 0%, ${C.white} 55%)` }}
        >
          <motion.div
            className="absolute -bottom-20 -right-20 w-56 h-56 rounded-full blur-3xl pointer-events-none"
            style={{ background: C.teal }}
            animate={reduceMotion ? {} : { opacity: [0.06, 0.12, 0.06] }}
            transition={{ duration: 5, repeat: Infinity }}
          />

          <p className="relative text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: C.tealDark }}>
            ASHIRA
          </p>
          <h3 className="relative font-display font-bold text-xl mb-1" style={{ color: C.ink }}>
            Todo en <span style={{ color: C.tealDark }}>un solo sistema</span>
          </h3>
          <p className="relative text-xs mb-8 max-w-xs" style={{ color: C.inkMuted }}>
            Consultorio, paciente, IA y ecosistema — conectados de punta a punta.
          </p>

          <div className="relative max-w-sm mx-auto lg:mx-0">
            <div
              className="rounded-2xl border border-teal-200 overflow-hidden shadow-lg shadow-teal-500/10 bg-white"
            >
              <div
                className="px-4 py-3 border-b border-teal-100 flex items-center justify-between"
                style={{ background: `linear-gradient(90deg, ${C.teal}12, transparent)` }}
              >
                <span className="font-display font-bold text-sm" style={{ color: C.ink }}>ASHIRA</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  Todo conectado
                </span>
              </div>

              {integratedLayers.map((layer, i) => (
                <motion.div
                  key={layer.label}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: reduceMotion ? 0 : 0.15 + i * 0.06 }}
                  viewport={{ once: true }}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    i < integratedLayers.length - 1 ? 'border-b border-teal-50' : ''
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${C.teal}14` }}
                  >
                    <layer.icon className="w-4 h-4" style={{ color: C.teal }} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: C.ink }}>{layer.label}</span>
                  <div className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: C.teal }} />
                </motion.div>
              ))}
            </div>

            <div
              className="absolute -left-3 top-8 bottom-8 w-1 rounded-full hidden lg:block"
              style={{ background: `linear-gradient(180deg, transparent, ${C.teal}50, transparent)` }}
              aria-hidden
            />
          </div>

          <p className="relative mt-8 text-xs font-semibold text-center lg:text-left" style={{ color: C.tealDark }}>
            Una historia médica · Un consultorio · Una plataforma
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Differentiators() {
  return (
    <section id="diferenciadores" className="relative py-20 sm:py-28 overflow-hidden" style={{ background: sectionBg }}>
      <div className={`absolute inset-0 ${dotGrid} pointer-events-none`} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp className="text-center mb-12 sm:mb-14 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold uppercase tracking-wider">
            Por qué ASHIRA
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight mb-4" style={{ color: C.ink }}>
            Piezas sueltas vs.{' '}
            <span style={{ color: C.tealDark }}>consultorio completo</span>
          </h2>
          <p className="text-lg leading-relaxed" style={{ color: C.inkMuted }}>
            En el mercado abundan sistemas que resuelven una función. ASHIRA reúne todo lo que tu práctica necesita.
          </p>
        </FadeUp>

        <FadeUp delay={0.08} className="mb-16">
          <ComparisonVisual />
        </FadeUp>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {diffs.map((d, i) => (
            <FadeUp key={d.n} delay={i * 0.06}>
              <GlassCard className="p-5 h-full">
                <span className="font-stats text-2xl font-bold tabular-nums" style={{ color: C.teal }}>{d.n}</span>
                <h3 className="font-display font-bold text-base mt-2 mb-2" style={{ color: C.ink }}>{d.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: C.inkMuted }}>{d.desc}</p>
              </GlassCard>
            </FadeUp>
          ))}
        </div>

        <FadeUp delay={0.2} className="mt-12 text-center">
          <p className="text-lg sm:text-xl font-display font-semibold max-w-2xl mx-auto leading-snug" style={{ color: C.tealDark }}>
            Nuestro foso no es el precio: es que tu consultorio entero vive aquí.
          </p>
        </FadeUp>
      </div>
    </section>
  );
}
