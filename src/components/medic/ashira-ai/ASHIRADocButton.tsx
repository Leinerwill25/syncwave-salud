'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, FileSearch, Loader2, X, ChevronRight, 
  Stethoscope, Pill, AlertCircle, CheckCircle2, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ASHIRADocButtonProps {
  fileId: string;
  patientId: string;
  doctorId: string;
}

export default function ASHIRADocButton({ fileId, patientId, doctorId }: ASHIRADocButtonProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [result, setResult] = useState<any>(null);

  const startAnalysis = async () => {
    setAnalyzing(true);
    try {
      // Nota: En un entorno real asociaremos el fileId al buffer. 
      // Para este MVP el endpoint espera el archivo o el file_hash.
      const res = await fetch('/api/ai/analyze-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, patientId, doctorId })
      });
      
      if (res.ok) {
        const json = await res.json();
        setResult(json.analysis);
        setShowModal(true);
      } else {
        toast.error('Error al analizar el informe');
      }
    } catch (err) {
      console.error('Error analyzing:', err);
      toast.error('Error de conexión con ASHIRA AI');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <>
      <Button
        onClick={startAnalysis}
        disabled={analyzing}
        size="sm"
        className="group relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-none shadow-lg hover:shadow-teal-500/20 transition-all duration-300 rounded-xl"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 to-transparent group-hover:from-teal-500/20 transition-all" />
        <div className="relative flex items-center gap-2">
          {analyzing ? (
            <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
          ) : (
            <Sparkles className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
          )}
          <span className="text-xs font-bold tracking-tight">
            {analyzing ? 'Analizando...' : 'Analizar con ASHIRA'}
          </span>
        </div>
      </Button>

      <AnimatePresence>
        {showModal && result && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-teal-100"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                    <FileSearch className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Inteligencia Clínica Extraída</h3>
                    <p className="text-white/80 text-xs">ASHIRA-Doc v1.0 • Análisis Multimodal</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-8">
                  {/* Resumen */}
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-400 uppercase tracking-widest text-[10px] font-black">
                      <Sparkles className="w-3 h-3 text-amber-500" /> Resumen del Hallazgo
                    </div>
                    <p className="text-slate-700 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      {result.resumen_hallazgos}
                    </p>
                  </section>

                  {/* Diagnósticos Presuntivos */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-400 uppercase tracking-widest text-[10px] font-black">
                      <Stethoscope className="w-3 h-3 text-teal-600" /> Diagnósticos Sugeridos
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.diagnosticos_presuntivos?.map((diag: string, i: number) => (
                        <Badge key={i} variant="secondary" className="bg-teal-50 text-teal-700 border-teal-100 px-3 py-1 text-xs">
                          {diag}
                        </Badge>
                      ))}
                    </div>
                  </section>

                  {/* Medicamentos y Valores Críticos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <section className="space-y-3">
                      <div className="flex items-center gap-2 text-slate-400 uppercase tracking-widest text-[10px] font-black">
                        <Pill className="w-3 h-3 text-cyan-600" /> Medicación Detectada
                      </div>
                      <div className="space-y-2">
                        {result.medicamentos_detectados?.map((med: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-slate-600 font-bold bg-cyan-50/50 p-2 rounded-lg">
                            <CheckCircle2 className="w-3 h-3 text-cyan-500" /> {med}
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="space-y-3">
                      <div className="flex items-center gap-2 text-slate-400 uppercase tracking-widest text-[10px] font-black">
                        <AlertCircle className="w-3 h-3 text-rose-500" /> Valores fuera de rango
                      </div>
                      <div className="space-y-2">
                        {result.valores_criticos?.map((val: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-rose-700 font-bold bg-rose-50 p-2 rounded-lg">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> {val}
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 p-4 px-8 border-t border-slate-100 flex justify-end gap-3">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(result.resumen_hallazgos);
                    toast.success('Copiado al portapapeles');
                  }}
                  className="text-slate-500 font-bold text-xs gap-2"
                >
                  <Copy className="w-3.5 h-3.5" /> Copiar Resumen
                </Button>
                <Button 
                  size="sm"
                  onClick={() => setShowModal(false)}
                  className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold"
                >
                  Cerrar e integrar
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
