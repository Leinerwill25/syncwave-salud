import { supabaseAnalytics, fetchAnalyticsData } from '../supabase-analytics';
import { AuditLogEntry, AnalyticsFilters } from '../types/analytics.types';

export async function getAuditLogs(
  filters: AnalyticsFilters,
  limit: number = 100
): Promise<AuditLogEntry[]> {
  const query = async () => {
    return await supabaseAnalytics
      .from('audit_log')
      .select('id, user_name, action_type, entity_type, description, metadata, created_at')
      .gte('created_at', filters.timeRange.start.toISOString())
      .lte('created_at', filters.timeRange.end.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);
  };

  const data = await fetchAnalyticsData(query);
  
  if (!data) return [];

  return (data as any[]).map((item: any) => ({
    id: item.id,
    user_name: item.user_name || 'Usuario desconocido',
    action_type: item.action_type,
    module: item.entity_type,
    timestamp: item.created_at,
    details: item.description || JSON.stringify(item.metadata || {})
  }));
}

export async function getActionTypeDistribution(
  filters: AnalyticsFilters
): Promise<{ action_type: string; count: number }[]> {
  const query = async () => {
    return await supabaseAnalytics
      .from('audit_log')
      .select('action_type')
      .gte('created_at', filters.timeRange.start.toISOString())
      .lte('created_at', filters.timeRange.end.toISOString());
  };

  const data = await fetchAnalyticsData(query);
  
  if (!data) return [];

  const grouped = (data as any[]).reduce((acc: any, item: any) => {
    const actionType = item.action_type || 'Desconocido';
    acc[actionType] = (acc[actionType] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([action_type, count]) => ({
      action_type,
      count: count as number
    }))
    .sort((a, b) => b.count - a.count);
}

