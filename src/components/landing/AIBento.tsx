'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import {
  Mic, Brain, FileSearch, MessageCircle, HeartPulse, Sparkles,
  Zap, CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { FadeUp, C, dotGrid, sectionAlt } from './shared';

type ModuleId = 'voice' | 'memory' | 'doc' | 'whatsapp' | 'kardex' | 'advice';

const modules: {
  id: ModuleId;
  icon: typeof Mic;
  title: string;
  short: string;
  desc: string;
  production: boolean;
  accent: string;
}[] = [
  {
    id: 'voice',
    icon: Mic,
    title: 'ASHIRA-Voice → Informe',
    short: 'Voice',
    desc: 'Dicta la consulta; la IA rellena el formulario clínico y genera el informe en un clic.',
    production: true,
    accent: C.mint,
  },
  {
    id: 'memory',
    icon: Brain,
    title: 'ASHIRA-Memory',
    short: 'Memory',
    desc: 'Resumen inteligente del historial con hashing para ahorro de tokens.',
    production: true,
    accent: C.tealBright,
  },
  {
    id: 'doc',
    icon: FileSearch,
    title: 'ASHIRA-Doc',
    short: 'Doc',
    desc: 'Análisis de informes, resultados de laboratorio e imágenes médicas.',
    production: true,
    accent: C.blue2,
  },
  {
    id: 'whatsapp',
    icon: MessageCircle,
    title: 'WhatsApp IA',
    short: 'WhatsApp',
    desc: 'Confirmación de citas por respuesta natural — NLP en español venezolano.',
    production: false,
    accent: '#4ADE80',
  },
  {
    id: 'kardex',
    icon: HeartPulse,
    title: 'Nursing Kardex',
    short: 'Kardex',
    desc: 'IA de enfermería para signos vitales, MAR y seguimiento de pacientes.',
    production: false,
    accent: '#F472B6',
  },
  {
    id: 'advice',
    icon: Sparkles,
    title: 'Patient Advice',
    short: 'Advice',
    desc: 'Recomendaciones personalizadas y educación al paciente.',
    production: false,
    accent: '#C084FC',
  },
];

function Waveform({ active }: { active: boolean }) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="flex items-center justify-center gap-[3px] h-16">
      {Array.from({ length: 32 }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full origin-center"
          style={{ background: `linear-gradient(to top, ${C.teal}, ${C.mint})` }}
          animate={
            reduceMotion || !active
              ? { height: 12, opacity: 0.4 }
              : { height: [8, 12 + Math.sin(i * 0.5) * 28, 8], opacity: [0.5, 1, 0.5] }
          }
          transition={{ duration: 0.8 + (i % 5) * 0.1, repeat: Infinity, ease: 'easeInOut', delay: i * 0.04 }}
        />
      ))}
    </div>
  );
}

const VOICE_FIELDS = ['Motivo de consulta', 'Examen físico', 'Diagnóstico', 'Plan de tratamiento'];

