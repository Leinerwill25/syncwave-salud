'use client';
// src/components/nurse/reports/ShiftReportForm.tsx
import { useState, useEffect } from 'react';
import { useNurseState, useNurseActions } from '@/context/NurseContext';
import type { ShiftIncident, ShiftPendingTask, ShiftReport } from '@/types/nurse.types';
import { createShiftReport, getDashboardSummary, signShiftReport } from '@/lib/supabase/nurse.service';
import { 
  ClipboardCheck, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  FileText, 
  History, 
  Send, 
  Loader2, 
  TrendingUp, 
  UserPlus,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function ShiftReportForm() {
  const router = useRouter();
  const { nurseProfile, todaySummary, currentShift } = useNurseState();
  const { endShift } = useNurseActions();
  
  const [loading, setLoading] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [incidents, setIncidents] = useState<ShiftIncident[]>([]);
  const [pendingTasks, setPendingTasks] = useState<ShiftPendingTask[]>([]);
  
  // Incident form state
  const [newIncident, setNewIncident] = useState<Partial<ShiftIncident>>({ severity: 'low', time: format(new Date(), 'HH:mm') });
  const [newPendingTask, setNewPendingTask] = useState<Partial<ShiftPendingTask>>({ priority: 'routine' });

  const addIncident = () => {
    if (!newIncident.description) return;
    setIncidents([...incidents, newIncident as ShiftIncident]);
    setNewIncident({ severity: 'low', time: format(new Date(), 'HH:mm') });
  };

  const addPendingTask = () => {
    if (!newPendingTask.description || !newPendingTask.patient_name) return;
    setPendingTasks([...pendingTasks, newPendingTask as ShiftPendingTask]);
    setNewPendingTask({ priority: 'routine' });
  };

  const handleSubmit = async (signNow = false) => {
    if (!nurseProfile) return;
    setLoading(true);
    try {
      const { data, error } = await createShiftReport({
        nurse_id: nurseProfile.nurse_profile_id,
        organization_id: nurseProfile.organization_id || undefined,
        report_type: nurseProfile.nurse_type === 'independent' ? 'independent_care_report' : 'shift_report',
        report_date: new Date().toISOString(),
        shift_start: currentShift.start?.toISOString() || new Date(new Date().setHours(new Date().getHours() - 8)).toISOString(),
        shift_end: new Date().toISOString(),
        patients_count: todaySummary?.total_patients || 0,
        summary: summaryText,
        incidents,
        pending_tasks: pendingTasks
      });

      if (error) throw new Error(error);

      if (signNow && data) {
        await signShiftReport(data.report_id);
      }

      toast.success('Reporte guardado correctamente');
      endShift(); // Finalizar el turno en el contexto
      router.push('/dashboard/nurse/reports');
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Header Info */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
             <ClipboardCheck className="w-8 h-8 text-teal-600" />
             Entrega de Turno
          </h2>
          <p className="text-sm text-gray-500 font-medium mt-1">
            {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-4">
           <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-2xl border border-gray-100 dark:border-gray-700">
             <span className="text-[10px] font-black text-gray-400 uppercase block tracking-widest">Pacientes</span>
             <span className="text-xl font-black text-teal-600">{todaySummary?.total_patients || 0}</span>
           </div>
           <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-2xl border border-gray-100 dark:border-gray-700">
             <span className="text-[10px] font-black text-gray-400 uppercase block tracking-widest">Turno</span>
             <span className="text-xl font-black text-teal-600">8h+</span>
           </div>
        </div>
      </div>

      {/* Main Form */}
      <div className="space-y-6">
        {/* Summary */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800">
          <label className="text-sm font-black text-gray-700 dark:text-gray-300 mb-3 block flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-600" />
            Resumen General del Turno
          </label>
          <textarea 
            value={summaryText}
            onChange={(e) => setSummaryText(e.target.value)}
            placeholder="Describe las novedades generales, estado del servicio y pacientes críticos..."
            className="w-full min-h-[120px] p-4 text-sm bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all resize-none"
          />
        </div>

        {/* Incidents Section */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800">
          <label className="text-sm font-black text-gray-700 dark:text-gray-300 mb-4 block flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Novedades e Incidentes
          </label>
          
          <div className="space-y-4 mb-6">
            {incidents.map((inc, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold bg-white dark:bg-gray-900 px-2 py-1 rounded-lg border">{inc.time}</span>
                  <div className="text-sm">
                    <span className={cn(
                      "text-[10px] font-black uppercase mr-2",
                      inc.severity === 'high' ? "text-red-600" : inc.severity === 'medium' ? "text-amber-600" : "text-blue-600"
                    )}>
                      [{inc.severity}]
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">{inc.description}</span>
                  </div>
                </div>
                <button onClick={() => setIncidents(incidents.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-3">
             <input 
               type="time" 
               value={newIncident.time}
               onChange={(e) => setNewIncident({...newIncident, time: e.target.value})}
               className="bg-gray-50 dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 text-sm outline-none w-full md:w-32" 
             />
             <input 
               type="text"
               placeholder="Descripción del incidente..."
               value={newIncident.description || ''}
               onChange={(e) => setNewIncident({...newIncident, description: e.target.value})}
               className="flex-1 bg-gray-50 dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 text-sm outline-none" 
             />
             <select 
               value={newIncident.severity}
               onChange={(e) => setNewIncident({...newIncident, severity: e.target.value as any})}
               className="bg-gray-50 dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 text-sm outline-none"
             >
               <option value="low">Baja</option>
               <option value="medium">Media</option>
               <option value="high">Alta</option>
             </select>
             <button 
               type="button"
               onClick={addIncident}
               className="bg-teal-600 text-white p-2.5 rounded-xl hover:bg-teal-700 transition-all flex items-center justify-center"
             >
               <Plus className="w-5 h-5" />
             </button>
          </div>
        </div>

        {/* Pending Tasks Section */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800">
          <label className="text-sm font-black text-gray-700 dark:text-gray-300 mb-4 block flex items-center gap-2">
            <History className="w-4 h-4 text-blue-500" />
            Pendientes para el Siguiente Turno
          </label>

          <div className="space-y-4 mb-6">
            {pendingTasks.map((task, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-900 flex items-center justify-center">
                    <TrendingUp className={cn("w-4 h-4", task.priority === 'urgent' ? "text-red-500" : "text-blue-500")} />
                  </div>
                  <div className="text-sm">
                    <p className="font-bold text-gray-900 dark:text-white">{task.patient_name}</p>
                    <p className="text-gray-500">{task.description}</p>
                  </div>
                </div>
                <button onClick={() => setPendingTasks(pendingTasks.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-3">
             <input 
               type="text"
               placeholder="Nombre del paciente..."
               value={newPendingTask.patient_name || ''}
               onChange={(e) => setNewPendingTask({...newPendingTask, patient_name: e.target.value})}
               className="bg-gray-50 dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 text-sm outline-none w-full md:w-48" 
             />
             <input 
               type="text"
               placeholder="Tarea pendiente (ej: Repetir laboratorios)..."
               value={newPendingTask.description || ''}
               onChange={(e) => setNewPendingTask({...newPendingTask, description: e.target.value})}
               className="flex-1 bg-gray-50 dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 text-sm outline-none" 
             />
             <select 
               value={newPendingTask.priority}
               onChange={(e) => setNewPendingTask({...newPendingTask, priority: e.target.value as any})}
               className="bg-gray-50 dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 text-sm outline-none"
             >
               <option value="routine">Rutina</option>
               <option value="urgent">Urgente</option>
             </select>
             <button 
               type="button"
               onClick={addPendingTask}
               className="bg-teal-600 text-white p-2.5 rounded-xl hover:bg-teal-700 transition-all flex items-center justify-center"
             >
               <Plus className="w-5 h-5" />
             </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col md:flex-row items-center gap-4 pt-4">
           <div className="flex items-center gap-3 p-4 bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/30 rounded-2xl flex-1">
             <Clock className="w-5 h-5 text-teal-600" />
             <div className="text-[10px] text-teal-800 dark:text-teal-400 font-bold leading-tight">
               Al confirmar, tu turno se marcará como FINALIZADO y no podrás editar este reporte a menos que lo guardes como borrador.
             </div>
           </div>
           
           <div className="flex gap-3 w-full md:w-auto">
             <button 
               disabled={loading}
               onClick={() => handleSubmit(false)}
               className="flex-1 md:flex-none px-8 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-black rounded-2xl hover:bg-gray-50 transition-all"
             >
               Guardar Borrador
             </button>
             <button 
               disabled={loading}
               onClick={() => handleSubmit(true)}
               className="flex-1 md:flex-none px-10 py-3 bg-teal-600 text-white font-black rounded-2xl hover:bg-teal-700 transition-all shadow-xl shadow-teal-500/20 flex items-center justify-center gap-2"
             >
               {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
               Firmar y Entregar
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
