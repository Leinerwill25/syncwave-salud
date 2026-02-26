'use client';
// src/components/nurse/layout/NurseSidebar.tsx
// ═══════════════════════════════════════════════════════════
// ASHIRA — Sidebar del Panel de Enfermería
// ═══════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Activity,
  Pill,
  Stethoscope,
  BedDouble,
  Package,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Clock,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNurseState } from '@/hooks/nurse/useNurseContext';
import type { NurseType } from '@/types/nurse.types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

function getNavItems(nurseType: NurseType): NavItem[] {
  if (nurseType === 'affiliated') {
    return [
      { label: 'Dashboard',         href: '/dashboard/nurse',     icon: LayoutDashboard },
      { label: 'Lista de Pacientes',href: '/dashboard/nurse/queue',         icon: Users },
      { label: 'Observación',       href: '/dashboard/nurse/observation',   icon: BedDouble },
      { label: 'Inventario',        href: '/dashboard/nurse/inventory',     icon: Package },
      { label: 'Reporte de Turno',  href: '/dashboard/nurse/reports',      icon: FileText },
      { label: 'Mi Perfil',         href: '/dashboard/nurse/settings',     icon: Settings },
    ];
  }
  return [
    { label: 'Dashboard',     href: '/dashboard/nurse/independent/dashboard',  icon: LayoutDashboard },
    { label: 'Mis Pacientes', href: '/dashboard/nurse/independent/patients',   icon: Users },
    { label: 'Mis Reportes',  href: '/dashboard/nurse/independent/reports',    icon: FileText },
    { label: 'Mi Perfil',     href: '/dashboard/nurse/independent/settings',   icon: Settings },
  ];
}

interface NurseSidebarProps {
  nurseType: NurseType;
}

export function NurseSidebar({ nurseType }: NurseSidebarProps) {
  const pathname = usePathname();
  const { nurseProfile, currentShift, isOnline } = useNurseState();
  const [collapsed, setCollapsed] = useState(false);
  const [shiftTimer, setShiftTimer] = useState<string>('');

  const navItems = getNavItems(nurseType);

  // ── Shift timer ──────────────────────────────────────────
  useEffect(() => {
    if (!currentShift.isActive || !currentShift.start) {
      setShiftTimer('');
      return;
    }
    const interval = setInterval(() => {
      const diff = Date.now() - currentShift.start!.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setShiftTimer(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [currentShift]);

  const initials = nurseProfile
    ? (nurseProfile.full_name ?? nurseProfile.email ?? 'EN')
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'EN';

  const badgeClass =
    nurseType === 'affiliated'
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';

  return (
    <aside
      className={cn(
        'relative flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out z-20',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 z-30 flex items-center justify-center w-6 h-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-gray-500" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-gray-500" />
        )}
      </button>

      {/* Header — Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-800', collapsed && 'justify-center px-2')}>
        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
          <Activity className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">ASHIRA</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Enfermería</p>
          </div>
        )}
      </div>

      {/* Nurse profile */}
      <div className={cn('flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-800', collapsed && 'justify-center px-2')}>
        <div className="flex-shrink-0 w-9 h-9 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full flex items-center justify-center shadow">
          {nurseProfile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={nurseProfile.avatar_url}
              alt={nurseProfile.full_name ?? 'Enfermera'}
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <span className="text-sm font-bold text-white">{initials}</span>
          )}
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {nurseProfile?.full_name ?? 'Cargando...'}
            </p>
            <span className={cn('inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-0.5', badgeClass)}>
              {nurseType === 'affiliated'
                ? `Afiliada · ${nurseProfile?.organization_name ?? '...'}`
                : 'Independiente'}
            </span>
          </div>
        )}
      </div>

      {/* Shift indicator */}
      {!collapsed && currentShift.isActive && (
        <div className="mx-3 mt-2 mb-1 flex items-center gap-2 bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 rounded-lg px-3 py-2">
          <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 flex-shrink-0 animate-pulse" />
          <div>
            <p className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">Turno activo</p>
            <p className="text-xs font-mono text-teal-700 dark:text-teal-300">{shiftTimer}</p>
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={cn(
                  'w-4.5 h-4.5 flex-shrink-0',
                  isActive ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400'
                )}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && item.badge ? (
                <span className="ml-auto inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Footer — online indicator */}
      <div className={cn('px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex items-center gap-2', collapsed && 'justify-center px-2')}>
        {isOnline ? (
          <Wifi className="w-3.5 h-3.5 text-emerald-500" />
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-red-500 animate-pulse" />
        )}
        {!collapsed && (
          <span className={cn('text-xs', isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>
            {isOnline ? 'En línea' : 'Sin conexión'}
          </span>
        )}
      </div>
    </aside>
  );
}
