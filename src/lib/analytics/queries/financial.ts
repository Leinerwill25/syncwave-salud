import { supabaseAnalytics, fetchAnalyticsData } from '../supabase-analytics';
import { FinancialMetrics, AnalyticsFilters } from '../types/analytics.types';

export async function getRevenueByPeriod(
  filters: AnalyticsFilters,
  groupBy: 'day' | 'month' = 'month'
): Promise<FinancialMetrics[]> {
  const query = async () => {
    return await supabaseAnalytics
      .from('facturacion')
      .select('total, currency, metodo_pago, fecha_emision, estado_pago')
      .eq('estado_pago', 'pagado')
      .gte('fecha_emision', filters.timeRange.start.toISOString())
      .lte('fecha_emision', filters.timeRange.end.toISOString());
  };

  const data = await fetchAnalyticsData(query);
  
  if (!data) return [];

  // Agrupar por período
  const grouped = (data as any[]).reduce((acc: any, item: any) => {
    const date = new Date(item.fecha_emision);
    const period = groupBy === 'month'
      ? date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' })
      : date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
    
    const currency = item.currency || 'USD';
    const key = `${period}-${currency}`;
    
    if (!acc[key]) {
      acc[key] = {
        total_revenue: 0,
        currency,
        payment_method: 'Varios',
        count: 0,
        period
      };
    }
    
    acc[key].total_revenue += parseFloat(item.total);
    acc[key].count++;
    
    return acc;
  }, {});

  return Object.values(grouped);
}

export async function getPaymentMethodDistribution(
  filters: AnalyticsFilters
): Promise<{ method: string; count: number; total_amount: number }[]> {
  const query = async () => {
    return await supabaseAnalytics
      .from('facturacion')
      .select('metodo_pago, total')
      .eq('estado_pago', 'pagado')
      .gte('fecha_emision', filters.timeRange.start.toISOString())
      .lte('fecha_emision', filters.timeRange.end.toISOString());
  };

  const data = await fetchAnalyticsData(query);
  
  if (!data) return [];

  const grouped = (data as any[]).reduce((acc: any, item: any) => {
    const method = item.metodo_pago || 'No especificado';
    
    if (!acc[method]) {
      acc[method] = {
        method,
        count: 0,
        total_amount: 0
      };
    }
    
    acc[method].count++;
    acc[method].total_amount += parseFloat(item.total);
    
    return acc;
  }, {});

  return Object.values(grouped).sort((a: any, b: any) => b.total_amount - a.total_amount) as { method: string; count: number; total_amount: number }[];
}

