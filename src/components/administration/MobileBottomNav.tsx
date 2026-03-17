'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  Menu 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/dashboard/administration',
      label: 'Inicio',
      icon: LayoutDashboard,
    },
    {
      href: '/dashboard/administration/patients',
      label: 'Pacientes',
      icon: Users,
    },
    {
      href: '/dashboard/administration/appointments',
      label: 'Citas',
      icon: CalendarCheck,
    },
  ];

  const toggleSidebar = () => {
    // Dispatch custom event to toggle sidebar
    window.dispatchEvent(new CustomEvent('toggle-admin-sidebar'));
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-50 px-4 pb-safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link 
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 transition-all duration-300 relative group",
                isActive ? "text-blue-600" : "text-slate-400"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-all duration-300",
                isActive ? "bg-blue-50" : "group-hover:bg-slate-50"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
              {isActive && (
                <div className="absolute -top-1 w-1 h-1 bg-blue-600 rounded-full animate-pulse" />
              )}
            </Link>
          );
        })}
        
        {/* Toggle Sidebar Button */}
        <button 
          onClick={toggleSidebar}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-600 transition-all group"
        >
          <div className="p-1.5 rounded-xl group-hover:bg-slate-50 transition-all">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Módulos</span>
        </button>
      </div>
    </div>
  );
}
