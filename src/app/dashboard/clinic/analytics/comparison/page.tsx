import React from 'react';
import { getCurrentOrganizationId } from '@/lib/clinic-auth';
import { getAppointmentVsConsultationStats } from '@/lib/actions/analytics';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';

export default async function AnalyticsComparisonPage() {
  const organizationId = await getCurrentOrganizationId();
  if (!organizationId) return <div>Error</div>;

  const data = await getAppointmentVsConsultationStats(organizationId, 'month');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Comparación Citas vs Consultas</h1>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-100">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Conversión (Mes Actual)</h3>
        <AnalyticsChart type="bar" data={data} dataKey="value" height={400} colors={['#f59e0b']} />
        <p className="mt-4 text-sm text-slate-500 text-center">
            Comparativa entre el número de citas agendadas y las consultas efectivamente realizadas.
        </p>
      </div>
    </div>
  );
}
