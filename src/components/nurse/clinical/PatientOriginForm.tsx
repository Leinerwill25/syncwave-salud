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
    <form onSubmit={handleSubmit(onLocalSubmit)} className="space-y-8 py-2">
      <div className="bg-teal-50/50 p-5 rounded-2xl border border-teal-100 flex gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="bg-white p-2 rounded-xl shadow-sm self-start">
          <Info className="w-5 h-5 text-teal-600" />
        </div>
        <p className="text-sm text-teal-800 leading-relaxed font-medium">
          Registrar el origen del paciente ayuda a mantener la trazabilidad clínica y la coordinación con otros centros o médicos tratantes.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
        {/* Origin Type */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 flex items-center gap-2 px-1">
            <MapPin className="w-4 h-4 text-teal-600" /> Tipo de Procedencia
          </label>
          <select 
            {...register('origin_type')}
            className={cn(
              "w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-teal-100 focus:bg-white text-sm",
              errors.origin_type ? "border-red-500" : "border-slate-200"
            )}
          >
            <option value="">Seleccione origen...</option>
            {Object.entries(ORIGIN_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {errors.origin_type && <p className="text-[10px] font-bold text-red-500 mt-1 px-1 uppercase tracking-wider">{errors.origin_type.message}</p>}
        </div>

        {/* Origin Org Name */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 flex items-center gap-2 px-1">
            <Building className="w-4 h-4 text-teal-600" /> Organización Origen
          </label>
          <input 
            {...register('origin_org_name')}
            placeholder="Nombre de la clínica o centro"
            className={cn(
              "w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-teal-100 focus:bg-white text-sm",
              errors.origin_org_name ? "border-red-500" : "border-slate-200"
            )}
          />
        </div>

        {/* Referring Doctor */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 flex items-center gap-2 px-1">
            <UserPlus className="w-4 h-4 text-teal-600" /> Médico que Remite
          </label>
          <input 
            {...register('referring_doctor_name')}
            placeholder="Nombre del médico tratante"
            className={cn(
              "w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-teal-100 focus:bg-white text-sm",
              errors.referring_doctor_name ? "border-red-500" : "border-slate-200"
            )}
          />
        </div>

        {/* Referral Reason */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 flex items-center gap-2 px-1">
            <FileText className="w-4 h-4 text-teal-600" /> Motivo de Remisión
          </label>
          <select 
            {...register('referral_reason')}
            className={cn(
              "w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-teal-100 focus:bg-white text-sm",
              errors.referral_reason ? "border-red-500" : "border-slate-200"
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
        <label className="text-sm font-bold text-gray-700 px-1">Notas Adicionales de Origen</label>
        <textarea 
          {...register('referral_notes')}
          rows={3}
          placeholder="Detalles sobre la remisión, diagnósticos previos relevantes, etc."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:ring-4 focus:ring-teal-100 focus:bg-white transition-all resize-none"
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4 border-t border-slate-100">
        <button
          type="submit"
          disabled={isLoading}
          className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-10 py-3.5 rounded-xl font-black flex items-center gap-3 shadow-xl shadow-teal-500/30 transition-all hover:-translate-y-1 active:scale-95 text-sm uppercase tracking-widest"
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
