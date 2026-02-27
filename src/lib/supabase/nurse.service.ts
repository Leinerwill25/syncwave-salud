// src/lib/supabase/nurse.service.ts
// ═══════════════════════════════════════════════════════════
// ASHIRA — Servicio centralizado de Supabase para Enfermería
// Todos los accesos a DB del módulo pasan por este archivo.
// ═══════════════════════════════════════════════════════════
import { createSupabaseBrowserClient } from '@/app/adapters/client';
import type {
  NurseProfile,
  NurseFullProfile,
  PatientQueueEntry,
  NurseDailyDashboard,
  VitalSigns,
  PatientOriginRecord,
  PriorTreatment,
  MARRecord,
  NurseProcedure,
  ShiftReport,
  QueueStatus,
  MARStatus,
  ProcedureStatus,
  PriorTreatmentStatus,
  CreateQueueEntryDto,
  CreateVitalSignsDto,
  CreateMARRecordDto,
  CreateProcedureDto,
  RegisterOriginDto,
  AddPriorTreatmentDto,
  CreateShiftReportDto,
  PatientFullOriginResponse,
  DashboardSummaryResponse,
  NursingEvolutionNote,
  CreateEvolutionNoteDto,
} from '@/types/nurse.types';

// ─── Cliente browser (client components) ─────────────────

function getClient() {
  return createSupabaseBrowserClient();
}

// ─── PERFIL ───────────────────────────────────────────────

export async function getNurseProfile(userId: string): Promise<NurseFullProfile | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('nurse_full_profile')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error(`[getNurseProfile] Error for userId ${userId}: ${JSON.stringify(error)}`);
    return null;
  }
  return data as NurseFullProfile | null;
}

export async function getNurseProfileByAuthId(authId: string): Promise<NurseProfile | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('nurse_profiles')
    .select('*')
    .eq('user_id', authId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error('[getNurseProfileByAuthId]', error);
    return null;
  }
  return data as NurseProfile | null;
}

export async function updateNurseProfile(
  nurseProfileId: string,
  data: Partial<Pick<NurseProfile,
    'specializations' | 'independent_scope' | 'notes' | 'license_expiry' | 'status'
  >>
): Promise<{ error: string | null }> {
  const supabase = getClient();
  const { error } = await supabase
    .from('nurse_profiles')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('nurse_profile_id', nurseProfileId);

  return { error: error?.message ?? null };
}

// ─── COLA DIARIA ──────────────────────────────────────────

export async function getDailyQueue(date?: Date): Promise<NurseDailyDashboard[]> {
  const supabase = getClient();
  const targetDate = date
    ? date.toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('nurse_daily_dashboard')
    .select('*')
    .eq('queue_date', targetDate)
    .order('arrival_time', { ascending: true }); // Mantenemos el orden de llegada para la deduplicación

  if (error) {
    console.error('[getDailyQueue]', error);
    return [];
  }

  const results = (data ?? []) as NurseDailyDashboard[];

  // Deduplicación para evitar mostrar el mismo paciente múltiples veces el mismo día
  // (por ej. si hizo doble click al abrir la sesión o React StrictMode disparó doble insert)
  const uniqueMap = new Map<string, NurseDailyDashboard>();
  
  results.forEach(entry => {
    // Usamos el ID del paciente registrado o no registrado como clave
    const patientKey = entry.patient_id || entry.unregistered_patient_id;
    if (patientKey) {
      if (!uniqueMap.has(patientKey)) {
        uniqueMap.set(patientKey, entry);
      } else {
        // Opcional: si ya existe, podríamos querer quedarnos con el más reciente o el que tenga un status más avanzado
        const existing = uniqueMap.get(patientKey)!;
        if (new Date(entry.arrival_time) > new Date(existing.arrival_time)) {
          uniqueMap.set(patientKey, entry);
        }
      }
    } else {
      // Si por alguna razón no tiene ID (no debería pasar), usamos su queue_id
      uniqueMap.set(entry.queue_id, entry);
    }
  });

  return Array.from(uniqueMap.values());
}

