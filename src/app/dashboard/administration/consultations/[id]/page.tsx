'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  ArrowLeft, 
  Loader2, 
  Calendar, 
  Clock, 
  User, 
  Activity,
  Microscope,
  Stethoscope,
  Pill,
  Download
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdministrationConsultationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [consultation, setConsultation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchConsultation() {
      try {
        const resolvedParams = await params;
        const res = await fetch(`/api/administration/consultations/${resolvedParams.id}`);
        if (!res.ok) throw new Error('Consulta no encontrada');
        const data = await res.json();
        setConsultation(data);
      } catch (error) {
        console.error('Error fetching consultation details:', error);
        router.push('/dashboard/administration/consultations');
      } finally {
        setIsLoading(false);
      }
    }

    fetchConsultation();
  }, [params, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!consultation) return null;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'EN_CURSO': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'COMPLETADA': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CANCELADA': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'PROGRAMADA': default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <Link href="/dashboard/administration/consultations" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Volver a Registro de Consultas
          </Link>
          <div className="flex items-center gap-3">
             <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
               Expediente Clínico
             </h1>
             <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${getStatusStyle(consultation.status)}`}>
               {consultation.status.replace('_', ' ')}
             </span>
          </div>
          <p className="text-slate-500 mt-2 text-lg">
            Revisión de la atención brindada a <span className="font-bold text-slate-700">{consultation.patient.firstName} {consultation.patient.lastName}</span>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: Metadatos y Equipo */}
        <div className="space-y-6">
          
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2 border-b pb-3">
               <Calendar className="w-4 h-4" /> Fecha y Hora
             </h3>
             <div className="space-y-4">
               <div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha Programada</p>
                 <p className="font-bold text-slate-900 text-lg">{new Date(`${consultation.consultation_date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inicio (Aprox)</p>
                   <p className="font-medium text-slate-700 flex items-center gap-1"><Clock className="w-4 h-4" /> {consultation.start_time ? consultation.start_time.substring(0,5) : '--:--'}</p>
                 </div>
                 <div>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fin (Aprox)</p>
                   <p className="font-medium text-slate-700 flex items-center gap-1"><Clock className="w-4 h-4" /> {consultation.end_time ? consultation.end_time.substring(0,5) : '--:--'}</p>
                 </div>
               </div>
             </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2 border-b pb-3 relative z-10">
               <User className="w-4 h-4" /> Equipo a Cargo
             </h3>
             <div className="space-y-6 relative z-10">
                <div className="flex items-start gap-4">
                   <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0">
                      {consultation.specialists.first_name[0]}{consultation.specialists.last_name[0]}
                   </div>
                   <div>
                      <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Especialista Principal</p>
                      <p className="font-bold text-slate-900">Dr(a). {consultation.specialists.first_name} {consultation.specialists.last_name}</p>
                      <p className="text-sm text-slate-500">Especialidad: {consultation.specialists.role}</p>
                      <p className="text-xs text-slate-400 mt-0.5">INPRES: {consultation.specialists.inpres_sax}</p>
                   </div>
                </div>

                {consultation.nurses && (
                  <div className="flex items-start gap-4 pt-4 border-t border-slate-50">
                     <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-black text-sm shrink-0">
                        {consultation.nurses.first_name[0]}{consultation.nurses.last_name[0]}
                     </div>
                     <div>
                        <p className="text-xs font-bold text-teal-500 uppercase tracking-wider">Enfermería Asignada</p>
                        <p className="font-bold text-slate-900">{consultation.nurses.first_name} {consultation.nurses.last_name}</p>
                     </div>
                  </div>
                )}
             </div>
          </div>

        </div>

        {/* Columna Derecha: Detalles Clínicos */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Evolucion SOAP */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
             <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2 border-b pb-4">
               <Activity className="w-6 h-6 text-indigo-600" /> Evaluación Clínica (Notas Clínicas)
             </h3>

             <div className="space-y-6">
                <div>
                   <h4 className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">
                     Notas Compartidas (Progreso / Evolución)
                   </h4>
                   {consultation.shared_notes ? (
                     <div className="bg-slate-50 border border-slate-100 text-slate-700 p-5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap">
                       {consultation.shared_notes}
                     </div>
                   ) : (
                     <p className="text-slate-500 italic bg-slate-50 p-4 rounded-xl text-sm text-center border border-dashed border-slate-200">
                        No se han registrado notas de evolución para esta consulta.
                     </p>
                   )}
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Inventario Utilizado */}
             <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
               <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 border-b pb-3">
                 <Stethoscope className="w-4 h-4" /> Materiales / Recetas
               </h3>
               {consultation.inventory_assignments && consultation.inventory_assignments.length > 0 ? (
                 <ul className="space-y-3">
                   {consultation.inventory_assignments.map((assignment: any) => (
                     <li key={assignment.id} className="flex items-center justify-between text-sm p-3 bg-slate-50 rounded-xl">
                       <div className="flex items-center gap-3 font-medium text-slate-700">
                          {assignment.medication_id ? <Pill className="w-4 h-4 text-indigo-500" /> : <Microscope className="w-4 h-4 text-teal-500" />}
                          {assignment.inventory_medications?.name || assignment.inventory_materials?.name}
                       </div>
                       <span className="font-black text-slate-900">Cant: {assignment.quantity_assigned}</span>
                     </li>
                   ))}
                 </ul>
               ) : (
                  <p className="text-slate-400 italic text-sm text-center py-4">Sin entregas de inventario registradas.</p>
               )}
             </div>

             {/* Documentos Adjuntos */}
             <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
               <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 border-b pb-3">
                 <FileText className="w-4 h-4" /> Documentos Adjuntos
               </h3>
               {consultation.clinical_documents && consultation.clinical_documents.length > 0 ? (
                 <ul className="space-y-3">
                   {consultation.clinical_documents.map((doc: any) => (
                     <li key={doc.id} className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl border border-blue-100 hover:bg-blue-50 transition-colors">
                       <div className="flex flex-col">
                          <span className="font-bold text-blue-900 text-sm truncate max-w-[150px]">{doc.file_name}</span>
                          <span className="text-xs text-blue-600 font-medium">{doc.document_type || 'Documento Médico'}</span>
                       </div>
                       <button className="p-2 bg-white text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-colors border border-blue-200 shadow-sm">
                         <Download className="w-4 h-4" />
                       </button>
                     </li>
                   ))}
                 </ul>
               ) : (
                  <p className="text-slate-400 italic text-sm text-center py-4">Sin documentos subidos en esta consulta.</p>
               )}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
