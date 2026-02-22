'use client';
// src/app/nurse/queue/page.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QueueTable } from '@/components/nurse/clinical/QueueTable';
import { getDailyQueue } from '@/lib/supabase/nurse.service';
import type { NurseDailyDashboard } from '@/types/nurse.types';
import { useNurseActions } from '@/hooks/nurse/useNurseContext';
import { Loader2, RefreshCw, Users } from 'lucide-react';

export default function NurseQueuePage() {
  const [data, setData] = useState<NurseDailyDashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { setActivePatient } = useNurseActions();

  async function loadQueue() {
    setLoading(true);
    const queue = await getDailyQueue();
    setData(queue);
    setLoading(false);
  }

  useEffect(() => {
    loadQueue();
  }, []);

  const handleAction = (action: 'vitals' | 'details', patient: NurseDailyDashboard) => {
    setActivePatient(patient);
    if (action === 'vitals') {
      router.push(`/nurse/patient/${patient.patient_id || patient.unregistered_patient_id}/vitals?queueId=${patient.queue_id}`);
    } else {
      router.push(`/nurse/patient/${patient.patient_id || patient.unregistered_patient_id}?queueId=${patient.queue_id}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-600" />
            Cola de Pacientes Hoy
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gestiona la atención primaria y triaje de los pacientes del centro.
          </p>
        </div>
        
        <button
          onClick={loadQueue}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Actualizar
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-4" />
          <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">Cargando pacientes de hoy...</p>
        </div>
      ) : (
        <QueueTable data={data} onAction={handleAction} />
      )}
    </div>
  );
}
