// src/schemas/nurse/origin.schema.ts
import { z } from 'zod';

export const originRecordSchema = z.object({
  origin_type: z.enum([
    'new',
    'referred_internal',
    'referred_external',
    'returning_same_org',
    'returning_other_org',
    'self_referred',
  ]),
  origin_org_name: z.string().max(200).optional(),
  origin_org_city: z.string().max(100).optional(),
  origin_org_country: z.string().max(50).default('CO'),
  last_seen_at_origin: z.string().optional(),
  referring_doctor_id: z.string().uuid().optional(),
  referring_doctor_name: z.string().max(200).optional(),
  referring_specialty: z.string().max(100).optional(),
  referring_org_name: z.string().max(200).optional(),
  referring_contact: z.string().max(200).optional(),
  referral_reason: z
    .enum([
      'second_opinion',
      'treatment_continuity',
      'specialty_unavailable',
      'emergency',
      'follow_up',
      'routine',
      'other',
    ])
    .optional(),
  referral_notes: z.string().max(1000).optional(),
  referral_document_url: z.string().url().optional().or(z.literal('')),
});

export type OriginRecordFormData = z.infer<typeof originRecordSchema>;

export const priorTreatmentSchema = z.object({
  medication_name: z.string().min(2, 'Nombre del medicamento requerido'),
  presentation: z.string().max(100).optional(),
  dose: z.string().max(100).optional(),
  frequency: z.string().max(100).optional(),
  route: z.string().max(50).optional(),
  duration_days: z.number().int().positive().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  treatment_status: z.enum(['active', 'completed', 'suspended', 'adverse_reaction', 'unknown']),
  suspension_reason: z.string().max(500).optional(),
  treatment_outcome: z.string().max(500).optional(),
  adverse_reaction_desc: z.string().max(1000).optional(),
  prescribed_by_doctor_name: z.string().max(200).optional(),
  prescribed_at_org_name: z.string().max(200).optional(),
  interaction_check_needed: z.boolean().default(false),
  notes: z.string().max(1000).optional(),
});

export type PriorTreatmentFormData = z.infer<typeof priorTreatmentSchema>;

export const ORIGIN_TYPE_LABELS: Record<string, string> = {
  new: 'Paciente nuevo',
  referred_internal: 'Referido interno',
  referred_external: 'Referido externo',
  returning_same_org: 'Retorno — misma organización',
  returning_other_org: 'Retorno — otra organización',
  self_referred: 'Autoremitido',
};

export const REFERRAL_REASON_LABELS: Record<string, string> = {
  second_opinion: 'Segunda opinión',
  treatment_continuity: 'Continuidad de tratamiento',
  specialty_unavailable: 'Especialidad no disponible en origen',
  emergency: 'Urgencia',
  follow_up: 'Seguimiento',
  routine: 'Control de rutina',
  other: 'Otro',
};
