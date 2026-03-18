'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, 
  ArrowLeft, 
  Loader2, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  AlertCircle,
  FileText,
  Activity,
  HeartPulse,
  Pill,
  Users,
  X,
  Stethoscope,
  Plus
} from 'lucide-react';
import Link from 'next/link';
import { formatDateDisplay } from '@/lib/format';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface PatientDetail {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone_number: string;
  email: string;
  address: string;
  city: string;
  country: string;
  is_active: boolean;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  allergies: string;
  current_medications: string;
  medical_history: string;
  created_at: string;
  identifier: string;
  type: string;
}

export default function AdminPatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Specialists Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [specialists, setSpecialists] = useState<any[]>([]);
  const [isLoadingSpecialists, setIsLoadingSpecialists] = useState(false);

  useEffect(() => {
    async function fetchPatient() {
      try {
        const resolvedParams = await params;
        const res = await fetch(`/api/administration/patients/${resolvedParams.id}`);
        if (!res.ok) throw new Error('Paciente no encontrado');
        const data = await res.json();
        setPatient(data);
      } catch (error) {
        console.error('Error fetching patient details:', error);
        router.push('/dashboard/administration/patients');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPatient();
  }, [params, router]);

  const handleOpenAssignModal = async () => {
    setIsModalOpen(true);
    setIsLoadingSpecialists(true);
    try {
      const res = await fetch('/api/clinic/assignments');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSpecialists(data.professionals || []);
    } catch (err) {
      toast.error('Error al cargar especialistas');
    } finally {
      setIsLoadingSpecialists(false);
    }
  };

  const handleAssign = async (profId: string, role: string) => {
    if (!patient) return;
    try {
      const res = await fetch('/api/clinic/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          isUnregistered: patient.type === 'UNREG',
          professionalId: profId,
          professionalRole: role,
          action: 'ASSIGN'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Especialista asignado correctamente');
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(`Error al asignar: ${err.message}`);
    }
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!patient) return null;

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <Link href="/dashboard/administration/patients" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Volver a Pacientes
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-blue-500/20">
              {patient.first_name[0]}{patient.last_name[0]}
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                {patient.first_name} {patient.last_name}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${patient.is_active ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                  {patient.is_active ? 'Paciente Activo' : 'Inactivo'}
                </span>
                <span className="text-sm font-medium text-slate-500 flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> Registrado: {new Date(patient.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
            <Link
              href={`/dashboard/administration/patients/${patient.id}/history`}
              className="bg-blue-600 border border-blue-600 text-white hover:bg-blue-700 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-1"
            >
              <Activity className="w-4 h-4" /> Historial Completo
            </Link>
            <Link
              href={`/dashboard/administration/patients/${patient.id}/edit`}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all hover:-translate-y-1"
            >
              <FileText className="w-4 h-4" /> Editar Ficha
            </Link>
           <button 
             onClick={handleOpenAssignModal}
             className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-1"
           >
             <Users className="w-4 h-4" /> Asignar Especialista
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: Info Básica */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2 relative z-10">
               <User className="w-5 h-5 text-blue-600" /> Datos Personales
            </h3>
            <div className="space-y-4 relative z-10">
               <div className="flex items-start gap-3">
                 <div className="p-2 bg-slate-50 rounded-lg text-slate-400 font-bold text-[10px]">ID</div>
                 <div>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Identificación</p>
                   <p className="font-medium text-slate-900">{patient.identifier || 'No registrado'}</p>
                 </div>
               </div>
               <div className="flex items-start gap-3">
                 <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Calendar className="w-4 h-4" /></div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nacimiento</p>
                    <div className="flex items-center gap-2">
                       <p className="font-medium text-slate-900">{formatDateDisplay(patient.date_of_birth)}</p>
                       <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                          {calculateAge(patient.date_of_birth)} años
                       </span>
                    </div>
                  </div>
               </div>
               <div className="flex items-start gap-3">
                 <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Phone className="w-4 h-4" /></div>
                 <div>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Teléfono</p>
                   <p className="font-medium text-slate-900">{patient.phone_number || 'No registrado'}</p>
                 </div>
               </div>
               <div className="flex items-start gap-3">
                 <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Mail className="w-4 h-4" /></div>
                 <div>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email</p>
                   <p className="font-medium text-slate-900 truncate max-w-[200px]">{patient.email || 'No registrado'}</p>
                 </div>
               </div>
               <div className="flex items-start gap-3">
                 <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><MapPin className="w-4 h-4" /></div>
                 <div>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ubicación</p>
                   <p className="font-medium text-slate-900">{patient.address || 'Sin dirección'}</p>
                   {patient.city && patient.country && (
                     <p className="text-sm text-slate-500">{patient.city}, {patient.country}</p>
                   )}
                 </div>
               </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-rose-50 to-red-50 rounded-3xl p-6 shadow-sm border border-rose-100">
             <h3 className="text-lg font-bold text-rose-900 mb-6 flex items-center gap-2">
               <HeartPulse className="w-5 h-5 text-rose-600" /> Emergencia
             </h3>
             {patient.emergency_contact_name ? (
               <div className="space-y-4">
                 <div>
                   <p className="text-xs font-bold text-rose-500 uppercase tracking-widest">Contacto Primario</p>
                   <p className="font-black text-rose-900 text-lg">{patient.emergency_contact_name}</p>
                   <p className="text-sm font-medium text-rose-700">{patient.emergency_contact_relation}</p>
                 </div>
                 <div className="pt-4 border-t border-rose-200/50">
                    <p className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-1">Teléfono</p>
                    <a href={`tel:${patient.emergency_contact_phone}`} className="flex items-center gap-2 font-black text-rose-600 hover:text-rose-800 transition-colors">
                      <Phone className="w-4 h-4" /> {patient.emergency_contact_phone}
                    </a>
                 </div>
               </div>
             ) : (
               <div className="flex items-center gap-3 text-rose-600/70 p-4 bg-white/50 rounded-2xl border border-rose-100 border-dashed">
                 <AlertCircle className="w-5 h-5 flex-shrink-0" />
                 <p className="text-sm font-medium">No se ha registrado un contacto de emergencia.</p>
               </div>
             )}
          </div>
        </div>

        {/* Columna Derecha: Detalles Clínicos */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
             <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2 border-b pb-4">
               <Activity className="w-6 h-6 text-teal-600" /> Expediente Clínico Base
             </h3>

             <div className="space-y-8">
                {/* Alergias */}
                <div>
                   <h4 className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">
                     <AlertCircle className="w-4 h-4 text-amber-500" /> Alergias Conocidas
                   </h4>
                   {patient.allergies ? (
                     <div className="flex flex-wrap gap-2">
                       {patient.allergies.split(',').map((allergy, i) => (
                         <span key={i} className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm font-bold border border-amber-200/50">
                           {allergy.trim()}
                         </span>
                       ))}
                     </div>
                   ) : (
                     <p className="text-slate-500 italic bg-slate-50 p-3 rounded-xl text-sm">Sin alergias registradas</p>
                   )}
                </div>

                {/* Medicación */}
                <div>
                   <h4 className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">
                     <Pill className="w-4 h-4 text-indigo-500" /> Medicación Actual
                   </h4>
                   {patient.current_medications ? (
                     <div className="bg-indigo-50/50 border border-indigo-100 text-slate-700 p-4 rounded-xl text-sm font-medium leading-relaxed">
                       {patient.current_medications}
                     </div>
                   ) : (
                     <p className="text-slate-500 italic bg-slate-50 p-3 rounded-xl text-sm">Sin medicación actual registrada</p>
                   )}
                </div>

                {/* Historial */}
                <div>
                   <h4 className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">
                     <FileText className="w-4 h-4 text-slate-400" /> Antecedentes Relevantes
                   </h4>
                   {patient.medical_history ? (
                     <div className="bg-slate-50 border border-slate-100 text-slate-700 p-5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap">
                       {patient.medical_history}
                     </div>
                   ) : (
                     <p className="text-slate-500 italic bg-slate-50 p-3 rounded-xl text-sm">El historial médico base está vacío.</p>
                   )}
                </div>
             </div>
          </div>

          {/* Navigation Links for feature integrations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Link 
                href={`/dashboard/administration/appointments?patient_id=${patient.id}`}
                className="bg-slate-50 border border-slate-200 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center hover:bg-blue-50 hover:border-blue-200 transition-all group"
             >
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
                </div>
                <h4 className="font-bold text-slate-700">Especialistas Asignados</h4>
                <p className="text-sm text-slate-500 mt-1 mb-4">Ver equipo médico y citas programadas.</p>
                <span className="text-sm font-bold text-blue-600">Ver asignaciones →</span>
             </Link>
             
             <Link 
                href={`/dashboard/administration/consultations?patient_id=${patient.id}`}
                className="bg-slate-50 border border-slate-200 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center hover:bg-indigo-50 hover:border-indigo-200 transition-all group"
             >
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Activity className="w-6 h-6 text-slate-400 group-hover:text-indigo-600" />
                </div>
                <h4 className="font-bold text-slate-700">Historial de Consultas</h4>
                <p className="text-sm text-slate-500 mt-1 mb-4">Registros de visitas y notas clínicas.</p>
                <span className="text-sm font-bold text-blue-600">Ver expediente →</span>
             </Link>
          </div>

        </div>
      </div>

      {/* Assign Specialist Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-blue-600" />
                Asignar Especialista
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              {isLoadingSpecialists ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Cargando especialistas...</p>
                </div>
              ) : specialists.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-slate-500 font-medium">No hay especialistas disponibles en la organización.</p>
                </div>
              ) : (
                specialists.map(prof => (
                  <div key={prof.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-blue-200 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${prof.role === 'MEDICO' ? 'bg-teal-50 text-teal-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        {prof.role === 'MEDICO' ? <Stethoscope className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{prof.full_name}</p>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{prof.role}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleAssign(prof.id, prof.role)}
                      className="px-4 py-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 font-bold text-xs rounded-xl transition-colors"
                    >
                      Asignar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
