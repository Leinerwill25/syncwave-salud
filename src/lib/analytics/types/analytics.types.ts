export interface TimeRange {
  start: Date;
  end: Date;
}

export interface AnalyticsFilters {
  timeRange: TimeRange;
  region?: string;
  specialty?: string;
  organizationId?: string;
  doctorId?: string;
}

export interface DiagnosisData {
  region: string;
  diagnosis: string;
  icd11_code: string | null;
  icd11_title: string | null;
  count: number;
  specialty: string;
  month: string;
}

export interface MedicationData {
  specialty: string;
  medication: string;
  total_prescriptions: number;
  avg_quantity: number;
  common_dosages: string[];
}

export interface AppointmentStats {
  consultorio: string;
  completed: number;
  cancelled: number;
  scheduled: number;
  attendance_rate: number;
}

export interface FinancialMetrics {
  total_revenue: number;
  currency: string;
  payment_method: string;
  count: number;
  period: string;
}

export interface LabResultData {
  result_type: string;
  total_orders: number;
  critical_count: number;
  avg_turnaround_days: number;
}

export interface PatientDemographics {
  age_group: string;
  gender: string;
  count: number;
  region: string;
}

export interface CommunicationMetrics {
  date: string;
  messages_sent: number;
  response_rate: number;
  avg_response_time_minutes: number;
}

export interface AuditLogEntry {
  id: string;
  user_name: string;
  action_type: string;
  module: string;
  timestamp: string;
  details: string;
}

