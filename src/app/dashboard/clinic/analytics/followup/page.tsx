import React from 'react';
import { getCurrentOrganizationId } from '@/lib/clinic-auth';
import { getFollowUpStats } from '@/lib/actions/analytics';
import { KPICard } from '@/components/analytics/KPICard';
import { Users, Repeat } from 'lucide-react';

export default async function AnalyticsFollowupPage() {
  const organizationId = await getCurrentOrganizationId();
  if (!organizationId) return <div>Error</div>;

  const stats = await getFollowUpStats(organizationId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Analítica de Seguimiento</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard 
            title="Tasa de Retención" 
            value={`${stats.retentionRate}%`} 
            icon={Repeat}
            subtitle="Pacientes que regresan"
        />
        <KPICard 
            title="Pacientes Recurrentes" 
            value={stats.returningPatients} 
            icon={Users}
        />
        <KPICard 
            title="Total Pacientes Únicos" 
            value={stats.totalPatients} 
            icon={Users}
        />
      </div>
    </div>
  );
}
