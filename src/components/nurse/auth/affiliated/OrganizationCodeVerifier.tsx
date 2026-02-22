'use client';
// src/components/nurse/auth/affiliated/OrganizationCodeVerifier.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { orgCodeSchema, type OrgCodeFormData } from '@/schemas/nurse/register.schema';
import { verifyOrganizationCode } from '@/lib/supabase/nurse.service';
import { Search, CheckCircle, XCircle, Loader2, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrgResult {
  id: string;
  name: string;
  address: string | null;
}

interface Props {
  prefilledOrg?: OrgResult;
  onVerified: (org: OrgResult) => void;
}

export function OrganizationCodeVerifier({ prefilledOrg, onVerified }: Props) {
  const [result, setResult] = useState<OrgResult | null>(prefilledOrg ?? null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<OrgCodeFormData>({
    resolver: zodResolver(orgCodeSchema),
  });

  async function onSearch({ organization_code }: OrgCodeFormData) {
    setLoading(true);
    setNotFound(false);
    setResult(null);
    const { organization, error } = await verifyOrganizationCode(organization_code);
    setLoading(false);
    if (error || !organization) {
      setNotFound(true);
    } else {
      setResult(organization);
      onVerified(organization);
    }
  }

  if (prefilledOrg) {
    return (
      <div className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
        <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Organización verificada</p>
          <p className="text-sm text-emerald-800 dark:text-emerald-200 font-bold">{prefilledOrg.name}</p>
          {prefilledOrg.address && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">{prefilledOrg.address}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit(onSearch)} className="flex gap-2">
        <div className="flex-1">
          <input
            {...register('organization_code')}
            placeholder="Ingresa el código de la organización"
            className={cn(
              'w-full rounded-lg border px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-colors uppercase',
              errors.organization_code
                ? 'border-red-400'
                : 'border-gray-300 dark:border-gray-700 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 dark:focus:ring-teal-900'
            )}
          />
          {errors.organization_code && (
            <p className="text-xs text-red-500 mt-1">{errors.organization_code.message}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Verificar
        </button>
      </form>

      {result && (
        <div className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl animate-in fade-in duration-300">
          <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Organización encontrada</p>
            <p className="text-base text-gray-900 dark:text-white font-bold mt-0.5">{result.name}</p>
            {result.address && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{result.address}</p>}
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
              ¿Es esta tu organización? Si es correcta, continúa al siguiente paso.
            </p>
          </div>
        </div>
      )}

      {notFound && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">Organización no encontrada</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              Verifica el código con el administrador de tu clínica e inténtalo de nuevo.
            </p>
          </div>
        </div>
      )}

      {!result && !notFound && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900 rounded-lg">
          <Building2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            El código de organización te lo proporcionará el administrador de tu clínica.
          </p>
        </div>
      )}
    </div>
  );
}
