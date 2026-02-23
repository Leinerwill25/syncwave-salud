// src/lib/auth/nurse-auth-server.ts
import type { NurseType } from '@/types/nurse.types';

/**
 * Verifica si la sesión actual pertenece a una enfermera activa.
 * Usar EXCLUSIVAMENTE en componentes servidor (Layouts, Server Components, API Routes).
 */
export async function getCurrentNurseProfileSSR(): Promise<{
  nurseProfileId: string;
  nurseType: NurseType;
  organizationId: string | null;
} | null> {
  try {
    const { default: createSupabaseServerClient } = await import(
      '@/app/adapters/server'
    );
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return null;

    const { data, error } = await supabase
      .from('nurse_profiles')
      .select('nurse_profile_id, nurse_type, organization_id, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (error || !data) return null;

    return {
      nurseProfileId: data.nurse_profile_id as string,
      nurseType: data.nurse_type as NurseType,
      organizationId: (data.organization_id as string | null) ?? null,
    };
  } catch (err) {
    console.error('[getCurrentNurseProfileSSR]', err);
    return null;
  }
}
