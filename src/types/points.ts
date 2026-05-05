export type PointTransactionType =
  | 'profile_completed'
  | 'emergency_qr_activated'
  | 'family_member_added'
  | 'first_appointment_booked'
  | 'appointment_confirmed'
  | 'appointment_attended'
  | 'appointment_rescheduled_early'
  | 'medical_report_uploaded'
  | 'lab_result_uploaded'
  | 'survey_completed'
  | 'invoice_paid_online'
  | 'family_member_profile_completed'
  | 'family_member_appointment_attended'
  | 'streak_3_appointments'
  | 'reward_redeemed';

export interface PointTransaction {
  id: string;
  patient_id: string;
  event_type: PointTransactionType;
  points: number;
  description: string;
  reference_id?: string | null;
  reference_table?: string | null;
  created_at: string;
}

export interface PatientPointsSummary {
  patient_id: string;
  total_earned: number;
  total_spent: number;
  current_balance: number;
  current_level: number;
  streak_count: number;
  updated_at: string;
}

export type RewardType = 
  | 'priority_waitlist' 
  | 'extended_reminders' 
  | 'pdf_export' 
  | 'family_dashboard' 
  | 'verified_badge';

export interface RewardCatalogItem {
  id: string;
  name: string;
  description: string;
  cost_points: number;
  reward_type: RewardType;
  min_level: number;
  is_active: boolean;
  icon: string | null;
  created_at: string;
}

export type RedemptionStatus = 'active' | 'used' | 'expired';

export interface RewardRedemption {
  id: string;
  patient_id: string;
  reward_id: string;
  points_spent: number;
  status: RedemptionStatus;
  activated_at: string;
  expires_at: string | null;
  created_at: string;
  reward?: RewardCatalogItem; // when joined
}

export interface DailyLimit {
  patient_id: string;
  event_category: string;
  event_date: string;
  count: number;
}
