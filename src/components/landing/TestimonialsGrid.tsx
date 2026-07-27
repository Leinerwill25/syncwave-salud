'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Quote } from 'lucide-react';
import { FadeUp, GlassCard, C, darkGradient, dotGrid } from './shared';

const testimonials = [
  {
    id: 'carwin',
    name: 'Dra. Carwin Silva',
    role: 'Ginecóloga Especialista · Embajadora Oficial ASHIRA',
    image: '/consultorios/dracarwin/IMG_5189.JPG',
    quote:
      'ASHIRA transformó la forma en que gestiono mi consultorio. Mis pacientes reciben atención de primer nivel y yo dedico más tiempo a lo que amo: la medicina.',
    real: true,
  },
  { id: 't2', name: null, role: null, image: null, quote: null, real: false },
  { id: 't3', name: null, role: null, image: null, quote: null, real: false },
];

export default function TestimonialsGrid() {
  const [active, setActive] = useState<string | null>('carwin');
  const reduceMotion = useReducedMotion();
  const selected = testimonials.find((t) => t.id === active && t.real);

  return (
    <section className="relative py-20 sm:py-28 overflow-hidden" style={{ background: darkGradient }}>
      <div className={`absolute inset-0 ${dotGrid} pointer-events-none`} />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-teal-300 text-xs font-bold uppercase tracking-wider">
            Testimonios
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Voces reales de la{' '}
            <span style={{ color: C.mint }}>red ASHIRA</span>
          </h2>
        </FadeUp>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {testimonials.map((t) =>
            t.real ? (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(active === t.id ? null : t.id)}
                className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 cursor-pointer ${
                  active === t.id ? 'border-teal-400 shadow-[0_0_30px_rgba(0,180,166,0.3)] scale-[1.02]' : 'border-white/10 shadow-lg hover:border-teal-400/40'
                }`}
                aria-expanded={active === t.id}
                aria-label={`Testimonio de ${t.name}`}
              >
                <Image src={t.image!} alt={t.name!} fill sizes="(max-width: 640px) 50vw, 200px" className="object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <span className="absolute bottom-3 left-3 right-3 text-white text-xs font-bold text-left">{t.name}</span>
              </button>
            ) : (
              <div key={t.id} className="aspect-square rounded-2xl border-2 border-dashed border-white/15 flex flex-col items-center justify-center p-4 text-center" aria-hidden>
                {/* TODO: testimonio real */}
                <Quote className="w-8 h-8 text-white/20 mb-2" />
                <span className="text-xs font-medium" style={{ color: C.ice }}>Próximamente</span>
              </div>
            ),
          )}
        </div>

        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div key={selected.id} initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}>
              <GlassCard className="p-6 sm:p-8 text-center">
                <Quote className="w-8 h-8 mx-auto mb-4" style={{ color: C.mint }} />
                <blockquote className="text-lg sm:text-xl font-medium leading-relaxed text-white mb-4">
                  &ldquo;{selected.quote}&rdquo;
                </blockquote>
                <footer>
                  <div className="font-display font-bold text-white">{selected.name}</div>
                  <div className="text-sm mt-1" style={{ color: C.ice }}>{selected.role}</div>
                </footer>
              </GlassCard>
            </motion.div>
          ) : (
            <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-sm" style={{ color: C.ice }}>
              Selecciona un testimonio para leer la cita completa.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
