import React from 'react';
import { getCurrentOrganizationId } from '@/lib/clinic-auth';
import { getClinicGeneralStats, getFinancialReports, getDiagnosesStats } from '@/lib/actions/analytics';
import { KPICard } from '@/components/analytics/KPICard';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';
import { Activity, Users, DollarSign, Stethoscope } from 'lucide-react';

export default async function AnalyticsKPIsPage() {
  const organizationId = await getCurrentOrganizationId();

  if (!organizationId) {
    return <div className="p-6 text-center text-slate-500">No se pudo identificar la organización.</div>;
  }

  const [stats, financialData, diagnosesData] = await Promise.all([
    getClinicGeneralStats(organizationId, 'month'),
    getFinancialReports(organizationId, 'year'),
    getDiagnosesStats(organizationId)
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Estadísticas y KPIs</h1>
          <p className="text-slate-500">Indicadores clave de rendimiento e inteligencia de negocio</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
            title="Consultas (Mes)" 
            value={stats.totalConsultations} 
            icon={Activity}
            trend={{ value: 12, isPositive: true }} // Mock trend for now
        />
        <KPICard 
            title="Pacientes (Mes)" 
            value={stats.totalPatients} 
            icon={Users}
            trend={{ value: 5, isPositive: true }}
        />
        <KPICard 
            title="Ingresos (Mes)" 
            value={`$${stats.totalIncome.toLocaleString()}`} 
            icon={DollarSign}
            trend={{ value: 8, isPositive: true }}
        />
        <KPICard 
            title="Especialistas" 
            value={stats.activeSpecialists} 
            icon={Stethoscope}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Ingresos Anuales</h3>
            <AnalyticsChart type="bar" data={financialData} dataKey="value" height={300} />
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Top Diagnósticos</h3>
            <AnalyticsChart type="pie" data={diagnosesData} dataKey="value" height={300} />
        </div>
      </div>
    </div>
  );
}