/**
 * Asegura que un paciente tenga una entrada en la cola diaria para ser atendido.
 * Si no existe para hoy, crea una sesión de "Atención Independiente".
 */
export async function ensurePatientInQueue(
  patientId: string, 
  isUnregistered: boolean, 
  nurseProfileId: string,
  userId: string,
  organizationId: string | null
): Promise<NurseDailyDashboard | null> {
  const supabase = getClient();
  const today = new Date().toISOString().split('T')[0];

  console.log('[ensurePatientInQueue] Asegurando sesión para:', { patientId, isUnregistered, nurseProfileId });

  // 1. Buscar si ya existe hoy en la vista enriquecida
  // Intentamos buscar por cualquiera de los dos IDs por robustez
  const { data: existing } = await supabase
    .from('nurse_daily_dashboard')
    .select('*')
    .eq('assigned_nurse_id', nurseProfileId)
    .eq('queue_date', today)
    .or(`unregistered_patient_id.eq.${patientId},patient_id.eq.${patientId}`)
    .maybeSingle();

  if (existing) {
    console.log('[ensurePatientInQueue] Sesión encontrada en cola:', existing.queue_id);
    return existing as NurseDailyDashboard;
  }

  // 2. Si no existe en la cola, verificar qué TIPO de paciente es realmente
  // Esto previene errores si el link/URL tiene el isUnregistered incorrecto
  let verifiedIsUnreg = isUnregistered;
  
  // Buscar en pacientes registrados
  const { data: regPatient } = await supabase
    .from('patient')
    .select('id')
    .eq('id', patientId)
    .maybeSingle();
  
  if (regPatient) {
    verifiedIsUnreg = false;
  } else {
    // Si no es registrado, verificar si es no-registrado
    const { data: unregPatient } = await supabase
      .from('unregisteredpatients')
      .select('id')
      .eq('id', patientId)
      .maybeSingle();
      
    if (unregPatient) {
      verifiedIsUnreg = true;
    }
    // Si no se encuentra en ninguno, usamos el valor inicial (fallback)
  }

  console.log('[ensurePatientInQueue] Tipo de paciente verificado:', { verifiedIsUnreg });

  // 3. Crear nueva entrada en la tabla base
  console.log('[ensurePatientInQueue] Creando nueva sesión independiente...');
  const { data: newEntry, error: insertError } = await supabase
    .from('patients_daily_queue')
    .insert({
      patient_id: verifiedIsUnreg ? null : patientId,
      unregistered_patient_id: verifiedIsUnreg ? patientId : null,
      assigned_nurse_id: nurseProfileId,
      organization_id: organizationId,
      queue_date: today,
      status: 'in_progress',
      arrival_time: new Date().toISOString(),
      chief_complaint: 'Atención Independiente / Seguimiento',
      created_by: userId,
      updated_by: userId
    })
    .select()
    .single();

  if (insertError) {
    console.error('[ensurePatientInQueue] Error creando sesión:', JSON.stringify(insertError));
    return null;
  }

  // 3. Recuperar la vista enriquecida para el nuevo registro (Asegurar que el RLS permita verlo)
  console.log('[ensurePatientInQueue] Recuperando vista enriquecida para:', newEntry.queue_id);
  const { data: fullData, error: viewError } = await supabase
    .from('nurse_daily_dashboard')
    .select('*')
    .eq('queue_id', newEntry.queue_id)
    .maybeSingle();

  if (viewError || !fullData) {
    console.error('[ensurePatientInQueue] Error recuperando vista:', JSON.stringify(viewError));
    // Si la vista falla por RLS inmediato, retornamos un objeto básico para no bloquear la UI
    return {
      ...newEntry,
      patient_first_name: 'Cargando...',
      patient_last_name: '',
      status: 'in_progress',
    } as any;
  }

  return fullData as NurseDailyDashboard;
}

export async function updateQueueStatus(
  queueId: string,
  status: QueueStatus
): Promise<{ error: string | null }> {
  const supabase = getClient();
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'in_triage') {
    // Do not auto-set triage_completed_at here
  }

  const { error } = await supabase
    .from('patients_daily_queue')
    .update(updates)
    .eq('queue_id', queueId);

  return { error: error?.message ?? null };
}

