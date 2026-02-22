'use client';
// src/components/nurse/auth/NurseRegisterStepper.tsx
// ═══════════════════════════════════════════════════════════
// ASHIRA — Wizard de registro de enfermera independiente
// ═══════════════════════════════════════════════════════════
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { NursePersonalDataForm } from './NursePersonalDataForm';
import { NurseProfessionalDataForm } from './NurseProfessionalDataForm';
import { NurseIndependentScopeForm } from './NurseIndependentScopeForm';
import { NurseRegisterSummary } from './NurseRegisterSummary';
import type {
  PersonalDataFormData,
  ProfessionalDataFormData,
  IndependentScopeFormData,
} from '@/schemas/nurse/register.schema';

const STEPS = [
  { label: 'Datos personales',     description: 'Tu información de contacto' },
  { label: 'Datos profesionales',  description: 'Licencia y especialidades' },
  { label: 'Configuración',        description: 'Modalidad de atención' },
  { label: 'Confirmación',         description: 'Revisa y crea tu cuenta' },
];

export interface RegisterFormState {
  personal: PersonalDataFormData | null;
  professional: ProfessionalDataFormData | null;
  scope: IndependentScopeFormData | null;
}

export function NurseRegisterStepper() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<RegisterFormState>({
    personal: null,
    professional: null,
    scope: null,
  });

  function handleContinuePersonal(data: PersonalDataFormData) {
    setFormData((prev) => ({ ...prev, personal: data }));
    setStep(1);
  }

  function handleContinueProfessional(data: ProfessionalDataFormData) {
    setFormData((prev) => ({ ...prev, professional: data }));
    setStep(2);
  }

  function handleContinueScope(data: IndependentScopeFormData) {
    setFormData((prev) => ({ ...prev, scope: data }));
    setStep(3);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col items-center justify-start px-4 py-8">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg mb-3">
          <span className="text-white text-xl font-bold">A</span>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">ASHIRA Software · Registro de Enfermera</p>
      </div>

      {/* Stepper indicator */}
      <div className="w-full max-w-2xl mb-8">
        <div className="flex items-center justify-between relative">
          {/* Connecting line */}
          <div className="absolute left-0 right-0 top-4 h-0.5 bg-gray-200 dark:bg-gray-800 z-0" />
          <div
            className="absolute left-0 top-4 h-0.5 bg-teal-500 z-0 transition-all duration-500"
            style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
          />

          {STEPS.map((s, index) => {
            const isCompleted = index < step;
            const isActive = index === step;
            return (
              <div key={s.label} className="flex flex-col items-center z-10 relative">
                <button
                  onClick={() => index < step && setStep(index)}
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                    isCompleted
                      ? 'bg-teal-500 border-teal-500 text-white cursor-pointer hover:bg-teal-600'
                      : isActive
                      ? 'bg-white dark:bg-gray-900 border-teal-500 text-teal-600'
                      : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-400 cursor-default'
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                </button>
                <div className="mt-2 text-center hidden sm:block">
                  <p className={cn('text-[10px] font-semibold', isActive || isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-400')}>
                    {s.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{STEPS[step].label}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{STEPS[step].description}</p>
        </div>

        <div className="p-6">
          {step === 0 && (
            <NursePersonalDataForm
              defaultValues={formData.personal ?? undefined}
              onSubmit={handleContinuePersonal}
            />
          )}
          {step === 1 && (
            <NurseProfessionalDataForm
              defaultValues={formData.professional ?? undefined}
              onSubmit={handleContinueProfessional}
              onBack={() => setStep(0)}
            />
          )}
          {step === 2 && (
            <NurseIndependentScopeForm
              defaultValues={formData.scope ?? undefined}
              onSubmit={handleContinueScope}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <NurseRegisterSummary
              data={formData}
              onBack={() => setStep(2)}
            />
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-gray-400 dark:text-gray-600 text-center">
        ¿Ya tienes cuenta?{' '}
        <a href="/login" className="text-teal-600 dark:text-teal-400 hover:underline font-medium">
          Iniciar sesión
        </a>
      </p>
    </div>
  );
}
