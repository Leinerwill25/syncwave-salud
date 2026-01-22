'use client';

import React, { useEffect, useState } from 'react';
import { MetricCard } from '@/components/analytics/cards/MetricCard';
import { BarChartComponent } from '@/components/analytics/charts/BarChartComponent';
import { FilterBar } from '@/components/analytics/layout/FilterBar';
import { Activity, Users, Calendar, DollarSign } from 'lucide-react';
import { getTopDiagnoses, getAppointmentStatsByOrganization, getRevenueByPeriod, getPatientCount } from '@/lib/analytics/api-client';
import { AnalyticsFilters } from '@/lib/analytics/types/analytics.types';

export default function AnalyticsOverviewPage() {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    timeRange: {
      start: new Date(new Date().setMonth(new Date().getMonth() - 6)),
      end: new Date()
    }
  });

  const [topDiagnoses, setTopDiagnoses] = useState<any[]>([]);
  const [appointmentStats, setAppointmentStats] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [patientCount, setPatientCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [diagnoses, appointments, revenue, patients] = await Promise.all([
        getTopDiagnoses(filters, 5),
        getAppointmentStatsByOrganization(filters),
        getRevenueByPeriod(filters),
        getPatientCount(filters)
      ]);

      setTopDiagnoses(diagnoses || []);
      setAppointmentStats(appointments || []);
      setRevenueData(revenue || []);
      setPatientCount(patients || 0);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalAppointments = appointmentStats.reduce((sum: number, item: any) => 
    sum + item.completed + item.cancelled + item.scheduled, 0);
  
  const totalRevenue = revenueData.reduce((sum: number, item: any) => 
    sum + item.total_revenue, 0);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Overview Dashboard</h2>
        <p className="text-gray-600">Resumen general de métricas de la plataforma</p>
      </div>

      <FilterBar onFilterChange={setFilters} />

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Cargando datos...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Total Diagnósticos"
              value={topDiagnoses.reduce((sum: number, item: any) => sum + item.count, 0)}
              icon={<Activity className="w-8 h-8 text-blue-600" />}
              change={{ value: 12.5, trend: 'up' }}
            />
            <MetricCard
              title="Total Citas"
              value={totalAppointments}
              icon={<Calendar className="w-8 h-8 text-green-600" />}
              change={{ value: 8.3, trend: 'up' }}
            />
            <MetricCard
              title="Ingresos Totales"
              value={`${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              icon={<DollarSign className="w-8 h-8 text-yellow-600" />}
              change={{ value: 15.2, trend: 'up' }}
            />
            <MetricCard
              title="Pacientes Activos"
              value={patientCount.toLocaleString()}
              icon={<Users className="w-8 h-8 text-purple-600" />}
              subtitle="Últimos 6 meses"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BarChartComponent
              data={topDiagnoses.map((item: any) => ({
                diagnosis: item.diagnosis.substring(0, 20),
                count: item.count
              }))}
              xKey="diagnosis"
              bars={[
                { dataKey: 'count', name: 'Casos', color: '#3b82f6' }
              ]}
              title="Top 5 Diagnósticos"
              subtitle="Diagnósticos más frecuentes en el período seleccionado"
            />

            <BarChartComponent
              data={appointmentStats.slice(0, 5).map((item: any) => ({
                consultorio: item.consultorio.substring(0, 15),
                completadas: item.completed,
                canceladas: item.cancelled
              }))}
              xKey="consultorio"
              bars={[
                { dataKey: 'completadas', name: 'Completadas', color: '#10b981' },
                { dataKey: 'canceladas', name: 'Canceladas', color: '#ef4444' }
              ]}
              title="Performance de Consultorios"
              subtitle="Citas completadas vs canceladas"
            />
          </div>
        </>
      )}
    </div>
  );
}

