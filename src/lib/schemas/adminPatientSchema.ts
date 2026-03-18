import * as z from 'zod';

export const adminPatientSchema = z.object({
  firstName: z.string().min(2, 'El nombre es requerido'),
  lastName: z.string().min(2, 'El apellido es requerido'),
  dateOfBirth: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.union([z.string().email('Email inválido'), z.literal('')]).optional(),
  
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  
  medicalHistory: z.string().optional(),
  allergies: z.string().optional(),
  currentMedications: z.string().optional(),
  
  // Home Care Fields
  serviceId: z.string().optional(),
  careDate: z.string().optional(),
  specialistIds: z.array(z.string()).optional(),
  inventoryItems: z.array(z.object({
    id: z.string(),
    type: z.enum(['medication', 'material']),
    name: z.string(),
    quantity: z.number().min(1)
  })).optional(),

  identifier: z.string().optional(),
  isActive: z.boolean().optional(),

  // Attention Reminders
  attentions: z.array(z.object({
    title: z.string().min(2, 'El título es requerido'),
    description: z.string().optional(),
    attentionDate: z.string().min(1, 'La fecha es requerida'),
    isInternal: z.boolean().default(true),
    specialistId: z.string().nullable().optional(),
    status: z.enum(['PENDIENTE', 'COMPLETADA', 'CANCELADA']).default('PENDIENTE')
  })).optional(),
});

export type AdminPatientFormValues = z.infer<typeof adminPatientSchema>;
