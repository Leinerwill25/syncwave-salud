'use client';

import React, { useEffect, useState } from 'react';
import { MetricCard } from '@/components/analytics/cards/MetricCard';
import { LineChartComponent } from '@/components/analytics/charts/LineChartComponent';
import { FilterBar } from '@/components/analytics/layout/FilterBar';
import { MessageSquare, Send, Clock } from 'lucide-react';
import { getCommunicationMetrics } from '@/lib/analytics/api-client';
import { AnalyticsFilters } from '@/lib/analytics/types/analytics.types';

export default function CommunicationPage() {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    timeRange: {
      start: new Date(new Date().setMonth(new Date().getMonth() - 6)),
      end: new Date()
    }
  });

  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getCommunicationMetrics(filters);
      setMetrics(data || []);
    } catch (error) {
      console.error('Error loading communication data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalMessages = metrics.reduce((sum: number, item: any) => 
    sum + item.messages_sent, 0);
  
  const avgResponseRate = metrics.length > 0
    ? metrics.reduce((sum: number, item: any) => sum + item.response_rate, 0) / metrics.length
    : 0;

  const avgResponseTime = metrics.length > 0
    ? metrics.reduce((sum: number, item: any) => sum + item.avg_response_time_minutes, 0) / metrics.length
    : 0;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Analítica de Comunicación</h2>
        <p className="text-gray-600">Mensajes y tasas de respuesta</p>
      </div>

      <FilterBar onFilterChange={setFilters} showRegionFilter={false} showSpecialtyFilter={false} />

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <MetricCard
              title="Total Mensajes"
              value={totalMessages}
              icon={<MessageSquare className="w-8 h-8 text-blue-600" />}
              change={{ value: 15.3, trend: 'up' }}
            />
            <MetricCard
              title="Tasa de Respuesta"
              value={`${avgResponseRate.toFixed(1)}%`}
              icon={<Send className="w-8 h-8 text-green-600" />}
            />
            <MetricCard
              title="Tiempo Promedio"
              value={`${avgResponseTime.toFixed(0)} min`}
              icon={<Clock className="w-8 h-8 text-purple-600" />}
              subtitle="Tiempo de respuesta"
            />
          </div>

          <LineChartComponent
            data={metrics.map((item: any) => ({
              fecha: item.date,
              mensajes: item.messages_sent,
              tasa_respuesta: item.response_rate,
              tiempo_respuesta: item.avg_response_time_minutes
            }))}
            xKey="fecha"
            lines={[
              { dataKey: 'mensajes', name: 'Mensajes Enviados', color: '#3b82f6' },
              { dataKey: 'tasa_respuesta', name: 'Tasa de Respuesta (%)', color: '#10b981' },
              { dataKey: 'tiempo_respuesta', name: 'Tiempo de Respuesta (min)', color: '#f59e0b' }
            ]}
            title="Métricas de Comunicación"
            subtitle="Evolución diaria de mensajes y respuestas"
          />
        </>
      )}
    </div>
  );
}

