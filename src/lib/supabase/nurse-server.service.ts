// src/lib/supabase/nurse-server.service.ts
import { createSupabaseServerClient } from '@/app/adapters/server';
import type { DashboardSummaryResponse, NurseDailyDashboard } from '@/types/nurse.types';

export async function getDashboardSummaryServer(): Promise<DashboardSummaryResponse | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_nurse_dashboard_summary');

  if (error) {
    console.error('[getDashboardSummaryServer]', error);
    return null;
  }
  return data as DashboardSummaryResponse;
}

export async function getDailyQueueServer(date?: Date): Promise<NurseDailyDashboard[]> {
  const supabase = await createSupabaseServerClient();
  const targetDate = date
    ? date.toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('nurse_daily_dashboard')
    .select('*')
    .eq('queue_date', targetDate)
    .order('arrival_time', { ascending: true });

  if (error) {
    console.error('[getDailyQueueServer]', error);
    return [];
  }

  const results = (data ?? []) as NurseDailyDashboard[];
  const uniqueMap = new Map<string, NurseDailyDashboard>();
  
  results.forEach(entry => {
    const patientKey = entry.patient_id || entry.unregistered_patient_id;
    if (patientKey) {
      if (!uniqueMap.has(patientKey)) {
        uniqueMap.set(patientKey, entry);
      } else {
        const existing = uniqueMap.get(patientKey)!;
        if (new Date(entry.arrival_time) > new Date(existing.arrival_time)) {
          uniqueMap.set(patientKey, entry);
        }
      }
    } else {
      uniqueMap.set(entry.queue_id, entry);
    }
  });

  return Array.from(uniqueMap.values());
}
