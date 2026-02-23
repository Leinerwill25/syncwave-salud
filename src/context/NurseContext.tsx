'use client';
// src/context/NurseContext.tsx
// ═══════════════════════════════════════════════════════════
// ASHIRA — Contexto global del Panel de Enfermería
// ═══════════════════════════════════════════════════════════
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import type {
  NurseContextState,
  NurseContextActions,
  NurseFullProfile,
  PatientQueueEntry,
  NurseDailyDashboard,
  DashboardSummaryResponse,
  NurseAlert,
  NurseType,
} from '@/types/nurse.types';
import { getNurseProfile, getDashboardSummary, createVitalSigns, createMARRecord, updateMARStatus, createProcedure, updateProcedureStatus, createEvolutionNote, updateQueueStatus } from '@/lib/supabase/nurse.service';
import { createSupabaseBrowserClient } from '@/app/adapters/client';
import { nurseSyncService } from '@/lib/services/NurseSyncService';
import { toast } from 'sonner';

// ─── Estado inicial ───────────────────────────────────────

const initialState: NurseContextState = {
  nurseProfile: null,
  nurseType: null,
  activePatient: null,
  todaySummary: null,
  alerts: [],
  currentShift: { start: null, isActive: false },
  isOnline: true,
  isLoading: true,
  pendingSyncCount: 0,
  isSyncing: false,
};

// ─── Actions del reducer ──────────────────────────────────