function VoiceDemo({ active }: { active: boolean }) {
  const [filled, setFilled] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!active || reduceMotion) {
      setFilled(reduceMotion ? VOICE_FIELDS.length : 0);
      return;
    }
    setFilled(0);
    const timers = VOICE_FIELDS.map((_, i) =>
      setTimeout(() => setFilled(i + 1), 600 + i * 700),
    );
    const loop = setInterval(() => {
      setFilled(0);
      VOICE_FIELDS.forEach((_, i) => setTimeout(() => setFilled(i + 1), 600 + i * 700));
    }, 4500);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(loop);
    };
  }, [active, reduceMotion]);

  return (
    <div className="space-y-4">
      <Waveform active={active} />
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
        {VOICE_FIELDS.map((f, i) => (
          <motion.div
            key={f}
            className="flex items-center gap-2 text-xs"
            initial={{ opacity: 0.3 }}
            animate={{ opacity: i < filled ? 1 : 0.35 }}
          >
            {i < filled ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: C.tealDark }} />
            ) : (
              <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
            )}
            <span className="w-28 shrink-0" style={{ color: C.inkMuted }}>{f}</span>
            <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${C.teal}, ${C.mint})` }}
                initial={{ width: '0%' }}
                animate={{ width: i < filled ? '100%' : '0%' }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        ))}
      </div>
      <motion.p
        className="text-center text-xs font-semibold"
        style={{ color: C.tealDark }}
        animate={{ opacity: filled === VOICE_FIELDS.length ? [0.5, 1, 0.5] : 0 }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Informe generado ✓
      </motion.p>
    </div>
  );
}

function MemoryDemo({ active }: { active: boolean }) {
  const lines = [
    'Paciente: antecedente de hipertensión controlada',
    'Última consulta: control ginecológico — hace 3 meses',
    'Alergias: penicilina · Medicación activa: losartán 50mg',
  ];
  const reduceMotion = useReducedMotion();

  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 font-mono text-[11px] leading-relaxed space-y-2 min-h-[180px]">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
        <span style={{ color: C.inkMuted }}>ashira.memory</span>
        <motion.span
          className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200"
          animate={active && !reduceMotion ? { opacity: [0.6, 1, 0.6] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          −68% tokens
        </motion.span>
      </div>
      {lines.map((line, i) => (
        <motion.div
          key={i}
          style={{ color: C.inkMuted }}
          initial={{ opacity: 0, x: -8 }}
          animate={active ? { opacity: 1, x: 0 } : { opacity: 0.3, x: 0 }}
          transition={{ delay: reduceMotion ? 0 : i * 0.25 }}
        >
          <span style={{ color: C.teal }}>{'>'}</span> {line}
        </motion.div>
      ))}
      {active && (
        <motion.div
          className="flex items-center gap-1.5 pt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <span className="w-2 h-3 bg-teal-400 animate-pulse rounded-sm" />
          <span className="text-teal-700 text-[10px]">Resumiendo historial...</span>
        </motion.div>
      )}
    </div>
  );
}

function DocDemo({ active }: { active: boolean }) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="relative rounded-xl bg-slate-50 border border-slate-200 p-4 min-h-[180px] overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center opacity-20">
        <FileSearch className="w-24 h-24" style={{ color: C.blue2 }} />
      </div>
      <motion.div
        className="absolute left-0 right-0 h-0.5 z-10"
        style={{ background: `linear-gradient(90deg, transparent, ${C.mint}, transparent)`, boxShadow: `0 0 12px ${C.mint}` }}
        animate={active && !reduceMotion ? { top: ['10%', '90%', '10%'] } : { top: '50%' }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative z-20 space-y-2 pt-2">
        {['Hemoglobina: 13.2 g/dL', 'Glucosa: 98 mg/dL', '⚠ Valor fuera de rango detectado'].map((r, i) => (
          <motion.div
            key={r}
            className={`text-xs px-3 py-2 rounded-lg border ${i === 2 ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-700'}`}
            initial={{ opacity: 0, y: 8 }}
            animate={active ? { opacity: 1, y: 0 } : { opacity: 0.4, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.4 + i * 0.35 }}
          >
            {r}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function WhatsAppDemo({ active }: { active: boolean }) {
  const msgs = [
    { from: 'bot', text: 'Hola María 👋 ¿Confirmas tu cita del martes 10:00 AM?' },
    { from: 'user', text: 'Sí, confirmo' },
    { from: 'bot', text: '✓ Cita confirmada. Te esperamos.' },
  ];
  const reduceMotion = useReducedMotion();

  return (
    <div className="rounded-xl bg-emerald-50/50 border border-emerald-100 p-4 min-h-[180px] space-y-2">
      {msgs.map((m, i) => (
        <motion.div
          key={i}
          className={`max-w-[85%] text-xs px-3 py-2 rounded-2xl ${m.from === 'user' ? 'ml-auto bg-teal-600 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm shadow-sm'}`}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={active ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0.35, scale: 1, y: 0 }}
          transition={{ delay: reduceMotion ? 0 : i * 0.5, type: 'spring', stiffness: 260 }}
        >
          {m.text}
        </motion.div>
      ))}
    </div>
  );
}

function KardexDemo({ active }: { active: boolean }) {
  const vitals = [
    { l: 'TA', v: '120/80', ok: true },
    { l: 'FC', v: '72', ok: true },
    { l: 'Temp', v: '37.1°C', ok: true },
    { l: 'SpO₂', v: '98%', ok: true },
  ];
  const reduceMotion = useReducedMotion();

  return (
    <div className="grid grid-cols-2 gap-2 min-h-[180px]">
      {vitals.map((v, i) => (
        <motion.div
          key={v.l}
          className="rounded-xl bg-white border border-slate-200 p-3 text-center"
          animate={active && !reduceMotion ? { borderColor: [`${C.teal}40`, `${C.tealDark}80`, `${C.teal}40`] } : {}}
          transition={{ delay: i * 0.2, duration: 2, repeat: Infinity }}
        >
          <div className="text-[10px] mb-1" style={{ color: C.inkMuted }}>{v.l}</div>
          <div className="font-stats text-lg font-bold" style={{ color: C.ink }}>{v.v}</div>
        </motion.div>
      ))}
    </div>
  );
}

function AdviceDemo({ active }: { active: boolean }) {
  const tips = ['Hidratación: 8 vasos de agua al día', 'Reposo relativo 48h', 'Control en 7 días'];
  const reduceMotion = useReducedMotion();

  return (
    <div className="space-y-2 min-h-[180px]">
      {tips.map((t, i) => (
        <motion.div
          key={t}
          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200"
          initial={{ opacity: 0, x: -12 }}
          animate={active ? { opacity: 1, x: 0 } : { opacity: 0.35, x: 0 }}
          transition={{ delay: reduceMotion ? 0 : i * 0.3 }}
        >
          <Sparkles className="w-4 h-4 shrink-0" style={{ color: '#C084FC' }} />
          <span className="text-xs" style={{ color: C.ink }}>{t}</span>
        </motion.div>
      ))}
    </div>
  );
}

