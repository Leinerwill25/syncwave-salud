'use client';
// src/components/nurse/NurseGlobalReminders.tsx
import { useNurse } from '@/context/NurseContext';
import { 
  Bell, 
  X, 
  AlertTriangle, 
  Info, 
  ChevronRight, 
  AlertCircle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export function NurseGlobalReminders() {
  const { alerts, dismissAlert } = useNurse();
  const [isOpen, setIsOpen] = useState(false);
  
  const activeAlerts = alerts.filter(a => !a.dismissed);
  const criticalCount = activeAlerts.filter(a => a.type === 'critical').length;
  
  if (activeAlerts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-80 md:w-96 max-h-[70vh] bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/30">
              <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-600" />
                Recordatorios
                <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full">
                  {activeAlerts.length}
                </span>
              </h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
              {activeAlerts.map((alert) => (
                <div 
                  key={alert.id}
                  className={cn(
                    "p-4 rounded-3xl border border-transparent transition-all group relative",
                    alert.type === 'critical' ? "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30" : 
                    alert.type === 'warning' ? "bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30" : 
                    "bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30"
                  )}
                >
                  <div className="flex gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0",
                      alert.type === 'critical' ? "bg-red-100 text-red-600" : 
                      alert.type === 'warning' ? "bg-amber-100 text-amber-600" : 
                      "bg-blue-100 text-blue-600"
                    )}>
                      {alert.type === 'critical' ? <AlertCircle className="w-5 h-5" /> : 
                       alert.type === 'warning' ? <AlertTriangle className="w-5 h-5" /> : 
                       <Info className="w-5 h-5" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">
                        {alert.title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium leading-snug mt-0.5">
                        {alert.message}
                      </p>
                      
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true, locale: es })}
                        </span>
                        
                        {alert.action && (
                          <Link 
                            href={alert.action.href}
                            className="bg-white dark:bg-gray-800 text-[10px] font-black py-1.5 px-3 rounded-full shadow-sm hover:shadow-md transition-all flex items-center gap-1 group/btn"
                            onClick={() => setIsOpen(false)}
                          >
                            {alert.action.label}
                            <ChevronRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-0.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => dismissAlert(alert.id)}
                    className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-black/5 rounded-full transition-all"
                  >
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="p-4 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-50 dark:border-gray-800 text-center">
              <button 
                onClick={() => activeAlerts.forEach(a => dismissAlert(a.id))}
                className="text-xs font-black text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors uppercase tracking-widest"
              >
                Limpiar Todo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all relative group",
          criticalCount > 0 ? "bg-red-600 hover:bg-red-700 animate-pulse" : "bg-teal-600 hover:bg-teal-700"
        )}
      >
        <Bell className="w-7 h-7 text-white" />
        {activeAlerts.length > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-white text-indigo-600 text-[10px] font-black rounded-full flex items-center justify-center border-2 border-indigo-600 shadow-md">
            {activeAlerts.length}
          </span>
        )}
      </button>
    </div>
  );
}
