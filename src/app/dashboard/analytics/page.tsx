'use client';

import React, { useEffect, useState } from 'react';
import { MetricCard } from '@/components/analytics/cards/MetricCard';
import { FilterBar } from '@/components/analytics/layout/FilterBar';
import { EpidemiologyRanking } from '@/components/analytics/charts/EpidemiologyRanking';
import { LineChartComponent } from '@/components/analytics/charts/LineChartComponent';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  Building2,
  UserCheck,
  UserMinus,
  TrendingUp,
  ArrowUpRight,
  BarChart3,
  Globe
} from 'lucide-react';
import { 
  getTopDiagnoses, 
  getAppointmentStatsByOrganization, 
  getRevenueByPeriod, 
  getPatientCount,
  getExtraStats,
  getOrganizations,
  getNetworkStats,
  AnalyticsFilters
} from '@/lib/analytics/api-client';
import { motion } from 'framer-motion';

// Helper para calcular el cambio porcentual con protección contra saltos irreales
function calculateChange(current: number, previous: number) {
  // Si el previo es 0 o muy pequeño, y el actual es alto, mostramos un indicador de crecimiento neto
  if (previous <= 5) {
    if (current > 5) return { value: 100, trend: 'up' as const, isNew: true };
    return { value: 0, trend: 'neutral' as const };
  }
  
  const change = ((current - previous) / previous) * 100;
  
  // Limitar porcentajes absurdos para mantener la sobriedad del dashboard
  const cappedValue = Math.min(Math.abs(change), 999);
  
  return {
    value: Math.round(cappedValue * 10) / 10,
    trend: change >= 0 ? 'up' : 'down' as 'up' | 'down' | 'neutral'
  };
}

