'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { serviceSchema } from '@/lib/schemas/serviceSchema';
import { Settings, Plus, Trash2, Loader2, Save, XOctagon, CreditCard, Stethoscope, Search, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ClinicService {
  id: string;
  name: string;
  description: string;
  service_code: string;
  price: number;
  is_active: boolean;
  created_at: string;
}

export default function AdministrationServicesPage() {
  const [services, setServices] = useState<ClinicService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      price: 0,
    }
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/administration/services');
      if (!res.ok) throw new Error('Failed to fetch services');
      const data = await res.json();
      setServices(data.data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Error al cargar la lista de servicios');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      const res = await fetch('/api/administration/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
           ...data,
           // Explicit mapping from camelCase to snake_case if backend expects it
           // our backend actually uses exact keys on schema, so we just pass data
        }),
      });

      if (!res.ok) {
         const errData = await res.json();
         throw new Error(errData.error || 'Error al crear el servicio');
      }

      toast.success('Servicio configurado exitosamente');
      reset();
      setIsAdding(false);
      fetchServices();
      
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
     try {
       const res = await fetch(`/api/administration/services/${id}`, {
         method: 'PATCH',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ is_active: !currentStatus })
       });
       if (!res.ok) throw new Error('Error al actualizar estado');
       toast.success(currentStatus ? 'Servicio desactivado' : 'Servicio activado');
       fetchServices();
     } catch (err: any) {
       toast.error(err.message);
     }
  };

  const deleteService = async (id: string) => {
     if (!confirm('¿Estás seguro de que deseas eliminar este servicio permanentemente?')) return;
     try {
       const res = await fetch(`/api/administration/services/${id}`, {
         method: 'DELETE'
       });
       if (!res.ok) throw new Error('Error al eliminar');
       toast.success('Servicio eliminado');
       fetchServices();
     } catch (err: any) {
       toast.error(err.message);
     }
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.service_code && s.service_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-8 animate-in fade-in duration-500">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-fuchsia-500" />
        <div className="pl-4">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Settings className="w-7 h-7 text-fuchsia-600" />
            Configuración de Servicios y Precios
          </h1>
          <p className="text-slate-500 mt-1 max-w-xl">
            Gestiona el catálogo de procedimientos médicos y consultas que ofrece la clínica.
          </p>
        </div>
        <button
           onClick={() => setIsAdding(!isAdding)}
           className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-fuchsia-500/20 transition-all hover:-translate-y-1"
        >
           {isAdding ? <XOctagon className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
           {isAdding ? 'Cancelar' : 'Nuevo Servicio'}
        </button>
      </div>

      {/* Formulario Nuevo Servicio */}
      {isAdding && (
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-md border border-fuchsia-100 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
             <Stethoscope className="w-6 h-6 text-fuchsia-600" />
             <h3 className="text-xl font-bold text-slate-800">Definir Nuevo Procedimiento</h3>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                <div className="space-y-2 lg:col-span-2">
                   <label className="text-sm font-bold text-slate-700">Nombre del Servicio *</label>
                   <input 
                     {...register('name')}
                     autoFocus
                     placeholder="Ej: Consulta Médica General"
                     className="w-full rounded-xl border border-slate-200 px-4 py-3 bg-slate-50 outline-none focus:ring-4 focus:ring-fuchsia-100 focus:bg-white text-sm"
                   />
                   {(errors as any).name && <p className="text-xs font-bold text-red-500">{(errors as any).name.message}</p>}
                </div>

                <div className="space-y-2">
                   <label className="text-sm font-bold text-slate-700 flex items-center gap-2">Código Interno</label>
                   <input 
                     {...register('serviceCode')}
                     placeholder="Ej: CMG-001"
                     className="w-full rounded-xl border border-slate-200 px-4 py-3 bg-slate-50 outline-none focus:ring-4 focus:ring-fuchsia-100 focus:bg-white text-sm font-mono uppercase"
                   />
                </div>

                <div className="space-y-2">
                   <label className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                     <CreditCard className="w-4 h-4 text-emerald-600" /> Precio / Tarifa *
                   </label>
                   <div className="relative">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                     <input 
                       type="number"
                       step="0.01"
                       min="0"
                       {...register('price', { valueAsNumber: true })}
                       className="w-full rounded-xl border border-slate-200 pl-8 pr-4 py-3 bg-emerald-50/30 outline-none focus:ring-4 focus:ring-emerald-100 focus:bg-white text-sm font-black text-slate-900"
                     />
                   </div>
                   {(errors as any).price && <p className="text-xs font-bold text-red-500">{(errors as any).price.message}</p>}
                </div>

                <div className="space-y-2 lg:col-span-4">
                   <label className="text-sm font-bold text-slate-700">Descripción (Opcional)</label>
                   <textarea 
                     {...register('description')}
                     rows={2}
                     className="w-full rounded-xl border border-slate-200 px-4 py-3 bg-slate-50 outline-none focus:ring-4 focus:ring-fuchsia-100 focus:bg-white text-sm resize-none"
                   />
                </div>
             </div>
             
             <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-fuchsia-600 hover:bg-fuchsia-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-fuchsia-500/20 w-full sm:w-auto"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {isSubmitting ? 'Guardando...' : 'Crear y Publicar'}
                </button>
             </div>
          </form>
        </div>
      )}

      {/* Utilities / Filters */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input 
          type="text"
          placeholder="Buscar servicios por nombre o código..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-fuchsia-100 shadow-sm"
        />
      </div>

      {/* List view */}
      {isLoading ? (
        <div className="space-y-4">
           {[...Array(3)].map((_, i) => (
             <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-pulse h-24" />
           ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Stethoscope className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Catálogo Vacío</h3>
          <p className="text-slate-500 max-w-md mt-2">
            No has configurado ningún servicio médico todavía.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredServices.map((service) => (
             <div key={service.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row justify-between shrink-0 gap-6">
                
                <div className="flex-1 flex gap-4">
                   <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                      <Stethoscope className="w-6 h-6" />
                   </div>
                   <div>
                     <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-extrabold text-slate-900 leading-tight">
                           {service.name}
                        </h3>
                        {service.service_code && (
                           <span className="text-[10px] uppercase font-bold tracking-widest bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full inline-flex">
                              {service.service_code}
                           </span>
                        )}
                     </div>
                     <p className="text-sm font-medium text-slate-500 line-clamp-2">
                        {service.description || 'Sin descripción detallada.'}
                     </p>
                   </div>
                </div>

                <div className="flex items-center gap-6 border-t sm:border-t-0 border-slate-100 pt-4 sm:pt-0 sm:pl-6 sm:border-l">
                   <div className="text-center sm:text-right flex-1 sm:flex-none">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tarifa Actual</p>
                      <p className="text-xl font-black text-emerald-600">
                         ${Number(service.price).toFixed(2)}
                      </p>
                   </div>
                   
                   <div className="flex flex-col gap-2 shrink-0">
                      <button 
                         onClick={() => toggleStatus(service.id, service.is_active)}
                         className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-colors ${
                           service.is_active 
                            ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' 
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                         }`}
                      >
                         {service.is_active ? 'Activo' : 'Inactivo'}
                      </button>
                      <button 
                        onClick={() => deleteService(service.id)}
                        className="p-1.5 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors border border-transparent hover:border-rose-100 flex justify-center"
                      >
                         <Trash2 className="w-4 h-4" />
                      </button>
                   </div>
                </div>
             </div>
          ))}
        </div>
      )}
    </div>
  );
}
