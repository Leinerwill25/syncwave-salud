'use client';

import { useEffect, useState } from 'react';
import { subscribeToPush } from '@/lib/actions/notifications';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export default function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscription();
    } else {
      setLoading(false);
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub);
    } catch (error) {
      console.error('Error al verificar suscripción:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      setLoading(true);
      const registration = await navigator.serviceWorker.ready;
      
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!)
      });

      const res = await subscribeToPush(sub.toJSON());
      
      if (res.success) {
        setSubscription(sub);
        toast.success('¡Notificaciones activadas!', {
          description: 'Recibirás alertas incluso con la web cerrada.'
        });
      } else {
        toast.error('Error al activar notificaciones');
      }
    } catch (error) {
      console.error('Error al suscribirse:', error);
      toast.error('Permiso denegado o error de registro');
    } finally {
      setLoading(false);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  if (!isSupported) return null;

  return (
    <button
      onClick={handleSubscribe}
      disabled={loading || !!subscription}
      title={subscription ? 'Notificaciones activadas' : 'Activar notificaciones push'}
      className={`relative inline-flex items-center justify-center h-10 w-10 rounded-xl transition-all duration-300 group ${
        subscription 
          ? 'bg-emerald-50 border border-emerald-100 text-emerald-600 cursor-default' 
          : 'bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/30 shadow-sm'
      }`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : subscription ? (
        <Bell className="w-4 h-4" />
      ) : (
        <>
          <BellOff className="w-4 h-4 transition-transform group-hover:scale-110" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse border border-white" />
        </>
      )}
      
      {/* Tooltip sutil opcional o simplemente confiar en el estilo */}
      {!subscription && !loading && (
        <span className="absolute -bottom-12 right-0 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          ACTIVAR PUSH
        </span>
      )}
    </button>
  );
}
