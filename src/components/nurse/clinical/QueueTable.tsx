'use client';
// src/components/nurse/clinical/QueueTable.tsx
import { useState } from 'react';
import type { NurseDailyDashboard, QueueStatus, TriageLevel } from '@/types/nurse.types';
import { TRIAGE_LABELS, TRIAGE_COLORS, QUEUE_STATUS_LABELS, QUEUE_STATUS_COLORS } from '@/types/nurse.types';
import { Search, User, Clock, AlertTriangle, ChevronRight, Activity, FileText, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  data: NurseDailyDashboard[];
  onAction: (action: 'vitals' | 'details', entry: NurseDailyDashboard) => void;
}

export function QueueTable({ data, onAction }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<QueueStatus | 'all'>('all');

  const filteredData = data.filter((item) => {
    const name = `${item.patient_first_name || item.unreg_first_name || ''} ${item.patient_last_name || item.unreg_last_name || ''}`.toLowerCase();
    const identifier = (item.patient_identifier || item.unreg_identifier || '').toLowerCase();
    const matchesSearch = name.includes(searchTerm.toLowerCase()) || identifier.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header & Controls */}
      <div className="p-4 border-bottom border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-800/50">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar paciente por nombre o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <button
            onClick={() => setStatusFilter('all')}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors",
              statusFilter === 'all' 
                ? "bg-teal-600 text-white" 
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50"
            )}
          >
            Todos
          </button>
          {(['waiting', 'in_triage', 'ready_for_doctor'] as QueueStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors",
                statusFilter === status 
                  ? "bg-teal-600 text-white" 
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50"
              )}
            >
              {QUEUE_STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/30">
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">H. Llegada</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Paciente</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Motivo</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Triaje</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredData.length > 0 ? (
              filteredData.map((item) => (
                <tr 
                  key={item.queue_id} 
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                        {format(new Date(item.arrival_time), 'HH:mm')}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center border border-teal-100 dark:border-teal-800 flex-shrink-0">
                        <User className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {item.patient_first_name || item.unreg_first_name} {item.patient_last_name || item.unreg_last_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          ID: {item.patient_identifier || item.unreg_identifier || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 max-w-[200px]">
                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate italic">
                      {item.chief_complaint || 'Sin motivo especificado'}
                    </p>
                    <div className="flex gap-1 mt-1">
                      {item.allergies_flag && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold uppercase">
                          <AlertTriangle className="w-2.5 h-2.5" /> Alergias
                        </span>
                      )}
                      {item.chronic_flag && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold uppercase">
                          Crónico
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1.5">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold w-fit",
                        QUEUE_STATUS_COLORS[item.status]
                      )}>
                        {QUEUE_STATUS_LABELS[item.status]}
                      </span>
                      {item.triage_level ? (
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold w-fit",
                          TRIAGE_COLORS[item.triage_level]
                        )}>
                          {TRIAGE_LABELS[item.triage_level]}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">Pendiente triaje</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onAction('vitals', item)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                          item.vital_signs_taken
                            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800"
                            : "bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                        )}
                      >
                        {item.vital_signs_taken ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <Activity className="w-3.5 h-3.5" />
                        )}
                        {item.vital_signs_taken ? 'Signos OK' : 'Toma Signos'}
                      </button>
                      
                      <button
                        onClick={() => onAction('details', item)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        title="Ver detalles"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-10 h-10 text-gray-200 dark:text-gray-800" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No se encontraron pacientes para hoy.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Summary Footer */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Mostrando <span className="font-semibold text-gray-900 dark:text-white">{filteredData.length}</span> de <span className="font-semibold text-gray-900 dark:text-white">{data.length}</span> pacientes registrados hoy.
        </p>
      </div>
    </div>
  );
}
