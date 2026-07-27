'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Mic, CheckCircle2, FileSearch } from 'lucide-react';
import { C, GlassCard } from './shared';

function FloatingCard({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <div className={className}>{children}</div>;
  return (
    <motion.div
      animate={{ y: [-8, 8, -8] }}
      transition={{ duration: 3.5 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function DashboardMockup() {
  return (
    <GlassCard className="p-6 sm:p-8 shadow-lg shadow-teal-500/5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-xs font-medium" style={{ color: C.inkMuted }}>Buenos días</div>
          <div className="text-lg font-display font-bold" style={{ color: C.ink }}>Dr. Ramírez</div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" /> En línea
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { v: '12', l: 'Citas hoy', c: C.tealDark },
          { v: '3', l: 'Pendientes', c: '#D97706' },
          { v: '98', l: 'Pacientes', c: C.blue },
        ].map((s) => (
          <div key={s.l} className="rounded-xl p-2.5 text-center bg-slate-50 border border-slate-100">
            <div className="text-xl font-stats font-bold tabular-nums" style={{ color: s.c }}>{s.v}</div>
            <div className="text-[10px] mt-0.5" style={{ color: C.inkMuted }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: C.inkMuted }}>Próximas citas</div>
      <div className="space-y-2">
        {[
          { name: 'María G.', time: '10:00', type: 'Consulta' },
          { name: 'Carlos P.', time: '11:30', type: 'Control' },
        ].map((a) => (
          <div key={a.name} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
              style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.blue})` }}
            >
              {a.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate" style={{ color: C.ink }}>{a.name}</div>
              <div className="text-[10px]" style={{ color: C.inkMuted }}>{a.type}</div>
            </div>
            <div className="text-[10px] font-medium" style={{ color: C.inkMuted }}>{a.time}</div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

export default function HeroVisual() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative mt-12 lg:mt-0">
      <FloatingCard
        className="absolute -top-4 -left-4 sm:-left-8 z-20 max-w-[230px]"
        delay={0}
      >
        <GlassCard className="p-3 sm:p-4 flex items-center gap-3 shadow-md">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-purple-50 border border-purple-200">
            <Mic className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <div className="text-xs font-bold" style={{ color: C.ink }}>Informe generado por voz</div>
            <div className="text-[10px]" style={{ color: C.tealDark }}>en 30 segundos</div>
          </div>
        </GlassCard>
      </FloatingCard>

      <FloatingCard className="absolute top-1/3 -right-2 sm:-right-6 z-20 max-w-[210px]" delay={0.7}>
        <GlassCard className="p-3 sm:p-4 flex items-center gap-3 shadow-md">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-xs font-bold" style={{ color: C.ink }}>Cita confirmada por WhatsApp</div>
            <div className="text-[10px]" style={{ color: C.inkMuted }}>NLP en español VE</div>
          </div>
        </GlassCard>
      </FloatingCard>

      <FloatingCard className="absolute -bottom-2 left-4 z-20" delay={1.1}>
        <GlassCard className="p-3 sm:p-4 flex items-center gap-3 shadow-md">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 border border-blue-200">
            <FileSearch className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="text-xs font-bold" style={{ color: C.ink }}>Resultado de lab analizado</div>
            <div className="text-[10px]" style={{ color: C.inkMuted }}>ASHIRA-Doc</div>
          </div>
        </GlassCard>
      </FloatingCard>

      <motion.div
        animate={reduceMotion ? {} : { y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
      >
        <DashboardMockup />
      </motion.div>
    </div>
  );
}
