import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Faltan variables de entorno de Supabase (URL o SERVICE_ROLE_KEY).');
}

/**
 * Cliente de Supabase con Service Role Key.
 * EXCLUSIVO para uso en el servidor (API Routes / Server Actions).
 * Salta todas las políticas de RLS.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
