import React from 'react';
import { getCurrentOrganizationId } from '@/lib/clinic-auth';
import { getFollowUpStats } from '@/lib/actions/analytics';
import { KPICard } from '@/components/analytics/KPICard';
import { Users, Repeat } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AnalyticsFollowupPage() {
  try {
    const organizationId = await getCurrentOrganizationId();
    if (!organizationId) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="p-4 rounded-2xl bg-slate-50 mb-4"><Users className="w-8 h-8 text-slate-300" /></div>
          <p className="text-slate-500 text-sm">No se pudo identificar la organización.</p>
        </div>
      );
    }

    const stats = await getFollowUpStats(organizationId);

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Analítica de Seguimiento</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KPICard 
              title="Tasa de Retención" 
              value={`${stats?.retentionRate ?? 0}%`} 
              icon={Repeat}
              subtitle="Pacientes que regresan"
          />
          <KPICard 
              title="Pacientes Recurrentes" 
              value={stats?.returningPatients ?? 0} 
              icon={Users}
          />
          <KPICard 
              title="Total Pacientes Únicos" 
              value={stats?.totalPatients ?? 0} 
              icon={Users}
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error('[Followup Page] Critical crash:', error);
    return (
      <div className="p-8 bg-white rounded-2xl border border-rose-100 shadow-sm text-center">
        <h2 className="text-lg font-bold text-rose-600 mb-2">Error cargando seguimiento</h2>
        <p className="text-slate-500 text-sm">No se pudieron procesar los datos de retención. Por favor, intente más tarde.</p>
      </div>
    );
  }
}