export async function addPatientToQueue(
  dto: CreateQueueEntryDto
): Promise<{ data: PatientQueueEntry | null; error: string | null }> {
  const supabase = getClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('patients_daily_queue')
    .insert({
      ...dto,
      queue_date: dto.queue_date ?? new Date().toISOString().split('T')[0],
      created_by: user?.id,
      updated_by: user?.id,
    })
    .select()
    .single();

  return {
    data: data as PatientQueueEntry | null,
    error: error?.message ?? null,
  };
}

export async function softDeleteQueueEntry(
  queueId: string
): Promise<{ error: string | null }> {
  const supabase = getClient();
  const { error } = await supabase.rpc('soft_delete_queue_entry', {
    p_queue_id: queueId,
  });
  return { error: error?.message ?? null };
}

// ─── SIGNOS VITALES ───────────────────────────────────────

export async function getVitalSigns(queueId: string): Promise<VitalSigns[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('nurse_vital_signs')
    .select('*')
    .eq('queue_id', queueId)
    .order('recorded_at', { ascending: false });

  if (error) {
    console.error('[getVitalSigns]', error);
    return [];
  }
  return (data ?? []) as VitalSigns[];
}

export async function createVitalSigns(
  dto: CreateVitalSignsDto
): Promise<{ data: VitalSigns | null; error: string | null }> {
  const supabase = getClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Calculate BMI if weight and height provided
  let bmi: number | undefined;
  if (dto.weight_kg && dto.height_cm) {
    const heightM = dto.height_cm / 100;
    bmi = Math.round((dto.weight_kg / (heightM * heightM)) * 100) / 100;
  }

  const { data, error } = await supabase
    .from('nurse_vital_signs')
    .insert({
      ...dto,
      bmi,
      recorded_at: new Date().toISOString(),
      created_by: user?.id,
      updated_by: user?.id,
    })
    .select()
    .single();

  if (!error) {
    // Update vital_signs_taken flag on queue entry
    await supabase
      .from('patients_daily_queue')
      .update({ vital_signs_taken: true, updated_at: new Date().toISOString() })
      .eq('queue_id', dto.queue_id);
  }

  return {
    data: data as VitalSigns | null,
    error: error?.message ?? null,
  };
}

// ─── ORIGEN DEL PACIENTE ──────────────────────────────────

export async function getPatientFullOrigin(params: {
  patientId?: string;
  unregisteredPatientId?: string;
  queueId?: string;
}): Promise<PatientFullOriginResponse | null> {
  const supabase = getClient();
  const { data, error } = await supabase.rpc('get_patient_full_origin', {
    p_patient_id: params.patientId ?? null,
    p_unregistered_patient_id: params.unregisteredPatientId ?? null,
    p_queue_id: params.queueId ?? null,
  });

  if (error) {
    console.error('[getPatientFullOrigin]', error);
    return null;
  }
  return data as PatientFullOriginResponse;
}

export async function createOriginRecord(
  dto: RegisterOriginDto
): Promise<{ data: PatientOriginRecord | null; error: string | null }> {
  const supabase = getClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('patient_origin_records')
    .insert({ ...dto, created_by: user?.id, updated_by: user?.id })
    .select()
    .single();

  return {
    data: data as PatientOriginRecord | null,
    error: error?.message ?? null,
  };
}

export async function addPriorTreatment(
  dto: AddPriorTreatmentDto
): Promise<{ data: PriorTreatment | null; error: string | null }> {
  const supabase = getClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('patient_prior_treatments')
    .insert({ ...dto, created_by: user?.id, updated_by: user?.id })
    .select()
    .single();

  return {
    data: data as PriorTreatment | null,
    error: error?.message ?? null,
  };
}

