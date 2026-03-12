'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { specialistSchema, SpecialistFormValues } from '@/lib/schemas/specialistSchema';
import { UserCog, ArrowLeft, Loader2, Save, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function EditSpecialistPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Use React.use to unwrap the params internally like Next.js 15 does if needed, or just let Next handle async params
  const [id, setId] = useState<string>('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(specialistSchema),
  });

  useEffect(() => {
    async function loadData() {
      try {
        const resolvedParams = await params;
        setId(resolvedParams.id);
        
        const res = await fetch(`/api/administration/specialists/${resolvedParams.id}`);
        if (!res.ok) throw new Error('Especialista no encontrado');
        
        const data = await res.json();
        reset({
          firstName: data.first_name,
          lastName: data.last_name,
          email: data.email,
          phoneNumber: data.phone_number,
          inpresSax: data.inpres_sax,
          role: data.role as any,
          isActive: data.is_active,
        });
      } catch (err: any) {
        toast.error(err.message);
        router.push('/dashboard/administration/specialists');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [params, reset, router]);

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const response = await fetch(`/api/administration/specialists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar el especialista');
      }

      toast.success('Especialista actualizado correctamente');
      router.push('/dashboard/administration/specialists');
      router.refresh(); // Refresh list
      
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
        <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/administration/specialists" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-teal-600 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Volver a Especialistas
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <UserCog className="w-8 h-8 text-teal-600" />
            Editar Especialista
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Modifica los datos del profesional clínico.
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Informacion Personal */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 border-b pb-2">Información Personal</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Nombre(s) *</label>
                <input 
                  {...register('firstName')}
                  className={cn(
                    "w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-teal-100 focus:bg-white text-sm",
                    errors.firstName ? "border-red-500" : "border-slate-200"
                  )}
                />
                {errors.firstName && <p className="text-xs font-bold text-red-500 mt-1">{errors.firstName.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Apellido(s) *</label>
                <input 
                  {...register('lastName')}
                  className={cn(
                    "w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-teal-100 focus:bg-white text-sm",
                    errors.lastName ? "border-red-500" : "border-slate-200"
                  )}
                />
                {errors.lastName && <p className="text-xs font-bold text-red-500 mt-1">{errors.lastName.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Correo Electrónico *</label>
                <input 
                  {...register('email')}
                  type="email"
                  className={cn(
                    "w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-teal-100 focus:bg-white text-sm",
                    errors.email ? "border-red-500" : "border-slate-200"
                  )}
                />
                {errors.email && <p className="text-xs font-bold text-red-500 mt-1">{errors.email.message}</p>}
              </div>
            </div>

            {/* Informacion Profesional */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 border-b pb-2">Información Profesional</h3>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Rol Clínico *</label>
                <select 
                  {...register('role')}
                  className={cn(
                    "w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-teal-100 focus:bg-white text-sm",
                    errors.role ? "border-red-500" : "border-slate-200"
                  )}
                >
                  <option value="DOCTOR">Doctor / Médico Especialista</option>
                  <option value="ENFERMERO">Enfermero(a)</option>
                  <option value="FISIOTERAPEUTA">Fisioterapeuta</option>
                  <option value="CURA">Especialista en Curas</option>
                </select>
                {errors.role && <p className="text-xs font-bold text-red-500 mt-1">{errors.role.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">INPRES / SAX *</label>
                <input 
                  {...register('inpresSax')}
                  disabled // INPRES usually doesn't change
                  className={cn(
                    "w-full rounded-xl border px-4 py-3 bg-slate-100 text-slate-500 outline-none cursor-not-allowed text-sm uppercase",
                    errors.inpresSax ? "border-red-500" : "border-slate-200"
                  )}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Teléfono de Contacto *</label>
                <input 
                  {...register('phoneNumber')}
                  className={cn(
                    "w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-teal-100 focus:bg-white text-sm",
                    errors.phoneNumber ? "border-red-500" : "border-slate-200"
                  )}
                />
                {errors.phoneNumber && <p className="text-xs font-bold text-red-500 mt-1">{errors.phoneNumber.message}</p>}
              </div>

              <div className="flex items-center gap-3 pt-4">
                <input 
                  type="checkbox"
                  id="isActive"
                  {...register('isActive')}
                  className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="isActive" className="text-sm font-bold text-slate-700 cursor-pointer">
                  Especialista Activo
                </label>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-10 py-4 rounded-xl font-black flex items-center justify-center gap-3 shadow-xl shadow-teal-500/30 transition-all hover:-translate-y-1 active:scale-95 text-lg uppercase tracking-widest min-w-[250px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" /> Actualizando...
                </>
              ) : (
                <>
                  <Save className="w-6 h-6" /> ACTUALIZAR ESPECIALISTA
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
