import { RewardCatalogItem, RewardRedemption } from '@/types/points';
import { Clock, Bell, FileText, Users, BadgeCheck, CheckCircle2, Lock } from 'lucide-react';

interface RewardsCatalogProps {
  catalog: RewardCatalogItem[];
  activeRedemptions: RewardRedemption[];
  currentBalance: number;
  currentLevel: number;
  onRedeemClick: (reward: RewardCatalogItem) => void;
}

const getIconComponent = (iconName: string | null) => {
  switch (iconName) {
    case 'Clock': return Clock;
    case 'Bell': return Bell;
    case 'FileText': return FileText;
    case 'Users': return Users;
    case 'BadgeCheck': return BadgeCheck;
    default: return Star;
  }
};
import { Star } from 'lucide-react';

export default function RewardsCatalog({ 
  catalog, 
  activeRedemptions, 
  currentBalance, 
  currentLevel, 
  onRedeemClick 
}: RewardsCatalogProps) {
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {catalog.map((reward) => {
        const Icon = getIconComponent(reward.icon);
        const isActive = activeRedemptions.some(r => r.reward_id === reward.id);
        const isLevelLocked = currentLevel < reward.min_level;
        const isBalanceInsufficient = currentBalance < reward.cost_points;
        
        let buttonContent = 'Canjear';
        let buttonDisabled = false;
        let buttonClass = 'bg-[#4A7DE8] text-white hover:bg-blue-600';

        if (isActive) {
          buttonContent = 'Ya Activo';
          buttonDisabled = true;
          buttonClass = 'bg-green-100 text-green-700 font-bold';
        } else if (isLevelLocked) {
          buttonContent = `Requiere Nivel ${reward.min_level}`;
          buttonDisabled = true;
          buttonClass = 'bg-gray-100 text-gray-400';
        } else if (isBalanceInsufficient) {
          buttonContent = `Faltan ${reward.cost_points - currentBalance} Pulsos`;
          buttonDisabled = true;
          buttonClass = 'bg-gray-100 text-gray-500';
        }

        return (
          <div key={reward.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col relative overflow-hidden transition-all hover:shadow-md">
            
            {/* Badges */}
            <div className="absolute top-4 right-4 flex gap-2">
              {isActive && (
                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Activo
                </span>
              )}
              {isLevelLocked && !isActive && (
                <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Nvl {reward.min_level}
                </span>
              )}
            </div>

            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${isActive ? 'bg-green-100 text-green-600' : isLevelLocked ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-[#4A7DE8]'}`}>
              <Icon className="w-6 h-6" />
            </div>

            <h3 className={`text-lg font-bold mb-2 ${isLevelLocked ? 'text-gray-500' : 'text-gray-900'}`}>{reward.name}</h3>
            <p className="text-sm text-gray-600 flex-1 mb-6 leading-relaxed">{reward.description}</p>

            <div className="flex items-center justify-between mt-auto">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Costo</p>
                <p className={`text-lg font-bold ${isBalanceInsufficient && !isActive ? 'text-red-500' : 'text-[#7FFFD4]'}`}>
                  {reward.cost_points} <span className="text-xs font-normal text-gray-500">Pulsos</span>
                </p>
              </div>

              <button
                disabled={buttonDisabled}
                onClick={() => onRedeemClick(reward)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${buttonClass}`}
              >
                {buttonContent}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
