// src/types/nurse.types.ts
// ═══════════════════════════════════════════════════════════
// ASHIRA — Módulo Enfermería · Tipos TypeScript completos
// Derivados del schema SQL nurse_panel_v1.1
// ═══════════════════════════════════════════════════════════

// ─── Enums ───────────────────────────────────────────────

export type NurseType = 'affiliated' | 'independent';
export type NurseStatus = 'active' | 'inactive' | 'suspended';

export type PatientOriginType =
  | 'new'
  | 'referred_internal'
  | 'referred_external'
  | 'returning_same_org'
  | 'returning_other_org'
  | 'self_referred';

export type ReferralReason =
  | 'second_opinion'
  | 'treatment_continuity'
  | 'specialty_unavailable'
  | 'emergency'
  | 'follow_up'
  | 'routine'
  | 'other';

export type PriorTreatmentStatus =
  | 'active'
  | 'completed'
  | 'suspended'
  | 'adverse_reaction'
  | 'unknown';

export type QueueStatus =
  | 'waiting'
  | 'in_triage'
  | 'ready_for_doctor'
  | 'in_consultation'
  | 'in_observation'
  | 'discharged'
  | 'absent';

export type TriageLevel =
  | 'immediate'
  | 'urgent'
  | 'less_urgent'
  | 'non_urgent'
  | 'deceased';

export type MARStatus =
  | 'pending'
  | 'administered'
  | 'omitted'
  | 'refused'
  | 'held'
  | 'not_available';

export type ProcedureStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

// ─── Interfaces principales ────────────────────────────────

export interface IndependentScope {
  home_visits?: boolean;
  prescription_reading?: boolean;
  can_share_records?: boolean;
  visible_in_network?: boolean;
}

