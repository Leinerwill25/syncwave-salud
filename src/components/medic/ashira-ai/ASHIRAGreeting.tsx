'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Sparkles, BrainCircuit, Waves, RefreshCw, Mic2, Volume2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ASHIRAGreetingProps {
  doctorId: string;
}

export default function ASHIRAGreeting({ doctorId }: ASHIRAGreetingProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ audio_url: string | null; greeting_text: string; status?: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // Web Speech API Ref
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
    if (doctorId) {
      fetchGreeting();
    }

    return () => {
      if (synthRef.current) synthRef.current.cancel();
    };
  }, [doctorId]);

  // Efecto Jarvis: Hablar automáticamente cuando los datos estén listos (Solo una vez al día)
  useEffect(() => {
    if (data?.greeting_text && !loading && !generating && !isPlaying) {
      const today = new Date().toISOString().split('T')[0];
      const storageKey = `ashira_greeted_${doctorId}_${today}`;
      const alreadyGreeted = localStorage.getItem(storageKey);

      if (!alreadyGreeted) {
        const timer = setTimeout(() => {
          handleSpeak(true); // Pasamos true para indicar que es auto-play
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [data, loading, generating, doctorId]);

  const fetchGreeting = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/voice-greeting?doctorId=${doctorId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        throw new Error('Error al cargar saludo');
      }
    } catch (err) {
      console.error('Error fetching greeting:', err);
      toast.error('No se pudo cargar el saludo de ASHIRA');
    } finally {
      setLoading(false);
    }
  };

  const generateNow = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/cron/morning-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId })
      });
      
      if (res.ok) {
        toast.success('¡ASHIRA está redactando tu saludo!');
        setTimeout(fetchGreeting, 3000);
      } else {
        toast.error('Error al generar saludo bajo demanda');
      }
    } catch (err) {
      toast.error('Error de conexión');
    } finally {
      setGenerating(false);
    }
  };

  const handleSpeak = (isAuto: boolean = false) => {
    if (!synthRef.current || !data?.greeting_text) return;

    if (isPlaying) {
      synthRef.current.cancel();
      setIsPlaying(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(data.greeting_text);
    const voices = synthRef.current.getVoices();
    
    const preferredVoices = voices.filter(v => 
      (v.lang.startsWith('es') || v.lang.startsWith('es-')) && 
      (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Neural'))
    );
    
    const fallbackVoices = voices.filter(v => v.lang.startsWith('es'));
    
    utterance.voice = preferredVoices[0] || fallbackVoices[0] || null;
    utterance.pitch = 1;
    utterance.rate = 0.95; 
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsPlaying(true);
      if (isAuto) {
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem(`ashira_greeted_${doctorId}_${today}`, 'true');
      }
    };
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => {
      setIsPlaying(false);
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  if (loading) {
    return (
      <div className="w-full h-32 animate-pulse bg-white/40 backdrop-blur-xl border border-white/40 rounded-3xl mb-8 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-teal-500 animate-spin" />
          <span className="text-sm font-medium text-slate-400 font-geist tracking-wide">Iniciando Protocolos ASHIRA...</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        boxShadow: isPlaying 
          ? "0 0 40px -10px rgba(20, 184, 166, 0.4)" 
          : "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
      }}
      transition={{ duration: 0.5 }}
      className={`relative overflow-hidden rounded-3xl backdrop-blur-xl border transition-all duration-700 p-6 mb-8 group ${
        isPlaying ? 'bg-teal-50/40 border-teal-200/50' : 'bg-white/40 border-white/40'
      }`}
    >
      {/* Background Glows Dinámicos */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-r from-teal-500/5 via-cyan-500/5 to-blue-500/5"
          />
        )}
      </AnimatePresence>
      
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-200/20 rounded-full blur-3xl opacity-50" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-200/20 rounded-full blur-3xl opacity-50" />

      <div className="relative flex flex-col md:flex-row items-center gap-8">
        {/* Profile / Jarvis Core */}
        <div className="relative">
          <motion.div 
            animate={isPlaying ? {
              scale: [1, 1.05, 1],
            } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
            className={`w-20 h-20 rounded-2xl p-0.5 shadow-lg overflow-hidden transition-all duration-500 ${
              isPlaying ? 'bg-gradient-to-br from-teal-400 to-blue-500' : 'bg-gradient-to-br from-slate-200 to-slate-300'
            }`}
          >
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <BrainCircuit className={`w-10 h-10 transition-colors duration-500 ${isPlaying ? 'text-teal-600' : 'text-slate-400'}`} />
            </div>
          </motion.div>
          
          {isPlaying && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -bottom-2 -right-2 bg-teal-500 rounded-full p-1.5 shadow-lg"
            >
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
            </motion.div>
          )}
        </div>

        {/* Text Section */}
        <div className="flex-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
            <h2 className={`text-xl font-bold tracking-tight transition-colors duration-500 ${isPlaying ? 'text-teal-900' : 'text-slate-800'}`}>
              ASHIRA Intelligence
            </h2>
            <span className={`text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full font-black transition-all ${
              isPlaying ? 'bg-teal-500 text-white animate-pulse' : 'bg-slate-200 text-slate-500'
            }`}>
              {isPlaying ? 'Output Active' : 'Standby'}
            </span>
          </div>
          
          <AnimatePresence mode="wait">
            <motion.p 
              key={data?.greeting_text}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-slate-600 mt-2 leading-relaxed max-w-2xl italic font-medium"
            >
              "{data?.greeting_text || 'Sincronizando registros clínicos...'}"
            </motion.p>
          </AnimatePresence>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <Volume2 className={`w-3 h-3 ${isPlaying ? 'text-teal-500' : ''}`} /> 
              {isPlaying ? 'Sistema de Voz Directo' : 'Esperando interacción'}
            </div>
          </div>
        </div>

        {/* Interaction Section */}
        <div className="flex flex-col items-center gap-3 min-w-[200px]">
          {data?.greeting_text && data?.status !== 'no_cache' ? (
            <div className="relative flex flex-col items-center gap-2">
              <button 
                onClick={() => handleSpeak(false)}
                className={`group/btn relative w-16 h-16 flex items-center justify-center rounded-full transition-all duration-500 shadow-xl hover:scale-105 active:scale-95 ${
                  isPlaying ? 'bg-teal-600 border-4 border-teal-100' : 'bg-slate-900 border-4 border-white'
                }`}
              >
                {isPlaying ? (
                  <Waves className="w-8 h-8 text-white animate-pulse" />
                ) : (
                  <Play className="w-6 h-6 text-white ml-1 fill-white" />
                )}
                
                {isPlaying && (
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                    className="absolute -inset-4 border-2 border-dashed border-teal-200/50 rounded-full"
                  />
                )}
              </button>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                {isPlaying ? 'Silenciar Asistente' : 'Repetir Informe'}
              </span>
            </div>
          ) : (
            <Button 
              disabled={generating}
              onClick={generateNow}
              className="bg-slate-900 text-white rounded-2xl px-8 py-6 h-auto hover:bg-slate-800 transition-all border-4 border-white shadow-xl group"
            >
              {generating ? (
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-bold">Procesando...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Mic2 className="w-5 h-5 text-teal-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Activar Jarvis</span>
                </div>
              )}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
