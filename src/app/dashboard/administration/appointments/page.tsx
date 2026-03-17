'use client';

import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  XOctagon, 
  AlertCircle,
  Loader2,
  Calendar
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  patient_id: string;
  specialist_id: string;
  appointment_type: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  notes?: string;
  
  // Joined
  patients: { first_name: string; last_name: string; phone_number: string };
  specialists: { first_name: string; last_name: string; role: string };
  clinic_services?: { name: string };
}

export default function AdministrationAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isApproving, setIsApproving] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');

  const searchParams = useSearchParams();
  const patientIdFilter = searchParams.get('patient_id');

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchAppointments();
      fetchServices();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [patientIdFilter, searchTerm]);

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      let url = '/api/administration/appointments?status=PENDIENTE';
      if (patientIdFilter) {
        url += `&patient_id=${patientIdFilter}`;
      }
      if (searchTerm) {
        url += `&search=${searchTerm}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch appointments');
      const data = await res.json();
      setAppointments(data.data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Error al cargar la cola de citas');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/administration/services?active=true');
      if (!res.ok) throw new Error('Failed to fetch services');
      const data = await res.json();
      setServices(data.data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const openApprovalModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedAppointment || !selectedServiceId) {
      toast.error('Debes seleccionar un servicio para aprobar la cita');
      return;
    }

    setIsApproving(selectedAppointment.id);
    try {
      const res = await fetch(`/api/administration/appointments/${selectedAppointment.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId: selectedServiceId,
          notes: approvalNotes || 'Aprobada desde el panel administrativo',
        }),
      });

      if (!res.ok) {
         const errData = await res.json();
         throw new Error(errData.error || 'Error al aprobar la cita');
      }

      toast.success('Cita aprobada y consulta médica generada exitosamente', {
        duration: 4000,
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />
      });
      
      setIsModalOpen(false);
      setSelectedAppointment(null);
      setSelectedServiceId('');
      setApprovalNotes('');
      fetchAppointments();
      
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsApproving(null);
    }
  };

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-4 md:space-y-8 animate-in fade-in duration-500 max-w-screen overflow-x-hidden pb-10">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 md:w-2 h-full bg-amber-500" />
        <div className="pl-3 md:pl-4">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 md:gap-3">
            <CalendarCheck className="w-6 h-6 md:w-7 md:h-7 text-amber-600" />
            Cola de Aprobación
          </h1>
          <p className="text-slate-500 mt-1 text-xs md:text-sm max-w-xl">
            Autoriza las citas solicitadas. Se generará la consulta médica automáticamente.
          </p>
        </div>
      </div>

      {/* List / Queue view */}
      {isLoading ? (
        <div className="space-y-4">
           {[...Array(4)].map((_, i) => (
             <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-pulse h-32" />
           ))}
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-white p-8 md:p-12 rounded-2xl md:rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-emerald-400" />
          </div>
          <h3 className="text-base md:text-lg font-bold text-slate-900">No hay citas pendientes</h3>
          <p className="text-slate-500 text-xs md:text-sm max-w-md mt-2">
            La cola de aprobación está vacía actualmente.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
             <div key={appointment.id} className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-amber-100/50 hover:border-amber-200 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6">
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                   {/* Col 1: Paciente & Servicio */}
                   <div>
                     <p className="text-[9px] md:text-xs font-black text-amber-600 uppercase tracking-widest mb-1 md:mb-1.5 flex items-center gap-1.5">
                       <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                       Pendiente
                     </p>
                     <h3 className="font-black text-slate-900 text-base md:text-lg leading-tight uppercase tracking-tighter">
                        {appointment.patients.first_name} {appointment.patients.last_name}
                     </h3>
                     <p className="text-[10px] md:text-sm font-bold text-amber-900 bg-amber-50 inline-block px-2 py-1 rounded-md mt-1.5 uppercase">
                        {appointment.clinic_services?.name || appointment.appointment_type.replace('_', ' ')}
                     </p>
                   </div>

                   {/* Col 2: Fecha & Especialista */}
                   <div className="space-y-2.5 md:space-y-3 md:border-l border-slate-100 md:pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs md:text-sm font-bold text-slate-900 uppercase">
                             {new Date(`${appointment.scheduled_date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})}
                          </p>
                          <p className="text-[10px] md:text-xs font-medium text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {appointment.scheduled_time.substring(0,5)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 shrink-0 uppercase font-black text-[10px]">
                          {appointment.specialists.first_name[0]}{appointment.specialists.last_name[0]}
                        </div>
                        <div>
                          <p className="text-xs md:text-sm font-bold text-slate-900 truncate uppercase">
                             Dr. {appointment.specialists.last_name}
                          </p>
                          <p className="text-[10px] md:text-xs font-medium text-slate-500 uppercase">
                            {appointment.specialists.role}
                          </p>
                        </div>
                      </div>
                   </div>

                   {/* Col 3: Notas u otro detalle */}
                   <div className="md:border-l border-slate-100 md:pl-6">
                     <p className="text-[9px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Notas del Solicitante</p>
                     <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs md:text-sm text-slate-600 h-16 overflow-y-auto w-full italic">
                       {appointment.notes || <span className="text-slate-300">Sin notas adicionales...</span>}
                     </div>
                   </div>
                </div>

                {/* Actions */}
                <div className="flex md:flex-row lg:flex-col gap-2 md:gap-3 shrink-0 pt-4 md:pt-4 lg:pt-0 border-t md:border-t-0 lg:border-l border-slate-100 lg:pl-6 w-full lg:w-48">
                   <button
                     onClick={() => openApprovalModal(appointment)}
                     disabled={isApproving !== null}
                     className="flex-1 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 md:py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 text-xs md:text-sm uppercase tracking-tighter shadow-lg shadow-emerald-500/10"
                   >
                     {isApproving === appointment.id ? (
                        <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                     ) : (
                        <><CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" /> Aprobar</>
                     )}
                   </button>
                   <button
                     disabled={isApproving !== null}
                     className="flex-1 w-full bg-white hover:bg-rose-50 border border-slate-200 text-slate-600 hover:text-rose-600 py-2.5 md:py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-xs md:text-sm uppercase tracking-tighter"
                   >
                      <XOctagon className="w-4 h-4 md:w-5 md:h-5" /> Cancelar
                   </button>
                </div>

             </div>
          ))}
        </div>
      )}

      {/* Approval Modal */}
      {isModalOpen && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-500 p-6 text-white text-center">
                 <CheckCircle2 className="w-12 h-12 mx-auto mb-2" />
                 <h2 className="text-xl font-black italic uppercase tracking-tighter">Confirmar Aprobación</h2>
                 <p className="text-emerald-50 text-xs font-medium uppercase tracking-widest mt-1 opacity-80">Finalizar autorización de cita</p>
              </div>
              
              <div className="p-8 space-y-6">
                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Servicio Médico Asignado *</label>
                    <select
                      value={selectedServiceId}
                      onChange={(e) => setSelectedServiceId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 font-medium focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 outline-none transition-all"
                    >
                      <option value="">Selecciona un servicio...</option>
                      {services.map(s => (
                        <option key={s.id} value={s.id}>{s.name} - ${s.price || '0.00'}</option>
                      ))}
                    </select>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Notas de Aprobación</label>
                    <textarea
                      placeholder="Agrega notas adicionales para el especialista o paciente..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 text-sm focus:ring-2 focus:ring-emerald-200 outline-none transition-all resize-none"
                      rows={3}
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                    />
                 </div>

                 <div className="bg-amber-50 rounded-2xl p-4 flex gap-3 border border-amber-100">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 font-medium leading-relaxed">
                       Al aprobar esta cita, se creará automáticamente un registro de **Consulta Médica** para que el especialista pueda iniciar la atención.
                    </p>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setIsModalOpen(false)}
                      className="py-3 px-6 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                    >
                       Atrás
                    </button>
                    <button 
                      onClick={handleApprove}
                      disabled={isApproving !== null || !selectedServiceId}
                      className="bg-slate-900 hover:bg-black text-white py-3 px-6 rounded-xl font-bold shadow-lg shadow-slate-900/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                       {isApproving === selectedAppointment.id ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirmar Aprobación'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
