'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History, AlertTriangle, Lightbulb, ChevronRight, 
  Brain, Zap, Quote, Loader2, Sparkles, Activity
} from 'lucide-react';

interface ASHIRAMemoryProps {
  patientId: string;
}

export default function ASHIRAMemoryCard({ patientId }: ASHIRAMemoryProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (patientId) fetchMemory();
  }, [patientId]);

  const fetchMemory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/patient-summary?patientId=${patientId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching memory:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-slate-50/50 border border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center gap-4 animate-pulse">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Recuperando memoria clínica...</p>
      </div>
    );
  }

  if (!data) return null;

  const { punto_de_partida, alertas_criticas, sugerencias_seguimiento } = data;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mb-8 relative"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-cyan-500/5 rounded-[2rem] blur-xl" />
      
      <div className="relative bg-white border border-teal-100 rounded-[2rem] shadow-xl overflow-hidden">
        {/* Header de la Tarjeta */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-teal-500 p-2 rounded-xl">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm tracking-wide uppercase">Memoria Clínica ASHIRA</h3>
              <p className="text-teal-400 text-[10px] font-bold tracking-widest">IA Generativa de Alto Rendimiento</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/10">
            <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-white text-[10px] font-bold">Resumen Inteligente</span>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Columna Principal: Punto de Partida */}
          <div className="lg:col-span-12">
            <div className="flex items-start gap-4 bg-teal-50/50 p-6 rounded-2xl border border-teal-100/50">
              <Quote className="w-8 h-8 text-teal-200 flex-shrink-0" />
              <div className="space-y-2">
                <h4 className="text-xs font-black text-teal-800 uppercase tracking-widest">Punto de Partida</h4>
                <p className="text-slate-700 text-base leading-relaxed font-medium">
                  {punto_de_partida}
                </p>
              </div>
            </div>
          </div>

          {/* Grid Inferior: Alertas y Sugerencias */}
          <div className="lg:col-span-7 space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <AlertTriangle className="w-3 h-3 text-amber-500" /> Alertas Clínicas Relevantes
            </h4>
            <div className="space-y-3">
              {alertas_criticas?.map((alerta: string, idx: number) => (
                <motion.div 
                  key={idx}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center gap-3 p-3 bg-rose-50 border border-rose-100 rounded-xl"
                >
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-sm text-rose-900 font-semibold">{alerta}</span>
                </motion.div>
              ))}
              {(!alertas_criticas || alertas_criticas.length === 0) && (
                <p className="text-sm text-slate-400 italic">No se detectaron alertas críticas.</p>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Activity className="w-3 h-3 text-cyan-500" /> Enfoque de Consulta
            </h4>
            <div className="bg-cyan-50 p-5 rounded-2xl border border-cyan-100 space-y-3">
              {sugerencias_seguimiento?.map((sug: string, idx: number) => (
                <div key={idx} className="flex gap-2.5">
                  <ChevronRight className="w-4 h-4 text-cyan-600 mt-0.5" />
                  <span className="text-xs text-cyan-900 font-medium">{sug}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-100 p-3 px-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-teal-600" />
            <span className="text-[10px] text-slate-500 font-bold italic">IA entrenada para precisión diagnóstica</span>
          </div>
          <button 
            onClick={fetchMemory}
            className="text-[10px] text-teal-700 font-bold hover:underline"
          >
            Actualizar Memoria
          </button>
        </div>
      </div>
    </motion.div>
  );
}
