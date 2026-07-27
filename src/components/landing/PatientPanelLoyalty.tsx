'use client';

import { Users, QrCode, Gift, Heart, Activity, Zap, Crown } from 'lucide-react';
import { FadeUp, GlassCard, C, dotGrid, sectionTint } from './shared';

const levels = [
  { name: 'Latido', icon: Heart, threshold: 0, color: '#94A3B8' },
  { name: 'Ritmo', icon: Activity, threshold: 25, color: C.teal },
  { name: 'Pulso Fuerte', icon: Zap, threshold: 50, color: C.tealBright },
  { name: 'Corazón ASHIRA', icon: Crown, threshold: 100, color: C.tealDark },
];

export default function PatientPanelLoyalty() {
  const currentProgress = 62;

  return (
    <section className="relative py-20 sm:py-28 overflow-hidden" style={{ background: sectionTint }}>
      <div className={`absolute inset-0 ${dotGrid} pointer-events-none`} />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-30 pointer-events-none" style={{ background: `${C.teal}15` }} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <FadeUp>
            <div className="relative mx-auto w-[260px]">
              <div className="rounded-[2rem] border-[3px] border-slate-200 bg-white p-2 shadow-xl shadow-teal-500/5">
                <div className="rounded-[1.5rem] overflow-hidden bg-slate-50 border border-slate-100">
                  <div className="px-4 py-3 text-center text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.blue})` }}>
                    Patient Panel
                  </div>
                  <div className="p-4 space-y-3">
                    {['Historial portable', 'Mis recetas', 'Plan Familiar (5)', 'QR de emergencia'].map((item) => (
                      <div key={item} className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-100 text-xs" style={{ color: C.ink }}>
                        <Users className="w-3.5 h-3.5 text-teal-600" />
                        {item}
                      </div>
                    ))}
                    <div className="flex items-center justify-center gap-2 p-2 rounded-lg border border-dashed border-teal-300 text-[10px] bg-teal-50" style={{ color: C.tealDark }}>
                      <QrCode className="w-4 h-4" /> Historial en toda la red ASHIRA
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 w-14 h-14 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-[10px] font-bold text-teal-700 shadow-sm">
                Ash
              </div>
            </div>
          </FadeUp>

          <FadeUp delay={0.1}>
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold uppercase tracking-wider">
              Diferenciador #3
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight" style={{ color: C.ink }}>
              El paciente es dueño de su historia,{' '}
              <span style={{ color: C.tealDark }}>y se la lleva a donde vaya</span>
            </h2>
            <p className="text-lg mb-6 leading-relaxed" style={{ color: C.inkMuted }}>
              Portal gratuito con Plan Familiar (hasta 5 miembros), historial, citas, recetas PDF, Mis Informes, QR de emergencia, mensajería y asistente IA <strong style={{ color: C.ink }}>Ash</strong>.
            </p>

            <GlassCard className="p-5 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <Gift className="w-5 h-5" style={{ color: C.tealDark }} />
                <span className="font-display font-bold" style={{ color: C.ink }}>ASHIRA Salud+</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">Pulsos</span>
              </div>
              <div className="relative h-3 rounded-full bg-slate-100 mb-6 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
                  style={{ width: `${currentProgress}%`, background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})` }}
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {levels.map((lvl) => (
                  <div key={lvl.name} className={`text-center p-2 rounded-xl ${currentProgress >= lvl.threshold ? 'bg-teal-50 border border-teal-200' : 'opacity-50'}`}>
                    <lvl.icon className="w-4 h-4 mx-auto mb-1" style={{ color: lvl.color }} />
                    <div className="text-[9px] font-semibold leading-tight" style={{ color: C.ink }}>{lvl.name}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs mt-4" style={{ color: C.inkMuted }}>
                Catálogo de recompensas y sistema de referidos. Niveles: Latido → Ritmo → Pulso Fuerte → Corazón ASHIRA.
              </p>
            </GlassCard>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
