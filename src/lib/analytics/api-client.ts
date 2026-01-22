// Cliente API para analytics - hace fetch a las API routes del servidor

export interface AnalyticsFilters {
  timeRange: {
    start: Date;
    end: Date;
  };
  region?: string;
  specialty?: string;
  organizationId?: string;
  doctorId?: string;
}

export async function fetchAnalyticsData<T>(
  endpoint: string,
  filters: AnalyticsFilters,
  params?: Record<string, string | number>
): Promise<T | null> {
  try {
    const queryParams = new URLSearchParams({
      type: endpoint,
      start: filters.timeRange.start.toISOString(),
      end: filters.timeRange.end.toISOString(),
      ...(params || {})
    });

    if (filters.region) queryParams.append('region', filters.region);
    if (filters.specialty) queryParams.append('specialty', filters.specialty);
    if (filters.organizationId) queryParams.append('organizationId', filters.organizationId);
    if (filters.doctorId) queryParams.append('doctorId', filters.doctorId);

    const response = await fetch(`/api/analytics/data?${queryParams.toString()}`);
    
    if (!response.ok) {
      console.error('[Analytics API] Error:', response.status, response.statusText);
      return null;
    }

    const result = await response.json();
    return result.data || null;
  } catch (err) {
    console.error('[Analytics API] Error:', err);
    return null;
  }
}

// Funciones específicas para cada tipo de dato
export async function getTopDiagnoses(
  filters: AnalyticsFilters,
  limit: number = 10
): Promise<{ diagnosis: string; count: number; percentage: number }[]> {
  const data = await fetchAnalyticsData<any[]>(
    'top-diagnoses',
    filters,
    { limit }
  );
  return data?.slice(0, limit) || [];
}

export async function getAppointmentStatsByOrganization(
  filters: AnalyticsFilters
): Promise<any[]> {
  return await fetchAnalyticsData<any[]>('appointment-stats', filters) || [];
}

export async function getRevenueByPeriod(
  filters: AnalyticsFilters,
  groupBy: 'day' | 'month' = 'month'
): Promise<any[]> {
  return await fetchAnalyticsData<any[]>('revenue', filters, { groupBy }) || [];
}

export async function getPatientCount(
  filters: AnalyticsFilters
): Promise<number> {
  const data = await fetchAnalyticsData<{ count: number }>('patient-count', filters);
  return data?.count || 0;
}

export async function getDiagnosisByRegion(
  filters: AnalyticsFilters
): Promise<any[]> {
  return await fetchAnalyticsData<any[]>('diagnosis-by-region', filters) || [];
}

export async function getTopMedicationsBySpecialty(
  filters: AnalyticsFilters,
  limit: number = 20
): Promise<any[]> {
  return await fetchAnalyticsData<any[]>('pharmacy-medications', filters, { limit }) || [];
}

export async function getConsultationDurationStats(
  filters: AnalyticsFilters
): Promise<{ avg_duration_minutes: number; median_duration_minutes: number }> {
  return await fetchAnalyticsData<any>('consultation-duration', filters) || { avg_duration_minutes: 0, median_duration_minutes: 0 };
}

export async function getPaymentMethodDistribution(
  filters: AnalyticsFilters
): Promise<any[]> {
  return await fetchAnalyticsData<any[]>('payment-methods', filters) || [];
}

export async function getLabResultStats(
  filters: AnalyticsFilters
): Promise<any[]> {
  return await fetchAnalyticsData<any[]>('lab-results', filters) || [];
}

export async function getPatientDemographics(
  filters: AnalyticsFilters
): Promise<any[]> {
  return await fetchAnalyticsData<any[]>('patient-demographics', filters) || [];
}

export async function getPatientGrowth(
  filters: AnalyticsFilters
): Promise<any[]> {
  return await fetchAnalyticsData<any[]>('patient-growth', filters) || [];
}

export async function getCommunicationMetrics(
  filters: AnalyticsFilters
): Promise<any[]> {
  return await fetchAnalyticsData<any[]>('communication-metrics', filters) || [];
}

export async function getAuditLogs(
  filters: AnalyticsFilters,
  limit: number = 100
): Promise<any[]> {
  return await fetchAnalyticsData<any[]>('audit-logs', filters, { limit }) || [];
}

export async function getActionTypeDistribution(
  filters: AnalyticsFilters
): Promise<any[]> {
  return await fetchAnalyticsData<any[]>('action-distribution', filters) || [];
}

