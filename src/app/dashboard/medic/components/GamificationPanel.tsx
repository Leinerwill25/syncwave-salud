'use client';

import React from 'react';
import { useGamification } from '@/hooks/useGamification';
import { CheckCircle2, Circle, Trophy, Lock, Unlock, Star } from 'lucide-react';

export default function GamificationPanel() {
  const { status, loading } = useGamification();

  if (loading || !status) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/4 mb-4"></div>
        <div className="h-4 bg-slate-200 rounded w-1/2 mb-6"></div>
        <div className="space-y-3">
          <div className="h-12 bg-slate-100 rounded-xl"></div>
          <div className="h-12 bg-slate-100 rounded-xl"></div>
          <div className="h-12 bg-slate-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const missions = [
    { id: 'M1', title: 'Datos del consultorio', points: 50, desc: 'Completa la información básica de tu consultorio.' },
    { id: 'M2', title: 'Tu foto de perfil', points: 50, desc: 'Sube una foto profesional para que tus pacientes te reconozcan.' },
    { id: 'M3', title: '3 fotos de tus instalaciones', points: 100, desc: 'Muestra tu consultorio a los pacientes.' },
    { id: 'M4', title: 'Ubicación en mapa', points: 50, desc: 'Permite que los pacientes encuentren tu consultorio fácilmente.' },
    { id: 'M5', title: 'Configurar tu moneda', points: 50, desc: 'Establece la moneda en la que cobras tus consultas.' },
    { id: 'M6', title: 'Subir tu plantilla de informe', points: 100, desc: 'Configura el formato de tus informes médicos.' },
    { id: 'M7', title: 'Vincular tu WhatsApp', points: 100, desc: 'Habilita las notificaciones automáticas a pacientes.' },
    { id: 'M8', title: 'Subir tu plantilla de receta', points: 100, desc: 'Configura el formato de tus recetas médicas.' },
  ];

  const levels = [
    { level: 1, points: '0-149', modules: ['Dashboard', 'Configuración'] },
    { level: 2, points: '150-349', modules: ['Pacientes', 'Citas'] },
    { level: 3, points: '350-599', modules: ['Consultas', 'Recetas', 'URL Pública'] },
    { level: 4, points: '600+', modules: ['Reportes', 'Link de Carga de Lab', 'Mensajería'] },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Tu Progreso de Onboarding
          </h2>
          <p className="text-sm text-slate-500 mt-1">Completa las misiones para desbloquear todas las funciones.</p>
        </div>
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-4 py-2 rounded-xl shadow-md">
          <span className="text-sm font-medium">Nivel {status.current_level}</span>
          <span className="mx-2">·</span>
          <span className="text-sm font-bold">{status.total_points} pts</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Nivel 1</span>
          <span>Nivel 2</span>
          <span>Nivel 3</span>
          <span>Nivel 4</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 relative">
          <div 
            className="bg-gradient-to-r from-teal-500 to-cyan-500 h-3 rounded-full" 
            style={{ width: `${Math.min((status.total_points / 600) * 100, 100)}%` }}
          ></div>
          {/* Marks */}
          <div className="absolute left-[25%] top-0 w-0.5 h-3 bg-white/50"></div>
          <div className="absolute left-[58%] top-0 w-0.5 h-3 bg-white/50"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Missions List */}
        <div className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Misiones</h3>
          <div className="space-y-3">
            {missions.map((mission) => {
              const isCompleted = status.completed_missions.includes(mission.id);
              
              return (
                <div 
                  key={mission.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition ${
                    isCompleted 
                      ? 'bg-teal-50 border-teal-200' 
                      : 'bg-white border-slate-200 hover:border-teal-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-teal-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300" />
                    )}
                    <div>
                      <p className={`text-sm font-semibold ${isCompleted ? 'text-teal-800' : 'text-slate-700'}`}>
                        {mission.title}
                      </p>
                      <p className="text-xs text-slate-500">{mission.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${isCompleted ? 'text-teal-600' : 'text-slate-400'}`}>
                      +{mission.points} pts
                    </span>
                    {isCompleted && (
                      <span className="text-xs font-medium bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
                        Listo
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Levels & Unlocks */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Niveles y Bloqueos</h3>
          <div className="space-y-3">
            {levels.map((lvl) => {
              const isCurrent = status.current_level === lvl.level;
              const isUnlocked = status.current_level >= lvl.level;
              
              return (
                <div 
                  key={lvl.level}
                  className={`p-4 rounded-xl border ${
                    isCurrent 
                      ? 'border-teal-500 bg-teal-50/50 ring-1 ring-teal-500' 
                      : isUnlocked 
                        ? 'border-teal-200 bg-white' 
                        : 'border-slate-200 bg-slate-50 opacity-75'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <Star className={`w-4 h-4 ${isUnlocked ? 'text-teal-600' : 'text-slate-400'}`} />
                      <span className={`text-sm font-bold ${isUnlocked ? 'text-teal-800' : 'text-slate-700'}`}>
                        Nivel {lvl.level}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">{lvl.points} pts</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mt-2">
                    {lvl.modules.map((mod) => (
                      <span 
                        key={mod}
                        className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isUnlocked 
                            ? 'bg-teal-100 text-teal-700' 
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {isUnlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {mod}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