export async function updateTreatmentStatus(
  treatmentId: string,
  status: PriorTreatmentStatus,
  reason?: string
): Promise<{ error: string | null }> {
  const supabase = getClient();
  const { error } = await supabase
    .from('patient_prior_treatments')
    .update({
      treatment_status: status,
      suspension_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('treatment_id', treatmentId);

  return { error: error?.message ?? null };
}

// ─── MAR ──────────────────────────────────────────────────

export async function getMARRecords(queueId: string): Promise<MARRecord[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('nurse_mar_records')
    .select('*')
    .eq('queue_id', queueId)
    .order('scheduled_at', { ascending: true });

  if (error) {
    console.error('[getMARRecords]', error);
    return [];
  }
  return (data ?? []) as MARRecord[];
}

export async function getPendingMedications(orgId: string): Promise<MARRecord[]> {
  const supabase = getClient();
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('nurse_mar_records')
    .select('*')
    .eq('organization_id', orgId)
    .eq('status', 'pending')
    .lte('scheduled_at', oneHourFromNow.toISOString())
    .order('scheduled_at', { ascending: true });

  if (error) {
    console.error('[getPendingMedications] Error:', JSON.stringify(error));
    return [];
  }
  return (data ?? []) as MARRecord[];
}

export async function createMARRecord(
  dto: CreateMARRecordDto
): Promise<{ data: MARRecord | null; error: string | null }> {
  const supabase = getClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('nurse_mar_records')
    .insert({ ...dto, status: 'pending', created_by: user?.id, updated_by: user?.id })
    .select()
    .single();

  return {
    data: data as MARRecord | null,
    error: error?.message ?? null,
  };
}

export async function updateMARStatus(
  marId: string,
  status: MARStatus,
  notes?: string,
  omissionReason?: string
): Promise<{ error: string | null }> {
  const supabase = getClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'No autorizado' };
  }

  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'administered') {
    updates.administered_at = new Date().toISOString();
  }
  if (notes) updates.notes = notes;
  if (omissionReason) updates.omission_reason = omissionReason;

  const { error } = await supabase
    .from('nurse_mar_records')
    .update(updates)
    .eq('mar_id', marId);

  if (!error) {
    // Registrar auditoría obligatoria para MAR
    try {
      const { data: profile } = await supabase
        .from('nurse_profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      enum ActionMap {
        administered = 'ADMINISTRAR_MEDICAMENTO',
        omitted = 'OMITIR_MEDICAMENTO',
        refused = 'PACIENTE_RECHAZA_MEDICAMENTO',
        held = 'RETENER_MEDICAMENTO',
        not_available = 'MEDICAMENTO_NO_DISPONIBLE',
        pending = 'RESTABLECER_ESTADO_PENDIENTE'
      }

      await supabase.from('audit_log').insert({
        user_id: user.id,
        user_name: user?.user_metadata?.full_name || 'Enfermero',
        user_role: 'NURSE',
        organization_id: profile?.organization_id,
        action_type: ActionMap[status as keyof typeof ActionMap] || 'MAR_STATUS_UPDATE',
        entity_type: 'MAR_RECORD',
        entity_id: marId,
        description: `Se actualizó el estado a ${status}${notes ? '. Notas: ' + notes : ''}${omissionReason ? '. Razón de omisión: ' + omissionReason : ''}`,
        metadata: { status, notes, omissionReason, updated_at: updates.updated_at }
      });
    } catch (auditError) {
      console.error('[updateMARStatus] audit_log error:', auditError);
      // No bloqueamos el flujo principal por error de auditoría "silencioso", 
      // pero en entornos estrictos se debería revertir.
    }
  }

  return { error: error?.message ?? null };
}

// ─── PROCEDIMIENTOS ───────────────────────────────────────

export async function getProcedures(queueId: string): Promise<NurseProcedure[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('nurse_procedures')
    .select('*')
    .eq('queue_id', queueId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getProcedures]', error);
    return [];
  }
  return (data ?? []) as NurseProcedure[];
}

export async function createProcedure(
  dto: CreateProcedureDto
): Promise<{ data: NurseProcedure | null; error: string | null }> {
  const supabase = getClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('nurse_procedures')
    .insert({ ...dto, status: 'pending', created_by: user?.id, updated_by: user?.id })
    .select()
    .single();

  return {
    data: data as NurseProcedure | null,
    error: error?.message ?? null,
  };
}

