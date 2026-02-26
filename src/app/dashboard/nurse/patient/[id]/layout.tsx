'use client';
// src/app/dashboard/nurse/patient/[id]/layout.tsx
import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { useNurseState, useNurseActions } from '@/context/NurseContext';
import { getDailyQueue } from '@/lib/supabase/nurse.service';
import { 
  ChevronLeft, 
  User, 
  Activity, 
  ClipboardList, 
  Pill, 
  FileText, 
  Loader2,
  Calendar,
  CreditCard,
  Droplet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

export default function PatientDetailsLayout({ children, params }: Props) {
  const { id } = React.use(params);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queueId = searchParams.get('queueId');
  const { activePatient } = useNurseState();
  const { setActivePatient } = useNurseActions();
  const [loading, setLoading] = useState(!activePatient);

  useEffect(() => {
    async function recoverPatient() {
      if (!activePatient && queueId) {
        setLoading(true);
        const queue = await getDailyQueue();
        const found = queue.find(q => q.queue_id === queueId);
        if (found) {
          setActivePatient(found);
        } else {
          toast.error('No se pudo encontrar la información del paciente en la cola.');
        }
        setLoading(false);
      } else if (!activePatient && !queueId) {
        // Handle cases where we don't have a queueId?
        // For now, satisfy with a basic loader or message
        setLoading(false);
      }
    }
    recoverPatient();
  }, [activePatient, queueId]);

  const patientName = activePatient 
    ? `${activePatient.patient_first_name || activePatient.unreg_first_name} ${activePatient.patient_last_name || activePatient.unreg_last_name}`
    : 'Cargando...';

  const tabs = [
    { id: 'summary', label: 'Resumen', icon: ClipboardList, href: `/nurse/patient/${id}${queueId ? `?queueId=${queueId}` : ''}` },
    { id: 'vitals', label: 'Signos Vitales', icon: Activity, href: `/nurse/patient/${id}/vitals${queueId ? `?queueId=${queueId}` : ''}` },
    { id: 'mar', label: 'Medicamentos (MAR)', icon: Pill, href: `/nurse/patient/${id}/mar${queueId ? `?queueId=${queueId}` : ''}` },
    { id: 'procedures', label: 'Procedimientos', icon: Droplet, href: `/nurse/patient/${id}/procedures${queueId ? `?queueId=${queueId}` : ''}` },
    { id: 'notes', label: 'Evolución / Notas', icon: FileText, href: `/nurse/patient/${id}/notes${queueId ? `?queueId=${queueId}` : ''}` },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
        <p className="mt-4 text-gray-500 font-medium">Recuperando ficha del paciente...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Patient Header Section */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
          <Link 
            href="/dashboard/nurse/queue"
            className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:bg-gray-100 transition-colors hidden md:block"
          >
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-none mb-1">
                {patientName}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="flex items-center gap-1.5 text-xs font-bold text-teal-600 dark:text-teal-400">
                  <CreditCard className="w-3.5 h-3.5" />
                  {activePatient?.patient_identifier || activePatient?.unreg_identifier || 'N/A'}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  Paciente {activePatient?.patient_id ? 'Registrado' : 'No registrado'}
                </span>
                {activePatient?.blood_type && (
                   <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/10 px-2 py-0.5 rounded-full">
                    <Droplet className="w-3.5 h-3.5" />
                    RH {activePatient.blood_type}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1" />

          {/* Quick Stats or Alerts */}
          {activePatient?.allergies_flag && (
            <div className="px-4 py-2 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">Alergias Detectadas</span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="px-4 md:px-6 border-t border-gray-50 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/20">
          <div className="flex items-center overflow-x-auto gap-1 scrollbar-hide py-1">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href.split('?')[0];
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap",
                    isActive 
                      ? "border-teal-600 text-teal-600" 
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
                  )}
                >
                  <tab.icon className={cn("w-4 h-4", isActive ? "text-teal-600" : "text-gray-400")} />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {children}
      </div>
    </div>
  );
}
