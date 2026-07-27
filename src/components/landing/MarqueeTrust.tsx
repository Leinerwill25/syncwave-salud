'use client';

import { Building2, Pill, Award } from 'lucide-react';
import { C } from './shared';

const partners = [
  {
    name: 'SafeCare',
    sub: 'Clínica domiciliaria 24/7 · Caracas y zona metropolitana',
    icon: Building2,
    accent: C.teal,
  },
  {
    name: 'FarmaTuya',
    sub: 'Primera farmacia afiliada a la red',
    icon: Pill,
    accent: C.blue,
  },
  {
    name: 'Dra. Carwin Silva',
    sub: 'Embajadora oficial · Ginecología',
    icon: Award,
    accent: C.tealDark,
  },
];

function PartnerChip({
  name,
  sub,
  icon: Icon,
  accent,
}: (typeof partners)[number]) {
  return (
    <div className="group flex items-center gap-4 px-5 sm:px-6 py-3.5 mx-3 rounded-2xl bg-white border border-slate-200 shrink-0 shadow-sm transition-all duration-300 hover:border-teal-300 hover:shadow-md">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-slate-100"
        style={{ background: `linear-gradient(135deg, ${accent}14, ${accent}06)` }}
      >
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-display font-bold whitespace-nowrap transition-colors" style={{ color: C.ink }}>
          {name}
        </div>
        <div className="text-[11px] leading-snug mt-0.5 whitespace-nowrap" style={{ color: C.inkMuted }}>
          {sub}
        </div>
      </div>
    </div>
  );
}

export default function MarqueeTrust() {
  const track = [...partners, ...partners];

  return (
    <section className="py-10 sm:py-12 overflow-hidden border-y border-slate-200" style={{ background: C.surfaceMuted }}>
      <p className="text-center text-xs font-bold uppercase tracking-widest mb-6 px-4" style={{ color: C.inkMuted }}>
        En producción con aliados reales
      </p>

      <div className="relative">
        <div
          className="absolute left-0 top-0 bottom-0 w-16 sm:w-28 z-10 pointer-events-none"
          style={{ background: `linear-gradient(to right, ${C.surfaceMuted}, transparent)` }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-16 sm:w-28 z-10 pointer-events-none"
          style={{ background: `linear-gradient(to left, ${C.surfaceMuted}, transparent)` }}
        />
        <div className="flex w-max animate-marquee-trust hover:[animation-play-state:paused]">
          {track.map((p, i) => (
            <PartnerChip key={`${p.name}-${i}`} {...p} />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee-trust {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-trust {
          animation: marquee-trust 28s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee-trust {
            animation: none;
            width: 100%;
            justify-content: center;
            flex-wrap: wrap;
            gap: 0.75rem;
            padding: 0 1rem;
          }
        }
      `}</style>
    </section>
  );
}
