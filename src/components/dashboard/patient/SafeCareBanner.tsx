'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  MapPin, 
  ArrowRight, 
  Sparkles, 
  X, 
  CheckCircle2,
  Phone,
  Clock,
  Heart,
  Stethoscope,
  Info
} from 'lucide-react';

// Comentario obligatorio: ID de WhatsApp corregido para SafeCare 24/7
// TODO: reemplazar con número real de SafeCare (formato: 58XXXXXXXXX)
const WHATSAPP_NUMBER = "584242513130"; 
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

export default function SafeCareBanner() {
  const [showModal, setShowModal] = useState(false);
  const [services, setServices] = useState<{name: string}[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
    }
  }, []);

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal]);

  const fetchServices = async () => {
    setLoadingServices(true);
    setShowModal(true);
    try {
      const res = await fetch('/api/patient/safecare/services');
      if (res.ok) {
        const data = await res.json();
        setServices(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching services:', err);
    } finally {
      setLoadingServices(false);
    }
  };

  // Variantes de animación
  const bannerVariants = {
    initial: { opacity: 0, y: prefersReducedMotion ? 0 : 24 },
    animate: { opacity: 1, y: 0 },
  };

  const staggerItem = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 }
  };

  return (
    <>
      <motion.div
        variants={bannerVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-cyan-700 to-blue-800 rounded-xl sm:rounded-2xl shadow-2xl p-0 group"
      >
        {/* Shimmer sutil de fondo */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div 
            animate={{ 
              x: ['-100%', '200%'],
              opacity: [0, 0.1, 0]
            }}
            transition={{ duration: prefersReducedMotion ? 0 : 5, repeat: Infinity, ease: 'linear' }}
            className="w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 translate-x-[-100%]"
          />
        </div>

        <div className="flex flex-col md:flex-row min-h-[320px]">
          {/* LADO IZQUIERDO: Contenido (60% en PC) */}
          <div className="md:w-3/5 p-6 lg:p-8 flex flex-col justify-center relative z-10">
            {/* Badge destacado con pulso */}
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-teal-400/20 border border-teal-400/30 text-teal-300 text-[10px] font-bold uppercase tracking-wider">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                </span>
                Servicio Destacado
              </span>
              <div className="relative h-8 w-24">
                <Image 
                  src="/clinicas/safecare/safecare-logo.png"
                  alt="SafeCare 24/7 Logo"
                  fill
                  className="object-contain brightness-0 invert"
                />
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-3 leading-tight">
              Atención médica especializada en tu hogar, <span className="text-teal-300">las 24 horas.</span>
            </h2>

            <p className="text-sm md:text-base text-blue-50/90 mb-6 max-w-xl leading-relaxed">
              SafeCare 24/7 es pionera en hospitalización domiciliaria en Venezuela. Médicos y especialistas van hasta tu hogar con tecnología de alto nivel.
            </p>

            {/* Chips de servicios (Stagger) */}
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ staggerChildren: prefersReducedMotion ? 0 : 0.1 }}
              className="flex flex-wrap gap-2 mb-6"
            >
              {[
                { label: 'Hospitalización en casa', icon: Activity },
                { label: 'Enfermería 24/7', icon: Clock },
                { label: 'Sueroterapia', icon: Heart }
              ].map((chip) => (
                <motion.span 
                  key={chip.label}
                  variants={staggerItem}
                  className="px-2 sm:px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg text-[10px] sm:text-xs text-white/90 flex items-center gap-1.5"
                >
                  <chip.icon className="w-3 h-3 text-teal-300" />
                  {chip.label}
                </motion.span>
              ))}
            </motion.div>

            {/* Chips de Cobertura */}
            <div className="flex items-center gap-3 mb-8">
              <span className="text-[10px] font-bold text-teal-300/80 uppercase tracking-widest">Cobertura:</span>
              <div className="flex flex-wrap gap-1.5">
                {['Caracas', 'Guarenas', 'Guatire', 'La Guaira', 'Altos Mirandinos'].map(zone => (
                  <span key={zone} className="px-2 py-0.5 bg-blue-900/40 rounded-md text-[9px] text-blue-100 font-medium">
                    {zone}
                  </span>
                ))}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <motion.a 
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={prefersReducedMotion ? {} : { scale: 1.04 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
                className="w-full sm:w-auto px-6 py-3 bg-[#25D366] hover:bg-[#1eb956] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 transition-all"
              >
                {/* WhatsApp SVG Inline */}
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.445 0 .081 5.363.079 11.968c0 2.112.552 4.172 1.597 6.01L0 24l6.193-1.624c1.769.965 3.758 1.474 5.782 1.477h.005c6.602 0 11.967-5.366 11.97-11.972a11.95 11.95 0 00-3.505-8.471z"/>
                </svg>
                Solicitar atención ahora
              </motion.a>
              <button 
                onClick={fetchServices}
                className="w-full sm:w-auto px-6 py-3 border border-white/20 hover:bg-white/10 text-white rounded-xl font-bold text-sm transition-all"
              >
                Conocer más
              </button>
            </div>
          </div>

          {/* LADO DERECHO: Imagen (40% en PC) */}
          <div className="md:w-2/5 h-[240px] md:h-auto relative overflow-hidden">
            <motion.div
              whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
              transition={{ duration: 0.4 }}
              className="w-full h-full relative"
            >
              <Image 
                src="/clinicas/safecare/safecare-01.jpeg"
                alt="SafeCare Specialist"
                fill
                className="object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-teal-900/60 to-transparent"></div>
              
              {/* Overlay Decorativo para unir con el lado izquierdo */}
              <div className="hidden md:block absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-teal-600/80 to-transparent"></div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Modal de Servicios */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop con fixed inset-0 para cubrir TODA la pantalla */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header Modal - Fijo */}
              <div className="relative flex-shrink-0 h-24 sm:h-28 bg-gradient-to-r from-teal-600 to-blue-700 p-5 sm:p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 sm:p-3 bg-white/20 rounded-xl sm:rounded-2xl">
                    <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base sm:text-lg leading-tight">Servicios SafeCare 24/7</h3>
                    <p className="text-white/80 text-[10px] sm:text-xs">Atención domiciliaria premium</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Lista de Servicios - Scrollable */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar bg-white">
                {loadingServices ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="h-12 bg-slate-50 border border-slate-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : services.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2.5">
                    {services.map((service, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-teal-200 hover:bg-teal-50/30 transition-all group">
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500 group-hover:scale-110 transition-transform flex-shrink-0" />
                        <span className="text-slate-800 text-xs sm:text-sm font-medium">{service.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                     <Info className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                     <p className="text-slate-500 text-sm">No hay servicios específicos registrados actualmente.</p>
                     <p className="text-slate-400 text-xs mt-1 italic">Contacta por WhatsApp para atención personalizada.</p>
                  </div>
                )}
              </div>

              {/* Footer Modal - Fijo */}
              <div className="flex-shrink-0 p-5 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-4">
                <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 sm:p-4 flex items-start gap-3">
                   <div className="p-2 bg-teal-500 text-white rounded-lg flex-shrink-0">
                      <Sparkles className="w-4 h-4" />
                   </div>
                   <div>
                     <p className="text-teal-900 text-[10px] font-bold leading-tight uppercase tracking-wider mb-1">Tecnología Médica</p>
                     <p className="text-teal-700 text-[10px] sm:text-[11px] leading-relaxed">Incluye monitoreo digital de signos vitales sincronizado con tu historial en ASHIRA.</p>
                   </div>
                </div>
                <motion.a 
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 sm:py-3.5 bg-[#25D366] hover:bg-[#1eb956] text-white rounded-xl font-bold text-center flex items-center justify-center gap-2 shadow-lg transition-all text-sm sm:text-base"
                >
                  Continuar por WhatsApp
                  <ArrowRight className="w-4 h-4" />
                </motion.a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
