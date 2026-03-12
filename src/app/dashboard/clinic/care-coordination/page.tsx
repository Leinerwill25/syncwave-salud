
'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Activity, 
  ArrowLeft, 
  Search, 
  Filter, 
  Calendar, 
  ShieldCheck,
  Zap,
  LayoutGrid,
  Link2,
  TrendingUp,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import CareTeamConnector from '@/components/clinic/care/CareTeamConnector';
import PatientTeamGrid from '@/components/clinic/care/PatientTeamGrid';
import { useRouter } from 'next/navigation';

export default function CareCoordinationPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'connect' | 'grid' | 'status'>('connect');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    patients: any[];
    professionals: any[];
    assignments: any[];
    statuses: any[];
  }>({
    patients: [],
    professionals: [],
    assignments: [],
    statuses: []
  });

  const fetchData = async () => {
    try {
      const resp = await fetch('/api/clinic/assignments');
      const json = await resp.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (err: any) {
      toast.error('Error al cargar datos de coordinación');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssign = async (patientId: string, isUnreg: boolean, profId: string, role: string) => {
    try {
      const resp = await fetch('/api/clinic/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          isUnregistered: isUnreg,
          professionalId: profId,
          professionalRole: role,
          action: 'ASSIGN'
        })
      });
      const json = await resp.json();
      if (json.error) throw new Error(json.error);
      
      toast.success('Profesional asignado correctamente. Notificación enviada.');
      await fetchData();
    } catch (err: any) {
      toast.error(`Error de asignación: ${err.message}`);
    }
  };

  const handleRemove = async (patientId: string, isUnreg: boolean, profId: string) => {
    try {
      const resp = await fetch('/api/clinic/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          isUnregistered: isUnreg,
          professionalId: profId,
          action: 'REMOVE'
        })
      });
      const json = await resp.json();
      if (json.error) throw new Error(json.error);
      
      toast.success('Asignación removida.');
      await fetchData();
    } catch (err: any) {
      toast.error(`Error al remover: ${err.message}`);
    }
  };

  const handleUpdateStatus = async (patientId: string, isUnreg: boolean, status: string, complexity?: string) => {
    try {
      const resp = await fetch('/api/clinic/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          isUnregistered: isUnreg,
          action: 'STATUS_UPDATE',
          overallStatus: status,
          complexityLevel: complexity
        })
      });
      const json = await resp.json();
      if (json.error) throw new Error(json.error);
      
      toast.success('Estado actualizado.');
      await fetchData();
    } catch (err: any) {
      toast.error(`Error al actualizar: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-black text-slate-800 uppercase tracking-widest">Cargando Módulo de Coordinación...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Header Premium */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-8 h-24 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => router.back()}
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Coordinación de Cuidados</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Gestión Interactiva de Equipos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-[22px]">
            {[
              { id: 'connect', icon: Link2, label: 'Asignar' },
              { id: 'grid', icon: LayoutGrid, label: 'Equipos' },
              { id: 'status', icon: Activity, label: 'Estados' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-[18px] text-[11px] font-black uppercase tracking-wider transition-all",
                  activeTab === tab.id 
                    ? "bg-white text-teal-600 shadow-xl shadow-teal-500/10" 
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-2xl flex items-center gap-3 shadow-lg shadow-teal-500/20">
               <Zap className="w-4 h-4" />
               <span className="text-[11px] font-bold uppercase">Actividad en Vivo</span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-8 py-10 space-y-10">
        
        {activeTab === 'connect' && (
          <div className="space-y-6">
            <div className="flex items-end justify-between">
               <div>
                  <h2 className="text-3xl font-black text-slate-800">Conector Interactivo</h2>
                  <p className="text-sm text-slate-500 font-medium">Arrastra un paciente hacia la derecha para asignarle un profesional.</p>
               </div>
               <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 bg-teal-500 rounded-full" />
                    <span className="text-[10px] font-black text-slate-400 uppercase">Médico</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 bg-indigo-500 rounded-full" />
                    <span className="text-[10px] font-black text-slate-400 uppercase">Enfermería</span>
                  </div>
               </div>
            </div>
            <CareTeamConnector 
              patients={data.patients}
              professionals={data.professionals}
              assignments={data.assignments}
              onAssign={handleAssign}
              onRemove={handleRemove}
            />
          </div>
        )}

        {activeTab === 'grid' && (
           <div className="space-y-8">
             <div className="flex items-center justify-between">
               <h2 className="text-3xl font-black text-slate-800">Equipos de Cuidado</h2>
               <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Buscar equipo..." 
                      className="pl-11 pr-5 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-medium outline-none focus:border-teal-500 transition-all w-64"
                    />
                  </div>
                  <button className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-500 hover:bg-slate-50">
                    <Filter className="w-5 h-5" />
                  </button>
               </div>
             </div>
             <PatientTeamGrid 
               patients={data.patients}
               professionals={data.professionals}
               assignments={data.assignments}
               onRemove={handleRemove}
             />
           </div>
        )}

        {activeTab === 'status' && (
          <div className="space-y-8">
             <h2 className="text-3xl font-black text-slate-800">Estado de Pacientes</h2>
             
             <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/20">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Paciente</th>
                      <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Estado Clínica</th>
                      <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Última Atención</th>
                      <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Complejidad</th>
                      <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.patients.map(patient => {
                      const status = data.statuses.find(s => s.patient_id === patient.id || s.unregistered_patient_id === patient.id);
                      return (
                        <tr key={patient.id} className="hover:bg-slate-50/30 transition-colors group">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 font-black text-xs">
                                {patient.first_name[0]}{patient.last_name[0]}
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-800">{patient.first_name} {patient.last_name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{patient.identifier}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <select 
                              value={status?.overall_status || 'ACTIVE'}
                              onChange={(e) => handleUpdateStatus(patient.id, patient.type === 'UNREG', e.target.value, status?.complexity_level)}
                              className={cn(
                                "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider outline-none border-none cursor-pointer",
                                status?.overall_status === 'ACTIVE' ? "bg-emerald-50 text-emerald-600" :
                                status?.overall_status === 'CRITICAL' ? "bg-red-50 text-red-600" :
                                status?.overall_status === 'OBSERVATION' ? "bg-orange-50 text-orange-600" :
                                status?.overall_status === 'DISCHARGED' ? "bg-blue-50 text-blue-600" :
                                "bg-slate-100 text-slate-500"
                              )}
                            >
                              <option value="ACTIVE">Activo</option>
                              <option value="OBSERVATION">Observación</option>
                              <option value="CRITICAL">Crítico</option>
                              <option value="DISCHARGED">Alta</option>
                              <option value="INACTIVE">Inactivo</option>
                            </select>
                          </td>
                          <td className="px-8 py-6 text-slate-500 font-bold text-xs">
                               <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-slate-300" />
                                  {status?.last_attention_at ? new Date(status.last_attention_at).toLocaleDateString() : 'Pendiente'}
                               </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-1.5">
                              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((level) => (
                                <button
                                  key={level}
                                  onClick={() => handleUpdateStatus(patient.id, patient.type === 'UNREG', status?.overall_status || 'ACTIVE', level)}
                                  className={cn(
                                    "w-4 h-1.5 rounded-full transition-all",
                                    (status?.complexity_level === level || 
                                     (level === 'LOW' && !status?.complexity_level))
                                      ? "bg-teal-500 scale-y-125" : "bg-slate-100 hover:bg-slate-200"
                                  )}
                                  title={`Complejidad: ${level}`}
                                />
                              ))}
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button className="px-5 py-2 hover:bg-slate-100 rounded-xl text-[10px] font-black text-teal-600 uppercase transition-all">
                              Historial
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
             </div>
          </div>
        )}

      </main>
    </div>
  );
}
