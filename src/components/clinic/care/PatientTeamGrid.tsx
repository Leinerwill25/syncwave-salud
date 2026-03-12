
'use client';

import { motion } from 'framer-motion';
import { User, X, Plus, ShieldCheck, Mail, Activity, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  identifier: string;
  type: 'REG' | 'UNREG';
}

interface Professional {
  id: string;
  full_name: string;
  role: 'MEDICO' | 'ENFERMERO';
  email: string;
}

interface Assignment {
  id: string;
  patient_id: string | null;
  unregistered_patient_id: string | null;
  professional_id: string;
  professional_role: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface PatientTeamGridProps {
  patients: Patient[];
  professionals: Professional[];
  assignments: Assignment[];
  onRemove: (patientId: string, isUnreg: boolean, profId: string) => Promise<void>;
}

export default function PatientTeamGrid({ patients, professionals, assignments, onRemove }: PatientTeamGridProps) {
  
  const getPatientTeam = (patientId: string) => {
    return assignments
      .filter(a => (a.patient_id === patientId || a.unregistered_patient_id === patientId) && a.status === 'ACTIVE')
      .map(a => professionals.find(p => p.id === a.professional_id))
      .filter(Boolean) as Professional[];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {patients.map(patient => {
        const team = getPatientTeam(patient.id);
        
        return (
          <motion.div
            key={patient.id}
            layout
            className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-xl shadow-slate-200/20 group hover:border-teal-100 transition-all"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600 transition-all duration-500">
                  <User className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 leading-tight">
                    {patient.first_name} {patient.last_name}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    ID: {patient.identifier || 'S/N'}
                  </p>
                </div>
              </div>
              <div className={cn(
                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter",
                patient.type === 'REG' ? "bg-teal-50 text-teal-600" : "bg-amber-50 text-amber-600"
              )}>
                {patient.type === 'REG' ? 'Registrado' : 'Temporal'}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipo a cargo ({team.length})</p>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                  <Activity className="w-4 h-4" />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {team.map(prof => (
                  <motion.div
                    key={prof.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl border transition-all hover:shadow-md",
                      prof.role === 'MEDICO' 
                        ? "bg-teal-50/30 border-teal-100 text-teal-700" 
                        : "bg-indigo-50/30 border-indigo-100 text-indigo-700"
                    )}
                  >
                    <span className="text-[11px] font-bold">{prof.full_name}</span>
                    <button
                      onClick={() => onRemove(patient.id, patient.type === 'UNREG', prof.id)}
                      className="p-1 hover:bg-white/50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3 h-3 opacity-60 hover:opacity-100 text-red-500" />
                    </button>
                  </motion.div>
                ))}

                {team.length === 0 && (
                  <div className="w-full py-4 px-6 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-center">
                    <p className="text-[10px] font-bold text-slate-400 italic">Sin especialistas asignados</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
               <div className="flex -space-x-2">
                 {team.map(prof => (
                   <div key={prof.id} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                     {prof.full_name.charAt(0)}
                   </div>
                 ))}
               </div>
               <button className="text-[10px] font-black text-teal-600 uppercase hover:underline">Ver Historial</button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
