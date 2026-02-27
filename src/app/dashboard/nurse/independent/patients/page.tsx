'use client';

import { useState, useEffect } from 'react';
import { useNurseState } from '@/context/NurseContext';
import { Search, Filter, Phone, Mail, MoreVertical, FileText, ArrowRight, Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getIndependentPatients } from '@/lib/supabase/nurse.service';
import PatientSearchModal from '@/components/nurse/PatientSearchModal';
import { cn } from '@/lib/utils';

export default function NurseIndependentPatientsPage() {
  const router = useRouter();
  const { nurseProfile } = useNurseState();
  const [searchTerm, setSearchTerm] = useState('');
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadSummary = async (patientId: string, isUnreg: boolean, name: string) => {
    try {
      setDownloadingId(patientId);
      const res = await fetch(`/api/nurse/patient-summary?patientId=${patientId}&isUnreg=${isUnreg}`);
      if (!res.ok) throw new Error('Error al generar resumen');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Resumen_${name.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error(error);
      alert('Hubo un error al generar el resumen del paciente.');
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    async function fetchPatients() {
      if (!nurseProfile?.user_id) return;
      try {
        const data = await getIndependentPatients(nurseProfile.user_id);
        setPatientsList(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPatients();
  }, [nurseProfile?.user_id]);

  const filteredPatients = patientsList.filter(p => {
    const fn = p.first_name || '';
    const ln = p.last_name || '';
    const nameStr = `${fn} ${ln}`.toLowerCase();
    const motiveStr = (p.motive || 'Atención Independiente').toLowerCase();
    return nameStr.includes(searchTerm.toLowerCase()) || motiveStr.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Mis Pacientes
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gestiona los pacientes a tu cargo y revisa sus historiales.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Nuevo Paciente
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar paciente o diagnóstico..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 focus:bg-white dark:focus:bg-gray-800 focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900/20 outline-none transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors w-full sm:w-auto justify-center">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filtrar</span>
          </button>
        </div>

        {/* List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-sm">
                <th className="p-4 font-medium">Paciente</th>
                <th className="p-4 font-medium">Diagnóstico / Motivo</th>
                <th className="p-4 font-medium">Contacto</th>
                <th className="p-4 font-medium">Estado</th>
                <th className="p-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient, idx) => (
                  <motion.tr 
                    key={patient.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                  >
                    <td className="p-4">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{patient.first_name} {patient.last_name}</p>
                        <p className="text-sm text-gray-500">{patient.identification || 'Sin DNI'}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">{patient.motive || 'Atención Independiente'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Adicionado: {new Date(patient.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                          <Phone className="w-3.5 h-3.5" /> {patient.phone}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2.5 py-1 text-[10px] font-black uppercase rounded-full tracking-wider",
                        patient.is_registered 
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" 
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      )}>
                        {patient.is_registered ? 'Clínica' : 'Independiente'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleDownloadSummary(patient.id, !patient.is_registered, `${patient.first_name} ${patient.last_name}`)}
                          disabled={downloadingId === patient.id}
                          className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors disabled:opacity-50" 
                          title="Descargar Resumen"
                        >
                          {downloadingId === patient.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                        </button>
                        <Link href={`/dashboard/nurse/patient/${patient.id}?isUnreg=${!patient.is_registered}`} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Ir a Panel de Paciente">
                          <ArrowRight className="w-5 h-5" />
                        </Link>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    No se encontraron pacientes que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PatientSearchModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onPatientSelected={(id, isUnreg) => {
          // Si el paciente acaba de ser creado o buscado, podemos refrescar la lista
          if (nurseProfile?.user_id) {
            getIndependentPatients(nurseProfile.user_id).then(setPatientsList);
          }
          router.push(`/dashboard/nurse/patient/${id}?isUnreg=${isUnreg ? 'true' : 'false'}`);
        }} 
      />
    </div>
  );
}