export async function updateProcedureStatus(
  procId: string,
  status: ProcedureStatus,
  outcome?: string
): Promise<{ error: string | null }> {
  const supabase = getClient();
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'in_progress') updates.started_at = new Date().toISOString();
  if (status === 'completed') {
    updates.completed_at = new Date().toISOString();
    if (outcome) updates.outcome = outcome;
  }

  const { error } = await supabase
    .from('nurse_procedures')
    .update(updates)
    .eq('procedure_id', procId);

  return { error: error?.message ?? null };
}

// ─── EVOLUCIÓN Y NOTAS ────────────────────────────────────

export async function getEvolutionNotes(queueId: string): Promise<NursingEvolutionNote[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('nurse_evolution_notes')
    .select('*')
    .eq('queue_id', queueId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getEvolutionNotes]', error);
    // Fallback if table doesn't exist: check nurse_notes in patients_daily_queue
    const { data: queueData } = await supabase
      .from('patients_daily_queue')
      .select('nurse_notes, created_at, created_by, patient_id, unregistered_patient_id, assigned_nurse_id')
      .eq('queue_id', queueId)
      .single();

    if (queueData?.nurse_notes) {
      return [{
        note_id: 'legacy',
        queue_id: queueId,
        patient_id: queueData.patient_id,
        unregistered_patient_id: queueData.unregistered_patient_id,
        nurse_id: queueData.assigned_nurse_id || '',
        content: queueData.nurse_notes,
        evolution_type: 'standard',
        created_at: queueData.created_at,
        updated_at: queueData.created_at,
        created_by: queueData.created_by || ''
      }];
    }
    return [];
  }
  return (data ?? []) as NursingEvolutionNote[];
}

export async function createEvolutionNote(
  dto: CreateEvolutionNoteDto
): Promise<{ data: NursingEvolutionNote | null; error: string | null }> {
  const supabase = getClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('nurse_evolution_notes')
    .insert({
      ...dto,
      evolution_type: dto.evolution_type || 'standard',
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) {
    // Attempt fallback to update patients_daily_queue.nurse_notes
    const { error: updError } = await supabase
      .from('patients_daily_queue')
      .update({ 
        nurse_notes: dto.content,
        updated_by: user?.id 
      })
      .eq('queue_id', dto.queue_id);
    
    if (!updError) {
      return { 
        data: {
          note_id: 'legacy_new',
          ...dto,
          patient_id: dto.patient_id || null,
          unregistered_patient_id: dto.unregistered_patient_id || null,
          evolution_type: dto.evolution_type || 'standard',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: user?.id || ''
        }, 
        error: null 
      };
    }
  }

  return {
    data: data as NursingEvolutionNote | null,
    error: error?.message ?? null,
  };
}

// ─── DASHBOARD ────────────────────────────────────────────

export async function getDashboardSummary(): Promise<DashboardSummaryResponse | null> {
  const supabase = getClient();
  const { data, error } = await supabase.rpc('get_nurse_dashboard_summary');

  if (error) {
    console.error('[getDashboardSummary]', error);
    return null;
  }
  return data as DashboardSummaryResponse;
}

// ─── REPORTES DE TURNO ────────────────────────────────────

export async function getShiftReports(filters?: {
  nurseId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<ShiftReport[]> {
  const supabase = getClient();
  let query = supabase
    .from('nurse_shift_reports')
    .select('*')
    .order('report_date', { ascending: false });

  if (filters?.nurseId) query = query.eq('nurse_id', filters.nurseId);
  if (filters?.dateFrom) query = query.gte('report_date', filters.dateFrom);
  if (filters?.dateTo) query = query.lte('report_date', filters.dateTo);

  const { data, error } = await query;
  if (error) {
    console.error('[getShiftReports]', error);
    return [];
  }
  return (data ?? []) as ShiftReport[];
}

export async function createShiftReport(
  dto: CreateShiftReportDto
): Promise<{ data: ShiftReport | null; error: string | null }> {
  const supabase = getClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('nurse_shift_reports')
    .insert({ ...dto, created_by: user?.id, updated_by: user?.id })
    .select()
    .single();

  return {
    data: data as ShiftReport | null,
    error: error?.message ?? null,
  };
}

export async function signShiftReport(
  reportId: string
): Promise<{ error: string | null }> {
  const supabase = getClient();
  const { error } = await supabase
    .from('nurse_shift_reports')
    .update({ signed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('report_id', reportId)
    .is('signed_at', null); // Safety: only sign if not already signed

  return { error: error?.message ?? null };
}

// ─── HISTORIAL CRUZADO ────────────────────────────────────

export async function getCrossOrgHistory(patientId: string): Promise<unknown[]> {
  const supabase = getClient();
  const { data, error } = await supabase.rpc('get_cross_org_history', {
    p_patient_id: patientId,
  });

  if (error) {
    console.error('[getCrossOrgHistory]', error);
    return [];
  }
  return (data ?? []) as unknown[];
}

// ─── REGISTRO ─────────────────────────────────────────────

export async function registerNurseIndependent(params: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry?: string;
  specializations: string[];
  scope: {
    home_visits: boolean;
    visible_in_network: boolean;
    can_share_records: boolean;
  };
}): Promise<{ userId: string | null; error: string | null }> {
  const supabase = getClient();

  // 1. Sign up in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        full_name: `${params.firstName} ${params.lastName}`,
      },
    },
  });

  if (authError || !authData.user) {
    return { userId: null, error: authError?.message ?? 'Error al crear usuario' };
  }

  const userId = authData.user.id;

  // 2. Insert nurse_profiles
  const { error: profileError } = await supabase
    .from('nurse_profiles')
    .insert({
      user_id: userId,
      nurse_type: 'independent',
      license_number: params.licenseNumber,
      license_expiry: params.licenseExpiry ?? null,
      license_verified: false,
      specializations: params.specializations,
      can_attend_independently: true,
      independent_scope: params.scope,
      organization_id: null,
      status: 'active',
      created_by: userId,
      updated_by: userId,
    });

  if (profileError) {
    console.error('[registerNurseIndependent] profile insert error:', profileError);
    return { userId: null, error: profileError.message };
  }

  return { userId, error: null };
}

