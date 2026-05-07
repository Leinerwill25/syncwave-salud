// src/types/referrals.ts

export type ReferralStatus = 'pending' | 'registered' | 'profile_completed' | 'converted';

export interface PatientReferral {
  id: string;
  referrer_id: string;
  referred_id: string | null;
  referral_code: string;
  referral_link: string;
  status: ReferralStatus;
  stage1_awarded: boolean;
  stage2_awarded: boolean;
  welcome_awarded: boolean;
  referred_email?: string;
  created_at: string;
  registered_at?: string;
  converted_at?: string;
  referred_alias?: string; // Alias para mostrar sin exponer PII
}

export interface ReferralStats {
  totalReferrals: number;
  pending: number;
  registered: number;
  converted: number;
  totalPulsosEarned: number;
  totalPointsAwarded: number;
  referralCode: string | null;
  referrals: PatientReferral[];
}
