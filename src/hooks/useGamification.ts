'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface GamificationStatus {
  total_points: number;
  current_level: number;
  completed_missions: string[];
  unlocked_modules: string[];
  persisted: boolean;
}

export function useGamification() {
  const { data, error, mutate, isLoading } = useSWR<GamificationStatus>(
    '/api/gamification/status',
    fetcher,
    {
      revalidateOnFocus: false, // Evitar peticiones excesivas
      dedupingInterval: 10000, // Cachear por 10 segundos
    }
  );

  const validateMission = async (missionId: string) => {
    try {
      const res = await fetch('/api/gamification/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ missionId }),
      });

      const result = await res.json();

      if (result.success) {
        // Revalidar los datos para actualizar el UI
        mutate();
      }

      return result;
    } catch (err) {
      console.error('[useGamification] Error validating mission:', err);
      return { success: false, error: 'Error de conexión' };
    }
  };

  return {
    status: data,
    loading: isLoading,
    error,
    validateMission,
    refreshStatus: mutate,
  };
}
