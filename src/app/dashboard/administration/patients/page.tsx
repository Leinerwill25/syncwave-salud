'use client';

import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Trash2, Eye, FileText, Phone } from 'lucide-react';
import Link from 'next/link';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  is_active: boolean;
  date_of_birth?: string;
}

export default function AdministrationPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPatients();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      const url = new URL('/api/administration/patients', window.location.origin);
      if (searchTerm) {
        url.searchParams.append('search', searchTerm);
      }
      
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setPatients(data.data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // No client-side filtering needed anymore
  const filteredPatients = patients;

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-4 md:space-y-8 animate-in fade-in duration-500 max-w-screen overflow-x-hidden">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 md:w-2 h-full bg-blue-500" />
        <div className="pl-3 md:pl-4">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 md:gap-3">
            <Users className="w-6 h-6 md:w-7 md:h-7 text-blue-600" />
            Directorio de Pacientes
          </h1>
          <p className="text-slate-500 mt-1 text-xs md:text-sm max-w-xl">
            Base de datos de pacientes, historiales y asignaciones.
          </p>
        </div>
        <Link
          href="/dashboard/administration/patients/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 md:px-6 py-2.5 md:py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95 text-sm md:text-base"
        >
          <Plus className="w-4 h-4 md:w-5 md:h-5" />
          Registrar Paciente
        </Link>
      </div>

      {/* Utilities / Filters */}
      <div className="flex items-center gap-4 bg-white p-3 md:p-4 rounded-xl md:rounded-2xl shadow-sm border border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar paciente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 md:pl-10 pr-4 py-2.5 md:py-3 bg-slate-50 border-none rounded-xl text-xs md:text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-shadow"
          />
        </div>
      </div>

      {/* List / Grid view */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
           {[...Array(6)].map((_, i) => (
             <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-pulse h-48" />
           ))}
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="bg-white p-8 md:p-12 rounded-2xl md:rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 md:w-10 md:h-10 text-slate-400" />
          </div>
          <h3 className="text-base md:text-lg font-bold text-slate-900">No hay pacientes</h3>
          <p className="text-slate-500 text-xs md:text-sm max-w-md mt-2">
            No hay registros que coincidan con tu búsqueda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 pb-4">
          {filteredPatients.map((patient) => (
            <div key={patient.id} className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 relative group flex flex-col">
              <div className="absolute top-4 right-4 md:top-6 md:right-6 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex gap-2">
                 <button className="p-1.5 md:p-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg transition-colors">
                   <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                 </button>
              </div>

              <div className="flex items-start gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-400 text-white flex items-center justify-center text-lg md:text-xl font-bold shadow-lg shadow-blue-500/20 flex-shrink-0">
                  {patient.first_name[0]}{patient.last_name[0]}
                </div>
                <div className="min-w-0 pr-6">
                  <h3 className="font-bold text-slate-900 text-base md:text-lg leading-tight truncate">
                    {patient.first_name} {patient.last_name}
                  </h3>
                  <p className="text-slate-500 text-[10px] md:text-sm mt-1 truncate">
                    {patient.email || 'Sin correo registrado'}
                  </p>
                </div>
              </div>

              <div className="space-y-2 md:space-y-3 pt-3 md:pt-4 border-t border-slate-100 flex-1">
                <div className="flex justify-between items-center text-[11px] md:text-sm">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium"><Phone className="w-3.5 h-3.5" /> Teléfono</span>
                  <span className="font-bold text-slate-700 uppercase">{patient.phone_number || '-'}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] md:text-sm">
                  <span className="text-slate-500 font-medium">Estado</span>
                  <span className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[9px] md:text-xs font-black uppercase ${patient.is_active ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                    {patient.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>

              <div className="mt-5 md:mt-6 pt-4 md:pt-4 border-t border-slate-50 grid grid-cols-2 gap-2 md:gap-3">
                <Link 
                  href={`/dashboard/administration/patients/${patient.id}`}
                  className="flex items-center justify-center gap-2 py-2 md:py-2.5 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors font-bold text-[10px] md:text-sm uppercase tracking-tighter"
                >
                  <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" /> Ficha
                </Link>
                <Link 
                  href={`/dashboard/administration/patients/${patient.id}/edit`}
                  className="flex items-center justify-center gap-2 py-2 md:py-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors font-bold text-[10px] md:text-sm uppercase tracking-tighter"
                >
                  <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" /> Evolución
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
