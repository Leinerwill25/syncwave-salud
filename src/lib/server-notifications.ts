// src/lib/server-notifications.ts
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface ServerNotificationOptions {
  userId?: string | null;
  organizationId?: string | null;
  type: string;
  title: string;
  message: string;
  payload?: Record<string, unknown>;
}

/**
 * Crea una notificación en la base de datos usando el cliente Admin.
 * Útil para Webhooks y Cron Jobs donde no hay contexto de cookies/sesión.
 */
export async function createServerNotification(options: ServerNotificationOptions) {
  try {
    const { data: notification, error } = await supabaseAdmin
      .from('notification')
      .insert({
        userId: options.userId || null,
        organizationId: options.organizationId || null,
        type: options.type,
        title: options.title,
        message: options.message,
        payload: options.payload || null,
        read: false,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[createServerNotification] Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, notificationId: notification.id };
  } catch (err) {
    console.error('[createServerNotification] Exception:', err);
    return { success: false, error: 'Internal Server Error' };
  }
}
