'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Bell, ArrowRight, CheckCircle2 } from 'lucide-react';
import { C, FadeUp, heroGradient, dotGrid } from '@/components/landing/shared';
import LandingFooter from '@/components/landing/LandingFooter';
import { ASHIRA_WHATSAPP } from '@/config/ashira-content';

type ComingSoonProps = {
  eyebrow: string;
  title: string;
  description: string;
  waitlistSource: 'farmacias' | 'laboratorios';
  accent?: string;
};

export default function ComingSoonLanding({
  eyebrow,
  title,
  description,
  waitlistSource,
  accent = C.teal,
}: ComingSoonProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/landing/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: waitlistSource }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('error');
        setMessage(data.error || 'No pudimos registrar tu email. Intenta de nuevo.');
        return;
      }
      setStatus('ok');
      setMessage('Listo. Te avisaremos cuando esté disponible.');
      setEmail('');
    } catch {
      setStatus('error');
      setMessage('Error de conexión. Intenta de nuevo o escríbenos por WhatsApp.');
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden font-body" style={{ background: C.white, color: C.ink }}>
      <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28" style={{ background: heroGradient }}>
        <div className={`absolute inset-0 ${dotGrid} pointer-events-none`} />
        <div className="absolute -top-32 right-0 w-96 h-96 rounded-full blur-3xl opacity-30 pointer-events-none" style={{ background: `${accent}30` }} />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeUp>
            <div
              className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border"
              style={{ background: `${accent}12`, borderColor: `${accent}40`, color: accent }}
            >
              <Bell className="w-3.5 h-3.5" />
              {eyebrow}
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight mb-6 leading-tight" style={{ color: C.ink }}>
              {title}
            </h1>
            <p className="text-lg sm:text-xl leading-relaxed mb-10 max-w-2xl mx-auto" style={{ color: C.inkMuted }}>
              {description}
            </p>
          </FadeUp>

          <FadeUp delay={0.1}>
            {status === 'ok' ? (
              <div className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                {message}
              </div>
            ) : (
              <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
                <label htmlFor={`waitlist-${waitlistSource}`} className="sr-only">
                  Correo electrónico
                </label>
                <input
                  id={`waitlist-${waitlistSource}`}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="flex-1 px-5 py-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  style={{ color: C.ink }}
                  disabled={status === 'loading'}
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-white text-sm shadow-lg hover:scale-[1.02] transition-all disabled:opacity-60"
                  style={{ background: `linear-gradient(135deg, ${accent}, ${C.blue})` }}
                >
                  {status === 'loading' ? 'Enviando…' : 'Avísame'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
            {status === 'error' && (
              <p className="mt-3 text-sm text-red-600">{message}</p>
            )}
            <p className="mt-6 text-sm" style={{ color: C.inkMuted }}>
              ¿Prefieres hablar ahora?{' '}
              <a href={ASHIRA_WHATSAPP} target="_blank" rel="noopener noreferrer" className="font-semibold text-teal-700 hover:underline">
                Escríbenos por WhatsApp
              </a>
            </p>
          </FadeUp>

          <FadeUp delay={0.2} className="mt-14 flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/landing/consultorios" className="text-teal-700 font-medium hover:underline">
              Software para consultorios
            </Link>
            <span style={{ color: C.inkLight }}>·</span>
            <Link href="/landing/clinicas" className="text-teal-700 font-medium hover:underline">
              Gestión para clínicas
            </Link>
            <span style={{ color: C.inkLight }}>·</span>
            <Link href="/" className="text-teal-700 font-medium hover:underline">
              Volver al inicio
            </Link>
          </FadeUp>
        </div>
      </section>
      <LandingFooter />
    </div>
  );
}
