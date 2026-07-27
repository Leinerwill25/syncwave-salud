'use client';

import { FadeUp, StatCounter, C, dotGrid, sectionAlt } from './shared';
import { consultorioPricing, tractionStats } from '@/config/ashira-content';

const steps = [
  { label: `${tractionStats.hoursSavedPerDay} h recuperadas al día`, value: `${tractionStats.hoursSavedPerDay}h` },
  { label: '× 20 días laborables', value: '40h/mes' },
  { label: `≈ 8 consultas extra × $${consultorioPricing.monthlyUsd}`, value: '+$280/mes' },
  { label: 'Costo ASHIRA Médico', value: `$${consultorioPricing.monthlyUsd}/mes` },
];

export default function RoiBlock() {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden" style={{ background: sectionAlt }}>
      <div className={`absolute inset-0 ${dotGrid} pointer-events-none`} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-3xl opacity-30 pointer-events-none" style={{ background: `${C.teal}20` }} />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <FadeUp>
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold uppercase tracking-wider">
            ROI del médico
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold mb-12 tracking-tight" style={{ color: C.ink }}>
            El empleado más barato del consultorio
          </h2>
        </FadeUp>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          {steps.map((s, i) => (
            <FadeUp key={s.label} delay={i * 0.1}>
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                <div className="font-stats text-xl sm:text-2xl font-bold tabular-nums mb-1" style={{ color: C.tealDark }}>
                  {s.value}
                </div>
                <div className="text-[11px] sm:text-xs" style={{ color: C.inkMuted }}>{s.label}</div>
              </div>
            </FadeUp>
          ))}
        </div>

        <FadeUp delay={0.3}>
          <div className="relative inline-block mb-6">
            <StatCounter target={tractionStats.roiMultiple} suffix="x" label="Retorno de inversión" />
            <div className="absolute inset-0 -z-10 blur-3xl opacity-20 rounded-full" style={{ background: C.teal }} />
          </div>
          <p className="text-xl sm:text-2xl font-display font-bold max-w-2xl mx-auto leading-snug" style={{ color: C.tealDark }}>
            &ldquo;ASHIRA no es un gasto. Es el empleado más barato del consultorio.&rdquo;
          </p>
          <p className="text-sm mt-4" style={{ color: C.inkMuted }}>
            Basado en plan Médico / Consultorio a ${consultorioPricing.monthlyUsd}/mes.
          </p>
        </FadeUp>
      </div>
    </section>
  );
}
