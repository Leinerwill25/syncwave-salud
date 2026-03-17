'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  Search, 
  Filter, 
  MoreVertical,
  AlertCircle,
  Loader2,
  ChevronRight,
  Stethoscope
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Attention {
  id: string;
  title: string;
  description: string;
  attention_date: string;
  status: 'PENDIENTE' | 'COMPLETADA' | 'CANCELADA';
  is_internal: boolean;
  specialist_id: string;
  cancellation_reason?: string;
  patient_id?: string;
  unregistered_patient_id?: string;
  specialist?: {
    first_name: string;
    last_name: string;
    role: string;
  };
}

export default function RemindersPage() {
  const [attentions, setAttentions] = useState<Attention[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('PENDIENTE');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state for cancellation
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAttId, setSelectedAttId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchAttentions();
  }, []);

  const fetchAttentions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/administration/patients/attentions');
      const data = await res.json();
      setAttentions(data.data || []);
    } catch (error) {
      toast.error('Error al cargar recordatorios');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string, reason?: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch('/api/administration/patients/attentions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, cancellation_reason: reason })
      });
      if (!res.ok) throw new Error('Error al actualizar');
      
      toast.success(`Atención marcada como ${status.toLowerCase()}`);
      setAttentions(prev => prev.map(a => a.id === id ? { ...a, status: status as any, cancellation_reason: reason } : a));
      setShowCancelModal(false);
      setCancelReason('');
    } catch (error) {
      toast.error('Error al actualizar el estado');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredAttentions = attentions.filter(a => {
    const matchesStatus = filterStatus === 'ALL' || a.status === filterStatus;
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (a.specialist?.last_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Clock className="w-8 h-8 text-blue-600" />
            Recordatorios de Atenciones
          </h1>
          <p className="text-slate-500 mt-1 italic">Seguimiento de consultas, laboratorios y exámenes programados.</p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
          {['PENDIENTE', 'COMPLETADA', 'CANCELADA', 'ALL'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                filterStatus === s 
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-200" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              )}
            >
              {s === 'ALL' ? 'Todos' : s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Search & Stats Bar */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <div className="relative">
              <input 
                type="text"
                placeholder="Buscar atención o especialista..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-shadow"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>

            <div className="pt-4 border-t border-slate-50 space-y-3">
              <div className="flex justify-between items-center group">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pendientes</span>
                <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg text-xs font-black">{attentions.filter(a => a.status === 'PENDIENTE').length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hoy</span>
                <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg text-xs font-black">
                   {attentions.filter(a => a.status === 'PENDIENTE' && a.attention_date.startsWith(new Date().toISOString().split('T')[0])).length}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-500/20">
             <AlertCircle className="w-8 h-8 mb-4 opacity-50" />
             <h4 className="font-black text-lg leading-tight">Gestión de Notificaciones</h4>
             <p className="text-blue-100 text-xs mt-2 leading-relaxed">Las atenciones marcadas como pendientes enviarán recordatorios automáticos según la fecha programada.</p>
          </div>
        </div>

        {/* List */}
        <div className="md:col-span-3 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
               <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
               <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Cargando recordatorios...</p>
            </div>
          ) : filteredAttentions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                  <CheckCircle2 className="w-8 h-8" />
               </div>
               <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No hay recordatorios que coincidan</p>
            </div>
          ) : (
            filteredAttentions.map((att) => (
              <div 
                key={att.id} 
                className={cn(
                  "bg-white rounded-3xl p-5 border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:shadow-lg hover:shadow-slate-200/50",
                  att.status === 'COMPLETADA' ? "border-emerald-100 opacity-75" : 
                  att.status === 'CANCELADA' ? "border-rose-100 opacity-75" : "border-slate-100"
                )}
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                    att.status === 'PENDIENTE' ? "bg-blue-50 text-blue-600" :
                    att.status === 'COMPLETADA' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  )}>
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                       {att.title}
                       {att.status === 'COMPLETADA' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                       {att.status === 'CANCELADA' && <XCircle className="w-4 h-4 text-rose-500" />}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                         <CalendarIcon className="w-3.5 h-3.5" />
                         {new Date(att.attention_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-tighter">
                         <User className="w-3.5 h-3.5" />
                         {att.specialist ? `${att.specialist.first_name} ${att.specialist.last_name}` : 'Especialista Externo'}
                      </div>
                    </div>
                    {att.description && (
                      <p className="text-slate-400 text-xs mt-2 italic line-clamp-1">{att.description}</p>
                    )}
                    {att.cancellation_reason && (
                      <div className="mt-2 p-2 bg-rose-50 rounded-lg text-rose-600 text-[10px] font-bold uppercase tracking-tight">
                         Motivo Cancelación: {att.cancellation_reason}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  {att.status === 'PENDIENTE' && (
                    <>
                      <button 
                        onClick={() => updateStatus(att.id, 'COMPLETADA')}
                        disabled={isUpdating}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                      >
                         Realizada
                      </button>
                      <button 
                        onClick={() => { setSelectedAttId(att.id); setShowCancelModal(true); }}
                        disabled={isUpdating}
                        className="bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-100 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
                      >
                         No Realizada
                      </button>
                    </>
                  )}
                  <button className="p-2 text-slate-300 hover:text-slate-500 transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                    <XCircle className="w-6 h-6" />
                 </div>
                 <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Atención No Realizada</h2>
                    <p className="text-slate-500 text-xs">Indica el motivo de la reprogramación o cancelación.</p>
                 </div>
              </div>

              <textarea 
                placeholder="Ej: El paciente no pudo asistir, falta de insumos, reprogramada para el próximo lunes..."
                rows={4}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-rose-100 transition-all resize-none"
              />

              <div className="flex gap-3">
                 <button 
                   onClick={() => setShowCancelModal(false)}
                   className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-black text-xs uppercase transition-all"
                 >
                    Atrás
                 </button>
                 <button 
                   onClick={() => selectedAttId && updateStatus(selectedAttId, 'CANCELADA', cancelReason)}
                   disabled={!cancelReason || isUpdating}
                   className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white py-3 rounded-xl font-black text-xs uppercase shadow-lg shadow-rose-500/20 transition-all active:scale-95"
                 >
                    {isUpdating ? 'Guardando...' : 'Confirmar'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
