'use client';
// src/components/nurse/auth/NurseRegisterSummary.tsx
// ─── Step 4: Confirmación y envío ─────────────────────────
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronLeft, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { registerNurseIndependent } from '@/lib/supabase/nurse.service';
import type { RegisterFormState } from './NurseRegisterStepper';
import { cn } from '@/lib/utils';

interface Props {
  data: RegisterFormState;
  onBack: () => void;
}

export function NurseRegisterSummary({ data, onBack }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  const { personal, professional, scope } = data;

  async function handleSubmit() {
    if (!personal || !professional || !scope) return;
    if (!acceptTerms || !acceptPrivacy) {
      toast.error('Debes aceptar los términos y la política de privacidad');
      return;
    }

    setLoading(true);
    try {
      const { userId, error } = await registerNurseIndependent({
        email: personal.email,
        password: personal.password,
        firstName: personal.firstName,
        lastName: personal.lastName,
        phone: personal.phone,
        licenseNumber: professional.license_number,
        licenseExpiry: professional.license_expiry,
        specializations: professional.specializations,
        scope: {
          home_visits: scope.home_visits,
          visible_in_network: scope.visible_in_network,
          can_share_records: scope.can_share_records,
        },
      });

      if (error || !userId) {
        toast.error(error ?? 'Error al crear la cuenta. Inténtalo de nuevo.');
        return;
      }

      toast.success('¡Cuenta creada! Revisa tu correo para verificar tu dirección.');
      router.push('/dashboard/nurse/independent');
    } catch (err) {
      toast.error('Error inesperado. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  if (!personal || !professional || !scope) {
    return <p className="text-sm text-red-500">Error: datos incompletos</p>;
  }

  return (
    <div className="space-y-6">
      {/* Verification warning */}
      <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Tu licencia quedará <strong>pendiente de verificación</strong> hasta que el equipo ASHIRA la revise. Podrás acceder al sistema en modo básico.
        </p>
      </div>

      {/* Summary cards */}
      <div className="space-y-3">
        <SummarySection title="Datos personales">
          <Row label="Nombre" value={`${personal.firstName} ${personal.lastName}`} />
          <Row label="Email" value={personal.email} />
          <Row label="Teléfono" value={personal.phone} />
          <Row label="Ubicación" value={`${personal.city}, ${personal.country}`} />
        </SummarySection>

        <SummarySection title="Datos profesionales">
          <Row label="Licencia" value={professional.license_number} />
          <Row label="Vencimiento" value={professional.license_expiry || '—'} />
          <Row label="Especializaciones" value={professional.specializations.join(', ')} />
        </SummarySection>

        <SummarySection title="Configuración">
          <Row label="Visitas domiciliarias" value={scope.home_visits ? 'Sí' : 'No'} />
          <Row label="Visible en la red" value={scope.visible_in_network ? 'Sí' : 'No'} />
          <Row label="Compartir registros" value={scope.can_share_records ? 'Sí' : 'No'} />
          <Row label="Tipo de cuenta" value="Enfermera independiente" />
        </SummarySection>
      </div>

      {/* Terms */}
      <div className="space-y-2.5">
        <CheckField checked={acceptTerms} onChange={setAcceptTerms}>
          Acepto los{' '}
          <a href="/terms" target="_blank" className="text-teal-600 hover:underline">
            Términos y Condiciones
          </a>{' '}
          de ASHIRA Software
        </CheckField>
        <CheckField checked={acceptPrivacy} onChange={setAcceptPrivacy}>
          Acepto la{' '}
          <a href="/privacy" target="_blank" className="text-teal-600 hover:underline">
            Política de Privacidad
          </a>{' '}
          y el tratamiento de mis datos de salud
        </CheckField>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="flex items-center gap-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg px-5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" /> Atrás
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || !acceptTerms || !acceptPrivacy}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 font-semibold rounded-lg px-6 py-2.5 transition-all text-sm',
            loading || !acceptTerms || !acceptPrivacy
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm hover:shadow-md'
          )}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Creando cuenta...</>
          ) : (
            <><CheckCircle className="w-4 h-4" /> Crear cuenta</>
          )}
        </button>
      </div>
    </div>
  );
}

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
      <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-900 dark:text-white text-right">{value}</span>
    </div>
  );
}

function CheckField({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all mt-0.5',
          checked ? 'bg-teal-600 border-teal-600' : 'border-gray-300 dark:border-gray-600 group-hover:border-teal-400'
        )}
      >
        {checked && <CheckCircle className="w-3.5 h-3.5 text-white" />}
      </button>
      <span className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{children}</span>
    </label>
  );
}
