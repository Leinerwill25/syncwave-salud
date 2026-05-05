import { PointTransactionType } from '@/types/points';

export interface PointEventDefinition {
  key: PointTransactionType;
  points: number;
  description: string;
  once: boolean;
  category: string;
  dailyLimit: number | null;
}

export const POINTS_EVENTS: Record<string, PointEventDefinition> = {
  // ─── ONBOARDING (una sola vez por paciente) ───
  PROFILE_COMPLETED: {
    key: 'profile_completed',
    points: 150,
    description: 'Completaste tu perfil de salud',
    once: true,
    category: 'profile',
    dailyLimit: null
  },
  EMERGENCY_QR_ACTIVATED: {
    key: 'emergency_qr_activated',
    points: 100,
    description: 'Activaste tu QR de Emergencia',
    once: true,
    category: 'profile',
    dailyLimit: null
  },
  FAMILY_MEMBER_ADDED: {
    key: 'family_member_added',
    points: 75,
    description: 'Agregaste un familiar a tu grupo de salud',
    once: true,
    category: 'profile',
    dailyLimit: null
  },
  FIRST_APPOINTMENT_BOOKED: {
    key: 'first_appointment_booked',
    points: 50,
    description: 'Agendaste tu primera cita en ASHIRA',
    once: true,
    category: 'appointments',
    dailyLimit: null
  },

  // ─── RECURRENTES ───
  APPOINTMENT_CONFIRMED: {
    key: 'appointment_confirmed',
    points: 25,
    description: 'Confirmaste tu cita desde el portal',
    once: false,
    category: 'appointments',
    dailyLimit: null
  },
  APPOINTMENT_ATTENDED: {
    key: 'appointment_attended',
    points: 40,
    description: 'Asististe a tu cita médica',
    once: false,
    category: 'appointments',
    dailyLimit: null
  },
  APPOINTMENT_RESCHEDULED_EARLY: {
    key: 'appointment_rescheduled_early',
    points: 20,
    description: 'Reagendaste tu cita con más de 24h de anticipación',
    once: false,
    category: 'appointments',
    dailyLimit: null
  },
  MEDICAL_REPORT_UPLOADED: {
    key: 'medical_report_uploaded',
    points: 30,
    description: 'Subiste un informe médico',
    once: false,
    category: 'documents',
    dailyLimit: 2
  },
  LAB_RESULT_UPLOADED: {
    key: 'lab_result_uploaded',
    points: 30,
    description: 'Subiste un resultado de laboratorio',
    once: false,
    category: 'documents',
    dailyLimit: 2
  },
  SURVEY_COMPLETED: {
    key: 'survey_completed',
    points: 50,
    description: 'Respondiste la encuesta post-consulta',
    once: false,
    category: 'surveys',
    dailyLimit: null
  },
  INVOICE_PAID_ONLINE: {
    key: 'invoice_paid_online',
    points: 20,
    description: 'Pagaste tu factura desde el portal',
    once: false,
    category: 'payments',
    dailyLimit: null
  },

  // ─── FAMILIA ───
  FAMILY_MEMBER_PROFILE_COMPLETED: {
    key: 'family_member_profile_completed',
    points: 60,
    description: 'Completaste el perfil de salud de un familiar',
    once: false,
    category: 'family',
    dailyLimit: null
  },
  FAMILY_MEMBER_APPOINTMENT_ATTENDED: {
    key: 'family_member_appointment_attended',
    points: 30,
    description: 'Un familiar asistió a su cita médica',
    once: false,
    category: 'family',
    dailyLimit: null
  },

  // ─── STREAKS (bonus especiales) ───
  STREAK_3_APPOINTMENTS: {
    key: 'streak_3_appointments',
    points: 100,
    description: '¡Racha! Asististe a 3 citas consecutivas',
    once: false,
    category: 'streaks',
    dailyLimit: null
  }
} as const;

export const getEventDefinitionByKey = (key: PointTransactionType): PointEventDefinition | undefined => {
  return Object.values(POINTS_EVENTS).find(e => e.key === key);
};
