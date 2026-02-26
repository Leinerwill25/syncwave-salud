'use client';
// src/components/nurse/clinical/PatientOriginForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { originRecordSchema, type OriginRecordFormData, ORIGIN_TYPE_LABELS, REFERRAL_REASON_LABELS } from '@/schemas/nurse/origin.schema';
import { MapPin, Building, UserPlus, FileText, Save, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  initialData?: Partial<OriginRecordFormData>;
  onSubmit: (data: OriginRecordFormData) => void;
  isLoading?: boolean;
}

export function PatientOriginForm({ initialData, onSubmit, isLoading }: Props) {
  // Convert nulls from database to undefined for the form
  const sanitizedInitialData = initialData ? Object.fromEntries(
    Object.entries(initialData).map(([k, v]) => [k, v === null ? undefined : v])
  ) : {};

  const defaultValues: any = {
    origin_org_country: 'CO',
    ...sanitizedInitialData,
  };

  const { register, handleSubmit, formState: { errors } } = useForm<OriginRecordFormData>({
    resolver: zodResolver(originRecordSchema) as any,
    defaultValues
  });

  const onLocalSubmit = (data: any) => {
    onSubmit(data as OriginRecordFormData);
  };

  return (
    <form onSubmit={handleSubmit(onLocalSubmit)} className="space-y-6">
      <div className="bg-teal-50 dark:bg-teal-900/10 p-4 rounded-2xl border border-teal-100 dark:border-teal-900/30 flex gap-3 mb-6">
        <Info className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-teal-800 dark:text-teal-300">
          Registrar el origen del paciente ayuda a mantener la trazabilidad clínica y la coordinación con otros centros o médicos tratantes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Origin Type */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-teal-600" /> Tipo de Procedencia
          </label>
          <select 
            {...register('origin_type')}
            className={cn(
              "w-full rounded-xl border px-4 py-3 bg-white dark:bg-gray-800 outline-none transition-all focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900/20",
              errors.origin_type ? "border-red-500" : "border-gray-200 dark:border-gray-700"
            )}
          >
            <option value="">Seleccione origen...</option>
            {Object.entries(ORIGIN_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {errors.origin_type && <p className="text-xs text-red-500">{errors.origin_type.message}</p>}
        </div>

        {/* Origin Org Name */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building className="w-4 h-4 text-teal-600" /> Organización Origen
          </label>
          <input 
            {...register('origin_org_name')}
            placeholder="Nombre de la clínica o centro"
            className={cn(
              "w-full rounded-xl border px-4 py-3 bg-white dark:bg-gray-800 outline-none transition-all focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900/20",
              errors.origin_org_name ? "border-red-500" : "border-gray-200 dark:border-gray-700"
            )}
          />
        </div>

        {/* Referring Doctor */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-teal-600" /> Médico que Remite
          </label>
          <input 
            {...register('referring_doctor_name')}
            placeholder="Nombre del médico tratante"
            className={cn(
              "w-full rounded-xl border px-4 py-3 bg-white dark:bg-gray-800 outline-none transition-all focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900/20",
              errors.referring_doctor_name ? "border-red-500" : "border-gray-200 dark:border-gray-700"
            )}
          />
        </div>

        {/* Referral Reason */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-600" /> Motivo de Remisión
          </label>
          <select 
            {...register('referral_reason')}
            className={cn(
              "w-full rounded-xl border px-4 py-3 bg-white dark:bg-gray-800 outline-none transition-all focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900/20",
              errors.referral_reason ? "border-red-500" : "border-gray-200 dark:border-gray-700"
            )}
          >
            <option value="">Seleccione motivo...</option>
            {Object.entries(REFERRAL_REASON_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Referral Notes */}
      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-900 dark:text-white">Notas Adiocionales de Origen</label>
        <textarea 
          {...register('referral_notes')}
          rows={3}
          placeholder="Detalles sobre la remisión, diagnósticos previos relevantes, etc."
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-sm outline-none focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900/20 transition-all resize-none"
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all hover:-translate-y-1 active:scale-95"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Guardar Procedencia
        </button>
      </div>
    </form>
  );
}
