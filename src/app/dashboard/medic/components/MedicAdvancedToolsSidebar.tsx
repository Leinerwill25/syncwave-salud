'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Settings, 
  MessageCircle, 
  CheckSquare, 
  Folder, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  FileType, 
  Zap, 
  Share2, 
  CreditCard, 
  DollarSign,
  Monitor,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MedicConfig } from '@/types/medic-config';
import PaymentsModal from '@/components/medic/PaymentsModal';
import PublicLinkModal from '@/components/medic/PublicLinkModal';
import { useLiteMode } from '@/contexts/LiteModeContext';

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

type ToolItem = {
  href?: string;
  label: string;
  icon: IconComponent;
  onClick?: () => void;
  badge?: string;
  showOnlyForOrgType?: string;
  submenu?: { href: string; label: string; icon?: IconComponent }[];
};

export default function MedicAdvancedToolsSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const [medicConfig, setMedicConfig] = useState<MedicConfig | null>(null);
  const [paymentsModalOpen, setPaymentsModalOpen] = useState(false);
  const [publicLinkModalOpen, setPublicLinkModalOpen] = useState(false);
  const { isLiteMode, toggleLiteMode } = useLiteMode();

  const loadMedicConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/medic/config', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setMedicConfig(data);
      }
    } catch (err) {
      console.error('Error loading config:', err);
    }
  }, []);

  useEffect(() => {
    loadMedicConfig();
  }, [loadMedicConfig]);

  const TOOLS: ToolItem[] = [
    {
      href: '/dashboard/medic/resultados',
      label: 'Resultados',
      icon: Folder,
    },
    {
      href: '/dashboard/medic/mensajes',
      label: 'Mensajes',
      icon: MessageCircle,
    },
    {
      href: '/dashboard/medic/mensajeria',
      label: 'Mensajería Privada',
      icon: MessageCircle,
    },
    {
      href: '/dashboard/medic/tareas',
      label: 'Tareas',
      icon: CheckSquare,
    },
    {
      label: 'Configuración',
      icon: Settings,
      submenu: [
        { href: '/dashboard/medic/configuracion', label: 'Perfil Profesional' },
        { href: '/dashboard/medic/configuracion/consultorio', label: 'Consultorio' },
        { href: '/dashboard/medic/configuracion/roles', label: 'Roles de Acceso' },
        { href: '/dashboard/medic/configuracion/moneda', label: 'Moneda', icon: DollarSign },
      ],
    },
    {
      href: '/dashboard/medic/reportes',
      label: 'Reportes',
      icon: FileText,
    },
    {
      href: '/dashboard/medic/plantilla-informe',
      label: 'Plantillas de Informe',
      icon: FileType,
    },
    {
      href: '/dashboard/medic/plantilla-receta',
      label: 'Plantillas de Receta',
      icon: FileText,
    },
    {
      label: 'Versión Lite',
      icon: Zap,
      onClick: toggleLiteMode,
      badge: isLiteMode ? 'ON' : 'OFF',
    },
    {
      label: 'Link Público',
      icon: Share2,
      onClick: () => setPublicLinkModalOpen(true),
      badge: 'Nuevo',
    },
    {
      label: 'Pagos Efectuados',
      icon: CreditCard,
      onClick: () => setPaymentsModalOpen(true),
    },
  ];

  return (
    <>
      {/* Pestaña flotante */}
      <div 
        className="fixed right-0 top-1/2 -translate-y-1/2 z-[60]"
        style={{ pointerEvents: 'auto' }}
      >
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ x: -4 }}
          className="bg-gradient-to-l from-teal-600 to-cyan-600 text-white p-2 rounded-l-2xl shadow-2xl flex items-center justify-center border-l border-y border-white/20 backdrop-blur-md"
        >
          {isOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          {!isOpen && (
            <motion.span 
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              className="text-[10px] font-bold uppercase tracking-widest ml-1 [writing-mode:vertical-lr] rotate-180 py-2"
            >
              Herramientas
            </motion.span>
          )}
        </motion.button>
      </div>

      {/* Sidebar derecho */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay para cerrar al hacer clic fuera */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-[50]"
            />

            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-80 bg-white/80 backdrop-blur-xl border-l border-white/20 shadow-[-20px_0_50px_rgba(0,0,0,0.1)] z-[55] overflow-y-auto"
            >
              <div className="p-6 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Utilidades Pro</h2>
                    <p className="text-xs text-slate-500 font-medium">Gestión avanzada ASHIRA</p>
                  </div>
                </div>

                <nav className="flex-1 space-y-1">
                  {TOOLS.map((tool, idx) => {
                    const isActive = tool.href && pathname === tool.href;
                    
                    return (
                      <div key={idx}>
                        {tool.href ? (
                          <Link
                            href={tool.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group overflow-hidden relative
                              ${isActive 
                                ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg' 
                                : 'text-slate-600 hover:bg-slate-100/50 hover:text-teal-600'}`}
                          >
                            <tool.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-teal-600'}`} />
                            <span className="flex-1">{tool.label}</span>
                            {tool.badge && (
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border
                                ${isActive ? 'bg-white/20 border-white/30 text-white' : 'bg-teal-50 border-teal-100 text-teal-600'}`}>
                                {tool.badge}
                              </span>
                            )}
                          </Link>
                        ) : (
                          <div className="space-y-1">
                            {tool.submenu ? (
                              <>
                                <div className="flex items-center gap-3 px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-4">
                                  <tool.icon className="w-4 h-4" />
                                  <span>{tool.label}</span>
                                </div>
                                <div className="space-y-0.5 ml-4 border-l border-slate-100">
                                  {tool.submenu.map((sub, sIdx) => {
                                    const subActive = pathname === sub.href;
                                    return (
                                      <Link
                                        key={sIdx}
                                        href={sub.href}
                                        className={`flex items-center gap-3 px-4 py-2 text-sm font-medium transition-all
                                          ${subActive ? 'text-teal-600 font-bold' : 'text-slate-500 hover:text-teal-600'}`}
                                      >
                                        <div className={`w-1.5 h-1.5 rounded-full ${subActive ? 'bg-teal-600' : 'bg-slate-200'}`} />
                                        {sub.label}
                                      </Link>
                                    );
                                  })}
                                </div>
                              </>
                            ) : (
                              <button
                                onClick={tool.onClick}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100/50 hover:text-teal-600 transition-all group"
                              >
                                <tool.icon className="w-5 h-5 text-slate-400 group-hover:text-teal-600" />
                                <span className="flex-1 text-left">{tool.label}</span>
                                {tool.badge && (
                                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full bg-teal-50 border border-teal-100 text-teal-600`}>
                                    {tool.badge}
                                  </span>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </nav>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-4 border border-blue-100">
                    <div className="flex items-center gap-2 mb-2 text-teal-700">
                      <Monitor size={14} className="animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Estado del Sistema</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                      Estás en el entorno profesional de ASHIRA. Todas las herramientas avanzadas activas.
                    </p>
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <PaymentsModal isOpen={paymentsModalOpen} onClose={() => setPaymentsModalOpen(false)} />
      <PublicLinkModal 
        isOpen={publicLinkModalOpen} 
        onClose={() => setPublicLinkModalOpen(false)} 
        organizationId={medicConfig?.user?.organizationId || (medicConfig as any)?.organizationId || null} 
      />
    </>
  );
}
