'use client';
// src/components/nurse/layout/NurseAlertPanel.tsx
// ═══════════════════════════════════════════════════════════
// ASHIRA — Panel lateral de alertas del módulo de enfermería
// ═══════════════════════════════════════════════════════════
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Info,
  AlarmClock,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNurseState, useNurseActions } from '@/hooks/nurse/useNurseContext';
import type { NurseAlert } from '@/types/nurse.types';

function AlertIcon({ type }: { type: NurseAlert['type'] }) {
  if (type === 'critical') return <AlarmClock className="w-4 h-4 text-red-500 flex-shrink-0 animate-pulse" />;
  if (type === 'warning')  return <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />;
  return <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />;
}

function AlertCard({ alert, onDismiss }: { alert: NurseAlert; onDismiss: () => void }) {
  const bgClass = {
    critical: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    warning:  'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    info:     'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  }[alert.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn('relative border rounded-lg p-3 mb-2', bgClass)}
    >
      {alert.type !== 'critical' && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Descartar alerta"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="flex items-start gap-2 pr-4">
        <AlertIcon type={alert.type} />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-900 dark:text-white">{alert.title}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-snug">{alert.message}</p>
          {alert.patientName && (
            <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-0.5">
              Paciente: {alert.patientName}
            </p>
          )}
          <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1">
            {formatDistanceToNow(alert.createdAt, { addSuffix: true, locale: es })}
          </p>
          {alert.action && (
            <Link
              href={alert.action.href}
              className="inline-block mt-1.5 text-[10px] font-medium text-teal-600 dark:text-teal-400 hover:underline"
            >
              {alert.action.label} →
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function NurseAlertPanel() {
  const [open, setOpen] = useState(false);
  const { alerts } = useNurseState();
  const { dismissAlert } = useNurseActions();

  const visible = alerts.filter((a) => !a.dismissed);
  const criticals = visible.filter((a) => a.type === 'critical');

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed right-0 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-8 h-16 rounded-l-lg shadow-lg transition-colors',
          criticals.length > 0
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-teal-500 hover:bg-teal-600 text-white'
        )}
        aria-label={open ? 'Cerrar alertas' : 'Ver alertas'}
      >
        <div className="flex flex-col items-center gap-1">
          {open ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {visible.length > 0 && (
            <span className="text-[9px] font-bold">{visible.length}</span>
          )}
        </div>
      </button>

      {/* Slide-in panel */}
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl z-20 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-800">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Alertas activas</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {visible.length === 0 ? 'Sin alertas nuevas' : `${visible.length} alerta${visible.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Critical section (non-dismissable) */}
            {criticals.length > 0 && (
              <div className="px-3 pt-3">
                <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  Críticas — no descartar
                </p>
                <AnimatePresence>
                  {criticals.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onDismiss={() => {}} // critical alerts cannot be dismissed
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Other alerts */}
            <div className="flex-1 overflow-y-auto px-3 pt-2 pb-4">
              {visible.filter((a) => a.type !== 'critical').length === 0 && criticals.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                    <Info className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Sin alertas nuevas</p>
                  <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                    Las alertas aparecerán aquí automáticamente
                  </p>
                </div>
              ) : null}
              <AnimatePresence>
                {visible
                  .filter((a) => a.type !== 'critical')
                  .map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onDismiss={() => dismissAlert(alert.id)}
                    />
                  ))}
              </AnimatePresence>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
