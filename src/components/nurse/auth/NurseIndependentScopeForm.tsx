'use client';
// src/components/nurse/auth/NurseIndependentScopeForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { independentScopeSchema, type IndependentScopeFormData } from '@/schemas/nurse/register.schema';
import { ChevronRight, ChevronLeft, Home, Globe, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  defaultValues?: IndependentScopeFormData;
  onSubmit: (data: IndependentScopeFormData) => void;
  onBack: () => void;
}

interface ScopeOptionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ScopeOption({ icon: Icon, title, description, checked, onChange }: ScopeOptionProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all duration-150',
        checked
          ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-teal-300'
      )}
    >
      <div className={cn('flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center', checked ? 'bg-teal-100 dark:bg-teal-900' : 'bg-gray-100 dark:bg-gray-700')}>
        <Icon className={cn('w-5 h-5', checked ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold', checked ? 'text-teal-700 dark:text-teal-300' : 'text-gray-900 dark:text-white')}>{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{description}</p>
      </div>
      <div className={cn('flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5', checked ? 'border-teal-500 bg-teal-500' : 'border-gray-300 dark:border-gray-600')}>
        {checked && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
    </button>
  );
}

export function NurseIndependentScopeForm({ defaultValues, onSubmit, onBack }: Props) {
  const { handleSubmit, watch, setValue } = useForm<IndependentScopeFormData>({
    resolver: zodResolver(independentScopeSchema) as any,
    defaultValues: defaultValues ?? { home_visits: false, visible_in_network: true, can_share_records: false },
  });

  const homeVisits = watch('home_visits');
  const visibleInNetwork = watch('visible_in_network');
  const canShare = watch('can_share_records');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400 pb-2">
        Configura cómo quieres operar como enfermera independiente en la red ASHIRA.
        Puedes modificar esto en cualquier momento desde tu perfil.
      </p>

      <ScopeOption
        icon={Home}
        title="Visitas domiciliarias"
        description="Realizo atención de enfermería en el domicilio del paciente."
        checked={homeVisits}
        onChange={(v) => setValue('home_visits', v)}
      />
      <ScopeOption
        icon={Globe}
        title="Visible en la red ASHIRA"
        description="Los médicos de la red pueden encontrarme para asignarme pacientes."
        checked={visibleInNetwork}
        onChange={(v) => setValue('visible_in_network', v)}
      />
      <ScopeOption
        icon={Share2}
        title="Compartir registros con médicos referentes"
        description="Permito que los médicos que me refieren pacientes accedan a mis notas de enfermería."
        checked={canShare}
        onChange={(v) => setValue('can_share_records', v)}
      />

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
