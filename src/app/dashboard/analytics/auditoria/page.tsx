'use client';

import React, { useEffect, useState } from 'react';
import { MetricCard } from '@/components/analytics/cards/MetricCard';
import { BarChartComponent } from '@/components/analytics/charts/BarChartComponent';
import { FilterBar } from '@/components/analytics/layout/FilterBar';
import { Shield, Activity, User } from 'lucide-react';
import { getAuditLogs, getActionTypeDistribution } from '@/lib/analytics/api-client';
import { AnalyticsFilters } from '@/lib/analytics/types/analytics.types';
import { ExportableTable } from '@/components/analytics/tables/ExportableTable';
import { formatDateTime } from '@/lib/analytics/utils/formatters';

export default function AuditPage() {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    timeRange: {
      start: new Date(new Date().setMonth(new Date().getMonth() - 6)),
      end: new Date()
    }
  });

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [actionDistribution, setActionDistribution] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [logs, actions] = await Promise.all([
        getAuditLogs(filters, 100),
        getActionTypeDistribution(filters)
      ]);

      setAuditLogs(logs || []);
      setActionDistribution(actions || []);
    } catch (error) {
      console.error('Error loading audit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const uniqueUsers = new Set(auditLogs.map((log: any) => log.user_name)).size;
  const uniqueActions = actionDistribution.length;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Auditoría del Sistema</h2>
        <p className="text-gray-600">Registro de actividades y acciones</p>
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
              title="Total Registros"
              value={auditLogs.length}
              icon={<Shield className="w-8 h-8 text-blue-600" />}
            />
            <MetricCard
              title="Usuarios Activos"
              value={uniqueUsers}
              icon={<User className="w-8 h-8 text-green-600" />}
            />
            <MetricCard
              title="Tipos de Acción"
              value={uniqueActions}
              icon={<Activity className="w-8 h-8 text-purple-600" />}
            />
          </div>

          <div className="mb-8">
            <BarChartComponent
              data={actionDistribution.slice(0, 10).map((item: any) => ({
                accion: item.action_type.substring(0, 20),
                cantidad: item.count
              }))}
              xKey="accion"
              bars={[
                { dataKey: 'cantidad', name: 'Cantidad', color: '#3b82f6' }
              ]}
              title="Distribución por Tipo de Acción"
              subtitle="Acciones más frecuentes"
            />
          </div>

          <ExportableTable
            data={auditLogs.map((log: any) => ({
              usuario: log.user_name,
              accion: log.action_type,
              modulo: log.module,
              timestamp: formatDateTime(log.timestamp),
              detalles: log.details.substring(0, 50) + (log.details.length > 50 ? '...' : '')
            }))}
            columns={[
              { key: 'usuario', header: 'Usuario' },
              { key: 'accion', header: 'Acción' },
              { key: 'modulo', header: 'Módulo' },
              { key: 'timestamp', header: 'Fecha y Hora' },
              { key: 'detalles', header: 'Detalles' }
            ]}
            title="Registro de Auditoría"
            filename="auditoria"
            emptyMessage="No hay registros de auditoría disponibles"
          />
        </>
      )}
    </div>
  );
}

