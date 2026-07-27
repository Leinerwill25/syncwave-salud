'use client';

import { FileText, Clock, Activity, Globe, Users, BarChart3 } from 'lucide-react';
import { FadeUp, ASHIRA } from './shared';

function MiniMock({ variant }: { variant: string }) {
  const base = 'rounded-lg overflow-hidden h-full min-h-[100px]';
  switch (variant) {
    case 'historial':
      return (
        <div className={`${base} p-3 space-y-1.5`} style={{ background: ASHIRA.bgSoft }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-2 items-center">
              <div className="w-2 h-2 rounded-full bg-teal-400" />
              <div className="h-2 rounded flex-1" style={{ background: `${ASHIRA.ink}10`, width: `${90 - i * 15}%` }} />
            </div>
          ))}
        </div>
      );
    case 'agenda':
      return (
        <div className={`${base} p-3 grid grid-cols-7 gap-1`} style={{ background: ASHIRA.bgSoft }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className={`h-4 rounded text-[6px] flex items-center justify-center ${i === 8 ? 'bg-teal-500 text-white font-bold' : 'bg-white'}`}>
              {i === 8 ? '●' : ''}
            </div>
          ))}
        </div>
      );
    case 'receta':
      return (
        <div className={`${base} p-3`} style={{ background: ASHIRA.bgSoft }}>
          <div className="bg-white rounded p-2 text-[8px] space-y-1 border border-teal-100">
            <div className="font-bold text-teal-700">Rx electrónica</div>
            <div className="h-1.5 rounded bg-slate-100 w-3/4" />
            <div className="h-1.5 rounded bg-slate-100 w-1/2" />
          </div>
        </div>
      );
    case 'publica':
      return (
        <div className={`${base}`} style={{ background: `linear-gradient(135deg, ${ASHIRA.tealDeep}, ${ASHIRA.cyan})` }}>
          <div className="p-3 text-white text-[9px] font-bold text-center pt-6">Tu consultorio online</div>
          <div className="mx-3 mb-3 bg-white/20 rounded py-1 text-[7px] text-center text-white">Agendar cita</div>
        </div>
      );
    case 'portal':
      return (
        <div className={`${base} p-3 flex flex-col justify-center items-center gap-2`} style={{ background: `linear-gradient(135deg, ${ASHIRA.navy}, ${ASHIRA.navy2})` }}>
          <Users className="w-8 h-8 text-teal-300" />
          <div className="text-[9px] text-teal-100 font-semibold text-center">Historial portable en toda la red</div>
          <div className="flex gap-1">
            {[ASHIRA.teal, ASHIRA.mint, ASHIRA.blue].map((c) => (
              <div key={c} className="w-2 h-2 rounded-full" style={{ background: c }} />
            ))}
          </div>
        </div>
      );
    case 'analytics':
      return (
        <div className={`${base} p-3 flex items-end gap-1`} style={{ background: ASHIRA.bgSoft }}>
          {[40, 65, 45, 80, 55].map((h, i) => (
            <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: `linear-gradient(to top, ${ASHIRA.tealDeep}, ${ASHIRA.cyan})`, opacity: 0.7 + i * 0.05 }} />
          ))}
        </div>
      );
    default:
      return null;
  }
}

const cells = [
  { icon: FileText, title: 'Historial médico digital', desc: 'Expedientes electrónicos completos y seguros.', mock: 'historial', span: 'sm:col-span-1' },
  { icon: Clock, title: 'Agenda inteligente', desc: 'Citas online con confirmación automática.', mock: 'agenda', span: 'sm:col-span-1' },
  { icon: Activity, title: 'Receta electrónica', desc: 'Genera, firma y envía a farmacias aliadas.', mock: 'receta', span: 'sm:col-span-1' },
  { icon: Globe, title: 'Página pública que agenda sola', desc: 'Tu consultorio visible 24/7 para nuevos pacientes.', mock: 'publica', span: 'sm:col-span-1' },
  { icon: Users, title: 'Portal del paciente portable', desc: 'El paciente lleva su historial por toda la red ASHIRA — el diferencial estrella.', mock: 'portal', span: 'sm:col-span-2 sm:row-span-2', featured: true },
  { icon: BarChart3, title: 'Analytics', desc: 'Dashboards, KPIs y reportes exportables.', mock: 'analytics', span: 'sm:col-span-1' },
];

export default function BentoGrid() {
  return (
    <section className="py-20 sm:py-28" style={{ background: ASHIRA.bgSoft }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp className="text-center mb-12 sm:mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-white border border-teal-200 text-teal-700 text-xs font-bold uppercase tracking-wider shadow-sm">
            Capacidades
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight mb-4" style={{ color: ASHIRA.ink }}>
            Todo lo que tu práctica necesita,{' '}
            <span style={{ color: ASHIRA.tealDeep }}>en un solo lugar</span>
          </h2>
          <p className="text-lg" style={{ color: ASHIRA.inkSoft }}>
            Cada módulo fue diseñado para la realidad venezolana — sin cambiar tu forma de trabajar.
          </p>
        </FadeUp>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 auto-rows-fr">
          {cells.map((cell, i) => (
            <FadeUp key={cell.title} delay={i * 0.06} className={cell.span}>
              <div
                className={`group h-full rounded-2xl border bg-white p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col ${
                  cell.featured ? 'border-teal-200 ring-1 ring-teal-100' : 'border-slate-100 hover:border-teal-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${ASHIRA.tealDeep}12, ${ASHIRA.cyan}12)` }}
                  >
                    <cell.icon className="w-5 h-5" style={{ color: ASHIRA.tealDeep }} />
                  </div>
                  {cell.featured && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                      Diferencial
                    </span>
                  )}
                </div>
                <h3 className="font-display font-bold text-base mb-1" style={{ color: ASHIRA.ink }}>{cell.title}</h3>
                <p className="text-sm mb-4 flex-1" style={{ color: ASHIRA.inkSoft }}>{cell.desc}</p>
                <div className="mt-auto">{/* TODO: captura real del producto */}<MiniMock variant={cell.mock} /></div>
                <div
                  className="mt-3 h-0.5 w-0 group-hover:w-full transition-all duration-500 rounded-full"
                  style={{ background: `linear-gradient(90deg, ${ASHIRA.tealDeep}, ${ASHIRA.cyan})` }}
                />
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
