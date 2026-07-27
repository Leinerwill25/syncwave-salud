'use client';

import { Stethoscope, ClipboardList, UserCheck, HeartPulse, Users, Building2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { FadeUp, GlassCard, C, dotGrid, sectionTint, SectionHeading } from './shared';

const roles = [
  { icon: Stethoscope, label: 'Médico / Especialista', angle: 0 },
  { icon: ClipboardList, label: 'Asistente de citas', angle: 72 },
  { icon: UserCheck, label: 'Recepción', angle: 144 },
  { icon: HeartPulse, label: 'Enfermería', angle: 216 },
  { icon: Users, label: 'Paciente', angle: 288 },
];

export default function OperationalUnit() {
  const reduceMotion = useReducedMotion();
  const radius = 140;

  return (
    <section id="ecosistema" className="relative py-20 sm:py-28 overflow-hidden" style={{ background: sectionTint }}>
      <div className={`absolute inset-0 ${dotGrid} pointer-events-none`} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Diferenciador #1"
          title={
            <>
              La competencia resuelve al médico.{' '}
              <span style={{ color: C.tealDark }}>ASHIRA resuelve al consultorio.</span>
            </>
          }
          subtitle="Médico + asistente de citas + recepción + enfermería en una sola plataforma operativa."
        />

        <div className="hidden md:flex justify-center items-center min-h-[420px] relative">
          <div className="absolute w-72 h-72 rounded-full border border-teal-200" />
          <div className="absolute w-96 h-96 rounded-full border border-slate-200" />
          <GlassCard highlight className="relative z-10 w-40 h-40 flex flex-col items-center justify-center text-center p-4">
            <Building2 className="w-8 h-8 mb-2" style={{ color: C.tealDark }} />
            <span className="font-display font-bold text-sm" style={{ color: C.ink }}>Consultorio</span>
            <span className="text-[10px] mt-1" style={{ color: C.inkMuted }}>Unidad operativa</span>
          </GlassCard>
          {roles.map((r, i) => {
            const rad = (r.angle * Math.PI) / 180;
            const x = Math.cos(rad) * radius;
            const y = Math.sin(rad) * radius;
            return (
              <motion.div
                key={r.label}
                className="absolute z-20"
                style={{ left: `calc(50% + ${x}px - 70px)`, top: `calc(50% + ${y}px - 40px)` }}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: reduceMotion ? 0 : i * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
              >
                <svg className="absolute -z-10" style={{ left: 70, top: 40, width: Math.abs(x) + 20, height: Math.abs(y) + 20, overflow: 'visible', transform: `translate(${x > 0 ? -Math.abs(x) : 0}px, ${y > 0 ? -Math.abs(y) : 0}px)` }}>
                  <line x1={x > 0 ? Math.abs(x) : 0} y1={y > 0 ? Math.abs(y) : 0} x2={x > 0 ? 0 : Math.abs(x)} y2={y > 0 ? 0 : Math.abs(y)} stroke={C.teal} strokeOpacity="0.25" strokeWidth="1" />
                </svg>
                <GlassCard className="w-[140px] p-3 text-center">
                  <r.icon className="w-5 h-5 mx-auto mb-1.5" style={{ color: C.teal }} />
                  <span className="text-[11px] font-semibold leading-tight block" style={{ color: C.ink }}>{r.label}</span>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>

        <div className="md:hidden space-y-3">
          <GlassCard highlight className="p-4 flex items-center gap-3 mb-6">
            <Building2 className="w-6 h-6" style={{ color: C.tealDark }} />
            <div>
              <div className="font-display font-bold" style={{ color: C.ink }}>Consultorio</div>
              <div className="text-xs" style={{ color: C.inkMuted }}>Unidad operativa central</div>
            </div>
          </GlassCard>
          {roles.map((r, i) => (
            <FadeUp key={r.label} delay={i * 0.06}>
              <div className="flex items-center gap-3">
                <div className="w-px h-6 ml-5" style={{ background: `${C.teal}40` }} />
                <GlassCard className="flex-1 p-3 flex items-center gap-3">
                  <r.icon className="w-5 h-5 shrink-0" style={{ color: C.teal }} />
                  <span className="text-sm font-semibold" style={{ color: C.ink }}>{r.label}</span>
                </GlassCard>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
