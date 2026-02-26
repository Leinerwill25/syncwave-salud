'use client';
// src/app/nurse/patient/[id]/page.tsx
import { useNurseState } from '@/context/NurseContext';
import { PatientSummaryTab } from '@/components/nurse/clinical/PatientSummaryTab';
import { Loader2, AlertCircle, User } from 'lucide-react';
import * as React from 'react';

export default function PatientSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { activePatient } = useNurseState();

  if (!activePatient) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
        <Loader2 className="w-10 h-10 text-teal-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Sincronizando datos del paciente...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <PatientSummaryTab patient={activePatient} />

      {/* Additional context or quick actions could go here */}
      <div className="mt-6 p-6 bg-teal-600 rounded-3xl text-white shadow-xl shadow-teal-500/20 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
        <div className="relative z-10">
          <h3 className="text-xl font-black mb-2 flex items-center gap-2">
            <User className="w-6 h-6" />
            Atención Rápida
          </h3>
          <p className="text-teal-100 text-sm max-w-md">
            Puedes proceder directamente a la toma de signos vitales o administrar un medicamento urgente si el protocolo lo permite.
          </p>
        </div>
        
        <div className="flex items-center gap-3 relative z-10 w-full md:w-auto">
          <button className="flex-1 md:flex-none px-6 py-3 bg-white text-teal-700 font-black rounded-2xl hover:bg-teal-50 transition-colors shadow-lg active:scale-95">
            Administrar Urgente
          </button>
        </div>

        {/* Abstract background blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500 rounded-full -mr-20 -mt-20 opacity-50 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-400 rounded-full -ml-20 -mb-20 opacity-30 blur-2xl" />
      </div>
    </div>
  );
}
