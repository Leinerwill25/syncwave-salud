'use client';

import { Building2, Stethoscope, Pill, FlaskConical, Users } from 'lucide-react';
import { ASHIRA } from './shared';

const items = [
  { type: 'placeholder' as const, label: 'Consultorio aliado' },
  { type: 'icon' as const, label: 'Consultorios privados', icon: Stethoscope },
  { type: 'icon' as const, label: 'Clínicas multi-especialista', icon: Building2 },
  { type: 'placeholder' as const, label: 'Clínica aliada' },
  { type: 'icon' as const, label: 'Farmacias conectadas', icon: Pill },
  { type: 'icon' as const, label: 'Laboratorios clínicos', icon: FlaskConical },
  { type: 'placeholder' as const, label: 'Organización aliada' },
  { type: 'icon' as const, label: 'Portal del paciente', icon: Users },
];

function MarqueeItem({ item }: { item: (typeof items)[number] }) {
  return (
    <div className="flex items-center gap-3 px-6 py-3 mx-3 rounded-xl bg-white border border-slate-100 shadow-sm whitespace-nowrap shrink-0">
      {item.type === 'placeholder' ? (
        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-medium">
          {/* TODO: logo real */}
          Logo
        </div>
      ) : (
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${ASHIRA.tealDeep}18, ${ASHIRA.cyan}18)` }}
        >
          <item.icon className="w-4 h-4" style={{ color: ASHIRA.tealDeep }} />
        </div>
      )}
      <span className="text-sm font-semibold" style={{ color: ASHIRA.inkSoft }}>
        {item.label}
      </span>
    </div>
  );
}

export default function MarqueeLogos() {
  const track = [...items, ...items];

  return (
    <section className="py-12 border-y border-slate-100 overflow-hidden" style={{ background: ASHIRA.bgSoft }}>
      <p
        className="text-center text-xs font-bold uppercase tracking-widest mb-8"
        style={{ color: ASHIRA.inkSoft }}
      >
        Confiado por profesionales de salud en Venezuela
      </p>
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 z-10 pointer-events-none" style={{ background: `linear-gradient(to right, ${ASHIRA.bgSoft}, transparent)` }} />
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 z-10 pointer-events-none" style={{ background: `linear-gradient(to left, ${ASHIRA.bgSoft}, transparent)` }} />
        <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
          {track.map((item, i) => (
            <MarqueeItem key={`${item.label}-${i}`} item={item} />
          ))}
        </div>
      </div>
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee {
            animation: none;
            flex-wrap: wrap;
            justify-content: center;
            width: 100%;
            max-width: 72rem;
            margin: 0 auto;
            padding: 0 1rem;
            gap: 0.5rem;
          }
        }
      `}</style>
    </section>
  );
}
