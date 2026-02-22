'use client';
// src/components/nurse/auth/affiliated/NurseAffiliationConfirmation.tsx
import { Building2, ChevronRight, ChevronLeft } from 'lucide-react';

interface Props {
  organizationName: string;
  onConfirm: () => void;
  onBack: () => void;
}

export function NurseAffiliationConfirmation({ organizationName, onConfirm, onBack }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center gap-4 py-4">
        <div className="w-16 h-16 rounded-2xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
          <Building2 className="w-8 h-8 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{organizationName}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ¿Confirmas que deseas unirte a esta organización?
          </p>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300">
        <strong>Nota:</strong> Tu solicitud quedará pendiente de aprobación por el administrador de{' '}
        <span className="font-semibold">{organizationName}</span>. Recibirás un correo cuando seas aprobado.
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg px-5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" /> Atrás
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg px-6 py-2.5 transition-colors text-sm"
        >
          Confirmar y continuar <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
