// src/schemas/nurse/mar.schema.ts
import { z } from 'zod';

export const administerMARSchema = z.object({
  confirm_patient: z.literal(true, { message: 'Debes confirmar el paciente' }),
  confirm_medication: z.literal(true, { message: 'Debes confirmar el medicamento' }),
  confirm_dose: z.literal(true, { message: 'Debes confirmar la dosis' }),
  confirm_route: z.literal(true, { message: 'Debes confirmar la vía' }),
  confirm_time: z.literal(true, { message: 'Debes confirmar la hora' }),
  notes: z.string().max(500).optional(),
  adverse_reaction: z.boolean().default(false),
  adverse_reaction_desc: z.string().max(1000).optional(),
}).refine(
  (data) => !data.adverse_reaction || (data.adverse_reaction_desc && data.adverse_reaction_desc.length > 0),
  {
    message: 'Describe la reacción adversa',
    path: ['adverse_reaction_desc'],
  }
);

export type AdministerMARFormData = z.infer<typeof administerMARSchema>;

export const notAdministeredMARSchema = z.object({
  status: z.enum(['omitted', 'refused', 'held', 'not_available']),
  omission_reason: z.string().min(5, 'Describe el motivo (mín. 5 caracteres)').max(500),
});

export type NotAdministeredMARFormData = z.infer<typeof notAdministeredMARSchema>;

export const createMARSchema = z.object({
  medication_name: z.string().min(2, 'Nombre del medicamento requerido'),
  dose: z.string().min(1, 'Dosis requerida'),
  route: z.string().min(1, 'Vía requerida'),
  frequency: z.string().optional(),
  scheduled_at: z.string().min(1, 'Hora programada requerida'),
  prescription_id: z.string().uuid().optional(),
  ordered_by_doctor_id: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
});

export type CreateMARFormData = z.infer<typeof createMARSchema>;

export const MAR_ROUTES = [
  'Oral',
  'IV directa',
  'IV infusión',
  'IM',
  'SC',
  'SL',
  'Tópico',
  'Inhalado',
  'Rectal',
  'Nasal',
  'Oftálmico',
  'Ótico',
] as const;
