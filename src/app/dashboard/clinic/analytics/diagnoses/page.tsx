import React from 'react';
import { getCurrentOrganizationId } from '@/lib/clinic-auth';
import { getDiagnosesStats } from '@/lib/actions/analytics';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';

export default async function AnalyticsDiagnosesPage() {
  const organizationId = await getCurrentOrganizationId();
  if (!organizationId) return <div>Error</div>;

  const diagnoses = await getDiagnosesStats(organizationId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Analítica de Diagnósticos</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Distribución de Diagnósticos</h3>
            <AnalyticsChart type="pie" data={diagnoses} dataKey="value" height={300} />
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Top 5 Diagnósticos</h3>
            <ul className="space-y-3">
                {diagnoses.map((d, i) => (
                    <li key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="font-medium text-slate-700">{d.name}</span>
                        <span className="text-slate-900 font-bold">{d.value}</span>
                    </li>
                ))}
            </ul>
        </div>
      </div>
    </div>
  );
}
