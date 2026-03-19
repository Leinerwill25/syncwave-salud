'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Users, 
  ClipboardList, 
  BarChart3, 
  MapPin, 
  Clock, 
  ShieldCheck,
  ArrowRight,
  Heart,
  Sparkles
} from 'lucide-react';

/**
 * Componente: ClinicasDomiciliariasSection
 * Versión: Rediseño Light Mode (Blancos, Morados, Fucsias)
 * Descripción: Sección premium adaptada a la estética actual de la landing de clínicas.
 */
export default function ClinicasDomiciliariasSection() {
  
  // Variantes para animaciones de Framer Motion
  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } as any
  };

  const staggerContainer = {
    initial: {},
    whileInView: { transition: { staggerChildren: 0.15 } },
    viewport: { once: true }
  };

  return (
    <section className="relative py-24 lg:py-32 overflow-hidden bg-white text-slate-800">
      {/* Elementos Decorativos de Fondo (Acentos de Color suaves) */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-100/40 rounded-full blur-[120px] pointer-events-none -mr-40 -mt-40"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-100/40 rounded-full blur-[150px] pointer-events-none -ml-40 -mb-40"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* BLOQUE 1: HEADLINE PRINCIPAL */}
        <motion.div 
          className="text-center mb-20 lg:mb-28"
          {...fadeInUp}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 border border-purple-100 mb-6 shadow-sm">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold tracking-widest uppercase text-purple-700">Adaptado para clínicas domiciliarias</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl lg:text-7xl font-extrabold mb-8 leading-[1.1] tracking-tight text-slate-900">
            Tu clínica domiciliaria,<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600">
              centralizada en un solo panel
            </span>
          </h2>
          
          <p className="max-w-3xl mx-auto text-lg md:text-xl text-slate-600 leading-relaxed font-medium">
            ASHIRA permite gestionar y analizar todas las atenciones a domicilio desde un dashboard inteligente: 
            pacientes, especialistas, reportes y métricas de salud en tiempo real.
          </p>
        </motion.div>

        {/* BLOQUE 2: PROPUESTA DE VALOR EN TARJETAS */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-32"
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true }}
        >
          {[
            {
              icon: Clock,
              title: "Control total desde la central",
              desc: "Visualiza en tiempo real qué especialista está en cada domicilio y el estado de tus pacientes."
            },
            {
              icon: ClipboardList,
              title: "Historial clínico completo",
              desc: "Signos vitales, evolución y medicamentos registrados al instante. Todo en un expediente unificado."
            },
            {
              icon: Users,
              title: "Equipo de alto nivel",
              desc: "Gestiona roles de médicos y enfermeras con permisos granulares en una sola cuenta centralizada."
            },
            {
              icon: BarChart3,
              title: "Reportes y Productividad",
              desc: "Métricas reales de tu operación: frecuencia de visitas e indicadores de desempeño del equipo."
            }
          ].map((item, index) => (
            <motion.div 
              key={index}
              variants={fadeInUp}
              whileHover={{ y: -5, borderColor: "rgba(168, 85, 247, 0.4)" }}
              className="group p-8 rounded-[2rem] bg-slate-50 border border-slate-200 hover:bg-white hover:shadow-2xl hover:shadow-purple-900/10 transition-all duration-500"
            >
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center mb-6 shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
                <item.icon className="w-8 h-8 text-purple-600 group-hover:text-fuchsia-600 transition-colors" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-slate-900 group-hover:text-purple-700 transition-colors">{item.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* BLOQUE 3: CASO REAL: SAFECARE 24/7 (Sección con fondo degradado suave) */}
        <div className="relative rounded-[3rem] overflow-hidden bg-slate-50 border border-slate-200 p-8 md:p-12 lg:p-16 shadow-xl">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-100/50 rounded-full blur-[100px] -mr-40 -mt-40"></div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
            
            {/* Imágenes con Layout Asimétrico (Restaurado) */}
            <div className="relative order-2 lg:order-1 h-[400px] md:h-[550px]">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
                whileInView={{ opacity: 1, scale: 1, rotate: -3 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="absolute top-0 left-0 w-[80%] h-[70%] z-10"
              >
                <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white">
                  <Image 
                    src="/clinicas/safecare/safecare-01.jpeg" 
                    alt="Atención Médica SafeCare 24/7" 
                    fill 
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-900/10 to-transparent"></div>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
                whileInView={{ opacity: 1, scale: 1, rotate: 3 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="absolute bottom-4 right-0 w-[75%] h-[65%] z-20"
              >
                <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white">
                  <Image 
                    src="/clinicas/safecare/safecare-01.jpeg" 
                    alt="Cuidado de Enfermería Domiciliaria" 
                    fill 
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/10 to-transparent"></div>
                </div>
              </motion.div>
              
              {/* Badge Flotante */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/2 -right-4 lg:-right-8 z-30 p-5 rounded-3xl bg-white shadow-2xl flex items-center gap-4 border border-purple-100"
              >
                <div className="p-3 bg-purple-100 rounded-2xl">
                  <MapPin className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-black text-slate-400 leading-none mb-1 tracking-widest">Cobertura Real</p>
                  <p className="text-base font-bold text-slate-800">Caracas y Miranda</p>
                </div>
              </motion.div>
            </div>

            {/* Contenido de SafeCare */}
            <motion.div 
              className="order-1 lg:order-2"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex flex-col gap-10">
                <div>
                  <div className="inline-block px-4 py-1.5 rounded-xl bg-gradient-to-r from-fuchsia-100 to-purple-100 text-fuchsia-700 text-xs font-black uppercase tracking-[0.2em] mb-8 shadow-sm">
                    Cliente Fundador
                  </div>
                  <div className="relative w-56 h-20 mb-10 overflow-hidden">
                    <Image 
                      src="/clinicas/safecare/safecare-logo.png" 
                      alt="Logo SafeCare 24/7" 
                      fill 
                      className="object-contain"
                    />
                  </div>
                  <h3 className="text-4xl md:text-5xl font-extrabold mb-8 text-slate-900 leading-tight">
                    SafeCare 24/7: <br/>
                    <span className="text-purple-600">Hospitalización en casa</span> <br/>
                    con tecnología ASHIRA
                  </h3>
                  <p className="text-slate-600 text-lg leading-relaxed mb-8 font-medium">
                    Líder en servicios médicos y de enfermería las 24 horas. 
                    Brindan atención especializada directamente en el hogar del paciente, 
                    garantizando un cuidado humanizado y profesional.
                  </p>
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-4 h-4 text-fuchsia-500" />
                    Zonas de Cobertura
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["Caracas", "Guarenas", "Guatire", "La Guaira", "Altos Mirandinos"].map((zone) => (
                      <span key={zone} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-sm hover:border-purple-300 hover:text-purple-600 transition-all cursor-default">
                        {zone}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-10 border-t border-slate-200">
                  <p className="text-xl italic text-purple-700 font-bold mb-10 relative">
                    <span className="absolute -top-6 -left-4 text-6xl text-purple-200 font-serif opacity-50">"</span>
                    SafeCare 24/7 gestiona su equipo completo y el historial de cada paciente atendido a domicilio con ASHIRA.
                  </p>
                  <button className="group flex items-center gap-4 text-slate-900 font-black hover:text-purple-600 transition-all text-lg">
                    <span>Solicita información para tu clínica</span>
                    <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center group-hover:scale-110 group-hover:bg-fuchsia-600 transition-all">
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* BLOQUE 4: CTA FINAL (Con gradiente vibrante) */}
        <motion.div 
          className="mt-32"
          {...fadeInUp}
        >
          <div className="p-12 lg:p-24 rounded-[4rem] bg-gradient-to-br from-purple-600 via-indigo-600 to-fuchsia-600 text-white text-center relative overflow-hidden shadow-2xl shadow-purple-900/30">
            {/* Patrón de brillo decorativo */}
            <div className="absolute inset-0 bg-white opacity-[0.03] pattern-grid-lg"></div>
            
            <h2 className="text-4xl md:text-6xl font-black mb-10 relative z-10 leading-tight tracking-tight">
              ¿Tu clínica atiende a domicilio? <br className="hidden md:block" />
              <span className="text-fuchsia-200">ASHIRA es tu mejor aliado.</span>
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center relative z-10">
              <button className="px-12 py-6 bg-white text-purple-700 font-black rounded-3xl shadow-2xl hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 text-lg">
                Solicitar Demostración
              </button>
              <button className="px-12 py-6 bg-purple-500/20 backdrop-blur-md border border-white/30 text-white font-bold rounded-3xl hover:bg-white/10 transition-all text-lg">
                Ver todos los planes
              </button>
            </div>

            {/* Decoraciones de fondo flotantes */}
            <div className="absolute -top-32 -left-32 w-64 h-64 bg-white/10 rounded-full blur-[80px]"></div>
            <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-fuchsia-400/20 rounded-full blur-[80px]"></div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
