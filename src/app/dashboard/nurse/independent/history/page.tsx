'use client';

import { useState, useEffect } from 'react';
import { useNurseState } from '@/context/NurseContext';
import { Search, Plus, FileText, Image as ImageIcon, Calendar, Stethoscope, Quote, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { getNursePatientRecords, NursePatientRecord } from '@/lib/supabase/nurse-doctors.service';
import Link from 'next/link';

export default function NurseHistoryPage() {
  const { nurseProfile } = useNurseState();
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecords() {
      if (!nurseProfile?.nurse_profile_id) return;
      try {
        const data = await getNursePatientRecords(nurseProfile.nurse_profile_id);
        setRecords(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchRecords();
  }, [nurseProfile?.nurse_profile_id]);

  const filteredRecords = records.filter(rec => {
    const patientName = `${rec.patient?.first_name || ''} ${rec.patient?.last_name || ''}`.toLowerCase();
    const dt = (rec.title || '').toLowerCase();
    return patientName.includes(searchTerm.toLowerCase()) || dt.includes(searchTerm.toLowerCase());
  });

  const getRecordIcon = (type: string) => {
    switch (type) {
      case 'INFORME_DOCTOR': return <Stethoscope className="w-5 h-5 text-indigo-500" />;
      case 'LABORATORIOS': return <ImageIcon className="w-5 h-5 text-amber-500" />;
      case 'REPORTE_ENFERMERIA': return <Quote className="w-5 h-5 text-teal-500" />;
      default: return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'INFORME_DOCTOR': return 'Informe Médico';
      case 'LABORATORIOS': return 'Exámenes / Labs';
      case 'REPORTE_ENFERMERIA': return 'Reporte de Enfermería';
      default: return 'Documento';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-teal-600" /> Historial Médico
          </h1>
          <p className="text-sm text-gray-500">
            Archivos, reportes y evolución clínica de tus pacientes.
          </p>
        </div>
        <Link 
          href="/dashboard/nurse/independent/history/new"
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors font-medium shadow-md shadow-teal-600/20"
        >
          <Plus className="w-4 h-4" />
          Registrar Documento
        </Link>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar por paciente o título..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-teal-100 outline-none transition-all"
          />
        </div>
      </div>

      {/* List */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm">
                <th className="p-4 font-medium">Documento</th>
                <th className="p-4 font-medium">Paciente</th>
                <th className="p-4 font-medium">Doctor Referente</th>
                <th className="p-4 font-medium">Fecha</th>
                <th className="p-4 font-medium text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-500">Cargando historial...</td>
                </tr>
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((rec, idx) => (
                  <motion.tr 
                    key={rec.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-gray-50 transition-colors group"
                  >
                    <td className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                          {getRecordIcon(rec.record_type)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{rec.title}</p>
                          <p className="text-xs font-medium text-teal-600 bg-teal-50 inline-block px-1.5 py-0.5 rounded mt-0.5">
                            {getTypeLabel(rec.record_type)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-gray-800">{rec.patient?.first_name} {rec.patient?.last_name}</p>
                      <p className="text-xs text-gray-500">{rec.patient?.identification || 'Sin DNI'}</p>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-600">
                        {rec.doctor?.doctor_name || <span className="text-gray-400 italic">No Aplica</span>}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(rec.record_date).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {rec.file_url ? (
                        <a href={rec.file_url} target="_blank" rel="noopener noreferrer" className="p-2 inline-flex text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Ver Archivo">
                          <ExternalLink className="w-5 h-5" />
                        </a>
                      ) : (
                        <button className="p-2 inline-flex text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Ver Transcripción" onClick={() => alert(rec.transcription)}>
                          <FileText className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-500">
                    <div className="flex justify-center mb-3">
                      <Quote className="w-8 h-8 text-gray-300" />
                    </div>
                    No se encontraron documentos ni reportes guardados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
