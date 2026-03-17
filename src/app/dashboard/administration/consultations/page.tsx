'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Search, Calendar, Clock, Activity, CheckCircle2, ChevronRight, User } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatDateDisplay } from '@/lib/format';

interface Consultation {
  id: string;
  patient_id: string;
  specialist_id: string;
  appointment_id: string;
  status: string;
  consultation_date: string;
  start_time: string;
  
  // Joined
  patient: { firstName: string; lastName: string };
  specialists: { first_name: string; last_name: string; role: string; inpres_sax: string };
  admin_appointments: { appointment_type: string; admin_clinic_services?: { name: string } };
}

export default function AdministrationConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const searchParams = useSearchParams();
  const patientIdFilter = searchParams.get('patient_id');

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchConsultations();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [statusFilter, patientIdFilter, searchTerm]);

  const fetchConsultations = async () => {
    try {
      setIsLoading(true);
      const url = new URL('/api/administration/consultations', window.location.origin);
      if (statusFilter) url.searchParams.append('status', statusFilter);
      if (patientIdFilter) url.searchParams.append('patient_id', patientIdFilter);
      if (searchTerm) url.searchParams.append('search', searchTerm);
      
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch consultations');
      const data = await res.json();
      setConsultations(data.data || []);
    } catch (error) {
      console.error('Error fetching consultations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredConsultations = consultations;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EN_CURSO': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'COMPLETADA': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'CANCELADA': return 'bg-rose-50 text-rose-600 border-rose-200';
      case 'PROGRAMADA': default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-4 md:space-y-8 animate-in fade-in duration-500 max-w-screen overflow-x-hidden pb-10">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 md:w-2 h-full bg-indigo-500" />
        <div className="pl-3 md:pl-4">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 md:gap-3">
            <Activity className="w-6 h-6 md:w-7 md:h-7 text-indigo-600" />
            Registro de Consultas
          </h1>
          <p className="text-slate-500 mt-1 text-xs md:text-sm max-w-xl">
            Historial de encuentros médicos y procedimientos realizados.
          </p>
        </div>
      </div>

      {/* Utilities / Filters */}
      <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 bg-white p-3 md:p-4 rounded-xl md:rounded-2xl shadow-sm border border-slate-100">
        <div className="relative w-full md:max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar paciente, especialista..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 md:pl-10 pr-4 py-2.5 md:py-3 bg-slate-50 border-none rounded-xl text-xs md:text-sm outline-none focus:ring-2 focus:ring-indigo-100 transition-shadow"
          />
        </div>
        <div className="w-full md:w-auto">
           <select
             value={statusFilter}
             onChange={(e) => setStatusFilter(e.target.value)}
             className="w-full md:w-auto bg-slate-50 border-none rounded-xl px-4 py-2.5 md:py-3 text-xs md:text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer uppercase tracking-tighter"
           >
             <option value="">Todos los Estados</option>
             <option value="PROGRAMADA">Programadas</option>
             <option value="EN_CURSO">En Curso</option>
             <option value="COMPLETADA">Completadas</option>
             <option value="CANCELADA">Canceladas</option>
           </select>
        </div>
      </div>

      {/* List / Grid view */}
      {isLoading ? (
        <div className="space-y-4">
           {[...Array(6)].map((_, i) => (
             <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-pulse h-28" />
           ))}
        </div>
      ) : filteredConsultations.length === 0 ? (
        <div className="bg-white p-8 md:p-12 rounded-2xl md:rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 md:w-10 md:h-10 text-slate-400" />
          </div>
          <h3 className="text-base md:text-lg font-bold text-slate-900 uppercase">No hay consultas</h3>
          <p className="text-slate-500 text-xs md:text-sm mt-2 max-w-sm mx-auto">
            Aún no existen registros de consultas para los filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {filteredConsultations.map((consultation) => (
             <Link 
                key={consultation.id} 
                href={`/dashboard/administration/consultations/${consultation.id}`}
                className="group bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-indigo-100 transition-all flex flex-col justify-between gap-4 md:gap-6"
             >
                <div className="flex justify-between items-start gap-2">
                   <div className="min-w-0 flex-1">
                     <p className="text-[9px] md:text-xs font-black text-indigo-600 uppercase tracking-widest mb-1 md:mb-1.5 truncate">
                       {consultation.admin_appointments.admin_clinic_services?.name || consultation.admin_appointments.appointment_type.replace('_', ' ')}
                     </p>
                     <h3 className="font-black text-slate-900 text-base md:text-xl flex items-center gap-2 truncate uppercase tracking-tighter">
                        {consultation.patient.firstName} {consultation.patient.lastName}
                     </h3>
                   </div>
                   <span className={`px-2.5 py-1 text-[9px] md:text-xs font-black rounded-full border uppercase shrink-0 ${getStatusColor(consultation.status)}`}>
                     {consultation.status.replace('_', ' ')}
                   </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 md:p-4 flex flex-col sm:flex-row gap-3 md:gap-6 border border-slate-100 group-hover:bg-indigo-50/50 transition-colors">
                   <div className="flex items-center gap-2.5 md:gap-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                        <User className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] md:text-xs font-black text-slate-400 uppercase tracking-wider">Profesional</p>
                        <p className="text-xs md:text-sm font-bold text-slate-700 truncate uppercase">Dr. {consultation.specialists.last_name}</p>
                      </div>
                   </div>

                   <div className="hidden sm:block w-px bg-slate-200" />

                   <div className="flex items-center gap-4">
                      <div>
                        <p className="text-[9px] md:text-xs font-black text-slate-400 uppercase tracking-wider">Fecha</p>
                        <p className="text-xs md:text-sm font-medium text-slate-700 flex items-center gap-1.5 uppercase">
                          <Calendar className="w-3 h-3 md:w-3.5 md:h-3.5" /> 
                          {formatDateDisplay(consultation.consultation_date)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] md:text-xs font-black text-slate-400 uppercase tracking-wider">Hora</p>
                        <p className="text-xs md:text-sm font-medium text-slate-700 flex items-center gap-1.5 uppercase">
                          <Clock className="w-3 h-3 md:w-3.5 md:h-3.5" /> 
                          {consultation.start_time ? consultation.start_time.substring(0,5) : '--:--'}
                        </p>
                      </div>
                   </div>
                   
                   <div className="hidden sm:flex ml-auto items-center justify-center self-center text-slate-300 group-hover:text-indigo-600 transition-colors">
                      <ChevronRight className="w-6 h-6" />
                   </div>
                </div>
             </Link>
          ))}
        </div>
      )}
    </div>
  );
}
