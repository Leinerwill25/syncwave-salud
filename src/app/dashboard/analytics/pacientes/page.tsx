'use client';

import React, { useEffect, useState } from 'react';
import { MetricCard } from '@/components/analytics/cards/MetricCard';
import { BarChartComponent } from '@/components/analytics/charts/BarChartComponent';
import { LineChartComponent } from '@/components/analytics/charts/LineChartComponent';
import { FilterBar } from '@/components/analytics/layout/FilterBar';
import { Users, TrendingUp, UserPlus } from 'lucide-react';
import { getPatientDemographics, getPatientGrowth } from '@/lib/analytics/api-client';
import { AnalyticsFilters } from '@/lib/analytics/types/analytics.types';

export default function PatientsPage() {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    timeRange: {
      start: new Date(new Date().setMonth(new Date().getMonth() - 6)),
      end: new Date()
    }
  });

  const [demographics, setDemographics] = useState<any[]>([]);
  const [growth, setGrowth] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [demo, growthData] = await Promise.all([
        getPatientDemographics(filters),
        getPatientGrowth(filters)
      ]);

      setDemographics(demo || []);
      setGrowth(growthData || []);
    } catch (error) {
      console.error('Error loading patients data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPatients = demographics.reduce((sum: number, item: any) => 
    sum + item.count, 0);

  const ageGroups = demographics.reduce((acc: any, item: any) => {
    if (!acc[item.age_group]) {
      acc[item.age_group] = 0;
    }
    acc[item.age_group] += item.count;
    return acc;
  }, {});

  const ageGroupData = Object.entries(ageGroups).map(([age_group, total]) => ({
    age_group,
    total
  }));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Analítica de Pacientes</h2>
        <p className="text-gray-600">Demografía y crecimiento de pacientes</p>
      </div>

      <FilterBar onFilterChange={setFilters} showSpecialtyFilter={false} />

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <MetricCard
              title="Total Pacientes"
              value={totalPatients}
              icon={<Users className="w-8 h-8 text-blue-600" />}
              change={{ value: 8.5, trend: 'up' }}
            />
            <MetricCard
              title="Nuevos Pacientes"
              value={growth[growth.length - 1]?.new_patients || 0}
              icon={<UserPlus className="w-8 h-8 text-green-600" />}
              subtitle="Último mes"
            />
            <MetricCard
              title="Tasa de Crecimiento"
              value="12.3%"
              icon={<TrendingUp className="w-8 h-8 text-purple-600" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <BarChartComponent
              data={ageGroupData}
              xKey="age_group"
              bars={[
                { dataKey: 'total', name: 'Pacientes', color: '#3b82f6' }
              ]}
              title="Distribución por Edad"
              subtitle="Pacientes por grupo etario"
            />

            <LineChartComponent
              data={growth.map((item: any) => ({
                mes: item.month,
                nuevos: item.new_patients,
                total: item.total_patients
              }))}
              xKey="mes"
              lines={[
                { dataKey: 'nuevos', name: 'Nuevos Pacientes', color: '#10b981' },
                { dataKey: 'total', name: 'Total Acumulado', color: '#3b82f6' }
              ]}
              title="Crecimiento de Pacientes"
              subtitle="Evolución mensual"
            />
          </div>
        </>
      )}
    </div>
  );
}

