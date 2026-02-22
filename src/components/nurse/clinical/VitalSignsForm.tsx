'use client';
// src/components/nurse/clinical/VitalSignsForm.tsx
import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { vitalSignsSchema, type VitalSignsFormData, getVitalAlertLevel, VITAL_ALERT_RANGES } from '@/schemas/nurse/vital-signs.schema';
import { TRIAGE_LABELS, TRIAGE_COLORS, type TriageLevel } from '@/types/nurse.types';
import { 
  Heart, 
  Wind, 
  Activity,
  Thermometer, 
  Droplet, 
  Weight, 
  Ruler, 
  AlertCircle, 
  Save, 
  Info,
  ChevronRight,
  Stethoscope,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  initialData?: Partial<VitalSignsFormData>;
  onSubmit: (data: VitalSignsFormData) => void;
  isLoading?: boolean;
}

export function VitalSignsForm({ initialData, onSubmit, isLoading }: Props) {
  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<VitalSignsFormData>({
    resolver: zodResolver(vitalSignsSchema),
    defaultValues: {
      ...initialData,
      weight_kg: initialData?.weight_kg || undefined,
      height_cm: initialData?.height_cm || undefined,
    }
  });

  const weight = useWatch({ control, name: 'weight_kg' });
  const height = useWatch({ control, name: 'height_cm' });

  // BMI Calculation
  const bmi = useMemo(() => {
    if (weight && height && height > 0) {
      const heightM = height / 100;
      return (weight / (heightM * heightM)).toFixed(2);
    }
    return null;
  }, [weight, height]);

  const onSubmitForm = (data: VitalSignsFormData) => {
    onSubmit(data);
  };

  const getLabelClass = (vital: keyof typeof VITAL_ALERT_RANGES, value?: number) => {
    if (value === undefined || value === null) return 'text-gray-700 dark:text-gray-300';
    const level = getVitalAlertLevel(vital, value);
    if (level === 'critical') return 'text-red-600 dark:text-red-400 font-bold';
    if (level === 'warning') return 'text-amber-600 dark:text-amber-400 font-bold';
    return 'text-gray-700 dark:text-gray-300';
  };

  const getInputClass = (vital: keyof typeof VITAL_ALERT_RANGES, value?: number, error?: any) => {
    const base = "w-full rounded-xl border px-4 py-3 text-lg font-semibold bg-white dark:bg-gray-800 outline-none transition-all";
    if (error) return cn(base, "border-red-500 ring-red-100 focus:ring-4 dark:ring-red-900/20");
    if (value === undefined || value === null) return cn(base, "border-gray-200 dark:border-gray-700 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900/20");
    
    const level = getVitalAlertLevel(vital, value);
    if (level === 'critical') return cn(base, "border-red-500 bg-red-50 dark:bg-red-900/10 text-red-700 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-900/20");
    if (level === 'warning') return cn(base, "border-amber-400 bg-amber-50 dark:bg-amber-900/10 text-amber-700 focus:ring-4 focus:ring-amber-100 dark:focus:ring-amber-900/20");
    
    return cn(base, "border-green-500 bg-green-50 dark:bg-green-900/10 text-green-700 focus:ring-4 focus:ring-green-100 dark:focus:ring-green-900/20 border-gray-200 dark:border-gray-700 focus:border-teal-500");
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-8">
      {/* Vital Signs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Blood Pressure */}
        <div className="space-y-3 bg-gray-50/50 dark:bg-gray-800/20 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-gray-900 dark:text-white">Presión Arterial</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Sistólica</label>
              <input 
                type="number" 
                {...register('bp_systolic', { valueAsNumber: true })}
                className={getInputClass('bp_systolic', weight, errors.bp_systolic)} // Dummy value for class check
                placeholder="120"
              />
            </div>
            <span className="text-2xl text-gray-300 mt-6">/</span>
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Diastólica</label>
              <input 
                type="number" 
                {...register('bp_diastolic', { valueAsNumber: true })}
                className={getInputClass('bp_diastolic', weight, errors.bp_diastolic)}
                placeholder="80"
              />
            </div>
          </div>
          {(errors.bp_systolic || errors.bp_diastolic) && (
            <p className="text-xs text-red-500">{errors.bp_systolic?.message || errors.bp_diastolic?.message}</p>
          )}
        </div>

        {/* Heart & Resp Rate */}
        <div className="space-y-6">
          <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <label className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                <Activity className="w-4 h-4 text-emerald-500" /> Frec. Cardíaca
              </span>
              <span className="text-[10px] font-bold text-gray-400">LPM</span>
            </label>
            <input 
              type="number" 
              {...register('heart_rate', { valueAsNumber: true })}
              className={getInputClass('heart_rate', undefined, errors.heart_rate)}
              placeholder="75"
            />
            {errors.heart_rate && <p className="text-xs text-red-500 mt-1">{errors.heart_rate.message}</p>}
          </div>

          <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <label className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                <Wind className="w-4 h-4 text-blue-400" /> Frec. Respiratoria
              </span>
              <span className="text-[10px] font-bold text-gray-400">RPM</span>
            </label>
            <input 
              type="number" 
              {...register('respiratory_rate', { valueAsNumber: true })}
              className={getInputClass('respiratory_rate', undefined, errors.respiratory_rate)}
              placeholder="18"
            />
            {errors.respiratory_rate && <p className="text-xs text-red-500 mt-1">{errors.respiratory_rate.message}</p>}
          </div>
        </div>

        {/* Temp & Spo2 */}
        <div className="space-y-6">
          <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <label className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                <Thermometer className="w-4 h-4 text-orange-500" /> Temperatura
              </span>
              <span className="text-[10px] font-bold text-gray-400">°C</span>
            </label>
            <input 
              type="number" 
              step="0.1"
              {...register('temperature_celsius', { valueAsNumber: true })}
              className={getInputClass('temperature_celsius', undefined, errors.temperature_celsius)}
              placeholder="36.5"
            />
            {errors.temperature_celsius && <p className="text-xs text-red-500 mt-1">{errors.temperature_celsius.message}</p>}
          </div>

          <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <label className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                <Droplet className="w-4 h-4 text-blue-600" /> Saturación O2 (SpO2)
              </span>
              <span className="text-[10px] font-bold text-gray-400">%</span>
            </label>
            <input 
              type="number" 
              {...register('spo2_percent', { valueAsNumber: true })}
              className={getInputClass('spo2_percent', undefined, errors.spo2_percent)}
              placeholder="98"
            />
            {errors.spo2_percent && <p className="text-xs text-red-500 mt-1">{errors.spo2_percent.message}</p>}
          </div>
        </div>
      </div>

      {/* Anthropometry & Glucose */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
            <label className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                <Weight className="w-4 h-4 text-gray-500" /> Peso
              </span>
              <span className="text-[10px] font-bold text-gray-400">KG</span>
            </label>
            <input 
              type="number" 
              step="0.1"
              {...register('weight_kg', { valueAsNumber: true })}
              className="w-full border-b-2 border-gray-100 dark:border-gray-800 py-2 text-xl font-black bg-transparent outline-none focus:border-teal-500 transition-colors"
              placeholder="70.0"
            />
          </div>

          <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <label className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                <Ruler className="w-4 h-4 text-gray-500" /> Talla
              </span>
              <span className="text-[10px] font-bold text-gray-400">CM</span>
            </label>
            <input 
              type="number" 
              {...register('height_cm', { valueAsNumber: true })}
              className="w-full border-b-2 border-gray-100 dark:border-gray-800 py-2 text-xl font-black bg-transparent outline-none focus:border-teal-500 transition-colors"
              placeholder="170"
            />
          </div>

          <div className="p-4 bg-teal-50 dark:bg-teal-900/10 rounded-2xl border border-teal-100 dark:border-teal-900/30 flex flex-col justify-center">
            <p className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-1 text-center">Índice Masa Corp.</p>
            <p className="text-3xl font-black text-teal-900 dark:text-teal-200 text-center">{bmi || '—'}</p>
            <p className="text-[10px] text-teal-600/60 text-center mt-1">IMC Automático</p>
          </div>

          <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm border-l-4 border-l-blue-400">
            <label className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                Glucometría
              </span>
              <span className="text-[10px] font-bold text-gray-400">MG/DL</span>
            </label>
            <input 
              type="number" 
              {...register('glucose_mg_dl', { valueAsNumber: true })}
              className="w-full bg-transparent text-xl font-black outline-none"
              placeholder="90"
            />
          </div>
      </div>

      {/* Triage Level Selector */}
      <div className="space-y-4">
        <label className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
          <Stethoscope className="w-6 h-6 text-teal-600" />
          Nivel de Triaje
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(['immediate', 'urgent', 'less_urgent', 'non_urgent', 'deceased'] as TriageLevel[]).map((level) => (
            <label 
              key={level}
              className={cn(
                "relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all cursor-pointer group",
                TRIAGE_COLORS[level],
                "hover:scale-[1.02] active:scale-95"
              )}
            >
              <input 
                type="radio" 
                value={level} 
                {...register('triage_level')}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <span className="text-center font-black uppercase text-[11px] tracking-tight">{TRIAGE_LABELS[level]}</span>
            </label>
          ))}
        </div>
        {errors.triage_level && <p className="text-sm text-red-500 text-center font-medium">{errors.triage_level.message}</p>}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          Notas de Enfermería / Observaciones
        </label>
        <textarea 
          {...register('notes')}
          rows={3}
          className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-sm outline-none focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900/20 focus:border-teal-500 transition-all resize-none"
          placeholder="Ej: Paciente refiere dolor en pecho, sudoración fría..."
        />
        {errors.notes && <p className="text-xs text-red-500">{errors.notes.message}</p>}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2 text-gray-400 text-xs italic">
          <Info className="w-4 h-4" />
          Los campos vacíos serán ignorados.
        </div>
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
          Guardar Signos y Finalizar Triaje
        </button>
      </div>
    </form>
  );
}
