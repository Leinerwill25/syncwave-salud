'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/app/adapters/client';
import PointsToast from './PointsToast';
import { PointTransaction } from '@/types/points';

export default function PointsProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<PointTransaction[]>([]);

  useEffect(() => {
    let channel: any;

    const setupRealtime = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      const patientId = userData.user.id;

      // Escuchar INSERTS en patient_points_transactions para el usuario actual
      channel = supabase
        .channel('points_channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'patient_points_transactions',
            filter: `patient_id=eq.${patientId}`,
          },
          (payload) => {
            const newTx = payload.new as PointTransaction;
            // Solo mostramos toast si son puntos ganados (no canjes)
            if (newTx.points > 0) {
              setToasts((prev) => [...prev, newTx]);
            }
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) {
        createSupabaseBrowserClient().removeChannel(channel);
      }
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-0 right-0 z-50 flex flex-col items-end pointer-events-none p-4 gap-2">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <PointsToast
              points={toast.points}
              description={toast.description}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </>
  );
}
