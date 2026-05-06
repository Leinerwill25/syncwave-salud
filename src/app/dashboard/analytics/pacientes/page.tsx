'use client';

import React, { useEffect, useState } from 'react';
import { MetricCard } from '@/components/analytics/cards/MetricCard';
import { BarChartComponent } from '@/components/analytics/charts/BarChartComponent';
import { LineChartComponent } from '@/components/analytics/charts/LineChartComponent';
import { FilterBar } from '@/components/analytics/layout/FilterBar';
import { getPatientDemographics, getPatientGrowth } from '@/lib/analytics/api-client';
import { AnalyticsFilters } from '@/lib/analytics/types/analytics.types';
import { DemographicsRanking } from '@/components/analytics/charts/DemographicsRanking';
import { Users, TrendingUp, UserPlus } from 'lucide-react';

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
    total: total as number
  }));

  const currentTotal = growth[growth.length - 1]?.total_patients || 0;
  const prevTotal = growth[growth.length - 2]?.total_patients || 0;
  const realGrowthRate = prevTotal > 0 
    ? (((currentTotal - prevTotal) / prevTotal) * 100).toFixed(1) 
    : '0.0';

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-4 space-y-10">
      <div className="mb-2">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Analítica de Pacientes</h2>
        <p className="text-slate-500 text-lg">Demografía y crecimiento de pacientes de la red</p>
      </div>

      <div className="bg-white/50 backdrop-blur-sm p-2 rounded-2xl border border-slate-100 shadow-sm inline-block">
        <FilterBar onFilterChange={setFilters} showSpecialtyFilter={false} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <MetricCard
              title="TOTAL PACIENTES"
              value={totalPatients}
              icon={<Users className="w-5 h-5 text-indigo-600" />}
              change={{ value: 8.5, trend: 'up' }}
              delay={0.1}
            />
            <MetricCard
              title="NUEVOS PACIENTES"
              value={growth[growth.length - 1]?.new_patients || 0}
              icon={<UserPlus className="w-5 h-5 text-emerald-600" />}
              subtitle="Último mes"
              delay={0.2}
            />
            <MetricCard
              title="TASA DE CRECIMIENTO"
              value={`${realGrowthRate}%`}
              icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
              delay={0.3}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-900">Distribución por Edad</h3>
                  <p className="text-sm text-slate-500">Pacientes por grupo etario</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center">
                  <Users className="h-5 w-5 text-indigo-600" />
                </div>
              </div>
              <DemographicsRanking data={ageGroupData} />
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
              <LineChartComponent
                data={growth.map((item: any) => ({
                  mes: item.month,
                  nuevos: item.new_patients,
                  total: item.total_patients
                }))}
                xKey="mes"
                lines={[
                  { dataKey: 'nuevos', name: 'Nuevos Pacientes', color: '#10b981' },
                  { dataKey: 'total', name: 'Total Acumulado', color: '#6366f1' }
                ]}
                title="Crecimiento de Pacientes"
                subtitle="Evolución mensual"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

