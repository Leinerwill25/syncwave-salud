'use client';

import React, { useState, useEffect } from 'react';
import { UserSquare2, Search, Plus, MoreVertical, Edit2, Trash2, ShieldAlert, CheckCircle, RefreshCcw, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Specialist {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  role: string;
  inpres_sax: string;
  is_active: boolean;
  // Local state for UI feedback
  verificationStatus?: 'VERIFIED' | 'INVALID' | 'PENDING';
}

export default function AdministrationSpecialistsPage() {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [validatingId, setValidatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSpecialists();
  }, []);

  const fetchSpecialists = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/administration/specialists');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSpecialists(data.data || []);
    } catch (error) {
      console.error('Error fetching specialists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidateInpres = async (specialistId: string) => {
    setValidatingId(specialistId);
    try {
      const res = await fetch(`/api/administration/specialists/${specialistId}/validate-inpres`, {
        method: 'POST',
      });
      const result = await res.json();

      if (result.isValid) {
        toast.success(`Especialista verificado: ${result.status}`, {
            icon: <CheckCircle className="w-5 h-5 text-emerald-500" />
        });
        setSpecialists(prev => prev.map(s => 
            s.id === specialistId ? { ...s, verificationStatus: 'VERIFIED' } : s
        ));
      } else {
        toast.error(result.message || 'Código INPRES inválido');
        setSpecialists(prev => prev.map(s => 
            s.id === specialistId ? { ...s, verificationStatus: 'INVALID' } : s
        ));
      }
    } catch (error) {
      toast.error('Error en el servicio de validación');
    } finally {
      setValidatingId(null);
    }
  };

  const filteredSpecialists = specialists.filter(s => 
    s.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.inpres_sax.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-8 animate-in fade-in duration-500">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-teal-500" />
        <div className="pl-4">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <UserSquare2 className="w-7 h-7 text-teal-600" />
            Gestión de Especialistas
          </h1>
          <p className="text-slate-500 mt-1 max-w-xl">
            Administra el equipo médico y clínico de tu institución y valida sus credenciales INPRES.
          </p>
        </div>
        <Link
          href="/dashboard/administration/specialists/new"
          className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition-all hover:-translate-y-1"
        >
          <Plus className="w-5 h-5" />
          Nuevo Especialista
        </Link>
      </div>

      {/* Utilities / Filters */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar por nombre, email, o INPRES..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-100 transition-shadow"
          />
        </div>
      </div>

      {/* List / Grid view */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {[...Array(6)].map((_, i) => (
             <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-pulse h-48" />
           ))}
        </div>
      ) : filteredSpecialists.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No se encontraron especialistas</h3>
          <p className="text-slate-500 max-w-md mt-2">
            No hay registros que coincidan con tu búsqueda o aún no has agregado especialistas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSpecialists.map((specialist) => (
            <div key={specialist.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative group">
              <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                 <Link href={`/dashboard/administration/specialists/${specialist.id}/edit`} className="p-2 bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-teal-600 rounded-lg transition-colors">
                   <Edit2 className="w-4 h-4" />
                 </Link>
                 <button className="p-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg transition-colors">
                   <Trash2 className="w-4 h-4" />
                 </button>
              </div>

              <div className="flex items-start gap-4 mb-6">
                <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-400 text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-teal-500/20">
                    {specialist.first_name[0]}{specialist.last_name[0]}
                    </div>
                    {specialist.verificationStatus === 'VERIFIED' && (
                        <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full ring-2 ring-emerald-500">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                        </div>
                    )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg leading-tight">
                    {specialist.first_name} {specialist.last_name}
                  </h3>
                  <p className="text-teal-600 font-medium text-sm mt-1">{specialist.role}</p>
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t border-slate-100">
                <div className="flex justify-between text-sm items-center">
                  <span className="text-slate-500">INPRES SAX</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${specialist.verificationStatus === 'INVALID' ? 'text-rose-500' : 'text-slate-900'}`}>{specialist.inpres_sax}</span>
                    <button 
                        onClick={() => handleValidateInpres(specialist.id)}
                        disabled={validatingId === specialist.id}
                        className="p-1.5 bg-slate-50 hover:bg-teal-50 text-slate-400 hover:text-teal-600 rounded-lg transition-all"
                        title="Validar Licencia"
                    >
                        {validatingId === specialist.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Teléfono</span>
                  <span className="font-medium text-slate-700">{specialist.phone_number}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-slate-500">Estado</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${specialist.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    {specialist.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
