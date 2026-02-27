'use client';

import React from 'react';
import type { MARRecord } from '@/types/nurse.types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Pill, CheckCircle2, XCircle, Clock, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MedicationKardexProps {
  records: MARRecord[];
}

export function MedicationKardex({ records }: MedicationKardexProps) {
  // Ordenar por hora programada
  const sortedRecords = [...records].sort((a, b) => 
    new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  );

  return (
    <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
      {sortedRecords.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-400 text-sm">No hay registros cronológicos para mostrar.</p>
        </div>
      ) : (
        sortedRecords.map((record, index) => {
          const isCompleted = record.status === 'administered';
          const isPending = record.status === 'pending';
          const isOmitted = record.status === 'omitted' || record.status === 'refused';
          const scheduledTime = new Date(record.scheduled_at);

          return (
            <div key={record.mar_id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              {/* Dot */}
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10",
                isCompleted ? "bg-emerald-500 text-white" : isPending ? "bg-amber-500 text-white" : "bg-slate-400 text-white"
              )}>
                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : isPending ? <Clock className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
              </div>

              {/* Content Card */}
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center justify-between space-x-2 mb-1">
                  <div className="font-black text-gray-900 dark:text-white truncate">
                    {record.medication_name}
                  </div>
                  <time className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400 whitespace-nowrap">
                    {format(scheduledTime, 'HH:mm')}
                  </time>
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-2 mb-3">
                  <span className="bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 rounded font-bold uppercase transition-colors group-hover:bg-teal-50 dark:group-hover:bg-teal-900/10 group-hover:text-teal-600">
                    {record.dose}
                  </span>
                  <span>•</span>
                  <span>{record.route}</span>
                </div>

                {/* Status-specific details */}
                <div className="mt-2 text-[10px] uppercase font-black tracking-tight">
                  {isCompleted ? (
                    <div className="text-emerald-600 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Administrado el {format(new Date(record.administered_at || record.updated_at), 'HH:mm')}
                    </div>
                  ) : isPending ? (
                    <div className="text-amber-600 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Pendiente para Hoy
                    </div>
                  ) : (
                    <div className="text-gray-400 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      {record.status === 'omitted' ? 'Omitido' : 'Rechazado'}
                    </div>
                  )}
                </div>

                {record.omission_reason && (
                  <p className="mt-2 text-xs text-red-500 italic bg-red-50 dark:bg-red-900/10 p-2 rounded-lg border border-red-100 dark:border-red-900/20">
                    Razón: {record.omission_reason}
                  </p>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
