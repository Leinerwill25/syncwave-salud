'use client';

import { useEffect, useState } from 'react';
import { Share, PlusSquare, Smartphone, X, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PWATutorial() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Detectar si es iOS y si NO está en modo standalone (PWA ya instalada)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isStandalone) {
      // Mostrar el tutorial después de 3 segundos para no ser invasivo
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-6 left-6 right-6 z-[100] md:max-w-sm md:left-auto"
      >
        <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-3xl p-6">
          {/* Decoración de fondo */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
          
          <button 
            onClick={() => setShow(false)}
            className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Instala ASHIRA</h3>
              <p className="text-[11px] text-slate-500 font-medium">Activa notificaciones premium en tu iPhone</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <Share className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Toca el botón <b>Compartir</b> en la barra inferior de tu navegador Safari.
              </p>
            </div>

            <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <PlusSquare className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Desliza hacia abajo y elige <b>"Añadir a la pantalla de inicio"</b>.
              </p>
            </div>

            <div className="flex items-start gap-4 p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
              <div className="p-2 bg-indigo-600 rounded-xl shadow-sm">
                <Bell className="w-4 h-4 text-white" />
              </div>
              <p className="text-[11px] text-indigo-900 leading-relaxed font-semibold">
                ¡Listo! Abre ASHIRA desde tu inicio y activa las alertas push al instante.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShow(false)}
            className="w-full mt-6 py-3 bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
          >
            Entendido
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
