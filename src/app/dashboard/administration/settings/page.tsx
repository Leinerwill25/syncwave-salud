'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Settings, 
  Save, 
  Mail, 
  Phone, 
  MapPin, 
  Globe,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
  address?: string;
  contactEmail: string;
  phone?: string;
  type: string;
}

export default function AdministrationSettingsPage() {
  const [clinic, setClinic] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClinicData();
  }, []);

  const fetchClinicData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/administration/settings');
      if (!res.ok) throw new Error('Error al cargar datos de la clínica');
      const data = await res.json();
      setClinic(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic) return;

    try {
      setIsSaving(true);
      const res = await fetch('/api/administration/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clinic),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al actualizar configuración');
      }

      toast.success('Configuración actualizada correctamente', {
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />
      });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Cargando configuración clínica...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-10 animate-in fade-in duration-500 max-w-5xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-blue-600" />
        <div className="pl-4">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Settings className="w-7 h-7 text-blue-600" />
            Configuración de la Clínica
          </h1>
          <p className="text-slate-500 mt-1 max-w-xl">
            Gestiona la identidad corporativa y datos de contacto de tu organización.
          </p>
        </div>
      </div>

      {error ? (
        <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl text-rose-600 flex items-center gap-4">
          <AlertCircle className="w-8 h-8 shrink-0" />
          <div>
            <h3 className="font-bold">Error de Conexión</h3>
            <p className="text-sm opacity-90">{error}</p>
            <button onClick={fetchClinicData} className="mt-2 text-sm font-bold underline">Reintentar</button>
          </div>
        </div>
      ) : clinic && (
        <form onSubmit={handleUpdate} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Col: Info & Logo */}
            <div className="lg:col-span-1 space-y-8">
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm text-center">
                 <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-500 flex items-center justify-center text-white text-3xl font-black mb-4 shadow-xl shadow-blue-500/20">
                    {clinic.name[0]}
                 </div>
                 <h2 className="text-xl font-bold text-slate-900">{clinic.name}</h2>
                 <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 bg-slate-50 inline-block px-3 py-1 rounded-full">{clinic.type}</p>
                 
                 <div className="mt-8 pt-6 border-t border-slate-50 flex flex-col gap-3">
                    <button type="button" className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 py-2 rounded-xl transition-colors">
                       Cambiar Logo (Próximamente)
                    </button>
                 </div>
              </div>

              <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100">
                 <h3 className="text-emerald-800 font-bold mb-2 flex items-center gap-2 italic">
                    <CheckCircle2 className="w-4 h-4" /> Estado del Plan
                 </h3>
                 <p className="text-xs text-emerald-700 leading-relaxed font-medium">
                    Tu suscripción está habilitada. Todos los módulos administrativos están activos para tu organización.
                 </p>
              </div>
            </div>

            {/* Right Col: Form Fields */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                 <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-4">
                    <Building2 className="w-5 h-5 text-blue-600" /> Datos Generales
                 </h3>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nombre de la Clínica *</label>
                       <div className="relative">
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            required
                            type="text" 
                            value={clinic.name}
                            onChange={(e) => setClinic({...clinic, name: e.target.value})}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 transition-all hover:bg-slate-100 focus:bg-white" 
                          />
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email de Contacto *</label>
                       <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            required
                            type="email" 
                            value={clinic.contactEmail}
                            onChange={(e) => setClinic({...clinic, contactEmail: e.target.value})}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 transition-all hover:bg-slate-100 focus:bg-white" 
                          />
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Teléfono Directo</label>
                       <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="tel" 
                            value={clinic.phone || ''}
                            onChange={(e) => setClinic({...clinic, phone: e.target.value})}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 transition-all hover:bg-slate-100 focus:bg-white" 
                          />
                       </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dirección Física</label>
                       <div className="relative">
                          <MapPin className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
                          <textarea 
                            value={clinic.address || ''}
                            onChange={(e) => setClinic({...clinic, address: e.target.value})}
                            rows={3}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 transition-all hover:bg-slate-100 focus:bg-white resize-none" 
                          />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                 <button 
                   type="submit"
                   disabled={isSaving}
                   className="bg-slate-900 hover:bg-black text-white px-10 py-4 rounded-2xl font-black italic uppercase tracking-tighter flex items-center gap-2 shadow-xl shadow-slate-900/20 active:scale-95 transition-all disabled:opacity-50"
                 >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Guardar Cambios</>}
                 </button>
              </div>
            </div>

          </div>
        </form>
      )}
    </div>
  );
}
