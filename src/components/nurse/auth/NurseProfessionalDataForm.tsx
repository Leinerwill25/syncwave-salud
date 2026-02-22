'use client';
// src/components/nurse/auth/NurseProfessionalDataForm.tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { professionalDataSchema, type ProfessionalDataFormData } from '@/schemas/nurse/register.schema';
import { SPECIALIZATIONS } from '@/types/nurse.types';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  defaultValues?: ProfessionalDataFormData;
  onSubmit: (data: ProfessionalDataFormData) => void;
  onBack: () => void;
}

export function NurseProfessionalDataForm({ defaultValues, onSubmit, onBack }: Props) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProfessionalDataFormData>({
    resolver: zodResolver(professionalDataSchema) as any,
    defaultValues: defaultValues ?? { license_number: '', license_expiry: '', specializations: [], position_title: '' },
  });

  const selected = watch('specializations') ?? [];

  function toggleSpec(spec: string) {
    const next = selected.includes(spec)
      ? selected.filter((s) => s !== spec)
      : [...selected, spec];
    setValue('specializations', next, { shouldValidate: true });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Número de licencia / colegiatura
          </label>
          <input
            {...register('license_number')}
            placeholder="ej. ENF-123456"
            className={inputCls(!!errors.license_number)}
          />
          {errors.license_number && <p className="text-xs text-red-500 mt-1">{errors.license_number.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Vencimiento de licencia <span className="text-gray-400">(opcional)</span>
          </label>
          <input
            {...register('license_expiry')}
            type="date"
            className={inputCls(false)}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Especializaciones <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {SPECIALIZATIONS.map((spec) => {
            const active = selected.includes(spec);
            return (
              <button
                key={spec}
                type="button"
                onClick={() => toggleSpec(spec)}
                className={cn(
                  'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all duration-150',
                  active
                    ? 'bg-teal-600 border-teal-600 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-teal-400 hover:text-teal-600'
                )}
              >
                {active && <Check className="w-3 h-3" />}
                {spec}
              </button>
            );
          })}
        </div>
        {errors.specializations && (
          <p className="text-xs text-red-500 mt-1">{errors.specializations.message}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
          Cargo en la organización <span className="text-gray-400">(opcional)</span>
        </label>
        <input
          {...register('position_title')}
          placeholder="ej. Enfermera de urgencias, Jefa de enfermería..."
          className={inputCls(false)}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg px-5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
        >
          <ChevronLeft className="w-4 h-4" /> Atrás
        </button>
        <button
          type="submit"
          className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg px-6 py-2.5 transition-colors text-sm"
        >
          Continuar <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}

function inputCls(hasError: boolean) {
  return cn(
    'w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 outline-none transition-colors',
    hasError
      ? 'border-red-400 focus:border-red-500'
      : 'border-gray-300 dark:border-gray-700 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 dark:focus:ring-teal-900'
  );
}
