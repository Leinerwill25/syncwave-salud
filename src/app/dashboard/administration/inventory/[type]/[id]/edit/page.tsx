'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { medicationSchema, materialSchema, MedicationFormValues, MaterialFormValues } from '@/lib/schemas/inventorySchema';
import { PackageSearch, ArrowLeft, Loader2, Save, AlertCircle, Pill, Stethoscope } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function EditInventoryItemPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [id, setId] = useState<string>('');
  const [type, setType] = useState<string>('');
  const isMedication = type === 'medicaciones';

  const schema = isMedication ? medicationSchema : materialSchema;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    async function loadData() {
      try {
        const resolvedParams = await params;
        const currentType = resolvedParams.type;
        const currentId = resolvedParams.id;
        
        setType(currentType);
        setId(currentId);

        const isMed = currentType === 'medicaciones';
        const endpoint = isMed 
          ? `/api/administration/inventory/medications/${currentId}`
          : `/api/administration/inventory/materials/${currentId}`;
          
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error('Item no encontrado');
        
        const data = await res.json();
        
        if (isMed) {
           reset({
             name: data.name,
             quantity: data.quantity,
             dosage: data.dosage,
             presentation: data.presentation,
             expirationDate: data.expiration_date || undefined
           });
        } else {
           reset({
             name: data.name,
             quantity: data.quantity,
             specifications: data.specifications,
             expirationDate: data.expiration_date || undefined
           });
        }
      } catch (err: any) {
        toast.error(err.message);
        router.push('/dashboard/administration/inventory');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [params, reset, router]);


  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setErrorMsg('');

    const endpoint = isMedication 
      ? `/api/administration/inventory/medications/${id}`
      : `/api/administration/inventory/materials/${id}`;

    try {
      const response = await fetch(endpoint, {
        method: 'PATCH', // Update
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar el item');
      }

      toast.success('Inventario actualizado correctamente');
      router.push('/dashboard/administration/inventory');
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
         <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
       </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/administration/inventory" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Volver a Inventario
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <PackageSearch className="w-8 h-8 text-emerald-600" />
            Actualizar Inventario
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Modifica los detalles o el stock del {isMedication ? 'medicamento' : 'material clínico'}.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-3 animate-in shake">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {/* Tipo Indicator */}
      <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-4">
         <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
           {isMedication ? <Pill className="w-6 h-6" /> : <Stethoscope className="w-6 h-6" />}
         </div>
         <div>
           <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest">Tipo de Registro</p>
           <p className="text-lg font-black text-emerald-900">{isMedication ? 'Medicamento / Fármaco' : 'Material o Insumo Clínico'}</p>
         </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-10">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            <div className="space-y-6 md:col-span-2">
              <h3 className="text-lg font-bold text-slate-900 border-b pb-2">Información del Producto</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <label className="text-sm font-bold text-slate-700">Nombre del Producto *</label>
                   <input 
                     {...register('name')}
                     className={cn(
                       "w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-emerald-100 focus:bg-white text-sm",
                       (errors as any).name ? "border-red-500" : "border-slate-200"
                     )}
                   />
                   {(errors as any).name && <p className="text-xs font-bold text-red-500">{(errors as any).name.message}</p>}
                 </div>

                 <div className="space-y-2">
                   <label className="text-sm font-bold text-slate-700">Cantidad Inicial *</label>
                   <input 
                     type="number"
                     {...register('quantity', { valueAsNumber: true })}
                     className={cn(
                       "w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-emerald-100 focus:bg-white text-sm",
                       (errors as any).quantity ? "border-red-500" : "border-slate-200"
                     )}
                   />
                   {(errors as any).quantity && <p className="text-xs font-bold text-red-500">{(errors as any).quantity.message}</p>}
                 </div>
              </div>
            </div>

            {isMedication ? (
              <>
                 <div className="space-y-2">
                   <label className="text-sm font-bold text-slate-700">Dosis *</label>
                   <input 
                     {...register('dosage')}
                     className={cn(
                       "w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-emerald-100 focus:bg-white text-sm",
                       (errors as any).dosage ? "border-red-500" : "border-slate-200"
                     )}
                   />
                   {(errors as any).dosage && <p className="text-xs font-bold text-red-500">{(errors as any).dosage.message}</p>}
                 </div>

                 <div className="space-y-2">
                   <label className="text-sm font-bold text-slate-700">Presentación *</label>
                   <select 
                     {...register('presentation')}
                     className={cn(
                       "w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-emerald-100 focus:bg-white text-sm",
                       (errors as any).presentation ? "border-red-500" : "border-slate-200"
                     )}
                   >
                     <option value="TABLETAS">Tabletas / Pastillas</option>
                     <option value="CAPSULAS">Cápsulas</option>
                     <option value="JARABE">Jarabe / Suspensión</option>
                     <option value="INYECCION">Inyección (Ampolla/Jeringa)</option>
                     <option value="CREMA">Crema / Pomada</option>
                     <option value="GOTAS">Gotas</option>
                     <option value="OTRO">Otro</option>
                   </select>
                   {(errors as any).presentation && <p className="text-xs font-bold text-red-500">{(errors as any).presentation.message}</p>}
                 </div>
              </>
            ) : (
              <div className="space-y-2 md:col-span-2">
                 <label className="text-sm font-bold text-slate-700">Especificaciones *</label>
                 <textarea 
                   {...register('specifications')}
                   rows={3}
                   className={cn(
                     "w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-emerald-100 focus:bg-white text-sm resize-none",
                     (errors as any).specifications ? "border-red-500" : "border-slate-200"
                   )}
                 />
                 {(errors as any).specifications && <p className="text-xs font-bold text-red-500">{(errors as any).specifications.message}</p>}
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
               <label className="text-sm font-bold text-slate-700">Fecha de Vencimiento</label>
               <input 
                 type="date"
                 {...register('expirationDate', { setValueAs: v => v === "" ? undefined : v })}
                 className="w-full md:w-1/2 rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-emerald-100 focus:bg-white text-sm border-slate-200 text-slate-600"
               />
            </div>

          </div>

          <div className="pt-8 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-10 py-4 rounded-xl font-black flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/30 transition-all hover:-translate-y-1 active:scale-95 text-lg uppercase tracking-widest min-w-[250px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" /> Actualizando...
                </>
              ) : (
                <>
                  <Save className="w-6 h-6" /> GUARDAR CAMBIOS
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
