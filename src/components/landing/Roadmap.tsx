'use client';

import { Shield } from 'lucide-react';
import { FadeUp, C, dotGrid, sectionTint } from './shared';

export default function Roadmap() {
  return (
    <section className="relative py-10 sm:py-12 overflow-hidden border-t border-slate-200" style={{ background: sectionTint }}>
      <div className={`absolute inset-0 ${dotGrid} pointer-events-none`} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-center sm:text-left">
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-amber-200 bg-amber-50">
              <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-0.5">
                  Próximamente
                </span>
                <span className="text-sm font-display font-semibold" style={{ color: C.ink }}>
                  Integración con aseguradoras
                </span>
              </div>
            </div>
            <p className="text-xs max-w-xs" style={{ color: C.inkMuted }}>
              Convenios y validación de cobertura — en desarrollo.
            </p>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