export default function AnalyticsOverviewPage() {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    timeRange: {
      start: new Date(new Date().setMonth(new Date().getMonth() - 6)),
      end: new Date()
    }
  });

  const [data, setData] = useState<any>({
    current: {
      diagnoses: [],
      appointments: [],
      revenue: [],
      unregistered: { total: 0, recurring: 0 }
    },
    previous: {
      appointments: [],
      revenue: [],
      unregistered: { total: 0, recurring: 0 }
    },
    network: {
      organizations: 0,
      patients: 0,
      staff: 0
    }
  });
  const [organizationsList, setOrganizationsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadInitialData = async () => {
    try {
      const orgs = await getOrganizations();
      setOrganizationsList(orgs || []);
    } catch (err) {
      console.error('Error loading initial analytics data:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Calcular periodo anterior
      const duration = filters.timeRange.end.getTime() - filters.timeRange.start.getTime();
      const prevEnd = new Date(filters.timeRange.start);
      const prevStart = new Date(prevEnd.getTime() - duration);
      
      const prevFilters = { ...filters, timeRange: { start: prevStart, end: prevEnd } };

      const [
        diagnoses, appointments, revenue, extra, network,
        prevAppointments, prevRevenue, prevExtra
      ] = await Promise.all([
        getTopDiagnoses(filters, 6),
        getAppointmentStatsByOrganization(filters),
        getRevenueByPeriod(filters),
        getExtraStats(filters),
        getNetworkStats(filters),
        // Datos previos para comparación
        getAppointmentStatsByOrganization(prevFilters),
        getRevenueByPeriod(prevFilters),
        getExtraStats(prevFilters)
      ]);

      setData({
        current: {
          diagnoses: diagnoses || [],
          appointments: appointments || [],
          revenue: revenue || [],
          unregistered: extra.unregistered
        },
        previous: {
          appointments: prevAppointments || [],
          revenue: prevRevenue || [],
          unregistered: prevExtra.unregistered
        },
        orgEvolution: extra.evolution,
        network: network || { organizations: 0, patients: 0, staff: 0 }
      });
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cálculos de métricas actuales
  // Cálculos de métricas actuales con protección
  const currentAppts = data?.current?.appointments?.reduce((s:any, i:any) => s + (i.total || 0), 0) || 0;
  const prevAppts = data?.previous?.appointments?.reduce((s:any, i:any) => s + (i.total || 0), 0) || 0;
  
  const currentRevenue = data?.current?.revenue?.reduce((s:any, i:any) => s + (i.total_revenue || 0), 0) || 0;
  const prevRevenue = data?.previous?.revenue?.reduce((s:any, i:any) => s + (i.total_revenue || 0), 0) || 0;

  const currentUnreg = data?.current?.unregistered?.total || 0;
  const prevUnreg = data?.previous?.unregistered?.total || 0;

  const currentRecurring = data?.current?.unregistered?.recurring || 0;
  const prevRecurring = data?.previous?.unregistered?.recurring || 0;

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      {/* Shadcn Optimized Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between py-10">
        <div className="space-y-1">
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Analítica <span className="text-indigo-600">Global</span>
          </h2>
          <p className="text-lg text-slate-500 font-medium max-w-2xl">
            Monitoreo inteligente del rendimiento y crecimiento de la red ASHIRA.
          </p>
        </div>
        <div className="flex flex-shrink-0">
           <FilterBar 
             onFilterChange={setFilters} 
             organizations={organizationsList}
             className="bg-slate-50/50 p-2 rounded-2xl border border-slate-100" 
           />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
            <BarChart3 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 w-6 h-6" />
          </div>
          <p className="mt-6 text-slate-500 font-bold tracking-tight text-lg animate-pulse">Sincronizando métricas de la red...</p>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-8"
        >
          {/* Row 1: Gestión Corporativa y Clínica */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="CLÍNICAS REGISTRADAS"
              value={data.network.organizations}
              subtitle="Red de salud activa"
              icon={<Building2 className="w-5 h-5 text-indigo-600" />}
              delay={0.1}
            />
            <MetricCard
              title="PERSONAL CORPORATIVO"
              value={data.network.staff}
              subtitle="Médicos y administrativos"
              icon={<Globe className="w-5 h-5 text-indigo-600" />}
              delay={0.2}
            />
            <MetricCard
              title="CITAS TOTALES"
              value={currentAppts.toLocaleString()}
              subtitle="vs. período anterior"
              icon={<Calendar className="h-5 w-5 text-slate-900" />}
              change={calculateChange(currentAppts, prevAppts)}
              delay={0.3}
            />
            <MetricCard
              title="INGRESOS GLOBALES"
              value={`$${currentRevenue.toLocaleString()}`}
              subtitle="vs. período anterior"
              icon={<DollarSign className="h-5 w-5 text-slate-900" />}
              change={calculateChange(currentRevenue, prevRevenue)}
              delay={0.4}
            />
          </div>

          {/* Row 2: Análisis de Pacientes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <MetricCard
              title="PACIENTES CON REGISTRO"
              value={data.network.patients.toLocaleString()}
              subtitle="Pacientes con perfil completo"
              icon={<UserCheck className="w-5 h-5 text-emerald-600" />}
              delay={0.5}
            />
            <MetricCard
              title="TOTAL PACIENTES (NO REG)"
              value={currentUnreg.toLocaleString()}
              subtitle="Pacientes sin perfil completo"
              icon={<Users className="w-5 h-5 text-slate-900" />}
              change={calculateChange(currentUnreg, prevUnreg)}
              delay={0.6}
            />
            <MetricCard
              title="PACIENTES RECURRENTES"
              value={currentRecurring.toLocaleString()}
              subtitle="2 o más citas registradas"
              icon={<UserMinus className="w-5 h-5 text-slate-900" />}
              change={calculateChange(currentRecurring, prevRecurring)}
              delay={0.7}
            />
          </div>

          {/* Evolution Chart Section - NOW MULTI-LINE */}
          <div className="grid gap-8 lg:grid-cols-7">
            <div className="lg:col-span-4">
              <LineChartComponent
                data={data.orgEvolution?.chartData || []}
                xKey="month"
                lines={(data.orgEvolution?.organizations || []).map((org: string, idx: number) => ({
                  dataKey: org,
                  name: org,
                  color: [
                    '#6366f1', '#10b981', '#f59e0b', '#ef4444', 
                    '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'
                  ][idx % 8]
                }))}
                title="Evolución de Organizaciones"
                subtitle="Crecimiento de actividad (citas) por clínica en el tiempo"
              />
            </div>
            
            <div className="lg:col-span-3">
              <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-slate-900">Top Organizaciones</h3>
                    <p className="text-sm text-slate-500">Por volumen de atención</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-slate-600" />
                  </div>
                </div>

                <div className="flex-1 space-y-6">
                  {data.current.appointments.slice(0, 5).map((org: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between group">
                      <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center font-bold text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{org.consultorio}</p>
                          <p className="text-xs text-slate-500">{org.total} citas gestionadas</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-baseline space-x-1">
                          <span className="text-sm font-extrabold text-slate-900">
                            {((org.completed / (org.total || 1)) * 100).toFixed(0)}%
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">({org.completed})</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-tighter">Éxito Real</span>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="mt-8 w-full inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800">
                  Descargar Reporte Completo
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Secondary Charts Section */}
          <div className="grid gap-8 lg:grid-cols-2">
            <LineChartComponent
              data={data.current.revenue}
              xKey="period"
              lines={[
                { dataKey: 'total_revenue', name: 'Ingresos Mensuales', color: '#10b981' }
              ]}
              title="Rendimiento Financiero"
              subtitle="Evolución de cobros por período"
              valuePrefix="$"
            />

            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-900">Análisis Epidemiológico</h3>
                  <p className="text-sm text-slate-500">Prevalencia de diagnósticos en la red</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                </div>
              </div>
              <EpidemiologyRanking data={data.current.diagnoses} />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

