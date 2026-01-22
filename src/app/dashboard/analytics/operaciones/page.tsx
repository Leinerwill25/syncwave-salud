'use client';

import React, { useEffect, useState } from 'react';
import { MetricCard } from '@/components/analytics/cards/MetricCard';
import { BarChartComponent } from '@/components/analytics/charts/BarChartComponent';
import { FilterBar } from '@/components/analytics/layout/FilterBar';
import { Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import { getAppointmentStatsByOrganization, getConsultationDurationStats } from '@/lib/analytics/api-client';
import { AnalyticsFilters } from '@/lib/analytics/types/analytics.types';

export default function OperationsPage() {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    timeRange: {
      start: new Date(new Date().setMonth(new Date().getMonth() - 6)),
      end: new Date()
    }
  });

  const [appointmentStats, setAppointmentStats] = useState<any[]>([]);
  const [durationStats, setDurationStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [appointments, durations] = await Promise.all([
        getAppointmentStatsByOrganization(filters),
        getConsultationDurationStats(filters)
      ]);

      setAppointmentStats(appointments || []);
      setDurationStats(durations || {});
    } catch (error) {
      console.error('Error loading operations data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalCompleted = appointmentStats.reduce((sum: number, item: any) => sum + item.completed, 0);
  const totalCancelled = appointmentStats.reduce((sum: number, item: any) => sum + item.cancelled, 0);
  const totalScheduled = appointmentStats.reduce((sum: number, item: any) => sum + item.scheduled, 0);
  const avgAttendanceRate = appointmentStats.length > 0
    ? appointmentStats.reduce((sum: number, item: any) => sum + item.attendance_rate, 0) / appointmentStats.length
    : 0;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Analítica de Operaciones</h2>
        <p className="text-gray-600">Métricas de citas y consultas</p>
      </div>

      <FilterBar onFilterChange={setFilters} />

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Citas Completadas"
              value={totalCompleted}
              icon={<CheckCircle className="w-8 h-8 text-green-600" />}
              change={{ value: 5.2, trend: 'up' }}
            />
            <MetricCard
              title="Citas Canceladas"
              value={totalCancelled}
              icon={<XCircle className="w-8 h-8 text-red-600" />}
            />
            <MetricCard
              title="Citas Programadas"
              value={totalScheduled}
              icon={<Calendar className="w-8 h-8 text-blue-600" />}
            />
            <MetricCard
              title="Tasa de Asistencia"
              value={`${avgAttendanceRate.toFixed(1)}%`}
              icon={<Clock className="w-8 h-8 text-purple-600" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <BarChartComponent
              data={appointmentStats.slice(0, 8).map((item: any) => ({
                consultorio: item.consultorio.substring(0, 15),
                completadas: item.completed,
                canceladas: item.cancelled,
                programadas: item.scheduled
              }))}
              xKey="consultorio"
              bars={[
                { dataKey: 'completadas', name: 'Completadas', color: '#10b981' },
                { dataKey: 'canceladas', name: 'Canceladas', color: '#ef4444' },
                { dataKey: 'programadas', name: 'Programadas', color: '#3b82f6' }
              ]}
              title="Performance por Consultorio"
              subtitle="Distribución de citas por estado"
            />

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Duración de Consultas</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Duración Promedio</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {durationStats.avg_duration_minutes || 0} min
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Duración Mediana</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {durationStats.median_duration_minutes || 0} min
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

