'use client';

import React, { useEffect, useState } from 'react';
import { MetricCard } from '@/components/analytics/cards/MetricCard';
import { BarChartComponent } from '@/components/analytics/charts/BarChartComponent';
import { FilterBar } from '@/components/analytics/layout/FilterBar';
import { Activity, MapPin, TrendingUp, AlertCircle } from 'lucide-react';
import { getDiagnosisByRegion, getTopDiagnoses } from '@/lib/analytics/api-client';
import { AnalyticsFilters } from '@/lib/analytics/types/analytics.types';
import { PieChartComponent } from '@/components/analytics/charts/PieChartComponent';
import { DataTable } from '@/components/analytics/tables/DataTable';

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];

export default function EpidemiologyPage() {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    timeRange: {
      start: new Date(new Date().setMonth(new Date().getMonth() - 6)),
      end: new Date()
    }
  });

  const [diagnosisByRegion, setDiagnosisByRegion] = useState<any[]>([]);
  const [topDiagnoses, setTopDiagnoses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [byRegion, top] = await Promise.all([
        getDiagnosisByRegion(filters),
        getTopDiagnoses(filters, 10)
      ]);

      setDiagnosisByRegion(byRegion || []);
      setTopDiagnoses(top || []);
    } catch (error) {
      console.error('Error loading epidemiology data:', error);
    } finally {
      setLoading(false);
    }
  };

  const regionStats = diagnosisByRegion.reduce((acc: any, item: any) => {
    if (!acc[item.region]) {
      acc[item.region] = { region: item.region, total: 0 };
    }
    acc[item.region].total += item.count;
    return acc;
  }, {});

  const regionData = Object.values(regionStats);
  const totalCases = topDiagnoses.reduce((sum: number, item: any) => sum + item.count, 0);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Análisis Epidemiológico</h2>
        <p className="text-gray-600">Patrones de salud por región y diagnóstico</p>
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
              title="Total Diagnósticos"
              value={totalCases.toLocaleString()}
              icon={<Activity className="w-8 h-8 text-blue-600" />}
              change={{ value: 12.5, trend: 'up' }}
            />
            <MetricCard
              title="Regiones Activas"
              value={regionData.length}
              icon={<MapPin className="w-8 h-8 text-green-600" />}
            />
            <MetricCard
              title="Casos Críticos"
              value="23"
              icon={<AlertCircle className="w-8 h-8 text-red-600" />}
            />
            <MetricCard
              title="Diagnósticos Únicos"
              value={topDiagnoses.length}
              icon={<TrendingUp className="w-8 h-8 text-purple-600" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <PieChartComponent
              data={regionData.slice(0, 5) as any[]}
              dataKey="total"
              nameKey="region"
              title="Distribución por Región"
              colors={COLORS}
            />

            <BarChartComponent
              data={topDiagnoses.slice(0, 8).map((item: any) => ({
                diagnosis: item.diagnosis.substring(0, 25),
                count: item.count,
                percentage: item.percentage.toFixed(1)
              }))}
              xKey="diagnosis"
              bars={[
                { dataKey: 'count', name: 'Casos', color: '#3b82f6' }
              ]}
              title="Top 8 Diagnósticos"
              subtitle="Diagnósticos más frecuentes"
            />
          </div>

          <DataTable
            data={topDiagnoses.map((item: any) => ({
              diagnosis: item.diagnosis,
              casos: item.count,
              porcentaje: `${item.percentage.toFixed(2)}%`
            }))}
            columns={[
              { key: 'diagnosis', header: 'Diagnóstico' },
              { key: 'casos', header: 'Casos' },
              { key: 'porcentaje', header: 'Porcentaje' }
            ]}
            title="Detalle de Diagnósticos"
          />
        </>
      )}
    </div>
  );
}

