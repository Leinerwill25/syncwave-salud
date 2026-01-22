import { supabaseAnalytics, fetchAnalyticsData } from '../supabase-analytics';
import { CommunicationMetrics, AnalyticsFilters } from '../types/analytics.types';

export async function getCommunicationMetrics(
  filters: AnalyticsFilters
): Promise<CommunicationMetrics[]> {
  const query = async () => {
    return await supabaseAnalytics
      .from('message')
      .select('id, created_at, read, read_at')
      .gte('created_at', filters.timeRange.start.toISOString())
      .lte('created_at', filters.timeRange.end.toISOString());
  };

  const data = await fetchAnalyticsData(query);
  
  if (!data) return [];

  // Agrupar por fecha
  const grouped = (data as any[]).reduce((acc: any, item: any) => {
    const date = new Date(item.created_at).toLocaleDateString('es-ES');
    const key = date;
    
    if (!acc[key]) {
      acc[key] = {
        date,
        messages_sent: 0,
        messages_read: 0,
        response_times: []
      };
    }
    
    acc[key].messages_sent++;
    if (item.read && item.read_at) {
      acc[key].messages_read++;
      const sent = new Date(item.created_at).getTime();
      const read = new Date(item.read_at).getTime();
      const minutes = (read - sent) / (1000 * 60);
      if (minutes > 0 && minutes < 10080) { // Filtrar valores anómalos (> 7 días)
        acc[key].response_times.push(minutes);
      }
    }
    
    return acc;
  }, {});

  // Calcular métricas
  const result: CommunicationMetrics[] = Object.values(grouped).map((item: any) => ({
    date: item.date,
    messages_sent: item.messages_sent,
    response_rate: item.messages_sent > 0 ? (item.messages_read / item.messages_sent) * 100 : 0,
    avg_response_time_minutes: item.response_times.length > 0
      ? Math.round((item.response_times.reduce((sum: number, t: number) => sum + t, 0) / item.response_times.length) * 10) / 10
      : 0
  }));

  return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

