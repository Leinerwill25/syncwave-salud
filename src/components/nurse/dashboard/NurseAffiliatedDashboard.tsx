'use client';
// src/components/nurse/dashboard/NurseAffiliatedDashboard.tsx
import { useEffect, useState } from 'react';
import { getDashboardSummary, getDailyQueue } from '@/lib/supabase/nurse.service';
import type { DashboardSummaryResponse, NurseDailyDashboard } from '@/types/nurse.types';
import { QUEUE_STATUS_LABELS, QUEUE_STATUS_COLORS } from '@/types/nurse.types';
import { 
  Users, 
  Activity, 
  Clock, 
  UserCheck, 
  ArrowRight, 
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface NurseAffiliatedDashboardProps {
  initialSummary?: DashboardSummaryResponse | null;
  initialQueue?: NurseDailyDashboard[];
}

export function NurseAffiliatedDashboard({ initialSummary, initialQueue }: NurseAffiliatedDashboardProps) {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(initialSummary || null);
  const [recentQueue, setRecentQueue] = useState<NurseDailyDashboard[]>(initialQueue?.slice(0, 5) || []);
  const [loading, setLoading] = useState(!initialSummary);

  async function loadData() {
    // Si ya tenemos datos iniciales, no mostramos el Loader2 de pantalla completa
    if (!summary) setLoading(true);
    
    const [summaryRes, queueRes] = await Promise.all([
      getDashboardSummary(),
      getDailyQueue()
    ]);
    setSummary(summaryRes);
    setRecentQueue(queueRes.slice(0, 5));
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-10 h-10 text-teal-600 animate-spin mb-4" />
        <p className="text-gray-500 animate-pulse">Preparando tu resumen del día...</p>
      </div>
    );
  }

  const stats = [
    { label: 'Total Hoy', value: summary?.total_patients ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 ' },
    { label: 'En Espera', value: summary?.waiting ?? 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 ' },
    { label: 'En Triaje', value: summary?.in_triage ?? 0, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50 ' },
    { label: 'Atendidos', value: summary?.ready_for_doctor ?? 0, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 ' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white  p-5 rounded-2xl border border-gray-100  shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2.5 rounded-xl", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Hoy</span>
            </div>
            <div>
              <p className="text-3xl font-black text-gray-900 ">{stat.value}</p>
              <p className="text-sm font-medium text-gray-500 ">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Queue View */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-gray-900  flex items-center gap-2">
              Próximos en Lista
              <span className="text-xs font-normal text-gray-500">(Primeros 5)</span>
            </h2>
            <Link 
              href="/dashboard/nurse/queue"
              className="text-sm font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 group transition-colors"
            >
              Ver toda la cola
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="bg-white  rounded-2xl border border-gray-100  overflow-hidden">
            {recentQueue.length > 0 ? (
              <div className="divide-y divide-gray-50 ">
                {recentQueue.map((item) => (
                  <div key={item.queue_id} className="p-4 flex items-center justify-between hover:bg-gray-50/50  transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100  flex items-center justify-center font-bold text-gray-600 ">
                        {item.patient_first_name?.[0] || item.unreg_first_name?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 ">
                          {item.patient_first_name || item.unreg_first_name} {item.patient_last_name || item.unreg_last_name}
                        </p>
                        <p className="text-xs text-gray-500  italic truncate max-w-[150px]">
                          {item.chief_complaint || 'Sin motivo'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight",
                        QUEUE_STATUS_COLORS[item.status]
                      )}>
                        {QUEUE_STATUS_LABELS[item.status]}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        Llegada: {new Date(item.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <Users className="w-12 h-12 text-gray-200  mb-3" />
                <p className="text-gray-500  text-sm">No hay pacientes en la cola actualmente.</p>
              </div>
            )}
          </div>
        </div>

        {/* Alerts / Tasks Sidebar */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900  px-1">Tareas Pendientes</h2>
          <div className="bg-white  rounded-2xl border border-gray-100  p-4 space-y-4">
            {summary?.pending_vitals && summary.pending_vitals > 0 ? (
              <div className="flex items-start gap-3 p-3 bg-red-50  border border-red-100  rounded-xl">
                <Activity className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-red-900 ">{summary.pending_vitals} Signos Pendientes</p>
                  <p className="text-xs text-red-700  mt-0.5">Pacientes esperando triaje para avanzar.</p>
                  <Link href="/dashboard/nurse/queue" className="text-xs font-bold text-red-600 mt-2 inline-block hover:underline">Ir a Triaje</Link>
                </div>
              </div>
            ) : null}

            {summary?.interaction_alerts && summary.interaction_alerts > 0 ? (
              <div className="flex items-start gap-3 p-3 bg-amber-50  border border-amber-100  rounded-xl">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-900 ">{summary.interaction_alerts} Alertas de Interacción</p>
                  <p className="text-xs text-amber-700  mt-0.5">Revisa combinaciones peligrosas de medicamentos.</p>
                </div>
              </div>
            ) : null}

            {!summary?.pending_vitals && !summary?.interaction_alerts ? (
              <div className="py-8 text-center bg-gray-50  rounded-xl border border-dashed border-gray-200 ">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs text-gray-500  font-medium px-4">¡Todo al día! No hay alertas clínicas urgentes.</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
