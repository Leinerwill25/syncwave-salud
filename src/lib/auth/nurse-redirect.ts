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
        ? '/dashboard/nurse'
        : '/dashboard/nurse/independent';

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
