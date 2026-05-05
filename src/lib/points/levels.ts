import { Heart, Activity, Zap, HeartPulse } from 'lucide-react';

export interface LevelDefinition {
  level: number;
  name: string;
  minPoints: number;
  maxPoints: number | null;
  icon: any; // Lucide icon component
  benefits: string[];
  colorClass: string;
}

export const POINTS_LEVELS: Record<number, LevelDefinition> = {
  1: {
    level: 1,
    name: 'Latido',
    minPoints: 0,
    maxPoints: 300,
    icon: Heart,
    benefits: [
      'Sistema de recompensas activo',
      'Historial de citas básico'
    ],
    colorClass: 'text-gray-400 bg-gray-50 border-gray-200'
  },
  2: {
    level: 2,
    name: 'Ritmo',
    minPoints: 301,
    maxPoints: 800,
    icon: Activity,
    benefits: [
      'Todo lo de Latido',
      'Desbloqueo de recordatorios extendidos',
      'Posibilidad de exportar PDFs clínicos'
    ],
    colorClass: 'text-blue-500 bg-blue-50 border-blue-200'
  },
  3: {
    level: 3,
    name: 'Pulso Fuerte',
    minPoints: 801,
    maxPoints: 1500,
    icon: Zap,
    benefits: [
      'Todo lo de Ritmo',
      'Prioridad en lista de espera',
      'Dashboard familiar unificado'
    ],
    colorClass: 'text-indigo-500 bg-indigo-50 border-indigo-200'
  },
  4: {
    level: 4,
    name: 'Corazón ASHIRA',
    minPoints: 1501,
    maxPoints: null,
    icon: HeartPulse,
    benefits: [
      'Todo lo de Pulso Fuerte',
      'Badge de paciente comprometido visible para médicos',
      'Atención preferencial en clínica'
    ],
    colorClass: 'text-rose-500 bg-rose-50 border-rose-200'
  }
};

export const getLevelDefinition = (level: number): LevelDefinition => {
  return POINTS_LEVELS[level] || POINTS_LEVELS[1];
};

export const getNextLevelDefinition = (currentLevel: number): LevelDefinition | null => {
  return POINTS_LEVELS[currentLevel + 1] || null;
};
