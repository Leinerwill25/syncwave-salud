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

    const { data: profile, error: profileError } = await supabase
      .from('nurse_profiles')
      .select('nurse_profile_id, nurse_type, organization_id, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (profile) {
      return {
        nurseProfileId: profile.nurse_profile_id as string,
        nurseType: profile.nurse_type as NurseType,
        organizationId: (profile.organization_id as string | null) ?? null,
      };
    }

    // Fallback: Si no tiene nurse_profile pero el rol en "users" es de enfermería,
    // permitimos el acceso con datos básicos (esto sucede para usuarios antiguos).
    const { data: usr } = await supabase
      .from('users')
      .select('id, role, organizationId')
      .eq('authId', user.id)
      .maybeSingle();

    if (usr && (usr.role === 'ENFERMERO' || usr.role === 'ENFERMERA')) {
      return {
        nurseProfileId: user.id, // Fallback ID si falta el perfil real
        nurseType: 'independent' as NurseType, // Asumimos independiente si no tiene perfil
        organizationId: usr.organizationId || null,
      };
    }

    // Fallback 2: Si no está en tablas, check metadata (muy común en registros directos/migrados)
    const metaRole = user.user_metadata?.role;
    if (metaRole === 'ENFERMERO' || metaRole === 'ENFERMERA') {
      return {
        nurseProfileId: user.id,
        nurseType: 'independent' as NurseType,
        organizationId: null, // No sabemos organización desde metadata sola
      };
    }

    return null;
  } catch (err) {
    console.error('[getCurrentNurseProfileSSR]', err);
    return null;
  }
}
