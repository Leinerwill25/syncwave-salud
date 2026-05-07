'use server';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/app/adapters/server';

/**
 * Registra una nueva suscripción de Web Push para el usuario actual.
 */
export async function subscribeToPush(subscription: any) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    // Obtener el ID de la tabla public.users para este usuario de Auth
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('authId', user.id)
      .single();

    if (!userData) {
      return { success: false, error: 'Perfil de usuario no encontrado' };
    }

    // Verificar si ya existe la suscripción para este endpoint
    const { data: existing } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userData.id)
      .filter('subscription->>endpoint', 'eq', subscription.endpoint)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from('push_subscriptions')
        .update({ 
          subscription: subscription, // Actualizar por si cambiaron las keys
          updated_at: new Date().toISOString() 
        })
        .eq('id', existing.id);
    } else {
      await supabaseAdmin
        .from('push_subscriptions')
        .insert({
          user_id: userData.id,
          subscription: subscription
        });
    }

    return { success: true };
  } catch (error) {
    console.error('[subscribeToPush] Error:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

/**
 * Elimina una suscripción de Web Push.
 */
export async function unsubscribeFromPush(endpoint: string) {
  try {
    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .filter('subscription->>endpoint', 'eq', endpoint);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('[unsubscribeFromPush] Error:', error);
    return { success: false, error: 'Error al eliminar suscripción' };
  }
}
