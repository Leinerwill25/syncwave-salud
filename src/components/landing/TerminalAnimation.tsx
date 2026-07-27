'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Bell, Activity, FlaskConical, Clock, ArrowRight } from 'lucide-react';
import { FadeUp, ASHIRA } from './shared';

const automations = [
  { icon: Bell, text: 'Notificaciones automáticas de citas y pagos pendientes' },
  { icon: Activity, text: 'Recetas enviadas directamente a farmacias aliadas' },
  { icon: FlaskConical, text: 'Resultados de laboratorio directo al médico y paciente' },
  { icon: Clock, text: 'Recordatorios de seguimiento de tratamientos activos' },
];

const terminalLines = [
  { time: '→ [09:00]', msg: 'Cita confirmada: María G. — WhatsApp ✓', cls: 'text-emerald-400' },
  { time: '→ [09:15]', msg: 'Receta enviada a Farmacia Central ✓', cls: 'text-sky-400' },
  { time: '→ [09:45]', msg: 'Resultado Lab recibido · Dr. Ramírez notificado', cls: 'text-teal-400' },
  { time: '→ [10:00]', msg: 'Pago registrado · Factura generada automáticamente', cls: 'text-purple-400' },
  { time: '→ [10:30]', msg: 'Recordatorio: Tratamiento de Ana M. (día 15/30)', cls: 'text-amber-400' },
];

export default function TerminalAnimation() {
  const termRef = useRef<HTMLDivElement>(null);
  const termInView = useInView(termRef, { once: true, margin: '-80px' });
  const reduceMotion = useReducedMotion();

  return (
    <section className="py-20 sm:py-28 overflow-hidden relative" style={{ background: ASHIRA.navy }}>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-30" style={{ background: ASHIRA.tealDeep }} />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl opacity-20" style={{ background: ASHIRA.cyan }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <FadeUp>
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              Automatización inteligente
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white mb-6 leading-tight tracking-tight">
              Tu clínica trabajando sola.<br />
              <span className="text-teal-300">Tú, enfocado en el paciente.</span>
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed mb-8">
              ASHIRA automatiza los flujos más repetitivos para que cada minuto de tu jornada sea productivo y clínicamente valioso.
            </p>
            <ul className="space-y-4 mb-10">
              {automations.map((item, i) => (
                <FadeUp key={i} delay={i * 0.08}>
                  <li className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <item.icon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-slate-300 text-sm leading-relaxed">{item.text}</span>
                  </li>
                </FadeUp>
              ))}
            </ul>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white text-sm shadow-lg hover:scale-[1.02] transition-all"
              style={{ background: 'linear-gradient(135deg, #10b981, #0d9488)' }}
            >
              Activar automatizaciones <ArrowRight className="w-4 h-4" />
            </Link>
          </FadeUp>

          <FadeUp delay={0.2}>
            <div
              ref={termRef}
              className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-sm p-6 font-mono text-sm overflow-hidden shadow-2xl"
              style={{ fontFamily: 'var(--font-mono), ui-monospace, monospace' }}
            >
              <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/10">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="ml-2 text-slate-600 text-xs">ashira.automations — activo</span>
              </div>
              <div className="space-y-3 text-xs sm:text-sm">
                {terminalLines.map((line, i) => (
                  <motion.div
                    key={i}
                    className={`flex gap-2 ${line.cls}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={
                      termInView || reduceMotion
                        ? { opacity: 1, x: 0 }
                        : { opacity: 0, x: -8 }
                    }
                    transition={{
                      duration: reduceMotion ? 0 : 0.4,
                      delay: reduceMotion ? 0 : i * 0.35,
                    }}
                  >
                    <span className="text-slate-600 shrink-0">{line.time}</span>
                    <span>{line.msg}</span>
                  </motion.div>
                ))}
                <motion.div
                  className="text-slate-500 mt-3 flex items-center gap-1.5"
                  initial={{ opacity: 0 }}
                  animate={termInView ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ delay: reduceMotion ? 0 : terminalLines.length * 0.35 + 0.2 }}
                >
                  {!reduceMotion && <span className="w-2 h-4 bg-slate-500 animate-pulse rounded-sm inline-block" />}
                  Sistema activo 24/7...
                </motion.div>
              </div>
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
