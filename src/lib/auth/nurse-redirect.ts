// src/lib/auth/nurse-redirect.ts
// ═══════════════════════════════════════════════════════════
// ASHIRA — Redirección post-login para enfermeras
// Extiende el sistema de login SIN modificarlo.
// ═══════════════════════════════════════════════════════════
import { createSupabaseBrowserClient } from '@/app/adapters/client';
import type { NurseType } from '@/types/nurse.types';

export interface NurseRedirectResult {
  isNurse: boolean;
  nurseType: NurseType | null;
  redirectPath: string | null;
}

/**
 * Verifica si el usuario autenticado tiene un perfil de enfermería activo
 * y retorna la ruta de redirección apropiada.
 *
 * Usar en el flujo post-login ANTES de ejecutar las redirecciones de otros roles.
 *
 * @param userId - auth.uid() del usuario recién autenticado
 */
export async function getNurseRedirectPath(
  userId: string
): Promise<NurseRedirectResult> {
  try {
    const supabase = createSupabaseBrowserClient();

    const { data, error } = await supabase
      .from('nurse_profiles')
      .select('nurse_type, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (error || !data) {
      return {
        isNurse: false,
        nurseType: null,
        redirectPath: null,
      };
    }

    const nurseType = data.nurse_type as NurseType;

    const redirectPath =
      nurseType === 'affiliated'
        ? '/nurse/dashboard'
        : '/nurse/independent/dashboard';

    return {
      isNurse: true,
      nurseType,
      redirectPath,
    };
  } catch (err) {
    console.error('[getNurseRedirectPath]', err);
    return { isNurse: false, nurseType: null, redirectPath: null };
  }
}

/**
 * Verifica si la sesión actual pertenece a una enfermera activa.
 * Usar en layouts server-side o guards.
 */
export async function getCurrentNurseProfileSSR(): Promise<{
  nurseProfileId: string;
  nurseType: NurseType;
  organizationId: string | null;
} | null> {
  try {
    // Dynamic import to avoid client/server bundle mixing
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
