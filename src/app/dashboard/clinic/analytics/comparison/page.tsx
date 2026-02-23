import React from 'react';
import { getCurrentOrganizationId } from '@/lib/clinic-auth';
import { getAppointmentVsConsultationStats } from '@/lib/actions/analytics';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';

export const dynamic = 'force-dynamic';

export default async function AnalyticsComparisonPage() {
  try {
    const organizationId = await getCurrentOrganizationId();
    if (!organizationId) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="p-4 rounded-2xl bg-slate-50 mb-4 text-slate-300">?</div>
          <p className="text-slate-500 text-sm">No se pudo identificar la organización.</p>
        </div>
      );
    }

    const data = await getAppointmentVsConsultationStats(organizationId, 'month');

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Comparación Citas vs Consultas</h1>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-100">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Conversión (Mes Actual)</h3>
          <AnalyticsChart type="bar" data={data || []} dataKey="value" height={400} colors={['#f59e0b']} />
          <p className="mt-4 text-sm text-slate-500 text-center">
              Comparativa entre el número de citas agendadas y las consultas efectivamente realizadas.
          </p>
        </div>
      </div>
    );
  } catch (error) {
    console.error('[Comparison Page] Critical crash:', error);
    return (
      <div className="p-8 bg-white rounded-2xl border border-rose-100 shadow-sm text-center">
        <h2 className="text-lg font-bold text-rose-600 mb-2">Error cargando comparativa</h2>
        <p className="text-slate-500 text-sm">No se pudieron procesar los datos de conversión. Por favor, intente más tarde.</p>
      </div>
    );
  }
}
