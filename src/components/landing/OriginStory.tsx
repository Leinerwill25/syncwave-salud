'use client';

import { Mail, Smartphone, FolderOpen, UserX, Clock, Repeat, EyeOff, Link2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { FadeUp, GlassCard, C, dotGrid, sectionBg } from './shared';
import PulseLine from './PulseLine';

const fragments = [
  {
    icon: Mail,
    label: 'Informes',
    detail: 'En un correo olvidado',
    rotate: '-6deg',
    offset: 'translate-x-0 -translate-y-2',
    color: C.blue2,
  },
  {
    icon: Smartphone,
    label: 'Recetas',
    detail: 'Foto en el teléfono',
    rotate: '4deg',
    offset: 'translate-x-4 translate-y-1',
    color: '#EC4899',
  },
  {
    icon: FolderOpen,
    label: 'Resultados',
    detail: 'Otra carpeta aparte',
    rotate: '-3deg',
    offset: 'translate-x-2 translate-y-6',
    color: '#D97706',
  },
  {
    icon: UserX,
    label: 'Especialistas',
    detail: 'Solo ven su parte',
    rotate: '5deg',
    offset: 'translate-x-6 translate-y-3',
    color: '#F43F5E',
  },
];

const consequences = [
  { icon: Clock, text: 'Se pierde tiempo' },
  { icon: Repeat, text: 'Se repiten exámenes' },
  { icon: EyeOff, text: 'Decisiones a ciegas' },
];

function FragmentStack() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative w-full max-w-sm mx-auto lg:mx-0 h-[320px] sm:h-[360px]">
      <div
        className="absolute inset-0 rounded-3xl border border-dashed border-slate-200 opacity-80"
        aria-hidden
      />
      {fragments.map((f, i) => (
        <motion.div
          key={f.label}
          className={`absolute left-4 right-4 sm:left-6 sm:right-6 ${f.offset}`}
          style={{ top: `${i * 68}px`, rotate: reduceMotion ? '0deg' : f.rotate }}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ delay: reduceMotion ? 0 : i * 0.12, duration: 0.5 }}
          viewport={{ once: true }}
        >
          <GlassCard className="p-4 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-slate-100"
              style={{ background: `${f.color}14` }}
            >
              <f.icon className="w-5 h-5" style={{ color: f.color }} />
            </div>
            <div className="min-w-0">
              <div className="font-display font-bold text-sm" style={{ color: C.ink }}>{f.label}</div>
              <div className="text-xs truncate" style={{ color: C.inkMuted }}>{f.detail}</div>
            </div>
            <div className="ml-auto w-2 h-2 rounded-full bg-red-400 shrink-0" aria-hidden title="Desconectado" />
          </GlassCard>
        </motion.div>
      ))}
      {!reduceMotion && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" aria-hidden>
          <line x1="20%" y1="15%" x2="80%" y2="45%" stroke={C.border} strokeWidth="1" strokeDasharray="4 6" />
          <line x1="30%" y1="50%" x2="70%" y2="75%" stroke={C.border} strokeWidth="1" strokeDasharray="4 6" />
        </svg>
      )}
    </div>
  );
}

export default function OriginStory() {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden" style={{ background: sectionBg }}>
      <div className={`absolute inset-0 ${dotGrid} pointer-events-none`} />
      <div className="absolute top-1/2 right-0 w-80 h-80 rounded-full blur-3xl opacity-40 pointer-events-none" style={{ background: `${C.teal}15` }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <FadeUp className="order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold uppercase tracking-wider">
              El problema
            </div>

            <h2 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold leading-[1.12] tracking-tight mb-6" style={{ color: C.ink }}>
              La historia médica de un paciente vive{' '}
              <span style={{ color: C.tealDark }}>en pedazos</span> por todos lados.
            </h2>

            <p className="text-lg leading-relaxed mb-8" style={{ color: C.inkMuted }}>
              Informes en un correo, recetas en una foto del teléfono, resultados en otra carpeta, y cada
              especialista viendo solo su parte. Cuando la información de salud está dispersa, se pierde
              tiempo, se repiten exámenes y las decisiones se toman a ciegas.
            </p>

            <div className="flex flex-wrap gap-2 mb-8">
              {consequences.map((c) => (
                <span
                  key={c.text}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 border border-slate-200"
                  style={{ color: C.ink }}
                >
                  <c.icon className="w-3.5 h-3.5 text-red-500" />
                  {c.text}
                </span>
              ))}
            </div>

            <div
              className="relative rounded-2xl p-5 sm:p-6 border border-teal-200 bg-teal-50"
              style={{ boxShadow: `0 4px 24px ${C.teal}12` }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 border border-teal-200 flex items-center justify-center shrink-0 mt-0.5">
                  <Link2 className="w-5 h-5" style={{ color: C.tealDark }} />
                </div>
                <p className="text-base sm:text-lg font-medium leading-relaxed" style={{ color: C.ink }}>
                  <span className="font-display font-bold" style={{ color: C.tealDark }}>ASHIRA</span> reúne
                  todo en un solo lugar y lo mantiene conectado entre médico, paciente y consultorio.
                </p>
              </div>
            </div>
          </FadeUp>

          <FadeUp delay={0.15} className="order-1 lg:order-2">
            <FragmentStack />
          </FadeUp>
        </div>

        <div className="mt-16 sm:mt-20">
          <PulseLine variant="separator" className="w-full h-12 opacity-60" />
        </div>
      </div>
    </section>
  );
}
