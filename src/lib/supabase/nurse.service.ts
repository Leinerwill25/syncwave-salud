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
    console.error('[getNurseProfile]', error);
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
    .order('arrival_time', { ascending: true });

  if (error) {
    console.error('[getDailyQueue]', error);
    return [];
  }
  return (data ?? []) as NurseDailyDashboard[];
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
    console.error('[getPendingMedications]', error);
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
