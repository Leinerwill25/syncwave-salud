import { CheckCircle2 } from 'lucide-react';
import { getLevelDefinition, getNextLevelDefinition } from '@/lib/points/levels';

interface LevelCardProps {
  currentLevel: number;
  totalEarned: number;
}

export default function LevelCard({ currentLevel, totalEarned }: LevelCardProps) {
  const levelDef = getLevelDefinition(currentLevel);
  const nextLevel = getNextLevelDefinition(currentLevel);
  const Icon = levelDef.icon;

  let progress = 100;
  let remaining = 0;

  if (nextLevel && nextLevel.maxPoints !== null) {
    const pointsInLevel = totalEarned - levelDef.minPoints;
    const requiredInLevel = nextLevel.minPoints - levelDef.minPoints;
    progress = Math.min(100, Math.max(0, (pointsInLevel / requiredInLevel) * 100));
    remaining = nextLevel.minPoints - totalEarned;
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 md:p-8 shadow-xl text-white bg-gradient-to-r from-[#4A7DE8] to-[#6FA8F5] border-0`}>
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#7FFFD4]/20 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-8">
        
        {/* Icon & Name */}
        <div className="flex flex-col items-center justify-center min-w-[140px] p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3 shadow-inner text-[#7FFFD4]">
            <Icon className="w-8 h-8" fill="currentColor" fillOpacity={0.2} />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/80 mb-1">Nivel {levelDef.level}</p>
          <h2 className="text-xl font-bold text-center">{levelDef.name}</h2>
        </div>

        {/* Progress */}
        <div className="flex-1 w-full">
          <div className="flex justify-between items-end mb-3">
            <p className="font-bold text-sm text-white/90">Progreso Total: <span className="text-[#7FFFD4] text-lg ml-1">{totalEarned}</span> Pulsos</p>
            {nextLevel ? (
              <p className="text-xs font-medium bg-white/20 px-3 py-1 rounded-full border border-white/10">Faltan <span className="font-bold text-white">{remaining}</span> para Nvl {nextLevel.level}</p>
            ) : (
              <p className="text-xs font-bold bg-[#7FFFD4]/20 text-[#7FFFD4] px-3 py-1 rounded-full border border-[#7FFFD4]/30">¡Nivel Máximo Alcanzado!</p>
            )}
          </div>
          
          <div className="h-3 w-full bg-black/20 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-[#7FFFD4] to-teal-300 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(127,255,212,0.5)]"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <div className="mt-8 bg-white/10 rounded-xl p-4 border border-white/10 backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-wider mb-3 text-[#7FFFD4] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Beneficios Actuales
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {levelDef.benefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-2 text-sm font-medium text-white/90">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7FFFD4] mt-1.5 shrink-0 shadow-[0_0_5px_rgba(127,255,212,0.8)]"></span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
