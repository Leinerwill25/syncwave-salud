'use client';
// src/app/nurse/patient/[id]/vitals/page.tsx
import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { VitalSignsForm } from '@/components/nurse/clinical/VitalSignsForm';
import { createVitalSigns, updateQueueStatus } from '@/lib/supabase/nurse.service';
import { useNurseState } from '@/context/NurseContext';
import { toast } from 'sonner';
import { ChevronLeft, User, Activity, Clock } from 'lucide-react';
import Link from 'next/link';

export default function PatientVitalsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const queueId = searchParams.get('queueId');
  const { activePatient, nurseProfile } = useNurseState();
  const [submitting, setSubmitting] = useState(false);

  // Fallback: If no active patient in context, we might need to fetch it
  // But for Sprint 2, we assume navigation comes from the Queue or Dashboard
  // where the context is already set.

  const patientName = activePatient 
    ? `${activePatient.patient_first_name || activePatient.unreg_first_name} ${activePatient.patient_last_name || activePatient.unreg_last_name}`
    : 'Cargando paciente...';

  const patientId = activePatient?.patient_id || activePatient?.unregistered_patient_id || id;

  const handleSubmit = async (data: any) => {
    if (!queueId || !nurseProfile) {
      toast.error('Error: Datos de sesión o cola faltantes');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create Vital Signs record
      const { error: vitalsError } = await createVitalSigns({
        ...data,
        queue_id: queueId,
        nurse_id: nurseProfile.nurse_profile_id,
        patient_id: activePatient?.patient_id || undefined,
        unregistered_patient_id: activePatient?.unregistered_patient_id || undefined,
        organization_id: nurseProfile.organization_id || undefined,
      });

      if (vitalsError) throw new Error(vitalsError);

      // 2. Update Queue Status to 'ready_for_doctor'
      const { error: statusError } = await updateQueueStatus(queueId, 'ready_for_doctor');
      if (statusError) throw new Error(statusError);

      toast.success('Signos vitales guardados. Paciente listo para médico.');
      router.push('/nurse/queue');
    } catch (err: any) {
      console.error(err);
      toast.error(`Error al guardar: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/nurse/queue"
            className="p-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-red-500" />
              Toma de Signos Vitales y Triaje
            </h1>
            <p className="text-sm text-gray-500">Completa la evaluación inicial del paciente.</p>
          </div>
        </div>

        {/* Patient Info Chip */}
        <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-800 flex items-center justify-center text-teal-600 font-bold">
            <User className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{patientName}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-700 font-bold uppercase text-teal-700 dark:text-teal-400">
                ID: {activePatient?.patient_identifier || activePatient?.unreg_identifier || 'N/A'}
              </span>
              <span className="text-[10px] flex items-center gap-1 text-gray-500 font-medium">
                <Clock className="w-3 h-3" /> Llegada: {activePatient ? new Date(activePatient.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 md:p-8 shadow-xl shadow-gray-200/20 dark:shadow-none">
        <VitalSignsForm 
          onSubmit={handleSubmit} 
          isLoading={submitting} 
          initialData={{
            notes: activePatient?.chief_complaint || undefined
          }}
        />
      </div>

      {/* Disclaimer / Helpful info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
        <div className="p-4 bg-gray-50 dark:bg-gray-800/20 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-start gap-3">
          <Activity className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500">
            La toma de signos vitales es el paso crítico para el Triaje. Un registro preciso ayuda a priorizar los casos según la urgencia clínica real.
          </p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-800/20 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-start gap-3">
          <Clock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500">
            Después de guardar, el estado del paciente cambiará a <strong>"Listo para médico"</strong> y aparecerá en la lista del especialista correspondiente.
          </p>
        </div>
      </div>
    </div>
  );
}