export interface NurseProfile {
  nurse_profile_id: string;
  user_id: string;
  nurse_type: NurseType;
  license_number: string;
  license_verified: boolean;
  license_expiry: string | null;       // ISO date
  organization_id: string | null;
  specializations: string[];
  can_attend_independently: boolean;
  independent_scope: IndependentScope;
  active_since: string | null;         // ISO date
  status: NurseStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface NurseFullProfile extends NurseProfile {
  // From auth.users
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  // From organization
  organization_name: string | null;
  organization_address: string | null;
  organization_email: string | null;
  organization_phone: string | null;
}

export interface PatientQueueEntry {
  queue_id: string;
  patient_id: string | null;
  unregistered_patient_id: string | null;
  organization_id: string | null;
  assigned_nurse_id: string | null;
  assigned_doctor_id: string | null;
  appointment_id: string | null;
  queue_date: string;                  // ISO date
  arrival_time: string;                // ISO timestamp
  status: QueueStatus;
  triage_level: TriageLevel | null;
  triage_completed_at: string | null;
  queue_number: number | null;
  vital_signs_taken: boolean;
  allergies_flag: boolean;
  chronic_flag: boolean;
  referral_flag: boolean;
  cross_org_history_flag: boolean;
  chief_complaint: string | null;
  triage_notes: string | null;
  nurse_notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

/** Vista nurse_daily_dashboard — cola enriquecida */
export interface NurseDailyDashboard extends PatientQueueEntry {
  // Paciente registrado
  patient_first_name: string | null;
  patient_last_name: string | null;
  patient_identifier: string | null;
  blood_type: string | null;
  patient_allergies: string | null;
  // Paciente no registrado
  unreg_first_name: string | null;
  unreg_last_name: string | null;
  unreg_identifier: string | null;
  unreg_allergies: string | null;
  // Médico
  doctor_name: string | null;
  // Signos vitales
  last_vitals_at: string | null;
}

export interface PatientOriginRecord {
  origin_id: string;
  patient_id: string | null;
  unregistered_patient_id: string | null;
  queue_id: string | null;
  origin_type: PatientOriginType;
  origin_org_id: string | null;
  origin_org_name: string | null;
  origin_org_city: string | null;
  origin_org_country: string;
  last_seen_at_origin: string | null;  // ISO date
  referring_doctor_id: string | null;
  referring_doctor_name: string | null;
  referring_specialty: string | null;
  referring_org_name: string | null;
  referring_contact: string | null;
  referral_reason: ReferralReason | null;
  referral_notes: string | null;
  referral_document_url: string | null;
  registered_by_nurse_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface PriorTreatment {
  treatment_id: string;
  patient_id: string | null;
  unregistered_patient_id: string | null;
  origin_record_id: string | null;
  medication_name: string;
  presentation: string | null;
  dose: string | null;
  frequency: string | null;
  route: string | null;
  duration_days: number | null;
  start_date: string | null;          // ISO date
  end_date: string | null;            // ISO date
  treatment_status: PriorTreatmentStatus;
  suspension_reason: string | null;
  treatment_outcome: string | null;
  adverse_reaction_desc: string | null;
  prescribed_by_doctor_id: string | null;
  prescribed_by_doctor_name: string | null;
  prescribed_at_org_id: string | null;
  prescribed_at_org_name: string | null;
  is_currently_active: boolean;       // computed column
  interaction_check_needed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface VitalSigns {
  vital_id: string;
  queue_id: string;
  patient_id: string | null;
  unregistered_patient_id: string | null;
  nurse_id: string;
  organization_id: string | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  heart_rate: number | null;
  respiratory_rate: number | null;
  temperature_celsius: number | null;
  spo2_percent: number | null;
  glucose_mg_dl: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  bmi: number | null;
  pain_scale: number | null;
  triage_level: TriageLevel | null;
  notes: string | null;
  recorded_at: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface MARRecord {
  mar_id: string;
  queue_id: string;
  patient_id: string | null;
  unregistered_patient_id: string | null;
  nurse_id: string;
  organization_id: string | null;
  medication_name: string;
  medication_id: string | null;
  dose: string;
  route: string;
  frequency: string | null;
  scheduled_at: string;
  administered_at: string | null;
  status: MARStatus;
  omission_reason: string | null;
  prescription_id: string | null;
  ordered_by_doctor_id: string | null;
  prior_treatment_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface NurseProcedure {
  procedure_id: string;
  queue_id: string;
  patient_id: string | null;
  unregistered_patient_id: string | null;
  nurse_id: string;
  organization_id: string | null;
  ordered_by_doctor_id: string | null;
  procedure_name: string;
  procedure_code: string | null;
  description: string | null;
  status: ProcedureStatus;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  outcome: string | null;
  notes: string | null;
  supplies_used: SupplyItem[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface SupplyItem {
  name: string;
  quantity: number;
  unit: string;
}

export interface NursingEvolutionNote {
  note_id: string;
  queue_id: string;
  patient_id: string | null;
  unregistered_patient_id: string | null;
  nurse_id: string;
  content: string;
  evolution_type: 'subjective' | 'objective' | 'assessment' | 'plan' | 'standard';
  created_at: string;
  updated_at: string;
  created_by: string;
}

// ─── Shift Monitoring Types ───────────────────────────────

export interface ShiftIncident {
  time: string;
  patient_id?: string;
  patient_name?: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ShiftPendingTask {
  patient_id?: string;
  queue_id?: string;
  patient_name?: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'routine' | 'urgent';
}

export interface ShiftReport {
  report_id: string;
  nurse_id: string;
  organization_id: string | null;
  report_type: 'shift_report' | 'independent_care_report';
  report_date: string;               // ISO date
  shift_start: string | null;
  shift_end: string | null;
  patients_count: number;
  summary: string | null;
  incidents: ShiftIncident[];
  pending_tasks: ShiftPendingTask[];
  pdf_url: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface CrossOrgPermission {
  permission_id: string;
  organization_id: string;
  share_diagnoses: boolean;
  share_medications_admin: boolean;
  share_lab_results: boolean;
  share_vital_signs: boolean;
  share_nursing_notes: boolean;
  share_visit_summary: boolean;
  allowed_org_ids: string[] | null;
  blocked_org_ids: string[] | null;
  last_updated_by: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

// ─── DTOs para formularios ─────────────────────────────────

export interface CreateQueueEntryDto {
  patient_id?: string;
  unregistered_patient_id?: string;
  organization_id: string;
  assigned_nurse_id?: string;
  assigned_doctor_id?: string;
  appointment_id?: string;
  queue_date?: string;
  chief_complaint?: string;
  referral_flag?: boolean;
  allergies_flag?: boolean;
  chronic_flag?: boolean;
}

export interface CreateVitalSignsDto {
  queue_id: string;
  patient_id?: string;
  unregistered_patient_id?: string;
  nurse_id: string;
  organization_id?: string;
  bp_systolic?: number;
  bp_diastolic?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  temperature_celsius?: number;
  spo2_percent?: number;
  glucose_mg_dl?: number;
  weight_kg?: number;
  height_cm?: number;
  pain_scale?: number;
  triage_level?: TriageLevel;
  notes?: string;
}

export interface CreateMARRecordDto {
  queue_id: string;
  patient_id?: string;
  unregistered_patient_id?: string;
  nurse_id: string;
  organization_id?: string;
  medication_name: string;
  medication_id?: string;
  dose: string;
  route: string;
  frequency?: string;
  scheduled_at: string;
  prescription_id?: string;
  ordered_by_doctor_id?: string;
  prior_treatment_id?: string;
  notes?: string;
}

export interface CreateProcedureDto {
  queue_id: string;
  patient_id?: string;
  unregistered_patient_id?: string;
  nurse_id: string;
  organization_id?: string;
  ordered_by_doctor_id?: string;
  procedure_name: string;
  procedure_code?: string;
  description?: string;
  scheduled_at?: string;
  supplies_used?: SupplyItem[];
  notes?: string;
}

export interface CreateEvolutionNoteDto {
  queue_id: string;
  patient_id?: string;
  unregistered_patient_id?: string;
  nurse_id: string;
  content: string;
  evolution_type?: 'subjective' | 'objective' | 'assessment' | 'plan' | 'standard';
}

export interface RegisterOriginDto {
  patient_id?: string;
  unregistered_patient_id?: string;
  queue_id?: string;
  origin_type: PatientOriginType;
  origin_org_id?: string;
  origin_org_name?: string;
  origin_org_city?: string;
  origin_org_country?: string;
  last_seen_at_origin?: string;
  referring_doctor_id?: string;
  referring_doctor_name?: string;
  referring_specialty?: string;
  referring_org_name?: string;
  referring_contact?: string;
  referral_reason?: ReferralReason;
  referral_notes?: string;
  referral_document_url?: string;
  registered_by_nurse_id: string;
}

export interface AddPriorTreatmentDto {
  patient_id?: string;
  unregistered_patient_id?: string;
  origin_record_id?: string;
  medication_name: string;
  presentation?: string;
  dose?: string;
  frequency?: string;
  route?: string;
  duration_days?: number;
  start_date?: string;
  end_date?: string;
  treatment_status: PriorTreatmentStatus;
  prescribed_by_doctor_name?: string;
  prescribed_at_org_name?: string;
  interaction_check_needed?: boolean;
  notes?: string;
}

export interface CreateShiftReportDto {
  nurse_id: string;
  organization_id?: string;
  report_type: 'shift_report' | 'independent_care_report';
  report_date?: string;
  shift_start?: string;
  shift_end?: string;
  patients_count?: number;
  summary?: string;
  incidents?: ShiftIncident[];
  pending_tasks?: ShiftPendingTask[];
}

// ─── Respuestas de RPCs ────────────────────────────────────

export interface PatientFullOriginResponse {
  origin: PatientOriginRecord | null;
  treatments: PriorTreatment[];
  active_treatments_count: number;
  interaction_alerts_count: number;
}

export interface DashboardSummaryResponse {
  today: string;
  nurse_type: NurseType;
  total_patients: number;
  waiting: number;
  in_triage: number;
  ready_for_doctor: number;
  in_consultation: number;
  in_observation: number;
  discharged: number;
  absent: number;
  referral_count: number;
  interaction_alerts: number;
  pending_vitals: number;
}

// ─── Alertas del panel ────────────────────────────────────

export interface NurseAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  patientName?: string;
  queueId?: string;
  action?: {
    label: string;
    href: string;
  };
  createdAt: Date;
  dismissed: boolean;
}

// ─── Estado del contexto global ───────────────────────────

export interface NurseContextState {
  nurseProfile: NurseFullProfile | null;
  nurseType: NurseType | null;
  activePatient: NurseDailyDashboard | null;
  todaySummary: DashboardSummaryResponse | null;
  alerts: NurseAlert[];
  currentShift: {
    start: Date | null;
    isActive: boolean;
  };
  isOnline: boolean;
  isLoading: boolean;
}

export interface NurseContextActions {
  setActivePatient: (entry: NurseDailyDashboard | null) => void;
  refreshDashboard: () => void;
  dismissAlert: (id: string) => void;
  startShift: () => void;
  endShift: () => void;
  addAlert: (alert: Omit<NurseAlert, 'id' | 'createdAt' | 'dismissed'>) => void;
}

// ─── Datos de registro ─────────────────────────────────────

export interface NurseRegisterPersonalData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  country: string;
  city: string;
}

export interface NurseRegisterProfessionalData {
  license_number: string;
  license_expiry: string;
  specializations: string[];
  license_file?: File;
  // Para afiliada:
  position_title?: string;
}

export interface NurseRegisterScopeData {
  home_visits: boolean;
  visible_in_network: boolean;
  can_share_records: boolean;
}

export interface NurseRegisterAffiliatedData {
  organization_code?: string;
  organization_token?: string;
  organization_id?: string;
  organization_name?: string;
}

// ─── Helpers de UI ─────────────────────────────────────────

export const TRIAGE_COLORS: Record<TriageLevel, string> = {
  immediate:   'bg-red-600 text-white',
  urgent:      'bg-orange-500 text-white',
  less_urgent: 'bg-yellow-400 text-gray-900',
  non_urgent:  'bg-green-500 text-white',
  deceased:    'bg-gray-900 text-white',
};

export const TRIAGE_LABELS: Record<TriageLevel, string> = {
  immediate:   'Inmediato',
  urgent:      'Urgente',
  less_urgent: 'Poco urgente',
  non_urgent:  'No urgente',
  deceased:    'Fallecido',
};

export const QUEUE_STATUS_COLORS: Record<QueueStatus, string> = {
  waiting:          'bg-gray-200 text-gray-700',
  in_triage:        'bg-blue-100 text-blue-800',
  ready_for_doctor: 'bg-green-100 text-green-800',
  in_consultation:  'bg-emerald-500 text-white',
  in_observation:   'bg-orange-100 text-orange-800',
  discharged:       'bg-slate-700 text-white',
  absent:           'bg-red-100 text-red-700',
};

export const QUEUE_STATUS_LABELS: Record<QueueStatus, string> = {
  waiting:          'En espera',
  in_triage:        'En triaje',
  ready_for_doctor: 'Listo para médico',
  in_consultation:  'En consulta',
  in_observation:   'En observación',
  discharged:       'Alta',
  absent:           'Ausente',
};

export const MAR_STATUS_LABELS: Record<MARStatus, string> = {
  pending:       'Pendiente',
  administered:  'Administrado',
  omitted:       'Omitido',
  refused:       'Rechazado',
  held:          'Retenido',
  not_available: 'No disponible',
};

export const SPECIALIZATIONS = [
  'UCI',
  'Pediatría',
  'Geriatría',
  'Oncología',
  'Quirúrgica',
  'Domiciliaria',
  'Salud Mental',
  'Urgencias',
  'Neonatología',
  'General',
  'Otra',
] as const;

export type Specialization = (typeof SPECIALIZATIONS)[number];
