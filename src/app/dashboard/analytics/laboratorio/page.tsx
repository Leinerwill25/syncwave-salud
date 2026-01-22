'use client';

import React, { useEffect, useState } from 'react';
import { MetricCard } from '@/components/analytics/cards/MetricCard';
import { BarChartComponent } from '@/components/analytics/charts/BarChartComponent';
import { FilterBar } from '@/components/analytics/layout/FilterBar';
import { FlaskConical, AlertTriangle, Clock } from 'lucide-react';
import { getLabResultStats } from '@/lib/analytics/api-client';
import { AnalyticsFilters } from '@/lib/analytics/types/analytics.types';

export default function LaboratoryPage() {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    timeRange: {
      start: new Date(new Date().setMonth(new Date().getMonth() - 6)),
      end: new Date()
    }
  });

  const [labStats, setLabStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getLabResultStats(filters);
      setLabStats(data || []);
    } catch (error) {
      console.error('Error loading laboratory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalOrders = labStats.reduce((sum: number, item: any) => 
    sum + item.total_orders, 0);
  
  const criticalCount = labStats.reduce((sum: number, item: any) => 
    sum + item.critical_count, 0);

  const avgTurnaround = labStats.length > 0
    ? labStats.reduce((sum: number, item: any) => sum + item.avg_turnaround_days, 0) / labStats.length
    : 0;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Analítica de Laboratorio</h2>
        <p className="text-gray-600">Resultados y tiempos de entrega</p>
      </div>

      <FilterBar onFilterChange={setFilters} showRegionFilter={false} />

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <MetricCard
              title="Total Órdenes"
              value={totalOrders}
              icon={<FlaskConical className="w-8 h-8 text-blue-600" />}
              change={{ value: 10.5, trend: 'up' }}
            />
            <MetricCard
              title="Resultados Críticos"
              value={criticalCount}
              icon={<AlertTriangle className="w-8 h-8 text-red-600" />}
            />
            <MetricCard
              title="Tiempo Promedio"
              value={`${avgTurnaround.toFixed(1)} días`}
              icon={<Clock className="w-8 h-8 text-purple-600" />}
              subtitle="Entrega de resultados"
            />
          </div>

          <BarChartComponent
            data={labStats.map((item: any) => ({
              tipo: item.result_type.substring(0, 20),
              total: item.total_orders,
              criticos: item.critical_count
            }))}
            xKey="tipo"
            bars={[
              { dataKey: 'total', name: 'Total Órdenes', color: '#3b82f6' },
              { dataKey: 'criticos', name: 'Críticos', color: '#ef4444' }
            ]}
            title="Órdenes por Tipo de Resultado"
            subtitle="Distribución de órdenes de laboratorio"
          />
        </>
      )}
    </div>
  );
}

