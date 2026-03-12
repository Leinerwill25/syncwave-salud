'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { adminPatientSchema, AdminPatientFormValues } from '@/lib/schemas/adminPatientSchema';
import { UserPlus, ArrowLeft, Loader2, Save, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function NewAdminPatientPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(adminPatientSchema),
    defaultValues: {
      isActive: true,
    }
  });

  const onSubmit = async (data: AdminPatientFormValues) => {
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/administration/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear el paciente');
      }

      toast.success('Paciente registrado correctamente');
      router.push('/dashboard/administration/patients');
      router.refresh();
      
    } catch (error: any) {
      setErrorMsg(error.message);
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/administration/patients" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Volver a Pacientes
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <UserPlus className="w-8 h-8 text-blue-600" />
            Registro de Paciente
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Añade un nuevo paciente al directorio de la clínica.
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

          <div className="pt-10 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-10 py-4 rounded-xl font-black flex items-center justify-center gap-3 shadow-xl shadow-blue-500/30 transition-all hover:-translate-y-1 active:scale-95 text-lg uppercase tracking-widest min-w-[280px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <Save className="w-6 h-6" /> REGISTRAR PACIENTE
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
