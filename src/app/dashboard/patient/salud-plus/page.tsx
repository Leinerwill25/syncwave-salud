'use client';

import { useState, useEffect } from 'react';
import { HeartPulse, History, Gift, Info } from 'lucide-react';
import { getPatientPointsData, redeemReward } from '@/lib/actions/points';
import { PatientPointsSummary, PointTransaction, RewardCatalogItem, RewardRedemption } from '@/types/points';

import LevelCard from '../components/points/LevelCard';
import PointsHistory from '../components/points/PointsHistory';
import RewardsCatalog from '../components/points/RewardsCatalog';
import RedeemModal from '../components/points/RedeemModal';
import HowToEarnList from '../components/points/HowToEarnList';
import { toast } from 'sonner';

export default function SaludPlusPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'rewards' | 'history' | 'earn'>('rewards');
  
  // Data
  const [summary, setSummary] = useState<PatientPointsSummary | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [catalog, setCatalog] = useState<RewardCatalogItem[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);

  // Modal
  const [selectedReward, setSelectedReward] = useState<RewardCatalogItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getPatientPointsData();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      if (data.summary) setSummary(data.summary);
      if (data.recentTransactions) setTransactions(data.recentTransactions);
      if (data.catalog) setCatalog(data.catalog);
      if (data.activeRedemptions) setRedemptions(data.activeRedemptions);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar datos de Salud+');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRedeemClick = (reward: RewardCatalogItem) => {
    setSelectedReward(reward);
    setIsModalOpen(true);
  };

  const handleConfirmRedeem = async (rewardId: string) => {
    const res = await redeemReward(rewardId);
    if (res.error) {
      throw new Error(res.error);
    }
    toast.success('¡Recompensa canjeada con éxito!');
    // Reload data to reflect new balance and active redemptions
    await loadData();
  };

  if (loading && !summary) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-48 bg-gray-200 rounded-2xl"></div>
        <div className="h-12 bg-gray-200 rounded-lg w-full max-w-md"></div>
        <div className="h-64 bg-gray-200 rounded-2xl"></div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#4A7DE8] to-[#6FA8F5] bg-clip-text text-transparent flex items-center gap-3">
            <HeartPulse className="w-8 h-8 text-[#4A7DE8]" /> ASHIRA Salud+
          </h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Tu compromiso con tu salud te recompensa</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Balance</span>
          <span className="text-3xl font-bold text-[#7FFFD4]">{summary.current_balance}</span>
        </div>
      </div>

      {/* Main Level Card */}
      <LevelCard currentLevel={summary.current_level} totalEarned={summary.total_earned} />

      {/* Tabs */}
      <div className="bg-white p-1.5 rounded-xl border border-gray-200 inline-flex flex-wrap gap-1 shadow-sm w-full sm:w-auto">
        <button
          onClick={() => setActiveTab('rewards')}
          className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'rewards' ? 'bg-[#4A7DE8] text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Gift className="w-4 h-4" /> Catálogo de Recompensas
        </button>
        <button
          onClick={() => setActiveTab('earn')}
          className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'earn' ? 'bg-[#4A7DE8] text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Info className="w-4 h-4" /> Cómo ganar Pulsos
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'history' ? 'bg-[#4A7DE8] text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <History className="w-4 h-4" /> Historial de Movimientos
        </button>
      </div>

      {/* Content */}
      <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'rewards' && (
          <RewardsCatalog 
            catalog={catalog} 
            activeRedemptions={redemptions} 
            currentBalance={summary.current_balance}
            currentLevel={summary.current_level}
            onRedeemClick={handleRedeemClick}
          />
        )}
        
        {activeTab === 'history' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PointsHistory transactions={transactions} redemptions={redemptions} />
            <div className="hidden lg:block bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-8 border border-indigo-100">
              <h3 className="text-xl font-bold text-indigo-900 mb-4">Tu Actividad</h3>
              <p className="text-indigo-700 leading-relaxed mb-6">
                Aquí puedes ver todas las transacciones de Pulsos. Cada vez que confirmas una cita, asistes o subes un documento médico, acumulas Pulsos que no expiran.
              </p>
              <div className="bg-white/60 p-4 rounded-xl">
                <p className="text-sm text-indigo-800 font-semibold mb-1">Total ganado histórico</p>
                <p className="text-2xl font-bold text-indigo-600">{summary.total_earned} Pulsos</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'earn' && (
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Acciones que suman Pulsos</h2>
            <HowToEarnList />
          </div>
        )}
      </div>

      <RedeemModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        reward={selectedReward}
        currentBalance={summary?.current_balance || 0}
        onConfirm={handleConfirmRedeem}
      />
    </div>
  );
}
