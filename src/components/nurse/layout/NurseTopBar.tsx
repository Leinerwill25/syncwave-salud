'use client';
// src/components/nurse/layout/NurseTopBar.tsx
// ═══════════════════════════════════════════════════════════
// ASHIRA — Barra superior del Panel de Enfermería
// ═══════════════════════════════════════════════════════════
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Calendar,
  Play,
  Square,
  ChevronDown,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNurseState, useNurseActions } from '@/hooks/nurse/useNurseContext';

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard/nurse':            'Dashboard',
  '/dashboard/nurse/queue':      'Lista de Pacientes',
  '/dashboard/nurse/observation':'Pacientes en Observación',
  '/dashboard/nurse/inventory':  'Inventario',
  '/dashboard/nurse/reports':    'Reporte de Turno',
  '/dashboard/nurse/settings':   'Mi Perfil',
  '/dashboard/nurse/independent':'Dashboard',
  '/dashboard/nurse/independent/patients': 'Mis Pacientes',
  '/dashboard/nurse/independent/reports':  'Mis Reportes',
  '/dashboard/nurse/independent/settings': 'Mi Perfil',
};

function getRouteTitle(pathname: string): string {
  // Exact match first
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];

  // Partial matches for dynamic routes
  if (pathname.includes('/triage/')) return 'Triaje';
  if (pathname.includes('/medications')) return 'Medicamentos (MAR)';
  if (pathname.includes('/procedures')) return 'Procedimientos';
  if (pathname.includes('/origin')) return 'Procedencia y Referencia';
  if (pathname.includes('/discharge')) return 'Alta del Paciente';
  if (pathname.includes('/vitals')) return 'Signos Vitales';
  if (pathname.includes('/patient/')) return 'Ficha del Paciente';

  return 'Panel de Enfermería';
}

export function NurseTopBar() {
  const pathname = usePathname();
  const { activePatient, alerts, currentShift } = useNurseState();
  const { startShift, endShift } = useNurseActions();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const title = getRouteTitle(pathname);
  const unreadAlerts = alerts.filter((a) => !a.dismissed).length;
  const criticalAlerts = alerts.filter((a) => a.type === 'critical' && !a.dismissed).length;
  const today = format(new Date(), "EEEE d 'de' MMMM", { locale: es });

  return (
    <header className="flex-shrink-0 h-14 bg-white  border-b border-gray-200  flex items-center gap-4 px-6 z-10">
      {/* Route title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-gray-900  truncate">
          {title}
        </h1>
        {activePatient && (
          <p className="text-xs text-gray-500  truncate mt-0.5">
            Paciente activo:&nbsp;
            <span className="font-medium text-teal-600 ">
              {/* Show patient name from queue entry */}
              Cola #{activePatient.queue_number ?? '—'}
            </span>
          </p>
        )}
      </div>

      {/* Date selector */}
      <button
        onClick={() => setShowDatePicker(!showDatePicker)}
        className="hidden sm:flex items-center gap-1.5 text-xs text-gray-600  hover:text-gray-900  transition-colors"
      >
        <Calendar className="w-3.5 h-3.5" />
        <span className="capitalize">{today}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {/* Shift toggle */}
      {currentShift.isActive ? (
        <button
          onClick={endShift}
          className="flex items-center gap-1.5 text-xs font-medium text-red-600  bg-red-50  hover:bg-red-100  border border-red-200  rounded-lg px-3 py-1.5 transition-colors"
        >
          <Square className="w-3 h-3 fill-current" />
          Finalizar turno
        </button>
      ) : (
        <button
          onClick={startShift}
          className="flex items-center gap-1.5 text-xs font-medium text-teal-600  bg-teal-50  hover:bg-teal-100  border border-teal-200  rounded-lg px-3 py-1.5 transition-colors"
        >
          <Play className="w-3 h-3 fill-current" />
          Iniciar turno
        </button>
      )}

      {/* Alert bell */}
      <button
        className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100  transition-colors"
        aria-label={`${unreadAlerts} alertas`}
      >
        <Bell className={cn('w-4.5 h-4.5', criticalAlerts > 0 ? 'text-red-500 animate-pulse' : 'text-gray-500 ')} />
        {unreadAlerts > 0 && (
          <span className={cn(
            'absolute -top-0.5 -right-0.5 flex items-center justify-center w-4.5 h-4.5 rounded-full text-[10px] font-bold text-white',
            criticalAlerts > 0 ? 'bg-red-500' : 'bg-amber-500'
          )}>
            {unreadAlerts > 9 ? '9+' : unreadAlerts}
          </span>
        )}
      </button>

      {/* Avatar mini */}
      <button className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 shadow-sm">
        <User className="w-4 h-4 text-white" />
      </button>
    </header>
  );
}
