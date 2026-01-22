'use client';

import React, { useEffect, useState } from 'react';
import { MetricCard } from '@/components/analytics/cards/MetricCard';
import { BarChartComponent } from '@/components/analytics/charts/BarChartComponent';
import { FilterBar } from '@/components/analytics/layout/FilterBar';
import { Pill, TrendingUp, Package } from 'lucide-react';
import { getTopMedicationsBySpecialty } from '@/lib/analytics/api-client';
import { AnalyticsFilters } from '@/lib/analytics/types/analytics.types';
import { ExportableTable } from '@/components/analytics/tables/ExportableTable';

export default function PharmacyPage() {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    timeRange: {
      start: new Date(new Date().setMonth(new Date().getMonth() - 6)),
      end: new Date()
    }
  });

  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getTopMedicationsBySpecialty(filters, 20);
      setMedications(data || []);
    } catch (error) {
      console.error('Error loading pharmacy data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPrescriptions = medications.reduce((sum: number, item: any) => 
    sum + item.total_prescriptions, 0);

  const uniqueMedications = new Set(medications.map((m: any) => m.medication)).size;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Analítica de Farmacia</h2>
        <p className="text-gray-600">Prescripciones y medicamentos más utilizados</p>
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
              title="Total Prescripciones"
              value={totalPrescriptions}
              icon={<Pill className="w-8 h-8 text-blue-600" />}
              change={{ value: 8.2, trend: 'up' }}
            />
            <MetricCard
              title="Medicamentos Únicos"
              value={uniqueMedications}
              icon={<Package className="w-8 h-8 text-green-600" />}
            />
            <MetricCard
              title="Tasa de Prescripción"
              value="12.5%"
              icon={<TrendingUp className="w-8 h-8 text-purple-600" />}
              subtitle="Por consulta"
            />
          </div>

          <div className="mb-8">
            <BarChartComponent
              data={medications.slice(0, 10).map((item: any) => ({
                medicamento: item.medication.substring(0, 20),
                prescripciones: item.total_prescriptions
              }))}
              xKey="medicamento"
              bars={[
                { dataKey: 'prescripciones', name: 'Prescripciones', color: '#3b82f6' }
              ]}
              title="Top 10 Medicamentos"
              subtitle="Medicamentos más prescritos"
            />
          </div>

          <ExportableTable
            data={medications.map((item: any) => ({
              especialidad: item.specialty,
              medicamento: item.medication,
              total_prescripciones: item.total_prescriptions,
              cantidad_promedio: item.avg_quantity.toFixed(2),
              dosajes_comunes: item.common_dosages.join(', ')
            }))}
            columns={[
              { key: 'especialidad', header: 'Especialidad' },
              { key: 'medicamento', header: 'Medicamento' },
              { key: 'total_prescripciones', header: 'Total Prescripciones' },
              { key: 'cantidad_promedio', header: 'Cantidad Promedio' },
              { key: 'dosajes_comunes', header: 'Dosajes Comunes' }
            ]}
            title="Detalle de Prescripciones"
            filename="prescripciones"
          />
        </>
      )}
    </div>
  );
}

