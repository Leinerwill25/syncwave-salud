'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Activity, 
  Pill, 
  Calendar, 
  DollarSign, 
  FlaskConical,
  Users,
  MessageSquare,
  Shield,
  LogOut,
  User
} from 'lucide-react';

const menuItems = [
  { href: '/dashboard/analytics', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/analytics/epidemiologia', label: 'Epidemiología', icon: Activity },
  { href: '/dashboard/analytics/farmacia', label: 'Farmacia', icon: Pill },
  { href: '/dashboard/analytics/operaciones', label: 'Operaciones', icon: Calendar },
  { href: '/dashboard/analytics/financiero', label: 'Financiero', icon: DollarSign },
  { href: '/dashboard/analytics/laboratorio', label: 'Laboratorio', icon: FlaskConical },
  { href: '/dashboard/analytics/pacientes', label: 'Pacientes', icon: Users },
  { href: '/dashboard/analytics/comunicacion', label: 'Comunicación', icon: MessageSquare },
  { href: '/dashboard/analytics/auditoria', label: 'Auditoría', icon: Shield },
];

export function AnalyticsSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Obtener información del usuario autenticado
    fetch('/api/analytics/login', {
      method: 'GET',
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        if (data.authenticated && data.user) {
          setUsername(data.user.username);
        }
      })
      .catch(err => console.error('Error obteniendo usuario:', err));
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics/login', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        router.push('/login/analytics');
      }
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      // Redirigir de todas formas
      router.push('/login/analytics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-4">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Analytics Dashboard</h2>
        <p className="text-xs text-gray-500">Panel de análisis y métricas</p>
      </div>
      
      <nav className="mt-4 flex-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center px-4 py-3 text-sm font-medium transition-colors
                ${isActive 
                  ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700' 
                  : 'text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer con usuario y logout */}
      <div className="p-4 border-t border-gray-200">
        {username && (
          <div className="flex items-center gap-2 mb-3 px-2 py-1 text-sm text-gray-600">
            <User className="w-4 h-4" />
            <span className="truncate">{username}</span>
          </div>
        )}
        <button
          onClick={handleLogout}
          disabled={loading}
          className="w-full flex items-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {loading ? 'Cerrando sesión...' : 'Cerrar Sesión'}
        </button>
      </div>
    </aside>
  );
}

