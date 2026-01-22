'use client';

import React, { useEffect, useState } from 'react';
import { MetricCard } from '@/components/analytics/cards/MetricCard';
import { LineChartComponent } from '@/components/analytics/charts/LineChartComponent';
import { PieChartComponent } from '@/components/analytics/charts/PieChartComponent';
import { FilterBar } from '@/components/analytics/layout/FilterBar';
import { DollarSign, TrendingUp, CreditCard, Wallet } from 'lucide-react';
import { getRevenueByPeriod, getPaymentMethodDistribution } from '@/lib/analytics/api-client';
import { AnalyticsFilters } from '@/lib/analytics/types/analytics.types';
import { formatCurrency } from '@/lib/analytics/utils/formatters';

export default function FinancialPage() {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    timeRange: {
      start: new Date(new Date().setMonth(new Date().getMonth() - 6)),
      end: new Date()
    }
  });

  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [revenue, payments] = await Promise.all([
        getRevenueByPeriod(filters, 'month'),
        getPaymentMethodDistribution(filters)
      ]);

      setRevenueData(revenue || []);
      setPaymentMethods(payments || []);
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = revenueData.reduce((sum: number, item: any) => 
    sum + item.total_revenue, 0);
  
  const totalTransactions = revenueData.reduce((sum: number, item: any) => 
    sum + item.count, 0);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Analítica Financiera</h2>
        <p className="text-gray-600">Ingresos y métodos de pago</p>
      </div>

      <FilterBar onFilterChange={setFilters} showRegionFilter={false} showSpecialtyFilter={false} />

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Ingresos Totales"
              value={formatCurrency(totalRevenue, 'USD')}
              icon={<DollarSign className="w-8 h-8 text-green-600" />}
              change={{ value: 15.2, trend: 'up' }}
            />
            <MetricCard
              title="Total Transacciones"
              value={totalTransactions}
              icon={<CreditCard className="w-8 h-8 text-blue-600" />}
            />
            <MetricCard
              title="Ticket Promedio"
              value={totalTransactions > 0 ? formatCurrency(totalRevenue / totalTransactions, 'USD') : '$0.00'}
              icon={<TrendingUp className="w-8 h-8 text-purple-600" />}
            />
            <MetricCard
              title="Métodos de Pago"
              value={paymentMethods.length}
              icon={<Wallet className="w-8 h-8 text-yellow-600" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <LineChartComponent
              data={revenueData.map((item: any) => ({
                periodo: item.period,
                ingresos: item.total_revenue
              }))}
              xKey="periodo"
              lines={[
                { dataKey: 'ingresos', name: 'Ingresos', color: '#10b981' }
              ]}
              title="Ingresos por Período"
              subtitle="Evolución mensual de ingresos"
            />

            <PieChartComponent
              data={paymentMethods.map((item: any) => ({
                metodo: item.method,
                monto: item.total_amount
              }))}
              dataKey="monto"
              nameKey="metodo"
              title="Distribución por Método de Pago"
              subtitle="Ingresos por método de pago"
            />
          </div>
        </>
      )}
    </div>
  );
}

