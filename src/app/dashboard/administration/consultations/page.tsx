'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Search, Calendar, Clock, Activity, CheckCircle2, ChevronRight, User } from 'lucide-react';
import Link from 'next/link';

interface Consultation {
  id: string;
  patient_id: string;
  specialist_id: string;
  appointment_id: string;
  status: string;
  consultation_date: string;
  start_time: string;
  
  // Joined
  patients: { first_name: string; last_name: string };
  specialists: { first_name: string; last_name: string; role: string; inpres_sax: string };
  appointments: { appointment_type: string; clinic_services?: { name: string } };
}

export default function AdministrationConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchConsultations();
  }, [statusFilter]);

  const fetchConsultations = async () => {
    try {
      setIsLoading(true);
      const url = new URL('/api/administration/consultations', window.location.origin);
      if (statusFilter) url.searchParams.append('status', statusFilter);
      
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

  const filteredConsultations = consultations.filter(c => 
    c.patients.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.patients.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.specialists.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.specialists.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.specialists.inpres_sax.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EN_CURSO': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'COMPLETADA': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'CANCELADA': return 'bg-rose-50 text-rose-600 border-rose-200';
      case 'PROGRAMADA': default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-8 animate-in fade-in duration-500">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500" />
        <div className="pl-4">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Activity className="w-7 h-7 text-indigo-600" />
            Registro de Consultas Clínicas
          </h1>
          <p className="text-slate-500 mt-1 max-w-xl">
            Historial centralizado de todos los encuentros médicos y procedimientos realizados.
          </p>
        </div>
      </div>

      {/* Utilities / Filters */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative w-full md:max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar por paciente, especialista o INPRES..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 transition-shadow"
          />
        </div>
        <div className="w-full md:w-auto flex items-center gap-2">
           <select
             value={statusFilter}
             onChange={(e) => setStatusFilter(e.target.value)}
             className="w-full md:w-auto bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
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
        <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No hay consultas registradas</h3>
          <p className="text-slate-500 max-w-md mt-2">
            Aún no existen registros de consultas para los filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredConsultations.map((consultation) => (
             <Link 
                key={consultation.id} 
                href={`/dashboard/administration/consultations/${consultation.id}`}
                className="group bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-indigo-100 transition-all flex flex-col justify-between gap-6"
             >
                <div className="flex justify-between items-start">
                   <div>
                     <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                       {consultation.appointments.clinic_services?.name || consultation.appointments.appointment_type.replace('_', ' ')}
                     </p>
                     <h3 className="font-black text-slate-900 text-xl flex items-center gap-2">
                        {consultation.patients.first_name} {consultation.patients.last_name}
                     </h3>
                   </div>
                   <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getStatusColor(consultation.status)}`}>
                     {consultation.status.replace('_', ' ')}
                   </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 flex flex-col sm:flex-row gap-4 sm:gap-6 border border-slate-100 group-hover:bg-indigo-50/50 transition-colors">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Profesional</p>
                        <p className="text-sm font-bold text-slate-700">Dr. {consultation.specialists.last_name}</p>
                      </div>
                   </div>

                   <div className="hidden sm:block w-px bg-slate-200" />

                   <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha</p>
                        <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" /> 
                          {new Date(`${consultation.consultation_date}T00:00:00`).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hora</p>
                        <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> 
                          {consultation.start_time ? consultation.start_time.substring(0,5) : '--:--'}
                        </p>
                      </div>
                   </div>
                   
                   <div className="ml-auto flex items-center justify-center self-center text-slate-300 group-hover:text-indigo-600 transition-colors">
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
