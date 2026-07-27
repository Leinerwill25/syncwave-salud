'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { FadeUp, ASHIRA } from './shared';

const cases = [
  {
    title: 'Tu página pública agendando sola',
    desc: 'Pacientes reservan citas sin llamadas ni mensajes de ida y vuelta.',
    gradient: `linear-gradient(135deg, ${ASHIRA.tealDeep}, ${ASHIRA.cyan})`,
  },
  {
    title: 'Recordatorios por WhatsApp',
    desc: 'Confirmaciones automáticas que reducen ausencias y liberan tu agenda.',
    gradient: `linear-gradient(135deg, ${ASHIRA.cyan}, ${ASHIRA.blue})`,
  },
  {
    title: 'Historial portable del paciente',
    desc: 'Un solo expediente que viaja contigo por toda la red ASHIRA.',
    gradient: `linear-gradient(135deg, ${ASHIRA.navy}, ${ASHIRA.navy2})`,
  },
  {
    title: 'Recetas conectadas a farmacias',
    desc: 'Prescripciones digitales con trazabilidad de punta a punta.',
    gradient: `linear-gradient(135deg, #7C3AED, ${ASHIRA.blue})`,
  },
  {
    title: 'Resultados de laboratorio al instante',
    desc: 'Órdenes y resultados entregados al médico y paciente automáticamente.',
    gradient: `linear-gradient(135deg, #EA580C, #F59E0B)`,
  },
];

export default function UseCaseCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.85;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <section className="py-20 sm:py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold uppercase tracking-wider">
              Casos de uso
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: ASHIRA.ink }}>
              Así se ve ASHIRA{' '}
              <span style={{ color: ASHIRA.tealDeep }}>en acción</span>
            </h2>
          </div>
          <div className="hidden sm:flex gap-2">
            <button
              type="button"
              onClick={() => scroll('left')}
              className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:border-teal-300 hover:bg-teal-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-5 h-5" style={{ color: ASHIRA.ink }} />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:border-teal-300 hover:bg-teal-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              aria-label="Siguiente"
            >
              <ChevronRight className="w-5 h-5" style={{ color: ASHIRA.ink }} />
            </button>
          </div>
        </FadeUp>

        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide"
          style={{ scrollbarWidth: 'none' }}
        >
          {cases.map((c, i) => (
            <FadeUp key={c.title} delay={i * 0.05} className="snap-center shrink-0 w-[85vw] sm:w-[380px]">
              <div className="rounded-2xl border border-slate-100 bg-white shadow-md overflow-hidden h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                {/* TODO: captura real del producto */}
                <div className="h-48 sm:h-52 relative" style={{ background: c.gradient }}>
                  <div className="absolute inset-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                    <span className="text-white/80 text-xs font-medium">Vista previa del módulo</span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-display font-bold text-lg mb-2" style={{ color: ASHIRA.ink }}>{c.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: ASHIRA.inkSoft }}>{c.desc}</p>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