function ModulePreview({ id, active }: { id: ModuleId; active: boolean }) {
  switch (id) {
    case 'voice': return <VoiceDemo active={active} />;
    case 'memory': return <MemoryDemo active={active} />;
    case 'doc': return <DocDemo active={active} />;
    case 'whatsapp': return <WhatsAppDemo active={active} />;
    case 'kardex': return <KardexDemo active={active} />;
    case 'advice': return <AdviceDemo active={active} />;
  }
}

export default function AIBento() {
  const [active, setActive] = useState<ModuleId>('voice');
  const reduceMotion = useReducedMotion();
  const current = modules.find((m) => m.id === active)!;
  const productionCount = modules.filter((m) => m.production).length;

  return (
    <section id="ia" className="relative py-20 sm:py-28 overflow-hidden" style={{ background: sectionAlt }}>
      <div className={`absolute inset-0 ${dotGrid} pointer-events-none`} />
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ background: C.teal }}
        animate={reduceMotion ? {} : { opacity: [0.06, 0.12, 0.06], scale: [1, 1.08, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl pointer-events-none"
        style={{ background: C.blue }}
        animate={reduceMotion ? {} : { opacity: [0.04, 0.1, 0.04], scale: [1.05, 1, 1.05] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp className="text-center mb-10 sm:mb-14 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold uppercase tracking-wider">
            <motion.span
              className="relative flex h-2 w-2"
              animate={reduceMotion ? {} : { scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400" />
            </motion.span>
            Inteligencia artificial que te devuelve horas
          </div>

          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4" style={{ color: C.ink }}>
            <motion.span
              className="inline-block font-stats tabular-nums mr-2"
              style={{ color: C.tealDark }}
              key={productionCount}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              {productionCount}
            </motion.span>
            módulos de IA{' '}
            <span style={{ color: C.tealDark }}>operativos en producción</span>
          </h2>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            {['Gemini 2.0 Flash', 'Groq Llama 3.3 70B', 'Fallback automático'].map((chip, i) => (
              <motion.span
                key={chip}
                className="text-[11px] px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-600"
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: reduceMotion ? 0 : i * 0.1 }}
                viewport={{ once: true }}
              >
                {chip}
              </motion.span>
            ))}
          </div>
        </FadeUp>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Selector de módulos */}
          <div className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3">
            {modules.map((m, i) => {
              const isActive = active === m.id;
              return (
                <FadeUp key={m.id} delay={i * 0.05}>
                  <button
                    type="button"
                    onClick={() => setActive(m.id)}
                    className={`relative w-full text-left p-4 rounded-2xl border bg-white outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-[border-color,background-color,box-shadow] duration-300 ease-out ${
                      isActive
                        ? 'border-teal-400 shadow-[inset_3px_0_0_0_var(--accent),0_4px_20px_rgba(0,180,166,0.1)]'
                        : 'border-slate-200 hover:border-teal-300 hover:shadow-sm'
                    }`}
                    style={
                      {
                        '--accent': m.accent,
                        background: isActive
                          ? `linear-gradient(135deg, ${m.accent}10, ${C.white})`
                          : undefined,
                      } as CSSProperties
                    }
                    aria-pressed={isActive}
                  >
                    {m.production && (
                      <span
                        className={`absolute top-2 right-2 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border transition-colors duration-300 ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-emerald-50/80 text-emerald-600 border-emerald-100'
                        }`}
                      >
                        <Zap className="w-2.5 h-2.5" />
                        Live
                      </span>
                    )}
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 border transition-colors duration-300 ${
                        isActive ? 'border-slate-200' : 'border-slate-100'
                      }`}
                      style={{ background: `${m.accent}${isActive ? '28' : '18'}` }}
                    >
                      <m.icon
                        className="w-4 h-4 transition-colors duration-300"
                        style={{ color: isActive ? m.accent : `${m.accent}cc` }}
                      />
                    </div>
                    <div
                      className={`font-display font-bold text-sm leading-tight pr-6 transition-colors duration-300 ${
                        isActive ? 'text-slate-900' : 'text-slate-600'
                      }`}
                    >
                      {m.short}
                    </div>
                  </button>
                </FadeUp>
              );
            })}
          </div>

          {/* Panel demo interactivo */}
          <FadeUp delay={0.15} className="lg:col-span-7">
            <div
              className="relative rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 overflow-hidden min-h-[340px] shadow-lg"
              style={{ boxShadow: `0 8px 40px ${current.accent}10` }}
            >
              <motion.div
                className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl pointer-events-none"
                style={{ background: current.accent }}
                animate={reduceMotion ? {} : { opacity: [0.08, 0.15, 0.08] }}
                transition={{ duration: 3, repeat: Infinity }}
                key={current.id}
              />

              <div className="relative z-10">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <current.icon className="w-5 h-5" style={{ color: current.accent }} />
                      <h3 className="font-display font-bold text-xl" style={{ color: C.ink }}>{current.title}</h3>
                    </div>
                    <p className="text-sm max-w-md" style={{ color: C.inkMuted }}>{current.desc}</p>
                  </div>
                  {current.production && (
                    <span className="shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      En producción
                    </span>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={current.id}
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    <ModulePreview id={current.id} active />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <p className="text-center text-xs mt-4" style={{ color: C.inkLight }}>
              Haz clic en un módulo para ver cómo funciona
            </p>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
