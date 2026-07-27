'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Clock, Activity, Globe, Users } from 'lucide-react';
import { FadeUp, C, dotGrid, sectionBg } from './shared';

const tabs = [
  {
    id: 'agenda',
    label: 'Agenda inteligente',
    icon: Clock,
    title: 'Tu agenda trabaja mientras tú atiendes',
    desc: 'Citas online, confirmación automática por WhatsApp IA, recordatorios y gestión de disponibilidad.',
    gradient: `linear-gradient(135deg, ${C.teal}25, ${C.surfaceTint})`,
  },
  {
    id: 'receta',
    label: 'Receta electrónica',
    icon: Activity,
    title: 'Prescripciones con trazabilidad a farmacia',
    desc: 'Genera, firma y envía recetas a FarmaTuya y la red farmacéutica integrada.',
    gradient: `linear-gradient(135deg, ${C.blue}20, ${C.iceBg})`,
  },
  {
    id: 'publica',
    label: 'Página pública',
    icon: Globe,
    title: 'Tu consultorio visible 24/7',
    desc: 'Agenda, servicios, precios, ubicación y Cashea — el paciente auto-agenda sin intervención.',
    gradient: `linear-gradient(135deg, ${C.tealBright}20, ${C.surfaceMuted})`,
  },
  {
    id: 'portal',
    label: 'Portal del paciente',
    icon: Users,
    title: 'Historial portable en toda la red',
    desc: 'Acceso gratuito a citas, recetas, resultados y ASHIRA Salud+ con Pulsos.',
    gradient: `linear-gradient(135deg, ${C.teal}15, ${C.surfaceTint})`,
  },
];

function DemoPoster({ label, gradient }: { label: string; gradient: string }) {
  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-200 shadow-lg shadow-teal-500/5" style={{ background: gradient }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-4 shadow-sm">
          <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-teal-600 border-b-8 border-b-transparent ml-1" />
        </div>
        <p className="text-sm font-semibold" style={{ color: C.ink }}>Demo: {label}</p>
        <p className="text-xs mt-1" style={{ color: C.inkMuted }}>Video próximamente</p>
      </div>
    </div>
  );
}

export default function FeatureTabs() {
  const [active, setActive] = useState(tabs[0].id);
  const reduceMotion = useReducedMotion();
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <section id="funcionalidades" className="relative py-20 sm:py-28 overflow-hidden" style={{ background: sectionBg }}>
      <div className={`absolute inset-0 ${dotGrid} pointer-events-none`} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp className="text-center mb-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold uppercase tracking-wider">
            Funcionalidades
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: C.ink }}>
            Mira el producto{' '}
            <span style={{ color: C.tealDark }}>en movimiento</span>
          </h2>
        </FadeUp>

        <div className="flex flex-wrap justify-center gap-2 mb-10" role="tablist" aria-label="Funcionalidades de ASHIRA">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active === tab.id}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActive(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
                active === tab.id
                  ? 'text-white shadow-md border border-teal-500'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-teal-300'
              }`}
              style={active === tab.id ? { background: `linear-gradient(135deg, ${C.teal}, ${C.blue})` } : {}}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              id={`panel-${current.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${current.id}`}
              initial={reduceMotion ? false : { opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, x: 16 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="font-display text-2xl sm:text-3xl font-extrabold mb-4" style={{ color: C.ink }}>{current.title}</h3>
              <p className="text-lg leading-relaxed" style={{ color: C.inkMuted }}>{current.desc}</p>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35 }}
            >
              <DemoPoster label={current.label} gradient={current.gradient} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
