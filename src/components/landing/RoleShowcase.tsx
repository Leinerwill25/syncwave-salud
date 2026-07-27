'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Stethoscope, ClipboardList, HeartPulse, Users } from 'lucide-react';
import { FadeUp, GlassCard, C, sectionAlt, dotGrid } from './shared';

const roles = [
  {
    icon: Stethoscope,
    title: 'Médico / Especialista',
    bullets: ['Historia clínica electrónica completa', 'Recetas PDF y DOCX', 'Dictado por voz → informe en un clic'],
    color: C.teal,
  },
  {
    icon: ClipboardList,
    title: 'Recepción / Asistente',
    bullets: ['Pagos auditados y trazables', 'Doble moneda BCV integrada', 'Panel Inteligente de Servicios'],
    color: C.blue,
  },
  {
    icon: HeartPulse,
    title: 'Enfermería',
    bullets: ['Signos vitales y MAR/Kardex', 'Modo offline para rondas', 'Comunicación directa con el equipo'],
    color: '#EC4899',
  },
  {
    icon: Users,
    title: 'Paciente',
    bullets: ['Historial portable en toda la red', 'Recetas y resultados en un tap', 'ASHIRA Salud+ y Pulsos'],
    color: C.tealDark,
  },
];

export default function RoleShowcase() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -380 : 380, behavior: 'smooth' });
  };

  return (
    <section className="relative py-20 sm:py-28 overflow-hidden" style={{ background: sectionAlt }}>
      <div className={`absolute inset-0 ${dotGrid} pointer-events-none`} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold uppercase tracking-wider">
              Por rol
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: C.ink }}>
              Profundidad real{' '}
              <span style={{ color: C.tealDark }}>para cada perfil</span>
            </h2>
          </div>
          <div className="hidden sm:flex gap-2">
            <button type="button" onClick={() => scroll('left')} className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:border-teal-300 transition-colors focus-visible:ring-2 focus-visible:ring-teal-400 shadow-sm" aria-label="Anterior">
              <ChevronLeft className="w-5 h-5" style={{ color: C.ink }} />
            </button>
            <button type="button" onClick={() => scroll('right')} className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:border-teal-300 transition-colors focus-visible:ring-2 focus-visible:ring-teal-400 shadow-sm" aria-label="Siguiente">
              <ChevronRight className="w-5 h-5" style={{ color: C.ink }} />
            </button>
          </div>
        </FadeUp>

        <div ref={scrollRef} className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          {roles.map((r, i) => (
            <FadeUp key={r.title} delay={i * 0.06} className="snap-center shrink-0 w-[85vw] sm:w-[360px]">
              <GlassCard className="h-full overflow-hidden hover:border-teal-300">
                <div className="h-44 relative" style={{ background: `linear-gradient(135deg, ${r.color}18, ${C.surfaceMuted})` }}>
                  <div className="absolute inset-4 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                    <r.icon className="w-12 h-12 opacity-50" style={{ color: r.color }} />
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-display font-bold text-lg mb-3" style={{ color: C.ink }}>{r.title}</h3>
                  <ul className="space-y-2">
                    {r.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm" style={{ color: C.inkMuted }}>
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: C.teal }} />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </GlassCard>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