type NurseAction =
  | { type: 'SET_PROFILE'; payload: NurseFullProfile }
  | { type: 'SET_ACTIVE_PATIENT'; payload: NurseDailyDashboard | null }
  | { type: 'SET_SUMMARY'; payload: DashboardSummaryResponse }
  | { type: 'ADD_ALERT'; payload: NurseAlert }
  | { type: 'SET_ALERTS'; payload: NurseAlert[] }
  | { type: 'DISMISS_ALERT'; payload: string }
  | { type: 'START_SHIFT' }
  | { type: 'END_SHIFT' }
  | { type: 'SET_ONLINE'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SYNCING'; payload: boolean }
  | { type: 'SET_PENDING_SYNC_COUNT'; payload: number };

function nurseReducer(state: NurseContextState, action: NurseAction): NurseContextState {
  switch (action.type) {
    case 'SET_PROFILE':
      return {
        ...state,
        nurseProfile: action.payload,
        nurseType: action.payload.nurse_type as NurseType,
        isLoading: false,
      };
    case 'SET_ACTIVE_PATIENT':
      return { ...state, activePatient: action.payload };
    case 'SET_SUMMARY':
      return { ...state, todaySummary: action.payload };
    case 'ADD_ALERT':
      // Evitar duplicados por queueId + medicationName
      if (state.alerts.some(a => a.message === action.payload.message && !a.dismissed)) {
        return state;
      }
      return { ...state, alerts: [action.payload, ...state.alerts] };
    case 'SET_ALERTS':
      return { ...state, alerts: action.payload };
    case 'DISMISS_ALERT':
      return {
        ...state,
        alerts: state.alerts.map((a) =>
          a.id === action.payload ? { ...a, dismissed: true } : a
        ),
      };
    case 'START_SHIFT':
      return {
        ...state,
        currentShift: { start: new Date(), isActive: true },
      };
    case 'END_SHIFT':
      return { ...state, currentShift: { start: null, isActive: false } };
    case 'SET_ONLINE':
      return { ...state, isOnline: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_SYNCING':
      return { ...state, isSyncing: action.payload };
    case 'SET_PENDING_SYNC_COUNT':
      return { ...state, pendingSyncCount: action.payload };
    default:
      return state;
  }
}

// ─── Contextos ────────────────────────────────────────────

export const NurseStateContext = createContext<NurseContextState>(initialState);
export const NurseActionsContext = createContext<NurseContextActions>({
  setActivePatient: () => {},
  refreshDashboard: () => {},
  dismissAlert: () => {},
  startShift: () => {},
  endShift: () => {},
  addAlert: () => {},
  addToSyncQueue: async () => {},
  triggerSync: async () => {},
});

// ─── Provider ─────────────────────────────────────────────

interface NurseProviderProps {
  children: ReactNode;
  /** nurse_profile_id del usuario autenticado (del layout SSR) */
  userId: string;
}

import { getPendingMedications } from '@/lib/supabase/nurse.service';

export function NurseProvider({ children, userId }: NurseProviderProps) {
  const [state, dispatch] = useReducer(nurseReducer, initialState);
  const summaryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remindersIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSyncingRef = useRef(false);

  // ── Cargar resumen del dashboard ────────────────────────
  const refreshDashboard = useCallback(async () => {
    const summary = await getDashboardSummary();
    if (summary) dispatch({ type: 'SET_SUMMARY', payload: summary });
  }, []);

  // ── Sincronización offline ──────────────────────────────

  const triggerSync = useCallback(async () => {
    if (!state.isOnline || state.isSyncing || isSyncingRef.current || !state.nurseProfile) return;

    try {
      isSyncingRef.current = true;
      dispatch({ type: 'SET_SYNCING', payload: true });

      const pendingItems = await nurseSyncService.getPendingItems(userId);
      if (pendingItems.length === 0) return;

      console.log(`[NurseSync] Iniciando sincronización de ${pendingItems.length} items...`);
      let successCount = 0;

      for (const item of pendingItems) {
        let error = null;

        try {
          switch (item.type) {
            case 'vital_signs':
              ({ error } = await createVitalSigns(item.payload));
              if (!error) {
                // Automáticamente pasar a 'ready_for_doctor' tras tomar signos vitales (comportamiento estándar del flujo)
                await updateQueueStatus(item.payload.queue_id, 'ready_for_doctor');
              }
              break;
            case 'mar':
              // Podría ser creación o actualización de estado
              if (item.payload.mar_id) {
                ({ error } = await updateMARStatus(item.payload.mar_id, item.payload.status, item.payload.notes, item.payload.omissionReason));
              } else {
                ({ error } = await createMARRecord(item.payload));
              }
              break;
            case 'procedure':
              if (item.payload.procedure_id) {
                ({ error } = await updateProcedureStatus(item.payload.procedure_id, item.payload.status, item.payload.outcome));
              } else {
                ({ error } = await createProcedure(item.payload));
              }
              break;
            case 'note':
              ({ error } = await createEvolutionNote(item.payload));
              break;
          }

          if (!error) {
            await nurseSyncService.removeFromQueue(item.id);
            successCount++;
          } else {
            console.error(`[NurseSync] Error sincronizando ${item.type}:`, error);
          }
        } catch (e) {
          console.error(`[NurseSync] Error crítico en item ${item.id}:`, e);
        }
      }

      const remaining = await nurseSyncService.getPendingCount(userId);
      dispatch({ type: 'SET_PENDING_SYNC_COUNT', payload: remaining });

      if (successCount > 0) {
        toast.success(`Sincronización completada: ${successCount} registros subidos.`);
        refreshDashboard();
      }
    } finally {
      isSyncingRef.current = false;
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  }, [state.isOnline, state.isSyncing, state.nurseProfile, userId, refreshDashboard]);

  const addToSyncQueue = useCallback(async (type: any, payload: any) => {
    try {
      await nurseSyncService.addToQueue({ userId, type, payload });
      const count = await nurseSyncService.getPendingCount(userId);
      dispatch({ type: 'SET_PENDING_SYNC_COUNT', payload: count });
      toast.info('Sin conexión. Información resguardada localmente de forma segura (AES-256).');
    } catch (err) {
      console.error('[SyncQueue] Error guardando offline:', err);
      toast.error('Error al guardar información offline.');
    }
  }, [userId]);

  // ── Cargar perfil al montar ─────────────────────────────
  useEffect(() => {
    async function loadProfile() {
      dispatch({ type: 'SET_LOADING', payload: true });
      const profile = await getNurseProfile(userId);
      if (profile) {
        dispatch({ type: 'SET_PROFILE', payload: profile });
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
    loadProfile();
  }, [userId]);


  // ── Polling de medicamentos pendientes ──────────────────
  const checkPendingReminders = useCallback(async () => {
    if (!state.nurseProfile?.organization_id) return;
    
    const pendingMedications = await getPendingMedications(state.nurseProfile.organization_id);
    
    pendingMedications.forEach(med => {
      // Solo agregar si no existe ya una alerta activa para este MAR
      dispatch({
        type: 'ADD_ALERT',
        payload: {
          id: `mar-${med.mar_id}`,
          type: 'critical',
          title: 'Medicación Pendiente',
          message: `${med.medication_name} — ${med.dose} (${med.route})`,
          queueId: med.queue_id,
          action: { label: 'Administrar', href: `/nurse/patient/${med.queue_id}/medications` },
          createdAt: new Date(),
          dismissed: false,
        }
      });
    });
  }, [state.nurseProfile?.organization_id]);

  useEffect(() => {
    if (!state.nurseProfile) return;
    refreshDashboard();
    checkPendingReminders();

    // Refresh dashboard every 60s, check reminders every 30s
    summaryIntervalRef.current = setInterval(refreshDashboard, 60_000);
    remindersIntervalRef.current = setInterval(checkPendingReminders, 30_000);

    return () => {
      if (summaryIntervalRef.current) clearInterval(summaryIntervalRef.current);
      if (remindersIntervalRef.current) clearInterval(remindersIntervalRef.current);
    };
  }, [state.nurseProfile, refreshDashboard, checkPendingReminders]);

  // ── Trigger sync al conectar o al cargar ────────────────
  useEffect(() => {
    if (state.isOnline && state.nurseProfile) {
      triggerSync();
    }
  }, [state.isOnline, state.nurseProfile, triggerSync]);

  // ── Cargar conteo inicial de pendientes ─────────────────
  useEffect(() => {
    if (state.nurseProfile) {
      nurseSyncService.getPendingCount(userId).then(count => {
        dispatch({ type: 'SET_PENDING_SYNC_COUNT', payload: count });
      });
    }
  }, [state.nurseProfile, userId]);

  // ── Monitor online/offline ──────────────────────────────
  useEffect(() => {
    function handleOnline() { dispatch({ type: 'SET_ONLINE', payload: true }); }
    function handleOffline() { dispatch({ type: 'SET_ONLINE', payload: false }); }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── Supabase Realtime — alertas MAR ────────────────────
  useEffect(() => {
    if (!state.nurseProfile) return;
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel('nurse-mar-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'nurse_mar_records',
          filter: `nurse_id=eq.${state.nurseProfile.user_id}`,
        },
        (payload) => {
          const record = payload.new as Record<string, unknown>;
          if (record.status === 'pending') {
            dispatch({
              type: 'ADD_ALERT',
              payload: {
                id: crypto.randomUUID(),
                type: 'warning',
                title: 'Nuevo Medicamento',
                message: `${record.medication_name as string} — ${record.dose as string} (${record.route as string})`,
                queueId: record.queue_id as string,
                action: { label: 'Ver MAR', href: `/nurse/patient/${record.queue_id}/medications` },
                createdAt: new Date(),
                dismissed: false,
              },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.nurseProfile]);

  // ── Actions ────────────────────────────────────────────

  const actions: NurseContextActions = {
    setActivePatient: useCallback(
      (entry: NurseDailyDashboard | null) => dispatch({ type: 'SET_ACTIVE_PATIENT', payload: entry }),
      []
    ),
    refreshDashboard,
    dismissAlert: useCallback(
      (id) => dispatch({ type: 'DISMISS_ALERT', payload: id }),
      []
    ),
    startShift: useCallback(() => dispatch({ type: 'START_SHIFT' }), []),
    endShift: useCallback(() => dispatch({ type: 'END_SHIFT' }), []),
    addAlert: useCallback((alert) => {
      dispatch({
        type: 'ADD_ALERT',
        payload: {
          ...alert,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          dismissed: false,
        },
      });
    }, []),
    addToSyncQueue,
    triggerSync,
  };

  return (
    <NurseStateContext.Provider value={state}>
      <NurseActionsContext.Provider value={actions}>
        {children}
      </NurseActionsContext.Provider>
    </NurseStateContext.Provider>
  );
}

// ─── Hooks de consumo ─────────────────────────────────────

export function useNurseState(): NurseContextState {
  return useContext(NurseStateContext);
}

export function useNurseActions(): NurseContextActions {
  return useContext(NurseActionsContext);
}

export function useNurse(): NurseContextState & NurseContextActions {
  return { ...useNurseState(), ...useNurseActions() };
}
