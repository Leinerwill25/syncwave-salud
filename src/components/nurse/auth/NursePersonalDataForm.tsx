'use client';
// src/components/nurse/auth/NursePersonalDataForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { personalDataSchema, type PersonalDataFormData } from '@/schemas/nurse/register.schema';
import { Eye, EyeOff, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  defaultValues?: PersonalDataFormData;
  onSubmit: (data: PersonalDataFormData) => void;
}

export function NursePersonalDataForm({ defaultValues, onSubmit }: Props) {
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PersonalDataFormData>({
    resolver: zodResolver(personalDataSchema) as any,
    defaultValues: defaultValues ?? {
      firstName: '', lastName: '', email: '', password: '',
      confirmPassword: '', phone: '', country: 'Colombia', city: '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nombre" error={errors.firstName?.message}>
          <input {...register('firstName')} placeholder="María" className={inputCls(!!errors.firstName)} />
        </Field>
        <Field label="Apellido" error={errors.lastName?.message}>
          <input {...register('lastName')} placeholder="García" className={inputCls(!!errors.lastName)} />
        </Field>
      </div>

      <Field label="Correo electrónico" error={errors.email?.message}>
        <input {...register('email')} type="email" placeholder="enfermera@clinica.com" className={inputCls(!!errors.email)} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Contraseña" error={errors.password?.message}>
          <div className="relative">
            <input
              {...register('password')}
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              className={cn(inputCls(!!errors.password), 'pr-10')}
            />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </Field>
        <Field label="Confirmar contraseña" error={errors.confirmPassword?.message}>
          <div className="relative">
            <input
              {...register('confirmPassword')}
              type={showConfirm ? 'text' : 'password'}
              placeholder="••••••••"
              className={cn(inputCls(!!errors.confirmPassword), 'pr-10')}
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </Field>
      </div>

      <Field label="Teléfono" error={errors.phone?.message}>
        <input {...register('phone')} placeholder="+57 300 000 0000" className={inputCls(!!errors.phone)} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="País" error={errors.country?.message}>
          <input {...register('country')} placeholder="Colombia" className={inputCls(!!errors.country)} />
        </Field>
        <Field label="Ciudad" error={errors.city?.message}>
          <input {...register('city')} placeholder="Bogotá" className={inputCls(!!errors.city)} />
        </Field>
      </div>

      <div className="pt-2">
        <button type="submit" className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg px-6 py-3 transition-colors text-sm">
          Continuar <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return cn(
    'w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 outline-none transition-colors',
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
      : 'border-gray-300 dark:border-gray-700 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 dark:focus:ring-teal-900'
  );
}
