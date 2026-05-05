import { RewardCatalogItem } from '@/types/points';
import { X, HeartPulse } from 'lucide-react';
import { useState } from 'react';

interface RedeemModalProps {
  reward: RewardCatalogItem | null;
  currentBalance: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (rewardId: string) => Promise<void>;
}

export default function RedeemModal({ reward, currentBalance, isOpen, onClose, onConfirm }: RedeemModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !reward) return null;

  const newBalance = currentBalance - reward.cost_points;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm(reward.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al canjear la recompensa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
              <HeartPulse className="w-6 h-6 text-[#4A7DE8]" />
            </div>
            <button onClick={onClose} disabled={loading} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirmar Canje</h2>
          <p className="text-gray-600 mb-6">
            Estás a punto de canjear tus Pulsos por: <strong className="text-gray-900">{reward.name}</strong>.
          </p>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Balance actual</span>
              <span className="font-semibold text-gray-900">{currentBalance} Pulsos</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Costo recompensa</span>
              <span className="font-semibold text-red-600">-{reward.cost_points} Pulsos</span>
            </div>
            <div className="h-px w-full bg-gray-200 my-2"></div>
            <div className="flex justify-between text-base">
              <span className="font-semibold text-gray-900">Nuevo balance</span>
              <span className="font-bold text-[#7FFFD4]">{newBalance} Pulsos</span>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 px-4 py-3 text-white bg-[#4A7DE8] hover:bg-blue-600 rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                'Confirmar Canje'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
