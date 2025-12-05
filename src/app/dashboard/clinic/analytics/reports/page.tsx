import React from 'react';
import { getCurrentOrganizationId } from '@/lib/clinic-auth';
import { getClinicGeneralStats, getFinancialReports, Period } from '@/lib/actions/analytics';
import { DownloadButton } from '@/components/analytics/DownloadButton';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';
import { FileText, Filter } from 'lucide-react';
import Link from 'next/link';

export default async function AnalyticsReportsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const organizationId = await getCurrentOrganizationId();
  const { period: rawPeriod } = await searchParams;
  const period = (rawPeriod as Period) || 'month';

  if (!organizationId) {
    return <div className="p-6 text-center text-slate-500">No se pudo identificar la organización.</div>;
  }

  const [stats, financialData] = await Promise.all([
    getClinicGeneralStats(organizationId, period),
    getFinancialReports(organizationId, 'year') // Financial report usually looks better over a year
  ]);

  // Prepare data for download
  const reportData = [
    { Metrica: 'Total Consultas', Valor: stats.totalConsultations },
    { Metrica: 'Total Pacientes', Valor: stats.totalPatients },
    { Metrica: 'Ingresos Totales', Valor: stats.totalIncome },
    { Metrica: 'Especialistas Activos', Valor: stats.activeSpecialists },
    ...financialData.map(d => ({ Metrica: `Ingresos ${d.name}`, Valor: d.value }))
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analítica de Reportes</h1>
          <p className="text-slate-500">Generación de reportes y exportación de datos</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="flex items-center bg-white rounded-lg border border-slate-200 p-1">
                <Link href="?period=week" className={`px-3 py-1 text-sm rounded-md transition-colors ${period === 'week' ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Semana</Link>
                <Link href="?period=month" className={`px-3 py-1 text-sm rounded-md transition-colors ${period === 'month' ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Mes</Link>
                <Link href="?period=year" className={`px-3 py-1 text-sm rounded-md transition-colors ${period === 'year' ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Año</Link>
            </div>
            <DownloadButton data={reportData} fileName={`reporte_clinica_${period}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-600" />
                Resumen del Periodo ({period === 'week' ? 'Semana' : period === 'month' ? 'Mes' : 'Año'})
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                <div>
                    <dt className="text-sm text-slate-500">Consultas Realizadas</dt>
                    <dd className="text-2xl font-semibold text-slate-900">{stats.totalConsultations}</dd>
                </div>
                <div>
                    <dt className="text-sm text-slate-500">Pacientes Atendidos</dt>
                    <dd className="text-2xl font-semibold text-slate-900">{stats.totalPatients}</dd>
                </div>
                <div>
                    <dt className="text-sm text-slate-500">Ingresos Generados</dt>
                    <dd className="text-2xl font-semibold text-emerald-600">${stats.totalIncome.toLocaleString()}</dd>
                </div>
                <div>
                    <dt className="text-sm text-slate-500">Especialistas Activos</dt>
                    <dd className="text-2xl font-semibold text-slate-900">{stats.activeSpecialists}</dd>
                </div>
            </dl>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Tendencia de Ingresos (Anual)</h3>
            <AnalyticsChart type="area" data={financialData} dataKey="value" height={200} />
        </div>
      </div>
    </div>
  );
}