export async function registerNurseAffiliated(params: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  licenseExpiry?: string;
  specializations: string[];
  organizationId: string;
  positionTitle?: string;
  requiresApproval: boolean;
}): Promise<{ userId: string | null; error: string | null }> {
  const supabase = getClient();

  // 1. Sign up in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        full_name: `${params.firstName} ${params.lastName}`,
      },
    },
  });

  if (authError || !authData.user) {
    return { userId: null, error: authError?.message ?? 'Error al crear usuario' };
  }

  const userId = authData.user.id;

  // 2. Insert nurse_profiles
  const { error: profileError } = await supabase
    .from('nurse_profiles')
    .insert({
      user_id: userId,
      nurse_type: 'affiliated',
      license_number: params.licenseNumber,
      license_expiry: params.licenseExpiry ?? null,
      license_verified: false,
      specializations: params.specializations,
      can_attend_independently: false,
      independent_scope: {},
      organization_id: params.organizationId,
      status: params.requiresApproval ? 'inactive' : 'active',
      notes: params.positionTitle ? `Cargo: ${params.positionTitle}` : null,
      created_by: userId,
      updated_by: userId,
    });

  if (profileError) {
    console.error('[registerNurseAffiliated] profile insert error:', profileError);
    return { userId: null, error: profileError.message };
  }

  return { userId, error: null };
}

export async function verifyOrganizationCode(
  code: string
): Promise<{ organization: { id: string; name: string; address: string | null } | null; error: string | null }> {
  const supabase = getClient();

  // Organizations are identified by their name or a specific code field
  // Using name for now — adjust if a specific invite_code column exists
  const { data, error } = await supabase
    .from('organization')
    .select('id, name, address')
    .ilike('name', `%${code}%`)
    .limit(1)
    .maybeSingle();

  if (error) return { organization: null, error: error.message };
  if (!data) return { organization: null, error: 'Organización no encontrada' };

  return {
    organization: data as { id: string; name: string; address: string | null },
    error: null,
  };
}

