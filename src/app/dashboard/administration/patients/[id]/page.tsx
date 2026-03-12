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
  Users
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
}

export default function AdminPatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
             href={`/dashboard/administration/patients/${patient.id}/edit`}
             className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all hover:-translate-y-1"
           >
             <FileText className="w-4 h-4" /> Editar Ficha
           </Link>
           {/* In a real app, this would open a modal to assign a specialist or navigate to assignments */}
           <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-1">
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
                 <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Calendar className="w-4 h-4" /></div>
                 <div>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nacimiento</p>
                   <p className="font-medium text-slate-900">{patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : 'No registrado'}</p>
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

          {/* Placeholders for future feature integrations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-slate-50 border border-slate-200 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-3">
                  <Users className="w-6 h-6 text-slate-400" />
                </div>
                <h4 className="font-bold text-slate-700">Especialistas Asignados</h4>
                <p className="text-sm text-slate-500 mt-1 mb-4">Ver equipo médico a cargo.</p>
                <button className="text-sm font-bold text-blue-600 hover:text-blue-700">Ver asignaciones →</button>
             </div>
             
             <div className="bg-slate-50 border border-slate-200 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-3">
                  <Activity className="w-6 h-6 text-slate-400" />
                </div>
                <h4 className="font-bold text-slate-700">Historial de Consultas</h4>
                <p className="text-sm text-slate-500 mt-1 mb-4">Registros de visitas y notas.</p>
                <button className="text-sm font-bold text-blue-600 hover:text-blue-700">Ver expediente →</button>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
