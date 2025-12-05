import React from 'react';
import { getCurrentOrganizationId } from '@/lib/clinic-auth';
import { getConsultationBreakdown } from '@/lib/actions/analytics';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';

export default async function AnalyticsConsultationsPage() {
  const organizationId = await getCurrentOrganizationId();
  if (!organizationId) return <div>Error</div>;

  const breakdown = await getConsultationBreakdown(organizationId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Analítica de Total de Consulta</h1>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-100">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Consultas por Mes</h3>
        <AnalyticsChart type="area" data={breakdown} dataKey="value" height={400} colors={['#8b5cf6']} />
      </div>
    </div>
  );
}
