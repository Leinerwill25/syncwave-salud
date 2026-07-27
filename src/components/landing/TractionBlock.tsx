'use client';

import { FadeUp, GlassCard, StatCounter, C, dotGrid, darkGradient } from './shared';

export default function TractionBlock() {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden" style={{ background: darkGradient }}>
      <div className={`absolute inset-0 ${dotGrid} pointer-events-none`} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            Validado en producción, no en demo
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Tracción <span style={{ color: C.mint }}>real</span>
          </h2>
        </FadeUp>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <StatCounter target={350} prefix="+" label="Pacientes gestionados" dark />
          <StatCounter target={3} label="Módulos IA activos" dark />
          <StatCounter target={2} suffix="h" label="Ahorradas al día" dark />
          <StatCounter target={2} suffix=" meses" label="Primer consultorio activo" dark />
        </div>

        <FadeUp>
          <GlassCard highlight className="p-6 sm:p-8 max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="w-20 h-20 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
                {/* TODO: confirmar nombre completo y autorización para uso público */}
                {/* TODO: foto Dra. Lisangela */}
                <span className="text-2xl font-display font-bold text-teal-300">DL</span>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: C.tealBright }}>Caso de estudio</div>
                <h3 className="font-display text-xl font-bold text-white mb-2">
                  Dra. Lisangela — Ginecóloga
                </h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color: C.ice }}>
                  350 pacientes gestionados en 2 meses de operación. Ahorro documentado de <strong className="text-white">2 horas diarias</strong> en tareas administrativas y clínicas.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['350+ pacientes', '2h/día ahorradas', 'En producción'].map((t) => (
                    <span key={t} className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        </FadeUp>
      </div>
    </section>
  );
}
