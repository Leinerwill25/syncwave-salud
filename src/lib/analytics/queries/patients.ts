import { supabaseAnalytics, fetchAnalyticsData } from '../supabase-analytics';
import { PatientDemographics, AnalyticsFilters } from '../types/analytics.types';

export async function getPatientDemographics(
  filters: AnalyticsFilters
): Promise<PatientDemographics[]> {
  const query = async () => {
    return await supabaseAnalytics
      .from('patient')
      .select('dob, gender, address, created_at')
      .gte('created_at', filters.timeRange.start.toISOString())
      .lte('created_at', filters.timeRange.end.toISOString());
  };

  const data = await fetchAnalyticsData(query);
  
  if (!data) return [];

  // Calcular grupos de edad y agrupar
  const grouped = (data as any[]).reduce((acc: any, item: any) => {
    let ageGroup = 'Desconocido';
    if (item.dob) {
      const age = Math.floor((new Date().getTime() - new Date(item.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
      if (age < 18) ageGroup = '0-17';
      else if (age < 30) ageGroup = '18-29';
      else if (age < 45) ageGroup = '30-44';
      else if (age < 60) ageGroup = '45-59';
      else if (age < 75) ageGroup = '60-74';
      else ageGroup = '75+';
    }
    
    const gender = item.gender || 'No especificado';
    const region = item.address || 'Sin región';
    const key = `${ageGroup}-${gender}-${region}`;
    
    if (!acc[key]) {
      acc[key] = {
        age_group: ageGroup,
        gender,
        count: 0,
        region
      };
    }
    
    acc[key].count++;
    return acc;
  }, {});

  return Object.values(grouped);
}

export async function getPatientGrowth(
  filters: AnalyticsFilters
): Promise<{ month: string; new_patients: number; total_patients: number }[]> {
  const query = async () => {
    return await supabaseAnalytics
      .from('patient')
      .select('created_at')
      .lte('created_at', filters.timeRange.end.toISOString());
  };

  const data = await fetchAnalyticsData(query);
  
  if (!data) return [];

  // Agrupar por mes
  const monthly = (data as any[]).reduce((acc: any, item: any) => {
    const date = new Date(item.created_at);
    const month = date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' });
    
    if (!acc[month]) {
      acc[month] = 0;
    }
    acc[month]++;
    
    return acc;
  }, {});

  // Calcular total acumulado
  let total = 0;
  return Object.entries(monthly)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([month, count]) => {
      total += count as number;
      return {
        month,
        new_patients: count as number,
        total_patients: total
      };
    });
}

