'use client';

import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { C } from './shared';

type PulseLineProps = {
  className?: string;
  variant?: 'hero' | 'separator';
};

export default function PulseLine({ className = '', variant = 'hero' }: PulseLineProps) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduceMotion = useReducedMotion();

  const path =
    variant === 'hero'
      ? 'M0 40 C80 40 100 10 160 40 S240 70 320 40 S400 10 480 40 S560 70 640 40'
      : 'M0 24 C120 24 160 8 240 24 S360 40 480 24 S600 8 720 24';

  const width = variant === 'hero' ? 640 : 720;
  const height = variant === 'hero' ? 80 : 48;

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden
      className={`pointer-events-none ${className}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="ashira-pulse-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={C.teal} stopOpacity="0" />
          <stop offset="30%" stopColor={C.tealBright} stopOpacity="1" />
          <stop offset="70%" stopColor={C.mint} stopOpacity="1" />
          <stop offset="100%" stopColor={C.teal} stopOpacity="0" />
        </linearGradient>
        <filter id="ashira-pulse-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <motion.path
        d={path}
        stroke="url(#ashira-pulse-grad)"
        strokeWidth={variant === 'hero' ? 2.5 : 1.5}
        strokeLinecap="round"
        fill="none"
        filter="url(#ashira-pulse-glow)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={
          reduceMotion
            ? { pathLength: 1, opacity: 0.5 }
            : inView
              ? { pathLength: 1, opacity: [0.35, 0.95, 0.35] }
              : { pathLength: 0, opacity: 0 }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                pathLength: { duration: 1.4, ease: [0.22, 1, 0.36, 1] },
                opacity: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' },
              }
        }
      />
    </svg>
  );
}
