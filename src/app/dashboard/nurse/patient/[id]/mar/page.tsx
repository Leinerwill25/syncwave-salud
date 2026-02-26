'use client';
// src/app/dashboard/nurse/patient/[id]/mar/page.tsx
import { useSearchParams } from 'next/navigation';
import { PatientMARTab } from '@/components/nurse/clinical/PatientMARTab';
import { useNurseState } from '@/context/NurseContext';
import { Loader2, AlertCircle } from 'lucide-react';
import * as React from 'react';

export default function PatientMARPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const searchParams = useSearchParams();
  const queueId = searchParams.get('queueId');
  const { activePatient } = useNurseState();

  if (!queueId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
        <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">ID de Cola Faltante</h3>
        <p className="text-gray-500 text-sm">No se puede cargar el MAR sin una referencia de atención válida.</p>
      </div>
    );
  }

  if (!activePatient) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  return <PatientMARTab queueId={queueId} />;
}
