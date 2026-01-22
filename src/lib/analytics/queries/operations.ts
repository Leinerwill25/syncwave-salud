import { supabaseAnalytics, fetchAnalyticsData } from '../supabase-analytics';
import { AppointmentStats, AnalyticsFilters } from '../types/analytics.types';

export async function getAppointmentStatsByOrganization(
  filters: AnalyticsFilters
): Promise<AppointmentStats[]> {
  const query = async () => {
    return await supabaseAnalytics
      .from('appointment')
      .select(`
        id,
        status,
        organization:organization_id (
          name
        )
      `)
      .gte('scheduled_at', filters.timeRange.start.toISOString())
      .lte('scheduled_at', filters.timeRange.end.toISOString());
  };

  const data = await fetchAnalyticsData(query);
  
  if (!data) return [];

  // Agrupar por organización
  const grouped = (data as any[]).reduce((acc: any, item: any) => {
    const orgName = item.organization?.name || 'Sin organización';
    
    if (!acc[orgName]) {
      acc[orgName] = {
        consultorio: orgName,
        completed: 0,
        cancelled: 0,
        scheduled: 0,
        total: 0
      };
    }
    
    acc[orgName].total++;
    
    if (item.status === 'COMPLETED') acc[orgName].completed++;
    if (item.status === 'CANCELLED') acc[orgName].cancelled++;
    if (item.status === 'SCHEDULED') acc[orgName].scheduled++;
    
    return acc;
  }, {});

  // Calcular tasas de asistencia
  const result: AppointmentStats[] = Object.values(grouped).map((item: any) => ({
    consultorio: item.consultorio,
    completed: item.completed,
    cancelled: item.cancelled,
    scheduled: item.scheduled,
    attendance_rate: item.total > 0 ? (item.completed / item.total) * 100 : 0
  }));

  return result.sort((a, b) => b.attendance_rate - a.attendance_rate);
}

export async function getConsultationDurationStats(
  filters: AnalyticsFilters
): Promise<{ avg_duration_minutes: number; median_duration_minutes: number }> {
  const query = async () => {
    return await supabaseAnalytics
      .from('consultation')
      .select('started_at, ended_at')
      .not('started_at', 'is', null)
      .not('ended_at', 'is', null)
      .gte('created_at', filters.timeRange.start.toISOString())
      .lte('created_at', filters.timeRange.end.toISOString());
  };

  const data = await fetchAnalyticsData(query);
  
  if (!data || (data as any[]).length === 0) return { avg_duration_minutes: 0, median_duration_minutes: 0 };

  // Calcular duraciones
  const durations = (data as any[])
    .map((item: any) => {
      const start = new Date(item.started_at).getTime();
      const end = new Date(item.ended_at).getTime();
      return (end - start) / (1000 * 60); // Minutos
    })
    .filter(d => d > 0 && d < 480); // Filtrar valores anómalos (> 8 horas)

  const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  
  durations.sort((a, b) => a - b);
  const median = durations[Math.floor(durations.length / 2)];

  return {
    avg_duration_minutes: Math.round(avg),
    median_duration_minutes: Math.round(median)
  };
}

