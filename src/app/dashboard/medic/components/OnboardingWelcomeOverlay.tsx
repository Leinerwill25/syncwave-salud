'use client';

import React, { useState, useEffect } from 'react';
import { useGamification } from '@/hooks/useGamification';
import { CheckCircle2, Circle, Trophy, ArrowRight } from 'lucide-react';

export default function OnboardingWelcomeOverlay() {
  const { status, loading } = useGamification();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Mostrar solo si no está cargando, hay status, y los puntos son 0 (doctor nuevo)
    // Y si no se ha cerrado ya en esta sesión
    const hasSeenOverlay = sessionStorage.getItem('hasSeenOnboardingOverlay');
    
    if (!loading && status && status.total_points === 0 && !hasSeenOverlay) {
      setIsOpen(true);
    }
  }, [status, loading]);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('hasSeenOnboardingOverlay', 'true');
  };

  if (!isOpen) return null;

  const missions = [
    { id: 'M1', title: 'Datos del consultorio', points: 50 },
    { id: 'M2', title: 'Tu foto de perfil', points: 50 },
    { id: 'M3', title: '3 fotos de tus instalaciones', points: 100 },
    { id: 'M4', title: 'Ubicación en mapa', points: 50 },
    { id: 'M5', title: 'Configurar tu moneda', points: 50 },
    { id: 'M6', title: 'Subir tu plantilla de informe', points: 100 },
    { id: 'M7', title: 'Vincular tu WhatsApp', points: 100 },
    { id: 'M8', title: 'Subir tu plantilla de receta', points: 100 },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-6 text-white text-center">
          <Trophy className="w-12 h-12 mx-auto mb-2 text-yellow-300" />
          <h1 className="text-2xl font-bold">¡Bienvenido a ASHIRA!</h1>
          <p className="text-teal-50 mt-1">Completa tu perfil, suma puntos y desbloquea todo el potencial de la plataforma.</p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Misiones de Onboarding</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {missions.map((mission) => {
              const isCompleted = status?.completed_missions?.includes(mission.id);
              
              return (
                <div 
                  key={mission.id}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    isCompleted 
                      ? 'bg-teal-50 border-teal-200' 
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-teal-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-400" />
                    )}
                    <div>
                      <p className={`text-sm font-medium ${isCompleted ? 'text-teal-800' : 'text-slate-700'}`}>
                        {mission.title}
                      </p>
                      <p className="text-xs text-slate-500">+{mission.points} pts</p>
                    </div>
                  </div>
                  {isCompleted && (
                    <span className="text-xs font-bold text-teal-600">Completado</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-sm text-yellow-800">
              <strong>Tip:</strong> Puedes ver tu progreso en la barra lateral. ¡Llega a los 600 puntos para desbloquear todas las funciones!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 flex justify-center">
          <button
            onClick={handleClose}
            className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-teal-700 hover:to-cyan-700 transition shadow-md flex items-center gap-2"
          >
            Empezar <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
