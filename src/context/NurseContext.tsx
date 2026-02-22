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
import { getNurseProfile, getDashboardSummary } from '@/lib/supabase/nurse.service';
import { createSupabaseBrowserClient } from '@/app/adapters/client';

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
  | { type: 'SET_LOADING'; payload: boolean };

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

  // ── Cargar resumen del dashboard ────────────────────────
  const refreshDashboard = useCallback(async () => {
    const summary = await getDashboardSummary();
    if (summary) dispatch({ type: 'SET_SUMMARY', payload: summary });
  }, []);

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
