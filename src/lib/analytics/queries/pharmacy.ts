import { supabaseAnalytics, fetchAnalyticsData } from '../supabase-analytics';
import { MedicationData, AnalyticsFilters } from '../types/analytics.types';

export async function getTopMedicationsBySpecialty(
  filters: AnalyticsFilters,
  limit: number = 20
): Promise<MedicationData[]> {
  // First get prescriptions in the date range
  const prescriptionsQuery = async () => {
    return await supabaseAnalytics
      .from('prescription')
      .select('id')
      .gte('issued_at', filters.timeRange.start.toISOString())
      .lte('issued_at', filters.timeRange.end.toISOString());
  };

  const prescriptionsData = await fetchAnalyticsData(prescriptionsQuery);
  if (!prescriptionsData || (prescriptionsData as any[]).length === 0) return [];

  const prescriptionIds = (prescriptionsData as any[]).map((p: any) => p.id);

  const query = async () => {
    return await supabaseAnalytics
      .from('prescription_item')
      .select(`
        name,
        dosage,
        quantity,
        prescription_id,
        prescription:prescription_id (
          doctor:doctor_id (
            medic_profile (
              specialty
            )
          )
        )
      `)
      .in('prescription_id', prescriptionIds);
  };

  const data = await fetchAnalyticsData(query);
  
  if (!data) return [];

  // Agrupar por especialidad y medicamento
  const grouped = (data as any[]).reduce((acc: any, item: any) => {
    const specialty = item.prescription?.doctor?.medic_profile?.specialty || 'Sin especialidad';
    const medication = item.name;
    const key = `${specialty}-${medication}`;
    
    if (!acc[key]) {
      acc[key] = {
        specialty,
        medication,
        total_prescriptions: 0,
        quantities: [],
        dosages: new Set()
      };
    }
    
    acc[key].total_prescriptions++;
    if (item.quantity) acc[key].quantities.push(item.quantity);
    if (item.dosage) acc[key].dosages.add(item.dosage);
    
    return acc;
  }, {});

  // Calcular promedios
  const result: MedicationData[] = Object.values(grouped).map((item: any) => ({
    specialty: item.specialty,
    medication: item.medication,
    total_prescriptions: item.total_prescriptions,
    avg_quantity: item.quantities.length > 0 
      ? item.quantities.reduce((sum: number, q: number) => sum + q, 0) / item.quantities.length 
      : 0,
    common_dosages: Array.from(item.dosages)
  }));

  return result
    .sort((a, b) => b.total_prescriptions - a.total_prescriptions)
    .slice(0, limit);
}

