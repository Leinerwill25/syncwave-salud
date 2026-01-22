import { supabaseAnalytics, fetchAnalyticsData } from '../supabase-analytics';
import { DiagnosisData, AnalyticsFilters } from '../types/analytics.types';

export async function getDiagnosisByRegion(
  filters: AnalyticsFilters
): Promise<DiagnosisData[]> {
  const query = async () => {
    let queryBuilder = supabaseAnalytics
      .from('consultation')
      .select(`
        id,
        diagnosis,
        icd11_code,
        icd11_title,
        created_at,
        patient:patient_id (
          address
        ),
        unregistered_patient:unregistered_patient_id (
          address
        ),
        doctor:doctor_id (
          medic_profile (
            specialty
          )
        )
      `)
      .not('diagnosis', 'is', null)
      .gte('created_at', filters.timeRange.start.toISOString())
      .lte('created_at', filters.timeRange.end.toISOString());

    return await queryBuilder;
  };

  const data = await fetchAnalyticsData(query);
  
  if (!data) return [];

  // Procesar y agrupar datos
  const grouped = (data as any[]).reduce((acc: any, item: any) => {
    const region = item.patient?.address || item.unregistered_patient?.address || 'Sin región';
    const specialty = item.doctor?.medic_profile?.specialty || 'Sin especialidad';
    const diagnosis = item.diagnosis;
    const month = new Date(item.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'short' });
    
    const key = `${region}-${diagnosis}-${specialty}-${month}`;
    
    if (!acc[key]) {
      acc[key] = {
        region,
        diagnosis,
        icd11_code: item.icd11_code,
        icd11_title: item.icd11_title,
        count: 0,
        specialty,
        month
      };
    }
    
    acc[key].count++;
    return acc;
  }, {});

  return Object.values(grouped);
}

export async function getTopDiagnoses(
  filters: AnalyticsFilters,
  limit: number = 10
): Promise<{ diagnosis: string; count: number; percentage: number }[]> {
  const query = async () => {
    return await supabaseAnalytics
      .from('consultation')
      .select('diagnosis')
      .not('diagnosis', 'is', null)
      .gte('created_at', filters.timeRange.start.toISOString())
      .lte('created_at', filters.timeRange.end.toISOString());
  };

  const data = await fetchAnalyticsData(query);
  
  if (!data) return [];

  // Contar diagnósticos
  const counts = (data as any[]).reduce((acc: any, item: any) => {
    const diagnosis = item.diagnosis;
    acc[diagnosis] = (acc[diagnosis] || 0) + 1;
    return acc;
  }, {});

  const total = Object.values(counts).reduce((sum: number, count: any) => sum + count, 0);

  // Ordenar y limitar
  const sorted = Object.entries(counts)
    .map(([diagnosis, count]) => ({
      diagnosis,
      count: count as number,
      percentage: ((count as number) / total) * 100
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return sorted;
}

