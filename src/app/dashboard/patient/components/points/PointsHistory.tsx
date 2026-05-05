import { PointTransaction, RewardRedemption } from '@/types/points';
import { POINTS_EVENTS } from '@/lib/points/events';
import { ArrowDownRight, ArrowUpRight, Clock, Star } from 'lucide-react';

interface PointsHistoryProps {
  transactions: PointTransaction[];
  redemptions: RewardRedemption[];
}

export default function PointsHistory({ transactions, redemptions }: PointsHistoryProps) {
  // Combinar ambos para una vista unificada si fuera necesario, 
  // o separar en tabs. Lo haremos simple: mostramos transacciones.
  
  const getIcon = (type: string, points: number) => {
    if (points < 0) return <ArrowDownRight className="w-5 h-5 text-gray-500" />;
    
    // Buscar en categorías si es posible, sino default
    const eventDef = Object.values(POINTS_EVENTS).find(e => e.key === type);
    if (type === 'streak_3_appointments') return <Star className="w-5 h-5 text-yellow-500" />;
    
    return <ArrowUpRight className="w-5 h-5 text-[#4A7DE8]" />;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <h3 className="text-lg font-bold text-gray-900">Historial de Transacciones</h3>
      </div>
      
      {transactions.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <Clock className="w-8 h-8 mx-auto text-gray-300 mb-3" />
          <p>No tienes transacciones aún. ¡Completa acciones para ganar Pulsos!</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
          {transactions.map((tx) => (
            <li key={tx.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors flex items-center gap-4">
              <div className={`p-2 rounded-full flex-shrink-0 ${tx.points > 0 ? 'bg-blue-50' : 'bg-gray-100'}`}>
                {getIcon(tx.event_type, tx.points)}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 line-clamp-1">{tx.description}</p>
                <p className="text-xs text-gray-500">
                  {new Date(tx.created_at).toLocaleDateString('es-ES', { 
                    day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' 
                  })}
                </p>
              </div>

              <div className="flex-shrink-0 text-right">
                <p className={`text-base font-bold ${tx.points > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                  {tx.points > 0 ? '+' : ''}{tx.points}
                </p>
                <p className="text-[10px] text-gray-500 uppercase">Pulsos</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
