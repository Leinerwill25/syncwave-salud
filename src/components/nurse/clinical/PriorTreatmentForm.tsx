'use client';
// src/components/nurse/clinical/PriorTreatmentForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { priorTreatmentSchema, type PriorTreatmentFormData } from '@/schemas/nurse/origin.schema';
import { Pill, Activity, Calendar, User, Save, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  initialData?: Partial<PriorTreatmentFormData>;
  onSubmit: (data: PriorTreatmentFormData) => void;
  isLoading?: boolean;
}

export function PriorTreatmentForm({ initialData, onSubmit, isLoading }: Props) {
  // Convert nulls from database to undefined for the form
  const sanitizedInitialData = initialData ? Object.fromEntries(
    Object.entries(initialData).map(([k, v]) => [k, v === null ? undefined : v])
  ) : {};

  const defaultValues: any = {
    treatment_status: 'active',
    interaction_check_needed: false,
    ...sanitizedInitialData,
  };

  const { register, handleSubmit, formState: { errors } } = useForm<PriorTreatmentFormData>({
    resolver: zodResolver(priorTreatmentSchema) as any,
    defaultValues
  });

  const onLocalSubmit = (data: any) => {
    onSubmit(data as PriorTreatmentFormData);
  };

  return (
    <form onSubmit={handleSubmit(onLocalSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Medication Name */}
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Pill className="w-4 h-4 text-purple-600" /> Nombre del Medicamento
          </label>
          <input 
            {...register('medication_name')}
            placeholder="Ej: Metformina 850mg"
            className={cn(
              "w-full rounded-xl border px-4 py-3 bg-white dark:bg-gray-800 outline-none transition-all focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/20 text-lg font-semibold",
              errors.medication_name ? "border-red-500" : "border-gray-200 dark:border-gray-700 focus:border-purple-500"
            )}
          />
          {errors.medication_name && <p className="text-xs text-red-500">{errors.medication_name.message}</p>}
        </div>

        {/* Dose & Frequency */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-900 dark:text-white">Dosis</label>
          <input 
            {...register('dose')}
            placeholder="Ej: 1 tableta"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/20 transition-all font-medium"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-900 dark:text-white">Frecuencia</label>
          <input 
            {...register('frequency')}
            placeholder="Ej: Cada 12 horas"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/20 transition-all font-medium"
          />
        </div>

        {/* Route & Status */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-900 dark:text-white">Vía de Adm.</label>
          <select 
            {...register('route')}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/20 transition-all"
          >
            <option value="ORAL">Oral</option>
            <option value="INTRAVENOSA">Intravenosa</option>
            <option value="INTRAMUSCULAR">Intramuscular</option>
            <option value="SUBCUTANEA">Subcutánea</option>
            <option value="TOPICA">Tópica</option>
            <option value="OTRA">Otra</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-900 dark:text-white">Estado del Tratamiento</label>
          <select 
            {...register('treatment_status')}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/20 transition-all"
          >
            <option value="active">Activo</option>
            <option value="completed">Completado</option>
            <option value="suspended">Suspendido</option>
            <option value="adverse_reaction">Reacción Adversa</option>
            <option value="unknown">Desconocido</option>
          </select>
        </div>

        {/* Start Date & prescriber */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" /> Fecha Inicio (aprox)
          </label>
          <input 
            type="date"
            {...register('start_date')}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/20 transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" /> Médico Tratante
          </label>
          <input 
            {...register('prescribed_by_doctor_name')}
            placeholder="Nombre del médico"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/20 transition-all"
          />
        </div>
      </div>

      {/* Interaction Check */}
      <label className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl cursor-pointer group hover:bg-amber-100 transition-colors">
        <input 
          type="checkbox"
          {...register('interaction_check_needed')}
          className="w-5 h-5 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
        />
        <div>
          <span className="text-sm font-bold text-amber-900 dark:text-amber-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Requiere revisión de interacciones
          </span>
          <p className="text-[10px] text-amber-700 dark:text-amber-500">Marque si el paciente toma otros fármacos que podrían colisionar con este.</p>
        </div>
      </label>

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-900 dark:text-white">Observaciones</label>
        <textarea 
          {...register('notes')}
          rows={2}
          placeholder="Notas adicionales sobre la tolerancia al medicamento..."
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-sm outline-none focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/20 transition-all resize-none"
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all hover:-translate-y-1 active:scale-95"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Registrar Medicamento
        </button>
      </div>
    </form>
  );
}
