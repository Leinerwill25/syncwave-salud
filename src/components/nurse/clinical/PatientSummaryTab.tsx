'use client';
// src/components/nurse/clinical/PatientSummaryTab.tsx
import { useEffect, useState, useCallback } from 'react';
import { getPatientFullOrigin, createOriginRecord, addPriorTreatment } from '@/lib/supabase/nurse.service';
import type { PatientFullOriginResponse, NurseDailyDashboard } from '@/types/nurse.types';
import { ORIGIN_TYPE_LABELS, REFERRAL_REASON_LABELS, type OriginRecordFormData, type PriorTreatmentFormData } from '@/schemas/nurse/origin.schema';
import { 
  History, 
  MapPin, 
  Pill, 
  UserPlus, 
  AlertCircle, 
  FileCheck, 
  Loader2,
  Stethoscope,
  Building,
  Plus,
  Edit2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PatientOriginForm } from './PatientOriginForm';
import { PriorTreatmentForm } from './PriorTreatmentForm';
import { useNurseState } from '@/context/NurseContext';
import { toast } from 'sonner';

interface Props {
  patient: NurseDailyDashboard;
}

export function PatientSummaryTab({ patient }: Props) {
  const { nurseProfile } = useNurseState();
  const [originData, setOriginData] = useState<PatientFullOriginResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [showOriginModal, setShowOriginModal] = useState(false);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);

  const loadOrigin = useCallback(async () => {
    setLoading(true);
    const res = await getPatientFullOrigin({
      patientId: patient.patient_id || undefined,
      unregisteredPatientId: patient.unregistered_patient_id || undefined,
      queueId: patient.queue_id
    });
    setOriginData(res);
    setLoading(false);
  }, [patient]);

  useEffect(() => {
    loadOrigin();
  }, [loadOrigin]);

  const handleOriginSubmit = async (data: OriginRecordFormData) => {
    if (!nurseProfile) return;
    setSaving(true);
    const { error } = await createOriginRecord({
      ...data,
      patient_id: patient.patient_id || undefined,
      unregistered_patient_id: patient.unregistered_patient_id || undefined,
      queue_id: patient.queue_id,
      registered_by_nurse_id: nurseProfile.nurse_profile_id
    });

    if (!error) {
      toast.success('Información de origen guardada');
      setShowOriginModal(false);
      loadOrigin();
    } else {
      toast.error('Error al guardar origen');
    }
    setSaving(false);
  };

  const handleTreatmentSubmit = async (data: PriorTreatmentFormData) => {
    setSaving(true);
    const { error } = await addPriorTreatment({
      ...data,
      patient_id: patient.patient_id || undefined,
      unregistered_patient_id: patient.unregistered_patient_id || undefined,
      origin_record_id: originData?.origin?.origin_id
    });

    if (!error) {
      toast.success('Tratamiento agregado');
      setShowTreatmentModal(false);
      loadOrigin();
    } else {
      toast.error('Error al agregar tratamiento');
    }
    setSaving(false);
  };

  if (loading && !originData) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-3" />
        <p className="text-sm text-gray-500 font-medium font-sans">Cargando antecedentes clínicos...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
      {/* Current Motive Section */}
      <section className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 md:p-8 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <History className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Motivo de Consulta Actual</h2>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/20 p-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
           <p className="text-gray-700 dark:text-gray-300 italic font-medium">
            "{patient.chief_complaint || 'No se especificó motivo de consulta en el registro de hoy.'}"
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-3 pt-4">
          <div className="p-3 bg-white dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-700">
            <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Alergias</p>
            <div className="flex items-center gap-1.5">
               {patient.patient_allergies || patient.unreg_allergies ? (
                 <span className="text-sm font-bold text-red-600 truncate">{patient.patient_allergies || patient.unreg_allergies}</span>
               ) : (
                 <span className="text-sm font-medium text-emerald-600">Ninguna reportada</span>
               )}
            </div>
          </div>
          <div className="p-3 bg-white dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-700">
            <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Grupo Sanguíneo</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{patient.blood_type || 'N/A'}</p>
          </div>
        </div>
      </section>

      {/* Origin Section */}
      <section className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 md:p-8 space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
              <MapPin className="w-5 h-5 text-teal-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Origen del Paciente</h2>
          </div>
          
          <Dialog open={showOriginModal} onOpenChange={setShowOriginModal}>
            <DialogTrigger asChild>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-teal-600">
                {originData?.origin ? <Edit2 className="w-4 h-4" /> : <Plus className="w-5 h-5" />}
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{originData?.origin ? 'Actualizar Origen' : 'Registrar Procedencia'}</DialogTitle>
              </DialogHeader>
              <PatientOriginForm 
                initialData={(originData?.origin || {}) as any} 
                onSubmit={handleOriginSubmit} 
                isLoading={saving} 
              />
            </DialogContent>
          </Dialog>
        </div>

        {originData?.origin ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase">Procedencia</span>
              <span className="text-sm font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-3 py-1 rounded-full">
                {ORIGIN_TYPE_LABELS[originData.origin.origin_type] || originData.origin.origin_type}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {originData.origin.origin_org_name && (
                 <div className="flex gap-3">
                   <Building className="w-4 h-4 text-gray-400 mt-1" />
                   <div>
                     <p className="text-[10px] font-bold text-gray-400 uppercase">Organización Origen</p>
                     <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{originData.origin.origin_org_name}</p>
                   </div>
                 </div>
               )}
               {originData.origin.referring_doctor_name && (
                 <div className="flex gap-3">
                   <UserPlus className="w-4 h-4 text-gray-400 mt-1" />
                   <div>
                     <p className="text-[10px] font-bold text-gray-400 uppercase">Médico Remitente</p>
                     <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{originData.origin.referring_doctor_name}</p>
                   </div>
                 </div>
               )}
            </div>

            {originData.origin.referral_reason && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Motivo de Remisión</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {REFERRAL_REASON_LABELS[originData.origin.referral_reason] || originData.origin.referral_reason}
                </p>
                {originData.origin.referral_notes && (
                  <p className="text-xs text-gray-500 mt-2 italic">"{originData.origin.referral_notes}"</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
            <AlertCircle className="w-8 h-8 text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">No hay registros de origen previos.</p>
          </div>
        )}
      </section>

      {/* Prior Treatments Section */}
      <section className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <Pill className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Tratamientos Previos y Activos</h2>
          </div>
          
          <div className="flex items-center gap-3">
            {originData && originData.active_treatments_count > 0 && (
              <span className="hidden sm:inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full">
                {originData.active_treatments_count} Activos
              </span>
            )}
            
            <Dialog open={showTreatmentModal} onOpenChange={setShowTreatmentModal}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-400 rounded-xl text-sm font-bold transition-all">
                  <Plus className="w-4 h-4" /> Agregar Medicamento
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>Registrar Tratamiento Previo</DialogTitle>
                </DialogHeader>
                <PriorTreatmentForm onSubmit={handleTreatmentSubmit} isLoading={saving} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {originData?.treatments && originData.treatments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {originData.treatments.map((treatment) => (
              <div 
                key={treatment.treatment_id} 
                className={cn(
                  "p-4 rounded-2xl border transition-all",
                  treatment.treatment_status === 'active' 
                    ? "bg-white dark:bg-gray-900 border-teal-100 dark:border-teal-800 shadow-sm" 
                    : "bg-gray-50/50 dark:bg-gray-800/10 border-gray-100 dark:border-gray-800 opacity-70"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">{treatment.medication_name}</h4>
                    <p className="text-[10px] text-gray-500 font-medium uppercase truncate max-w-[120px]">
                      {treatment.dose} • {treatment.frequency}
                    </p>
                  </div>
                  <span className={cn(
                    "text-[8px] font-black uppercase px-2 py-0.5 rounded",
                    treatment.treatment_status === 'active' 
                      ? "bg-teal-500 text-white" 
                      : "bg-gray-400 text-white"
                  )}>
                    {treatment.treatment_status}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-50 dark:border-gray-800">
                  <div className="flex items-center gap-1.5">
                    <History className="w-3 h-3 text-gray-400" />
                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">
                      {treatment.start_date ? format(new Date(treatment.start_date), 'dd MMM yyyy', { locale: es }) : 'N/A'}
                    </span>
                  </div>
                  {treatment.interaction_check_needed && (
                     <div className="flex items-center gap-1.5 ml-auto">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[9px] font-black text-amber-600 uppercase">Revisar Alerta</span>
                     </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800/20 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl">
            <Pill className="w-12 h-12 text-gray-200 dark:text-gray-800 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No hay historial de tratamientos previos registrados.</p>
          </div>
        )}

        {originData?.interaction_alerts_count ? originData.interaction_alerts_count > 0 && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/40 rounded-2xl flex items-center gap-4">
             <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
               <AlertCircle className="w-6 h-6 text-amber-600" />
             </div>
             <div>
               <p className="text-sm font-black text-amber-900 dark:text-amber-400">Alerta de Seguridad Farmacológica</p>
               <p className="text-xs text-amber-700 dark:text-amber-500">
                 Se han detectado {originData.interaction_alerts_count} posibles interacciones con los tratamientos activos actuales. Por favor, revise antes de administrar nuevos medicamentos.
               </p>
             </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

