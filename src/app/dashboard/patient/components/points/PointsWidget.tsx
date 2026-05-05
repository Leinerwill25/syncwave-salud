'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { HeartPulse, ChevronRight } from 'lucide-react';
import { getPatientPointsData } from '@/lib/actions/points';
import { PatientPointsSummary } from '@/types/points';
import { getLevelDefinition, getNextLevelDefinition } from '@/lib/points/levels';

export default function PointsWidget() {
  const [summary, setSummary] = useState<PatientPointsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getPatientPointsData();
        if (data.summary) {
          setSummary(data.summary);
        }
      } catch (err) {
        console.error('Error loading points:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="h-24 sm:h-32 bg-gray-200 animate-pulse rounded-xl sm:rounded-2xl w-full"></div>
    );
  }

  if (!summary) return null;

  const currentLevel = getLevelDefinition(summary.current_level);
  const nextLevel = getNextLevelDefinition(summary.current_level);
  
  // Calcular progreso (basado en total ganados)
  let progress = 100;
  if (nextLevel && nextLevel.maxPoints !== null) {
    const pointsInLevel = summary.total_earned - currentLevel.minPoints;
    const requiredInLevel = nextLevel.minPoints - currentLevel.minPoints;
    progress = Math.min(100, Math.max(0, (pointsInLevel / requiredInLevel) * 100));
  }

  return (
    <div className="relative rounded-2xl shadow-xl overflow-hidden text-white group">
      {/* Fondo base oscuro premium */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-blue-800 to-blue-600"></div>
      
      {/* Capa de destellos y mesh (simulado con radial gradients) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#7FFFD4]/20 via-transparent to-transparent opacity-80 mix-blend-overlay group-hover:opacity-100 transition-opacity duration-700"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-400/30 via-transparent to-transparent"></div>
      
      {/* Elementos decorativos abstractos */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-40 h-40 bg-[#7FFFD4]/10 rounded-full blur-2xl pointer-events-none"></div>
      
      {/* Contenido Principal */}
      <div className="relative z-10 p-5 sm:p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8">
        
        {/* Lado Izquierdo: Icono y Balance */}
        <div className="flex items-center gap-5 w-full md:w-auto">
          {/* Icono con glow effect */}
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center flex-shrink-0">
            <div className="absolute inset-0 bg-[#7FFFD4] rounded-full blur-md opacity-40 animate-pulse"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/5 rounded-full border border-white/30 backdrop-blur-md"></div>
            <HeartPulse className="w-7 h-7 sm:w-8 sm:h-8 text-[#7FFFD4] relative z-10 drop-shadow-lg" strokeWidth={2.5} />
          </div>
          
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7FFFD4] animate-pulse"></span>
              <p className="text-white/80 text-xs sm:text-sm font-bold uppercase tracking-[0.2em]">Tus Pulsos</p>
            </div>
            <p className="text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-[#7FFFD4] drop-shadow-sm leading-none pb-1">
              {summary.current_balance}
            </p>
          </div>
        </div>

        {/* Centro: Progreso de Nivel (Desktop) */}
        <div className="flex-1 w-full max-w-xl hidden md:block px-6 border-l border-white/10">
          <div className="flex justify-between items-end mb-2.5">
            <div className="flex flex-col">
              <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-0.5">Nivel {currentLevel.level}</span>
              <p className="text-white font-bold text-lg leading-none">{currentLevel.name}</p>
            </div>
            {nextLevel ? (
              <div className="text-right">
                <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-0.5">Siguiente Nivel</span>
                <p className="text-[#7FFFD4] text-sm font-semibold">
                  {summary.total_earned} <span className="text-white/50 font-normal">/ {nextLevel.minPoints}</span>
                </p>
              </div>
            ) : (
              <div className="text-right">
                <span className="text-[#7FFFD4] text-xs font-bold uppercase tracking-wider bg-[#7FFFD4]/10 px-2 py-1 rounded-md">Nivel Máximo</span>
              </div>
            )}
          </div>
          
          <div className="relative h-2.5 w-full bg-black/20 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#7FFFD4] to-teal-300 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(127,255,212,0.5)]"
              style={{ width: `${progress}%` }}
            >
              {/* Shine effect on progress bar */}
              <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-r from-transparent via-white/50 to-transparent -skew-x-12 animate-[shine_2s_infinite]"></div>
            </div>
          </div>
          {nextLevel && (
            <p className="text-white/50 text-[10px] text-right mt-1.5">Te faltan {nextLevel.minPoints - summary.total_earned} para {nextLevel.name}</p>
          )}
        </div>

        {/* Lado Derecho: Badge y Link */}
        <div className="flex flex-col w-full md:w-auto gap-4 md:gap-0 justify-between h-full">
          {/* Progress for Mobile only */}
          <div className="md:hidden flex-1 w-full bg-white/5 rounded-xl p-3 border border-white/10">
             <div className="flex justify-between items-center mb-2">
               <div>
                 <span className="text-white/60 text-[9px] uppercase tracking-wider block">Nivel {currentLevel.level}</span>
                 <span className="text-sm font-bold">{currentLevel.name}</span>
               </div>
               <span className="text-[#7FFFD4] text-xs font-semibold">{Math.round(progress)}%</span>
             </div>
             <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
               <div className="h-full bg-gradient-to-r from-[#7FFFD4] to-teal-300 rounded-full shadow-[0_0_8px_rgba(127,255,212,0.5)]" style={{ width: `${progress}%` }}></div>
             </div>
          </div>

          <Link 
            href="/dashboard/patient/salud-plus" 
            className="group/btn relative overflow-hidden flex items-center justify-center gap-2 bg-white text-blue-900 px-5 py-2.5 sm:py-3 rounded-xl font-bold transition-all shadow-[0_4px_15px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(127,255,212,0.3)] hover:-translate-y-0.5 w-full md:w-auto"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white via-[#7FFFD4]/20 to-white opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
            <span className="relative z-10 text-sm">Explorar Salud+</span>
            <ChevronRight className="w-4 h-4 relative z-10 group-hover/btn:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
