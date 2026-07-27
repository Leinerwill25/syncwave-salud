'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

export const C = {
  /* Marca */
  teal: '#00B4A6',
  tealDark: '#0D9488',
  tealBright: '#00D4C4',
  mint: '#0D9488',
  blue: '#4A7DE8',
  blue2: '#3B82F6',
  /* Superficies claras */
  white: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F8FAFC',
  surfaceTint: '#F0FDFA',
  iceBg: '#F0F9FF',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  /* Texto */
  ink: '#0F2133',
  inkMuted: '#5B6B7F',
  inkLight: '#94A3B8',
  /* Legacy (footer acento oscuro opcional) */
  navy900: '#0F2133',
  navy800: '#1E293B',
  navy700: '#334155',
  ice: '#64748B',
} as const;

export const ASHIRA = {
  teal: C.teal,
  tealDeep: C.tealDark,
  cyan: C.tealBright,
  blue: C.blue,
  mint: C.tealDark,
  navy: C.navy900,
  navy2: C.navy700,
  bg: C.white,
  bgSoft: C.surfaceMuted,
  ink: C.ink,
  inkSoft: C.inkMuted,
} as const;

export const dotGrid =
  'bg-[linear-gradient(to_right,#0d94880a_1px,transparent_1px),linear-gradient(to_bottom,#0d94880a_1px,transparent_1px)] bg-[size:32px_32px]';

export const heroGradient = `linear-gradient(180deg, ${C.white} 0%, ${C.surfaceTint} 55%, ${C.surfaceMuted} 100%)`;

/** @deprecated usar heroGradient o sectionBg */
export const darkGradient = heroGradient;

export const sectionBg = C.white;
export const sectionAlt = C.surfaceMuted;
export const sectionTint = C.surfaceTint;

export function GlassCard({
  children,
  className = '',
  highlight = false,
}: {
  children: React.ReactNode;
  className?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl transition-all duration-300 ${
        highlight
          ? 'bg-white border-2 border-teal-500 shadow-lg shadow-teal-500/10 ring-1 ring-teal-100'
          : 'bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-200/60'
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function FadeUp({
  children,
  delay = 0,
  className = '',
  disabled = false,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const reduceMotion = useReducedMotion();

  if (disabled || reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StatCounter({
  target,
  suffix = '',
  label,
  prefix = '',
  dark = false,
  decimals = 0,
}: {
  target: number;
  suffix?: string;
  label: string;
  prefix?: string;
  dark?: boolean;
  decimals?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const reduceMotion = useReducedMotion();
  const [count, setCount] = useState(reduceMotion ? target : 0);

  useEffect(() => {
    if (reduceMotion || !inView) {
      setCount(target);
      return;
    }
    const duration = 1600;
    const step = (ts: number, start: number) => {
      const prog = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - prog, 3);
      const val = ease * target;
      setCount(decimals > 0 ? Math.round(val * 10) / 10 : Math.floor(val));
      if (prog < 1) requestAnimationFrame((t) => step(t, start));
    };
    requestAnimationFrame((t) => step(t, t));
  }, [inView, target, reduceMotion, decimals]);

  const display = decimals > 0 ? count.toFixed(decimals) : String(count);

  return (
    <div ref={ref} className="text-center">
      <div
        className="font-stats text-3xl sm:text-4xl lg:text-5xl font-bold tabular-nums"
        style={{ color: dark ? C.tealBright : C.tealDark }}
      >
        {prefix}
        {display}
        {suffix}
      </div>
      <div className="text-xs sm:text-sm font-medium mt-1.5" style={{ color: dark ? C.ice : C.inkMuted }}>
        {label}
      </div>
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  dark = false,
  id,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
  dark?: boolean;
  id?: string;
}) {
  return (
    <FadeUp className="text-center mb-12 sm:mb-16 max-w-3xl mx-auto">
      {eyebrow && (
        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-50 border border-teal-200 text-teal-700">
          {eyebrow}
        </div>
      )}
      <h2
        id={id}
        className="font-display text-3xl sm:text-4xl font-extrabold mb-4 leading-tight tracking-tight"
        style={{ color: dark ? C.white : C.ink }}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="text-lg leading-relaxed" style={{ color: dark ? 'rgba(255,255,255,0.85)' : C.inkMuted }}>
          {subtitle}
        </p>
      )}
    </FadeUp>
  );
}
