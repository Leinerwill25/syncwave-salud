'use client';
// src/app/dashboard/nurse/reports/page.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNurseState } from '@/context/NurseContext';
import { getShiftReports } from '@/lib/supabase/nurse.service';
import type { ShiftReport } from '@/types/nurse.types';
import { 
  FileText, 
  Plus, 
  Search, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Download,
  AlertCircle,
  Loader2,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { toast } from 'sonner';

import { generateShiftReportDoc } from '@/lib/utils/nurse-report-generator';

export default function ReportsPage() {
  const { nurseProfile } = useNurseState();
  const [reports, setReports] = useState<ShiftReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    if (!nurseProfile) return;
    setLoading(true);
    try {
      const data = await getShiftReports({ nurseId: nurseProfile.nurse_profile_id });
      setReports(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [nurseProfile]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleDownload = async (report: ShiftReport) => {
    setIsDownloading(report.report_id);
    try {
      const blob = await generateShiftReportDoc(report);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_${report.report_type}_${report.report_date}.docx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Documento generado exitosamente');
    } catch (error) {
      console.error(error);
      toast.error('Error al generar el documento');
    } finally {
      setIsDownloading(null);
    }
  };

  const filteredReports = reports.filter(r => 
    r.summary?.toLowerCase().includes(filter.toLowerCase()) ||
    r.report_date.includes(filter)
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
        <p className="mt-4 text-gray-500 font-medium">Cargando historial de reportes...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-teal-600" />
            Control de Turnos
          </h1>
          <p className="text-gray-500 font-medium mt-1">Historial de entregas y reportes de atención</p>
        </div>

        <Link 
          href="/dashboard/nurse/reports/new"
          className="bg-teal-600 hover:bg-teal-700 text-white font-black px-6 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-teal-500/20"
        >
          <Plus className="w-5 h-5" />
          Nuevo Reporte
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Buscar por resumen o fecha..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm"
          />
        </div>
        <button className="px-5 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl text-gray-500 font-bold flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm">
          <Filter className="w-4 h-4" />
          Filtros Avanzados
        </button>
      </div>

      {/* Content */}
      {filteredReports.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-20 flex flex-col items-center text-center shadow-sm">
           <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-6">
             <FileText className="w-10 h-10 text-gray-300" />
           </div>
           <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No se encontraron reportes</h3>
           <p className="text-gray-500 max-w-sm">
             {filter ? 'No hay reportes que coincidan con tu búsqueda.' : 'Aún no has generado ningún reporte de turno o atención.'}
           </p>
        </div>
      ) : (
        <div className="grid gap-4">
           {filteredReports.map((report) => (
             <div 
               key={report.report_id}
               className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 hover:border-teal-100 dark:hover:border-teal-900/30 transition-all shadow-sm group"
             >
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                 <div className="flex items-start gap-4">
                   <div className={cn(
                     "w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105",
                     report.signed_at ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                   )}>
                     <FileText className="w-7 h-7" />
                   </div>
                   <div className="space-y-1">
                     <div className="flex items-center gap-3">
                       <h3 className="text-lg font-black text-gray-900 dark:text-white">
                         Reporte de {report.report_type === 'shift_report' ? 'Turno' : 'Atención'}
                       </h3>
                       {report.signed_at ? (
                         <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">
                           <CheckCircle2 className="w-3 h-3" /> Firmado
                         </span>
                       ) : (
                         <span className="flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase">
                           <Clock className="w-3 h-3" /> Borrador
                         </span>
                       )}
                     </div>
                     <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {format(new Date(report.report_date), "d 'de' MMMM, yyyy", { locale: es })}
                        </span>
                        <span className="flex items-center gap-1.5 text-teal-600 font-bold">
                          {report.patients_count} Pacientes Atendidos
                        </span>
                     </div>
                   </div>
                 </div>

                 <div className="flex items-center gap-2">
                    <button className="flex-1 md:flex-none px-4 py-2 text-sm font-bold text-gray-600 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/10 rounded-xl transition-all flex items-center justify-center gap-2">
                      Ver Detalle
                    </button>
                    <button 
                      onClick={() => handleDownload(report)}
                      disabled={isDownloading === report.report_id}
                      className="p-2 text-gray-400 hover:text-teal-600 rounded-xl transition-all disabled:opacity-50"
                    >
                      {isDownloading === report.report_id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                    </button>
                 </div>
               </div>

               {report.summary && (
                 <div className="mt-6 pt-6 border-t border-gray-50 dark:border-gray-800">
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 italic">
                      "{report.summary}"
                    </p>
                 </div>
               )}
             </div>
           ))}
        </div>
      )}

      {/* Info Card */}
      <div className="p-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-[2rem] flex gap-4">
        <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
        <div>
          <h4 className="text-sm font-black text-blue-900 dark:text-blue-400 mb-1 uppercase tracking-tight">Legal y Protocolo</h4>
          <p className="text-xs text-blue-800/80 dark:text-blue-500/80 leading-relaxed font-medium">
            Los reportes aquí generados constituyen un documento legal de la atención brindada. Asegúrese de que toda la información crítica esté contenida antes de la firma digital. Los registros firmados no pueden ser modificados.
          </p>
        </div>
      </div>
    </div>
  );
}
