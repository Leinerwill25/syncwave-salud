'use client';

import React from 'react';
import type { NurseDailyDashboard } from '@/types/nurse.types';
import { User, Activity, AlertCircle, Clock, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface BedsGridProps {
  patients: NurseDailyDashboard[];
  totalBeds?: number;
}

export function BedsGrid({ patients, totalBeds = 12 }: BedsGridProps) {
  // Crear un array de camas y asignar pacientes
  const beds = Array.from({ length: totalBeds }, (_, i) => {
    const patient = patients[i]; // Mapeo simple por ahora
    return {
      id: i + 1,
      name: `Cama ${i + 1}`,
      patient,
    };
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {beds.map((bed) => (
        <div 
          key={bed.id}
          className={cn(
            "group relative bg-white dark:bg-gray-900 border rounded-[2rem] p-6 transition-all",
            bed.patient 
              ? "border-teal-100 dark:border-teal-900/30 shadow-lg shadow-teal-500/5 hover:border-teal-200" 
              : "border-gray-100 dark:border-gray-800 border-dashed hover:border-gray-200"
          )}
        >
          {/* Bed Number Badge */}
          <div className={cn(
            "absolute -top-3 left-6 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm",
            bed.patient ? "bg-teal-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"
          )}>
            {bed.name}
          </div>

          {!bed.patient ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3 opacity-40 group-hover:opacity-60 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                <MoreHorizontal className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-xs font-bold text-gray-400">DESOCUPADA</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Patient Header */}
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0",
                  bed.patient.triage_level === 'immediate' ? "bg-red-50 text-red-600" : "bg-teal-50 text-teal-600"
                )}>
                  <User className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-gray-900 dark:text-white truncate">
                    {bed.patient.patient_first_name || bed.patient.unreg_first_name}
                  </h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">
                    ID: {bed.patient.patient_identifier || bed.patient.unreg_identifier || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Triage / Status */}
              <div className="flex items-center gap-2">
                <span className={cn(
                  "flex-1 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5",
                  bed.patient.triage_level === 'immediate' ? "bg-red-100 text-red-700" :
                  bed.patient.triage_level === 'urgent' ? "bg-orange-100 text-orange-700" :
                  "bg-blue-100 text-blue-700"
                )}>
                  <Activity className="w-3 h-3" />
                  {bed.patient.triage_level || 'Sin Triaje'}
                </span>
                <span className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-[10px] font-black text-gray-400 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {new Date(bed.patient.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Patient Complaint */}
              {bed.patient.chief_complaint && (
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 mt-2">
                  <p className="text-[10px] text-gray-500 line-clamp-2 italic">
                    "{bed.patient.chief_complaint}"
                  </p>
                </div>
              )}

              {/* Action */}
              <Link 
                href={`/dashboard/nurse/patient/${bed.patient.queue_id}`}
                className="block w-full text-center py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-teal-500 hover:text-teal-600 rounded-2xl text-xs font-black transition-all group-hover:shadow-lg group-hover:shadow-teal-500/10"
              >
                Atender Paciente
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
