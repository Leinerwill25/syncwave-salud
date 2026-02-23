'use client';
// src/components/nurse/clinical/PatientMARTab.tsx
import { useState, useEffect, useCallback } from 'react';
import type { MARRecord, MARStatus } from '@/types/nurse.types';
import { getMARRecords, updateMARStatus } from '@/lib/supabase/nurse.service';
import { useNurseState, useNurseActions } from '@/context/NurseContext';
import { Pill, Clock, CheckCircle2, XCircle, AlertCircle, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface Props {
  queueId: string;
}

export function PatientMARTab({ queueId }: Props) {
  const { isOnline } = useNurseState();
  const { addToSyncQueue } = useNurseActions();
  const [records, setRecords] = useState<MARRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMARRecords(queueId);
      setRecords(data);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar registros de medicación');
    } finally {
      setLoading(false);
    }
  }, [queueId]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleUpdateStatus = async (marId: string, status: MARStatus, notes?: string, omissionReason?: string) => {
    setProcessingId(marId);
    try {
      if (!isOnline) {
        await addToSyncQueue('mar', { mar_id: marId, status, notes, omissionReason });
        // Optimistic update for UI feel (wait for actual sync for database permanence)
        setRecords(prev => prev.map(r => r.mar_id === marId ? { ...r, status, notes: notes || r.notes, omission_reason: omissionReason || r.omission_reason } : r));
        return;
      }

      const { error } = await updateMARStatus(marId, status, notes, omissionReason);
      if (error) throw new Error(error);
      
      toast.success(status === 'administered' ? 'Medicamento administrado' : 'Registro actualizado');
      loadRecords();
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: MARStatus) => {
    switch (status) {
      case 'administered':
        return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase">Administrado</span>;
      case 'omitted':
        return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 uppercase">Omitido</span>;
      case 'refused':
        return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 uppercase">Rechazado</span>;
      case 'pending':
        return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase">Pendiente</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        <p className="text-sm text-gray-500">Cargando esquema de medicación...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
          <Pill className="w-5 h-5 text-teal-600" />
          Registro de Administración (MAR)
        </h3>
        <button 
          onClick={loadRecords}
          className="text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors"
        >
          Actualizar
        </button>
      </div>

      {records.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800/40 rounded-3xl p-12 border border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Info className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-gray-900 dark:text-white font-bold mb-1">No hay medicamentos programados</h4>
          <p className="text-sm text-gray-500 max-w-xs">Este paciente no tiene indicaciones de medicamentos registradas para esta visita.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {records.map((record) => (
            <div 
              key={record.mar_id}
              className={cn(
                "bg-white dark:bg-gray-900 border rounded-3xl p-5 transition-all shadow-sm",
                record.status === 'administered' ? "border-emerald-100 dark:border-emerald-900/30" : "border-gray-100 dark:border-gray-800"
              )}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0",
                    record.status === 'administered' ? "bg-emerald-50 text-emerald-600" : "bg-teal-50 text-teal-600"
                  )}>
                    <Pill className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-black text-gray-900 dark:text-white">{record.medication_name}</h4>
                      {getStatusBadge(record.status)}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="font-bold text-gray-700 dark:text-gray-300">Dosis:</span> {record.dose}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="font-bold text-gray-700 dark:text-gray-300">Vía:</span> {record.route}
                      </span>
                      {record.frequency && (
                        <span className="flex items-center gap-1">
                          <span className="font-bold text-gray-700 dark:text-gray-300">Frecuencia:</span> {record.frequency}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 md:border-l border-gray-100 dark:border-gray-800 md:pl-6">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <Clock className="w-3 h-3" />
                    Programado
                  </div>
                  <div className="text-lg font-black text-gray-900 dark:text-white">
                    {format(new Date(record.scheduled_at), 'hh:mm a')}
                  </div>
                  <div className="text-[10px] text-gray-400 font-medium">
                    {format(new Date(record.scheduled_at), "d 'de' MMMM", { locale: es })}
                  </div>
                </div>
              </div>

              {/* Action Buttons if Pending */}
              {record.status === 'pending' && (
                <div className="mt-6 pt-6 border-t border-gray-50 dark:border-gray-800 flex flex-wrap gap-3">
                  <button
                    disabled={processingId === record.mar_id}
                    onClick={() => handleUpdateStatus(record.mar_id, 'administered')}
                    className="flex-1 min-w-[140px] bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50"
                  >
                    {processingId === record.mar_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Administrar
                  </button>
                  <button
                    disabled={processingId === record.mar_id}
                    onClick={() => {
                      const reason = window.prompt('Motivo de la omisión/rechazo:');
                      if (reason) handleUpdateStatus(record.mar_id, 'omitted', '', reason);
                    }}
                    className="flex-1 min-w-[140px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Omitir
                  </button>
                </div>
              )}

              {/* Log Info if Completed */}
              {record.status !== 'pending' && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    record.status === 'administered' ? "bg-emerald-100 text-emerald-600" : "bg-gray-200 text-gray-600"
                  )}>
                    {record.status === 'administered' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  </div>
                  <div className="text-xs">
                    <p className="text-gray-500 font-medium">
                      {record.status === 'administered' 
                        ? `Administrado el ${format(new Date(record.administered_at || record.updated_at), "d/MM 'a las' HH:mm")}`
                        : record.omission_reason ? `Omitido: ${record.omission_reason}` : `Registrado el ${format(new Date(record.updated_at), "d/MM 'a las' HH:mm")}`
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Warning Alert */}
      <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-3xl flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed font-medium">
          <strong>Importante:</strong> La administración de medicamentos debe ser verificada según la indicación médica. Si existen discrepancias o reacciones adversas, regístrelas en las Notas de Evolución.
        </div>
      </div>
    </div>
  );
}
