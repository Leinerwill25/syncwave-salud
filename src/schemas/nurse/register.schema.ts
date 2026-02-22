// src/schemas/nurse/register.schema.ts
import { z } from 'zod';

// ─── Paso 1: Datos personales ──────────────────────────────

export const personalDataSchema = z
  .object({
    firstName: z.string().min(2, 'Mínimo 2 caracteres').max(100),
    lastName: z.string().min(2, 'Mínimo 2 caracteres').max(100),
    email: z.string().email('Correo electrónico inválido'),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
    confirmPassword: z.string(),
    phone: z
      .string()
      .min(7, 'Teléfono inválido')
      .max(20, 'Teléfono inválido')
      .regex(/^[+\d\s\-()]+$/, 'Formato de teléfono inválido'),
    country: z.string().min(2, 'País requerido'),
    city: z.string().min(2, 'Ciudad requerida'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type PersonalDataFormData = z.infer<typeof personalDataSchema>;

// ─── Paso 2: Datos profesionales ──────────────────────────

export const professionalDataSchema = z.object({
  license_number: z
    .string()
    .min(4, 'Número de licencia inválido')
    .max(50, 'Número de licencia inválido'),
  license_expiry: z.string().optional(),
  specializations: z
    .array(z.string())
    .min(1, 'Selecciona al menos una especialización'),
  position_title: z.string().max(100).optional(),
});

export type ProfessionalDataFormData = z.infer<typeof professionalDataSchema>;

// ─── Paso 3: Configuración independiente ─────────────────

export const independentScopeSchema = z.object({
  home_visits: z.boolean().default(false),
  visible_in_network: z.boolean().default(true),
  can_share_records: z.boolean().default(false),
});

export type IndependentScopeFormData = z.infer<typeof independentScopeSchema>;

// ─── Paso 4: Términos ─────────────────────────────────────

export const termsSchema = z.object({
  accept_terms: z.literal(true, { message: 'Debes aceptar los términos y condiciones' }),
  accept_privacy: z.literal(true, { message: 'Debes aceptar la política de privacidad' }),
});

export type TermsFormData = z.infer<typeof termsSchema>;

// ─── Validación código afiliada ───────────────────────────

export const orgCodeSchema = z.object({
  organization_code: z
    .string()
    .min(4, 'Código de organización inválido')
    .max(50)
    .toUpperCase(),
});

export type OrgCodeFormData = z.infer<typeof orgCodeSchema>;
