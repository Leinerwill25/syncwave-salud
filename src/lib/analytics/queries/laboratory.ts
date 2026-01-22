import { supabaseAnalytics, fetchAnalyticsData } from '../supabase-analytics';
import { LabResultData, AnalyticsFilters } from '../types/analytics.types';

export async function getLabResultStats(
  filters: AnalyticsFilters
): Promise<LabResultData[]> {
  const query = async () => {
    return await supabaseAnalytics
      .from('lab_result')
      .select('result_type, is_critical, created_at, reported_at')
      .gte('created_at', filters.timeRange.start.toISOString())
      .lte('created_at', filters.timeRange.end.toISOString());
  };

  const data = await fetchAnalyticsData(query);
  
  if (!data) return [];

  // Agrupar por tipo de resultado
  const grouped = (data as any[]).reduce((acc: any, item: any) => {
    const resultType = item.result_type || 'Sin tipo';
    const key = resultType;
    
    if (!acc[key]) {
      acc[key] = {
        result_type: resultType,
        total_orders: 0,
        critical_count: 0,
        turnarounds: []
      };
    }
    
    acc[key].total_orders++;
    if (item.is_critical) acc[key].critical_count++;
    
    if (item.created_at && item.reported_at) {
      const created = new Date(item.created_at).getTime();
      const reported = new Date(item.reported_at).getTime();
      const days = (reported - created) / (1000 * 60 * 60 * 24);
      if (days > 0 && days < 365) { // Filtrar valores anómalos
        acc[key].turnarounds.push(days);
      }
    }
    
    return acc;
  }, {});

  // Calcular promedios
  const result: LabResultData[] = Object.values(grouped).map((item: any) => ({
    result_type: item.result_type,
    total_orders: item.total_orders,
    critical_count: item.critical_count,
    avg_turnaround_days: item.turnarounds.length > 0
      ? Math.round((item.turnarounds.reduce((sum: number, d: number) => sum + d, 0) / item.turnarounds.length) * 10) / 10
      : 0
  }));

  return result.sort((a, b) => b.total_orders - a.total_orders);
}