// ─── Inventario y Farmacia ─────────────────────────────────

export async function getPharmacyInventory(organizationId: string) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('pharmacy_inventory')
    .select(`
      *,
      medication (*)
    `)
    .eq('organization_id', organizationId);

  if (error) {
    console.error('[getPharmacyInventory] error:', error);
    return [];
  }
  return data;
}

export async function updatePharmacyInventory(id: string, updates: Partial<{ quantity: number; unit_cost: number | null; lot: string | null; expiry_date: string | null }>) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('pharmacy_inventory')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[updatePharmacyInventory] error:', error);
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

export async function createPharmacyInventory(dto: {
  organization_id: string;
  medication_id: string;
  lot?: string | null;
  expiry_date?: string | null;
  quantity: number;
  unit_cost?: number | null;
}) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('pharmacy_inventory')
    .insert(dto)
    .select()
    .single();

  if (error) {
    console.error('[createPharmacyInventory] error:', error);
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

export async function getMedicationList() {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('medication')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('[getMedicationList] error:', error);
    return [];
  }
  return data;
}

// ─── Enfermería Independiente (Superficie) ────────────────

export async function getIndependentDashboardStats(userId: string) {
  const supabase = getClient();
  const today = new Date().toISOString().split('T')[0];

  // 1. Obtener profile_id para buscar en la cola
  const { data: profile } = await supabase
    .from('nurse_profiles')
    .select('nurse_profile_id')
    .eq('user_id', userId)
    .maybeSingle();

  const nurseProfileId = profile?.nurse_profile_id || userId;

  // Cola de hoy para este enfermero (usamos la vista para tener nombres de pacientes)
  const { data: rawQueueData } = await supabase
    .from('nurse_daily_dashboard')
    .select('*')
    .eq('assigned_nurse_id', nurseProfileId)
    .eq('queue_date', today)
    .order('arrival_time', { ascending: true });

  // Deduplicación de la cola para los KPIs y Agenda
  const uniqueMap = new Map<string, any>();
  if (rawQueueData) {
    rawQueueData.forEach(entry => {
      const patientKey = entry.patient_id || entry.unregistered_patient_id;
      if (patientKey) {
        if (!uniqueMap.has(patientKey)) {
          uniqueMap.set(patientKey, entry);
        } else {
          const existing = uniqueMap.get(patientKey)!;
          if (new Date(entry.arrival_time) > new Date(existing.arrival_time)) {
            uniqueMap.set(patientKey, entry);
          }
        }
      } else {
        uniqueMap.set(entry.queue_id, entry);
      }
    });
  }
  const queueData = Array.from(uniqueMap.values());

  // Mis Pacientes (Consolidado de ambas tablas)
  const allPatients = await getIndependentPatients(userId);

  // Reportes completados hoy
  const { data: reportsToday } = await supabase
    .from('nurse_shift_reports')
    .select('report_id')
    .eq('nurse_id', userId)
    .eq('report_type', 'independent_care_report')
    .gte('report_date', `${today}T00:00:00.000Z`)
    .lte('report_date', `${today}T23:59:59.999Z`);

  return {
    todayQueue: queueData || [],
    activePatientsCount: allPatients.length,
    reportsCompletedToday: reportsToday?.length || 0,
  };
}

export async function searchPatientsGlobal(searchTerm: string) {
  try {
    const response = await fetch(`/api/nurse/search-patients?q=${encodeURIComponent(searchTerm)}`);
    if (!response.ok) {
      console.error('[searchPatientsGlobal] Error del API:', response.statusText);
      return { registered: [], unregistered: [] };
    }
    const data = await response.json();
    console.log('[searchPatientsGlobal] Resultados:', data);
    return data;
  } catch (error) {
    console.error('[searchPatientsGlobal] Exception:', error);
    return { registered: [], unregistered: [] };
  }
}

