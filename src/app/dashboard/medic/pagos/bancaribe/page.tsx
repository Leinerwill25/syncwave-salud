'use client';

import React, { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/app/adapters/client';
import { DashboardFinanciero } from '@/components/bancaribe/DashboardFinanciero';
import { Loader2, Landmark } from 'lucide-react';

export default function BancaribePage() {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          throw new Error('No autorizado o sesión expirada.');
        }
        const session = await res.json();
        
        if (!session.organizationId) {
          throw new Error('No posees una organización asociada.');
        }

        setOrganizationId(session.organizationId);

        // Fetch organization name
        const supabase = createSupabaseBrowserClient();
        const { data: org, error: orgError } = await supabase
          .from('organization')
          .select('name, type')
          .eq('id', session.organizationId)
          .single();

        if (orgError || !org) {
          throw new Error('Organización no encontrada.');
        }

        if (org.type !== 'CONSULTORIO') {
          throw new Error('Esta integración es exclusiva para organizaciones de tipo CONSULTORIO.');
        }

        setOrgName(org.name || 'Mi Consultorio');
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Error cargando datos del consultorio.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
        <p className="text-sm font-semibold text-slate-500">Cargando panel financiero...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-lg mx-auto bg-white rounded-2xl border border-red-100 shadow-sm text-center space-y-4 my-12">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto text-xl font-bold">
          !
        </div>
        <h3 className="text-lg font-bold text-slate-900">Error de Acceso</h3>
        <p className="text-sm text-slate-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 min-h-screen space-y-6">
      {organizationId && (
        <DashboardFinanciero organizationId={organizationId} orgName={orgName} />
      )}
    </div>
  );
}
