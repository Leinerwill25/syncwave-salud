'use client';

import { useState, useEffect } from 'react';
import { useNurseState } from '@/context/NurseContext';
import { getObservationPatients } from '@/lib/supabase/nurse.service';
import type { NurseDailyDashboard } from '@/types/nurse.types';
import { BedsGrid } from '@/components/nurse/observation/BedsGrid';
import { Bed, Info, Loader2, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

export default function NurseObservationPage() {
  const { nurseProfile } = useNurseState();
  const [patients, setPatients] = useState<NurseDailyDashboard[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPatients = async () => {
    if (!nurseProfile?.organization_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getObservationPatients(nurseProfile.organization_id);
      setPatients(data);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar pacientes en observación');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, [nurseProfile]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
        <p className="text-gray-500 font-medium">Cargando pacientes en observación...</p>
      </div>
    );
  }

  if (!nurseProfile?.organization_id) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-20 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center mb-6">
          <Info className="w-10 h-10 text-orange-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Módulo no disponible</h3>
        <p className="text-gray-500 max-w-sm">
          Este módulo de gestión de camas está reservado para enfermeros afiliados a una organización hospitalaria.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3 font-outfit">
            <Bed className="w-8 h-8 text-teal-600" />
            Control de Camas y Observación
          </h1>
          <p className="text-gray-500 font-medium mt-1">Monitoreo de pacientes en vigilancia clínica activa</p>
        </div>

        <button 
          onClick={loadPatients}
          className="p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2 text-sm font-bold text-gray-600"
        >
          <RefreshCcw className="w-4 h-4" />
          Sincronizar Panel
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Ocupadas</p>
          <p className="text-2xl font-black text-teal-600">{patients.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Disponibles</p>
          <p className="text-2xl font-black text-gray-300">{Math.max(0, 12 - patients.length)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Críticos</p>
          <p className="text-2xl font-black text-red-500">
            {patients.filter(p => p.triage_level === 'immediate').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Promedio Estancia</p>
          <p className="text-lg font-black text-gray-900 dark:text-white">--:--</p>
        </div>
      </div>

      {/* Beds Grid Interface */}
      <BedsGrid patients={patients} totalBeds={12} />

      {/* Guidelines Card */}
      <div className="p-6 bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/30 rounded-[2rem] flex gap-4">
        <Info className="w-6 h-6 text-teal-600 flex-shrink-0" />
        <div>
          <h4 className="text-sm font-black text-teal-900 dark:text-teal-400 mb-1 uppercase tracking-tight">Manual de Vigilancia</h4>
          <p className="text-xs text-teal-800/80 dark:text-teal-500/80 leading-relaxed font-medium">
            Los pacientes en observación deben tener sus signos vitales registrados al menos cada 4 horas o según protocolo específico. Asegúrese de realizar el cambio de estado de la cama una vez que el paciente sea dado de alta o trasladado a hospitalización.
          </p>
        </div>
      </div>
    </div>
  );
}