export async function getIndependentPatients(userId: string) {
  const supabase = getClient();
  
  // 1. Obtener nurse_profile_id para buscar en la cola
  const { data: profile } = await supabase
    .from('nurse_profiles')
    .select('nurse_profile_id')
    .eq('user_id', userId)
    .maybeSingle();

  // 2. Obtener pacientes no registrados creados por esta enfermera o asignados en cola
  const { data: unreg, error: unregError } = await supabase
    .from('unregisteredpatients')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false });

  if (unregError) console.error('[getIndependentPatients] unregError:', unregError);

  // 3. Obtener TODOS los pacientes que esta enfermera ha atendido (usando la vista de la cola)
  // Esto incluye tanto registrados como no registrados atendidos por esta enfermera
  let queuePatients: any[] = [];
  if (profile?.nurse_profile_id) {
    const { data: qData, error: qError } = await supabase
      .from('nurse_daily_dashboard')
      .select('patient_id, patient_first_name, patient_last_name, patient_identifier, blood_type, patient_allergies, unregistered_patient_id, unreg_first_name, unreg_last_name, unreg_identifier, unreg_allergies, created_at')
      .eq('assigned_nurse_id', profile.nurse_profile_id);

    if (qError) {
      console.error(`[getIndependentPatients] Error de consulta: ${JSON.stringify(qError)}`);
    } else if (qData) {
      qData.forEach(p => {
        if (p.patient_id) {
          queuePatients.push({
            id: p.patient_id,
            first_name: p.patient_first_name,
            last_name: p.patient_last_name,
            identification: p.patient_identifier,
            blood_type: p.blood_type,
            allergies: p.patient_allergies,
            created_at: p.created_at,
            is_registered: true
          });
        } else if (p.unregistered_patient_id) {
          queuePatients.push({
            id: p.unregistered_patient_id,
            first_name: p.unreg_first_name,
            last_name: p.unreg_last_name,
            identification: p.unreg_identifier,
            allergies: p.unreg_allergies,
            created_at: p.created_at,
            is_registered: false
          });
        }
      });
    }
  }

  // Combinar los creados manualmente por la enfermera y los atendidos en la cola
  const combined = [
    ...(unreg || []).map(p => ({ ...p, is_registered: false })),
    ...queuePatients
  ];

  // Deduplicar la lista final
  const finalMap = new Map();
  combined.forEach(p => {
    if (!finalMap.has(p.id)) {
      finalMap.set(p.id, p);
    }
  });

  return Array.from(finalMap.values())
    .sort((a, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function createIndependentPatient(dto: any) {
  const supabase = getClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('unregisteredpatients')
    .insert({
      first_name: dto.first_name,
      last_name: dto.last_name,
      identification: dto.identification,
      phone: dto.phone,
      sex: dto.sex,
      email: dto.email,
      created_by: user?.id
    })
    .select()
    .single();

  if (error) {
    console.error('[createIndependentPatient]', error);
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

/**
 * Obtiene alertas de inventario bajo (stock < 5)
 */
export async function getInventoryAlerts(organizationId: string) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('pharmacy_inventory')
    .select('*, medication(name)')
    .eq('organization_id', organizationId)
    .lt('quantity', 5);

  if (error) {
    console.error('[getInventoryAlerts]', error);
    return [];
  }
  return data || [];
}

/**
 * Obtiene alertas de medicación pendiente para enfermeros independientes
 */
export async function getPendingMedicationsIndependent(nurseId: string) {
  const supabase = getClient();
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('nurse_mar_records')
    .select('*')
    .eq('nurse_id', nurseId)
    .eq('status', 'pending')
    .lte('scheduled_at', oneHourFromNow.toISOString())
    .order('scheduled_at', { ascending: true });

  if (error) {
    console.error('[getPendingMedicationsIndependent]', error);
    return [];
  }
  return data || [];
}
/**
 * Obtiene pacientes en estado de observación para una organización
 */
export async function getObservationPatients(organizationId: string): Promise<NurseDailyDashboard[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('nurse_daily_dashboard')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'in_observation')
    .order('arrival_time', { ascending: true });

  if (error) {
    console.error('[getObservationPatients]', error);
    return [];
  }
  return (data || []) as NurseDailyDashboard[];
}
