import React from 'react';
import { getCurrentOrganizationId } from '@/lib/clinic-auth';
import { getSpecialistDetails } from '@/lib/actions/analytics';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';
import { notFound } from 'next/navigation';

export default async function SpecialistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const organizationId = await getCurrentOrganizationId();
  const { id } = await params;
  
  if (!organizationId) return <div>Error</div>;

  const details = await getSpecialistDetails(organizationId, id);
  if (!details) notFound();

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-100">
        <h1 className="text-2xl font-bold text-slate-900">{details.name}</h1>
        <p className="text-slate-500">{details.email}</p>
        <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
            {details.role}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-100">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Historial de Consultas (Últimos 6 meses)</h3>
        <AnalyticsChart type="bar" data={details.history} dataKey="value" height={300} />
      </div>
    </div>
  );
}
