'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Building2, 
  Users, 
  UserSquare2, 
  Package, 
  CalendarCheck, 
  FileText, 
  Settings2,
  Menu,
  X,
  LogOut,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createSupabaseBrowserClient } from '@/app/adapters/client';

// Sidebar Items Definition
const NAV_GROUPS = [
  {
    title: 'General',
    items: [
      { name: 'Dashboard', href: '/dashboard/administration', icon: Activity },
    ]
  },
  {
    title: 'Gestión Clínica',
    items: [
      { name: 'Especialistas', href: '/dashboard/administration/specialists', icon: UserSquare2 },
      { name: 'Pacientes', href: '/dashboard/administration/patients', icon: Users },
      { name: 'Inventario', href: '/dashboard/administration/inventory', icon: Package },
      { name: 'Agendamiento', href: '/dashboard/administration/appointments', icon: CalendarCheck },
      { name: 'Consultas', href: '/dashboard/administration/consultations', icon: FileText },
    ]
  },
  {
    title: 'Configuración',
    items: [
      { name: 'Servicios', href: '/dashboard/administration/services', icon: Settings2 },
    ]
  }
];

export function AdministrationSidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile menu when pathname changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 w-64 md:w-72 lg:w-80 border-r border-slate-800 shadow-xl transition-all duration-300 ease-in-out">
      {/* Header / Logo Area */}
      <div className="p-6 border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20 transform hover:rotate-6 transition-all">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">ASHIRA</h2>
            <p className="text-[10px] font-medium text-teal-400 uppercase tracking-widest bg-teal-500/10 inline-block px-2 py-0.5 rounded-full mt-0.5">Administración</p>
          </div>
        </div>
        
        {/* Mobile close button */}
        <button 
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Navigation Area */}
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {NAV_GROUPS.map((group, idx) => (
          <div key={idx} className="space-y-2 animate-in fade-in slide-in-from-left-4" style={{ animationDelay: `${idx * 100}ms` }}>
            <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              {group.title}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard/administration' && pathname.startsWith(item.href));
                const Icon = item.icon;
                
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative overflow-hidden",
                        isActive 
                          ? "bg-slate-800 text-white shadow-md shadow-slate-900/20 ring-1 ring-slate-700/50" 
                          : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                      )}
                    >
                      {/* Active Background Effect */}
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                      
                      {/* Active Indicator Line */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-teal-500 rounded-r-full" />
                      )}
                      
                      <div className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        isActive ? "bg-teal-500/20 text-teal-400" : "bg-slate-800/50 group-hover:bg-slate-700/50"
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      
                      <span className="font-medium text-sm z-10">{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Footer Area */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/80 sticky bottom-0">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group"
        >
          <div className="p-1.5 rounded-lg bg-slate-800/50 group-hover:bg-red-500/20 transition-colors">
            <LogOut className="w-4 h-4" />
          </div>
          <span className="font-medium text-sm">Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );

  // Prevent hydration mismatch
  if (!mounted) return null;

  return (
    <>
      {/* Mobile Toggle Button (Fixed on screen) */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2.5 bg-slate-900 text-white rounded-xl shadow-xl shadow-slate-900/20 border border-slate-700 active:scale-95 transition-transform"
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40 animate-in fade-in transition-all"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 md:sticky md:top-0 transform transition-transform duration-300 ease-in-out h-[100dvh]",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
