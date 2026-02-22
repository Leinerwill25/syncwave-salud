'use client';
// src/components/nurse/auth/affiliated/NursePendingApprovalScreen.tsx
import { Clock, Mail, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface Props {
  organizationName: string;
  email: string;
}

export function NursePendingApprovalScreen({ organizationName, email }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-8 text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-10 h-10 text-amber-500" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-white dark:border-gray-900">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Solicitud enviada
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-6">
          Tu solicitud para unirte a{' '}
          <span className="font-semibold text-gray-900 dark:text-white">{organizationName}</span>{' '}
          ha sido enviada. El administrador deberá aprobar tu acceso.
        </p>

        {/* Steps */}
        <div className="space-y-3 text-left mb-8">
          {[
            { icon: CheckCircle, label: 'Cuenta creada en ASHIRA', done: true },
            { icon: Mail, label: `Email de confirmación enviado a ${email}`, done: true },
            { icon: Clock, label: 'Aprobación del administrador pendiente', done: false },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                <step.icon className={`w-3.5 h-3.5 ${step.done ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`} />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">{step.label}</p>
            </div>
          ))}
        </div>

        <Link
          href="/login"
          className="block w-full text-center bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg px-6 py-3 transition-colors text-sm"
        >
          Ir al inicio de sesión
        </Link>
      </div>
    </div>
  );
}
