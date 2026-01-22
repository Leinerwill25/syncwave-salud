import { createClient } from '@supabase/supabase-js';

// Cliente específico para analytics (solo lectura)
export const supabaseAnalytics = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper para queries con manejo de errores
export async function fetchAnalyticsData<T>(
  query: () => Promise<{ data: T | null; error: any }>
): Promise<T | null> {
  try {
    const { data, error } = await query();
    if (error) {
      console.error('[Analytics Error]:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('[Analytics Fetch Error]:', err);
    return null;
  }
}

