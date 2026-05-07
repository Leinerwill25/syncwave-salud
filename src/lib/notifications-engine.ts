import webpush from 'web-push';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Configuración de Web Push
const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
};

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  webpush.setVapidDetails(
    'mailto:syncwaveagency@syncwave.com.ve',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
}

// Configuración de Resend
const resend = new Resend(process.env.RESEND_API_KEY);

interface NotificationOptions {
  title: string;
  body: string;
  url?: string;
  email?: {
    to: string;
    subject: string;
    html: string;
  };
}

/**
 * Motor central para enviar notificaciones (Push + Email + In-App)
 */
export async function sendNotification(userId: string, options: NotificationOptions) {
  try {
    const results: any = { inApp: false, push: false, email: false };

    // 1. Notificación In-App (Tabla public.notification)
    const { error: inAppError } = await supabaseAdmin
      .from('notification')
      .insert({
        userId: userId,
        type: 'general',
        title: options.title,
        message: options.body,
        payload: { url: options.url },
        read: false
      });
    
    if (!inAppError) results.inApp = true;

    // 2. Notificación Web Push
    // Buscar todas las suscripciones activas del usuario
    const { data: subscriptions } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId);

    if (subscriptions && subscriptions.length > 0) {
      const pushPromises = subscriptions.map(sub => 
        webpush.sendNotification(sub.subscription as any, JSON.stringify({
          title: options.title,
          body: options.body,
          url: options.url || '/dashboard'
        })).catch(err => {
          console.error('[WebPush] Error enviando a suscripción:', err);
          // Si la suscripción ya no es válida (410 Gone o 404), podríamos eliminarla aquí
        })
      );
      await Promise.all(pushPromises);
      results.push = true;
    }

    // 3. Notificación por Email (Solo si se provee la opción y es paciente)
    if (options.email) {
      const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'ASHIRA <notificaciones@syncwave.com.ve>',
        to: options.email.to,
        subject: options.email.subject,
        html: options.email.html,
      });
      if (!error) results.email = true;
    }

    return { success: true, results };
  } catch (error) {
    console.error('[NotificationEngine] Error general:', error);
    return { success: false, error };
  }
}
