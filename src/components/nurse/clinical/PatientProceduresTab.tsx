'use client';
// src/components/nurse/clinical/PatientProceduresTab.tsx
import { useState, useEffect, useCallback } from 'react';
import type { NurseProcedure, ProcedureStatus } from '@/types/nurse.types';
import { getProcedures, updateProcedureStatus } from '@/lib/supabase/nurse.service';
import { Droplet, Clock, CheckCircle2, Play, AlertCircle, Loader2, Clipboard, Box } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface Props {
  queueId: string;
}

export function PatientProceduresTab({ queueId }: Props) {
  const [procedures, setProcedures] = useState<NurseProcedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadProcedures = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProcedures(queueId);
      setProcedures(data);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar procedimientos');
    } finally {
      setLoading(false);
    }
  }, [queueId]);

  useEffect(() => {
    loadProcedures();
  }, [loadProcedures]);

  const handleUpdateStatus = async (procId: string, status: ProcedureStatus) => {
    let outcome: string | undefined;
    if (status === 'completed') {
      const res = window.prompt('Resultado/Hallazgos del procedimiento:');
      if (res === null) return;
      outcome = res;
    }

    setProcessingId(procId);
    try {
      const { error } = await updateProcedureStatus(procId, status, outcome);
      if (error) throw new Error(error);
      
      toast.success(status === 'in_progress' ? 'Procedimiento iniciado' : 'Estado actualizado');
      loadProcedures();
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: ProcedureStatus) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase">Completado</span>;
      case 'in_progress':
        return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase animate-pulse">En Progreso</span>;
      case 'pending':
        return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase">Pendiente</span>;
      case 'cancelled':
        return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 uppercase">Cancelado</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 uppercase">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        <p className="text-sm text-gray-500">Cargando procedimientos médicos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
          <Droplet className="w-5 h-5 text-teal-600" />
          Módulo de Procedimientos
        </h3>
        <button 
          onClick={loadProcedures}
          className="text-xs font-bold text-teal-600 hover:text-teal-700"
        >
          Refrescar
        </button>
      </div>

      {procedures.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800/40 rounded-3xl p-12 border border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center text-center">
          <Clipboard className="w-12 h-12 text-gray-300 mb-4" />
          <h4 className="text-gray-900 dark:text-white font-bold mb-1">No hay procedimientos asignados</h4>
          <p className="text-sm text-gray-500 max-w-xs">No se han registrado curas, sondajes u otros procedimientos para este paciente.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {procedures.map((proc) => (
            <div 
              key={proc.procedure_id}
              className={cn(
                "bg-white dark:bg-gray-900 border rounded-3xl p-6 transition-all shadow-sm",
                proc.status === 'completed' ? "border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/10" : "border-gray-100 dark:border-gray-800"
              )}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0",
                    proc.status === 'completed' ? "bg-emerald-100 text-emerald-600" : "bg-teal-50 text-teal-600"
                  )}>
                    <Droplet className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-black text-gray-900 dark:text-white text-lg">{proc.procedure_name}</h4>
                      {getStatusBadge(proc.status)}
                    </div>
                    {proc.description && (
                      <p className="text-sm text-gray-500 line-clamp-2 italic">{proc.description}</p>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 pt-3 border-t border-gray-50 dark:border-gray-800">
                       {proc.procedure_code && (
                         <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Código: {proc.procedure_code}</span>
                       )}
                       {proc.scheduled_at && (
                         <span className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                           <Clock className="w-3.5 h-3.5" />
                           Programado: {format(new Date(proc.scheduled_at), "HH:mm")}
                         </span>
                       )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-w-[160px]">
                  {proc.status === 'pending' && (
                    <button
                      disabled={processingId === proc.procedure_id}
                      onClick={() => handleUpdateStatus(proc.procedure_id, 'in_progress')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                    >
                      {processingId === proc.procedure_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      Iniciar
                    </button>
                  )}
                  {proc.status === 'in_progress' && (
                    <button
                      disabled={processingId === proc.procedure_id}
                      onClick={() => handleUpdateStatus(proc.procedure_id, 'completed')}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                    >
                      {processingId === proc.procedure_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Finalizar
                    </button>
                  )}
                  {proc.status !== 'completed' && proc.status !== 'cancelled' && (
                     <button
                        onClick={() => handleUpdateStatus(proc.procedure_id, 'cancelled')}
                        className="w-full text-xs text-red-500 font-bold hover:underline py-1"
                     >
                       Cancelar
                     </button>
                  )}
                </div>
              </div>

              {/* Outcome or Notes if Finished */}
              {proc.status === 'completed' && proc.outcome && (
                <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                  <span className="text-[10px] font-black text-emerald-600 uppercase mb-2 block tracking-widest">Resultado</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{proc.outcome}"</p>
                </div>
              )}

              {/* Supplies Used list if any */}
              {proc.supplies_used && proc.supplies_used.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {proc.supplies_used.map((item, idx) => (
                    <span key={idx} className="flex items-center gap-1 text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-1 rounded-lg">
                      <Box className="w-3 h-3" />
                      {item.quantity} {item.unit} {item.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Guidelines Alert */}
      <div className="p-5 bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/30 rounded-3xl flex gap-4">
        <AlertCircle className="w-6 h-6 text-teal-600 flex-shrink-0" />
        <div className="text-xs text-teal-800 dark:text-teal-400 leading-relaxed font-bold">
          Recordatorio: Todo procedimiento invasivo requiere consentimiento informado verbal o escrito según protocolo institucional. Asegúrese de registrar cualquier complicación inmediatamente.
        </div>
      </div>
    </div>
  );
}
