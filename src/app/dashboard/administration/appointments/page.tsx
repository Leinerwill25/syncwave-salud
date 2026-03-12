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
  const [isApproving, setIsApproving] = useState<string | null>(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      // Fetch only PENDING appointments for the queue
      const res = await fetch('/api/administration/appointments?status=PENDIENTE');
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

  const handleApprove = async (appointmentId: string) => {
    setIsApproving(appointmentId);
    try {
      const res = await fetch(`/api/administration/appointments/${appointmentId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: 'Aprobación automática desde el panel de administración',
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
      fetchAppointments(); // Refresh the list
      
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsApproving(null);
    }
  };

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-8 animate-in fade-in duration-500">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-amber-500" />
        <div className="pl-4">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <CalendarCheck className="w-7 h-7 text-amber-600" />
            Cola de Aprobación de Citas
          </h1>
          <p className="text-slate-500 mt-1 max-w-xl">
            Revisa y autoriza las citas solicitadas. La aprobación generará automáticamente el registro de consulta médica.
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
        <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No hay citas pendientes</h3>
          <p className="text-slate-500 max-w-md mt-2">
            La cola de aprobación está vacía. Todas las solicitudes han sido gestionadas.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
             <div key={appointment.id} className="bg-white rounded-2xl p-6 shadow-sm border border-amber-100/50 hover:border-amber-200 hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
                   {/* Col 1: Paciente & Servicio */}
                   <div>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                       <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                       Solicitud Pendiente
                     </p>
                     <h3 className="font-black text-slate-900 text-lg leading-tight">
                        {appointment.patients.first_name} {appointment.patients.last_name}
                     </h3>
                     <p className="text-sm font-medium text-amber-700 bg-amber-50 inline-block px-2 py-0.5 rounded-md mt-1.5">
                        {appointment.clinic_services?.name || appointment.appointment_type.replace('_', ' ')}
                     </p>
                   </div>

                   {/* Col 2: Fecha & Especialista */}
                   <div className="space-y-3 md:border-l border-slate-100 md:pl-6">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                             {new Date(`${appointment.scheduled_date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})}
                          </p>
                          <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {appointment.scheduled_time.substring(0,5)}
                          </p>
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 shrink-0 uppercase font-bold text-xs">
                          {appointment.specialists.first_name[0]}{appointment.specialists.last_name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 truncate">
                             Dr. {appointment.specialists.last_name}
                          </p>
                          <p className="text-xs font-medium text-slate-500">
                            {appointment.specialists.role}
                          </p>
                        </div>
                     </div>
                   </div>

                   {/* Col 3: Notas u otro detalle */}
                   <div className="md:border-l border-slate-100 md:pl-6">
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Notas del Solicitante</p>
                     <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm text-slate-600 h-16 overflow-y-auto w-full">
                       {appointment.notes || <span className="text-slate-400 italic">Sin notas adicionales...</span>}
                     </div>
                   </div>
                </div>

                {/* Actions */}
                <div className="flex lg:flex-col gap-3 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-6 w-full lg:w-48">
                   <button
                     onClick={() => handleApprove(appointment.id)}
                     disabled={isApproving !== null}
                     className="flex-1 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                   >
                     {isApproving === appointment.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                     ) : (
                        <><CheckCircle2 className="w-5 h-5" /> Aprobar</>
                     )}
                   </button>
                   <button
                     disabled={isApproving !== null}
                     className="flex-1 w-full bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                   >
                      <XOctagon className="w-5 h-5" /> Cancelar
                   </button>
                </div>

             </div>
          ))}
        </div>
      )}
    </div>
  );
}
