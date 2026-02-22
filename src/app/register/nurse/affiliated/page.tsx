'use client';
// src/app/register/nurse/affiliated/page.tsx
// ─── Registro de Enfermera Afiliada (4 pasos) ─────────────
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { toast } from 'sonner';
import { Check, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { OrganizationCodeVerifier } from '@/components/nurse/auth/affiliated/OrganizationCodeVerifier';
import { NurseAffiliationConfirmation } from '@/components/nurse/auth/affiliated/NurseAffiliationConfirmation';
import { NursePendingApprovalScreen } from '@/components/nurse/auth/affiliated/NursePendingApprovalScreen';
import { NursePersonalDataForm } from '@/components/nurse/auth/NursePersonalDataForm';
import { NurseProfessionalDataForm } from '@/components/nurse/auth/NurseProfessionalDataForm';
import { registerNurseAffiliated } from '@/lib/supabase/nurse.service';
import type { PersonalDataFormData, ProfessionalDataFormData } from '@/schemas/nurse/register.schema';
import { cn } from '@/lib/utils';

interface OrgData { id: string; name: string; address: string | null }

const STEPS = [
  { label: 'Organización' },
  { label: 'Datos personales' },
  { label: 'Datos profesionales' },
  { label: 'Confirmación' },
];

function AffiliatedRegisterContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL token pre-fills org (from admin invite link)
  const tokenOrgId   = searchParams.get('org_id') ?? undefined;
  const tokenOrgName = searchParams.get('org_name') ? decodeURIComponent(searchParams.get('org_name')!) : undefined;
  const prefilledOrg: OrgData | undefined = tokenOrgId && tokenOrgName
    ? { id: tokenOrgId, name: tokenOrgName, address: null }
    : undefined;

  const [step, setStep]               = useState(prefilledOrg ? 1 : 0);
  const [org, setOrg]                 = useState<OrgData | null>(prefilledOrg ?? null);
  const [personal, setPersonal]       = useState<PersonalDataFormData | null>(null);
  const [professional, setProfessional] = useState<ProfessionalDataFormData | null>(null);
  const [loading, setLoading]         = useState(false);
  const [done, setDone]               = useState(false);

  async function handleFinalSubmit() {
    if (!org || !personal || !professional) return;
    setLoading(true);
    try {
      const { error } = await registerNurseAffiliated({
        email: personal.email,
        password: personal.password,
        firstName: personal.firstName,
        lastName: personal.lastName,
        licenseNumber: professional.license_number,
        licenseExpiry: professional.license_expiry,
        specializations: professional.specializations,
        organizationId: org.id,
        positionTitle: professional.position_title,
        requiresApproval: true, // always requires admin approval for manual registration
      });

      if (error) { toast.error(error); return; }
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done && personal) {
    return <NursePendingApprovalScreen organizationName={org!.name} email={personal.email} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col items-center px-4 py-8">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg mb-3">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">ASHIRA Software · Registro Afiliada</p>
      </div>

      {/* Stepper */}
      <div className="w-full max-w-2xl mb-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 right-0 top-4 h-0.5 bg-gray-200 dark:bg-gray-800 z-0" />
          <div className="absolute left-0 top-4 h-0.5 bg-teal-500 z-0 transition-all duration-500" style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
          {STEPS.map((s, i) => {
            const done = i < step, active = i === step;
            return (
              <div key={s.label} className="flex flex-col items-center z-10">
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all', done ? 'bg-teal-500 border-teal-500 text-white' : active ? 'bg-white dark:bg-gray-900 border-teal-500 text-teal-600' : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-400')}>
                  {done ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <p className={cn('text-[10px] font-semibold mt-2 hidden sm:block', active || done ? 'text-gray-900 dark:text-white' : 'text-gray-400')}>{s.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{STEPS[step].label}</h2>
        </div>
        <div className="p-6">
          {step === 0 && (
            <>
              <OrganizationCodeVerifier
                prefilledOrg={prefilledOrg}
                onVerified={(o) => setOrg(o)}
              />
              {org && (
                <div className="mt-6">
                  <NurseAffiliationConfirmation organizationName={org.name} onConfirm={() => setStep(1)} onBack={() => { setOrg(null); }} />
                </div>
              )}
            </>
          )}
          {step === 1 && (
            <NursePersonalDataForm
              defaultValues={personal ?? undefined}
              onSubmit={(data) => { setPersonal(data); setStep(2); }}
            />
          )}
          {step === 2 && (
            <NurseProfessionalDataForm
              defaultValues={professional ?? undefined}
              onSubmit={(data) => { setProfessional(data); setStep(3); }}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && org && personal && professional && (
            <div className="space-y-5">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Resumen</p>
                <Row label="Organización" value={org.name} />
                <Row label="Nombre" value={`${personal.firstName} ${personal.lastName}`} />
                <Row label="Email" value={personal.email} />
                <Row label="Licencia" value={professional.license_number} />
                <Row label="Especializaciones" value={professional.specializations.join(', ')} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex items-center gap-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Atrás
                </button>
                <button
                  onClick={handleFinalSubmit}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors"
                >
                  {loading ? 'Enviando...' : <>Solicitar ingreso a {org.name} <ChevronRight className="w-4 h-4" /></>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-gray-400 dark:text-gray-600 text-center">
        ¿Eres independiente?{' '}
        <a href="/register/nurse" className="text-teal-600 dark:text-teal-400 hover:underline font-medium">
          Regístrate aquí
        </a>
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}

export default function NurseAffiliatedRegisterPage() {
  return (
    <Suspense>
      <AffiliatedRegisterContent />
    </Suspense>
  );
}
