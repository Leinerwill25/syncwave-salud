'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { adminPatientSchema, AdminPatientFormValues } from '@/lib/schemas/adminPatientSchema';
import { UserCog, ArrowLeft, Loader2, Save, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Plus, Trash2, Check, UserPlus } from 'lucide-react';

export default function EditAdminPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [id, setId] = useState<string>('');

  // Attention Reminders State
  const [attentionsList, setAttentionsList] = useState<any[]>([]);
  const [attTitle, setAttTitle] = useState('');
  const [attDate, setAttDate] = useState('');
  const [attIsInternal, setAttIsInternal] = useState(true);
  const [attSpecialistId, setAttSpecialistId] = useState('');
  const [attDesc, setAttDesc] = useState('');
  const [attSpecSearch, setAttSpecSearch] = useState('');
  const [showAttSpecDropdown, setShowAttSpecDropdown] = useState(false);
  const [specialists, setSpecialists] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(adminPatientSchema),
  });

  useEffect(() => {
    fetch('/api/administration/specialists?limit=100')
      .then(res => res.json())
      .then(data => setSpecialists(data.data || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const resolvedParams = await params;
        setId(resolvedParams.id);
        
        const res = await fetch(`/api/administration/patients/${resolvedParams.id}`);
        if (!res.ok) throw new Error('Paciente no encontrado');
        
        const data = await res.json();
        reset({
          firstName: data.firstName || data.first_name,
          lastName: data.lastName || data.last_name,
          identifier: data.identifier,
          dateOfBirth: data.dob || data.date_of_birth,
          phoneNumber: data.phone || data.phone_number,
          email: data.email,
          address: data.address,
          city: data.city,
          country: data.country,
          isActive: data.is_active ?? true,
          emergencyContactName: data.emergency_contact_name,
          emergencyContactPhone: data.emergency_contact_phone,
          emergencyContactRelation: data.emergency_contact_relation,
          allergies: data.allergies,
          currentMedications: data.current_medications || data.current_medication,
          medicalHistory: data.medical_history || data.background || data.notes,
        });
        if (data.attentions) {
          setAttentionsList(data.attentions.map((att: any) => ({
             ...att,
             attentionDate: att.attention_date ? att.attention_date.split('T')[0] : '',
             isInternal: att.is_internal,
             specialistId: att.specialist_id
          })));
        }
      } catch (err: any) {
        toast.error(err.message);
        router.push('/dashboard/administration/patients');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [params, reset, router]);

  const addAttention = () => {
    if (!attTitle || !attDate) {
      toast.error('Título y Fecha son requeridos');
      return;
    }
    const newAtt = {
      title: attTitle,
      attentionDate: attDate,
      description: attDesc,
      isInternal: attIsInternal,
      specialistId: attIsInternal ? attSpecialistId : null,
      status: 'PENDIENTE'
    };
    setAttentionsList(prev => [...prev, newAtt]);
    setAttTitle(''); setAttDate(''); setAttDesc(''); setAttSpecialistId(''); setAttSpecSearch('');
  };

  const removeAttention = (index: number) => {
    setAttentionsList(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: AdminPatientFormValues) => {
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const response = await fetch(`/api/administration/patients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           ...data,
           attentions: attentionsList
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar el paciente');
      }

      toast.success('Ficha médica actualizada');
      router.push('/dashboard/administration/patients');
      router.refresh();
      
    } catch (error: any) {
      setErrorMsg(error.message);
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/administration/patients" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Volver a Pacientes
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <UserCog className="w-8 h-8 text-blue-600" />
            Actualizar Ficha Médica
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Modifica la información y antecedentes del paciente.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-3 animate-in shake">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-10">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10">
            {/* Informacion Principal */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-slate-900 border-b pb-3 flex items-center gap-2">
                 <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-black">1</div>
                 Datos Generales
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Nombre(s) *</label>
                  <input 
                    {...register('firstName')}
                    autoFocus
                    className={cn(
                      "w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:bg-white text-sm",
                      errors.firstName ? "border-red-500" : "border-slate-200"
                    )}
                  />
                  {errors.firstName && <p className="text-xs font-bold text-red-500">{errors.firstName.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Apellido(s) *</label>
                  <input 
                    {...register('lastName')}
                    className={cn(
                      "w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:bg-white text-sm",
                      errors.lastName ? "border-red-500" : "border-slate-200"
                    )}
                  />
                  {errors.lastName && <p className="text-xs font-bold text-red-500">{errors.lastName.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Identificación (Cédula/ID)</label>
                <input 
                  {...register('identifier')}
                  className={cn(
                    "w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:bg-white text-sm",
                    errors.identifier ? "border-red-500" : "border-slate-200"
                  )}
                  placeholder="V-25.555.555"
                />
                {errors.identifier && <p className="text-xs font-bold text-red-500">{errors.identifier.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Fecha de Nacimiento</label>
                    <input 
                      type="date"
                      {...register('dateOfBirth')}
                      className="w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:bg-white text-sm border-slate-200 text-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Teléfono</label>
                    <input 
                      {...register('phoneNumber')}
                      className="w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:bg-white text-sm border-slate-200"
                    />
                  </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Correo Electrónico</label>
                <input 
                  type="email"
                  {...register('email')}
                  className={cn(
                    "w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:bg-white text-sm",
                    errors.email ? "border-red-500" : "border-slate-200"
                  )}
                />
                {errors.email && <p className="text-xs font-bold text-red-500">{errors.email.message}</p>}
              </div>

              <div className="space-y-4 pt-4">
                 <h4 className="text-sm font-bold text-slate-900 border-b pb-2">Ubicación</h4>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dirección Completa</label>
                    <input {...register('address')} className="w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:bg-white text-sm border-slate-200" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ciudad</label>
                        <input {...register('city')} className="w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:bg-white text-sm border-slate-200" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">País</label>
                        <input {...register('country')} className="w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:bg-white text-sm border-slate-200" />
                    </div>
                 </div>
              </div>
            </div>

            {/* Informacion Medica & Emergencia */}
            <div className="space-y-8">
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-slate-900 border-b pb-3 flex items-center gap-2">
                   <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 font-black">2</div>
                   Contacto de Emergencia
                </h3>
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Nombre del Contacto</label>
                  <input {...register('emergencyContactName')} className="w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-rose-100 focus:bg-white text-sm border-slate-200" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Teléfono Auxiliar</label>
                      <input {...register('emergencyContactPhone')} className="w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-rose-100 focus:bg-white text-sm border-slate-200" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Parentesco</label>
                      <input {...register('emergencyContactRelation')} placeholder="Ej: Madre, Esposo..." className="w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-rose-100 focus:bg-white text-sm border-slate-200" />
                   </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-bold text-slate-900 border-b pb-3 flex items-center gap-2">
                   <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 font-black">3</div>
                   Datos Clínicos Adicionales
                </h3>
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Alergias Conocidas</label>
                  <input {...register('allergies')} placeholder="Múltiples alergias separadas por comas" className="w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-teal-100 focus:bg-white text-sm border-slate-200" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Medicamentos Actuales</label>
                  <input {...register('currentMedications')} className="w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-teal-100 focus:bg-white text-sm border-slate-200" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Antecedentes Relevantes (Breve)</label>
                  <textarea {...register('medicalHistory')} rows={3} className="w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-teal-100 focus:bg-white text-sm border-slate-200 resize-none" />
                </div>
                
                <div className="flex items-center gap-3 pt-4">
                  <input 
                    type="checkbox"
                    id="isActive"
                    {...register('isActive')}
                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="isActive" className="text-sm font-bold text-slate-700 cursor-pointer">
                    Paciente Activo
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Seccion 6: Atenciones y Recordatorios */}
          <div className="space-y-6 pt-10 border-t border-slate-100">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 uppercase">
                 <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 font-black">4</div>
                 Recordatorios de Atenciones
              </h3>
              
              <div className="bg-slate-50 rounded-2xl p-6 space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-500 uppercase">Atención / Examen *</label>
                       <input 
                         type="text" 
                         value={attTitle}
                         onChange={(e) => setAttTitle(e.target.value)}
                         placeholder="Ej: Rayos X Tórax" 
                         className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-100"
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-500 uppercase">Fecha Programada *</label>
                       <input 
                         type="date" 
                         value={attDate}
                         onChange={(e) => setAttDate(e.target.value)}
                         className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-100"
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-500 uppercase">Especialista</label>
                       <div className="flex bg-white rounded-xl border border-slate-200 p-1">
                          <button type="button" onClick={() => setAttIsInternal(true)} className={cn("flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all", attIsInternal ? "bg-emerald-500 text-white" : "text-slate-400")}>Interno</button>
                          <button type="button" onClick={() => { setAttIsInternal(false); setAttSpecialistId(''); }} className={cn("flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all", !attIsInternal ? "bg-slate-700 text-white" : "text-slate-400")}>Externo</button>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {attIsInternal && (
                       <div className="space-y-1 relative">
                          <label className="text-[10px] font-black text-slate-500 uppercase">Especialista Asignado</label>
                          <input 
                            type="text" 
                            placeholder="Buscar..." 
                            value={attSpecSearch}
                            onChange={(e) => { setAttSpecSearch(e.target.value); setShowAttSpecDropdown(true); }}
                            onFocus={() => setShowAttSpecDropdown(true)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-100"
                          />
                          {showAttSpecDropdown && specialists.length > 0 && (
                             <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                                {specialists.filter(s => `${s.first_name} ${s.last_name}`.toLowerCase().includes(attSpecSearch.toLowerCase())).map(s => (
                                   <div key={s.id} onClick={() => { setAttSpecialistId(s.id); setAttSpecSearch(`${s.first_name} ${s.last_name}`); setShowAttSpecDropdown(false); }} className="px-3 py-2 hover:bg-emerald-50 cursor-pointer text-xs font-bold uppercase">{s.first_name} {s.last_name}</div>
                                ))}
                             </div>
                          )}
                       </div>
                    )}
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-500 uppercase">Notas</label>
                       <input 
                         type="text" 
                         value={attDesc}
                         onChange={(e) => setAttDesc(e.target.value)}
                         placeholder="Indicaciones..." 
                         className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-100"
                       />
                    </div>
                 </div>

                 <button type="button" onClick={addAttention} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"><Plus size={16} /> Agregar Recordatorio</button>
              </div>

              {attentionsList.length > 0 && (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {attentionsList.map((att, idx) => {
                       const spec = specialists.find(s => s.id === att.specialistId);
                       return (
                          <div key={idx} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm flex items-start justify-between">
                             <div className="space-y-1">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-tighter">{att.title}</h4>
                                <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase"><CalendarIcon size={12} /> {att.attentionDate}</div>
                                <div className="flex items-center gap-1.5">
                                   <span className={cn("text-[8px] px-1.5 py-0.5 rounded font-black uppercase", att.isInternal ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500")}>{att.isInternal ? 'Interno' : 'Externo'}</span>
                                   {att.isInternal && spec && <span className="text-[10px] font-bold text-slate-600">{spec.last_name}</span>}
                                </div>
                             </div>
                             <button type="button" onClick={() => removeAttention(idx)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                          </div>
                       );
                    })}
                 </div>
              )}
          </div>

          <div className="pt-10 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-10 py-4 rounded-xl font-black flex items-center justify-center gap-3 shadow-xl shadow-blue-500/30 transition-all hover:-translate-y-1 active:scale-95 text-lg uppercase tracking-widest min-w-[280px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" /> Actualizando...
                </>
              ) : (
                <>
                  <Save className="w-6 h-6" /> ACTUALIZAR FICHA
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
