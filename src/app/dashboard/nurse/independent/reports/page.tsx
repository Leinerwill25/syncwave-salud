'use client';

import { useState, useEffect } from 'react';
import { useNurseState } from '@/context/NurseContext';
import { Search, Download, FileText, Calendar, Filter, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createSupabaseBrowserClient } from '@/app/adapters/client';

export default function NurseIndependentReportsPage() {
  const { nurseProfile } = useNurseState();
  const [searchTerm, setSearchTerm] = useState('');
  const [shiftReports, setShiftReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      if (!nurseProfile?.user_id) return;
      const supabase = createSupabaseBrowserClient();
      try {
        const { data, error } = await supabase
          .from('nurse_shift_reports')
          .select('*')
          .eq('nurse_id', nurseProfile.user_id)
          .eq('report_type', 'independent_care_report')
          .order('report_date', { ascending: false });

        if (error) throw error;
        setShiftReports(data || []);
      } catch (err: any) {
        toast.error('Error cargando reportes: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, [nurseProfile?.user_id]);

  const handleDownload = (id: string, date: string) => {
    // Aquí iría la llamada a la API local de generación
    toast.success(`Iniciando descarga del reporte ${date}...`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Mis Reportes
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Histórico de jornadas y reportes de atención independiente.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors font-medium">
          <Calendar className="w-4 h-4" />
          Filtrar por Mes
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por fecha (YYYY-MM-DD)..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 focus:bg-white dark:focus:bg-gray-800 focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900/20 outline-none transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-sm">
                <th className="p-4 font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Fecha
                </th>
                <th className="p-4 font-medium">Atenciones</th>
                <th className="p-4 font-medium">Procedimientos</th>
                <th className="p-4 font-medium">Estado</th>
                <th className="p-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {shiftReports.map((report) => {
                const start = new Date(report.shift_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const end = new Date(report.shift_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const date = new Date(report.report_date).toLocaleDateString();

                return (
                <tr key={report.report_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">Reporte — {date}</p>
                        <p className="text-sm text-gray-500">Jornada: {start} - {end}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{report.patients_count}</span>
                    <span className="text-sm text-gray-500 ml-1">pacientes</span>
                  </td>
                  <td className="p-4">
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{report.procedures?.length || 0}</span>
                    <span className="text-sm text-gray-500 ml-1">procs. (estimados)</span>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {report.status || 'Completado'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleDownload(report.report_id, date)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors shadow-sm"
                      >
                        <Download className="w-4 h-4" />
                        PDF
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
