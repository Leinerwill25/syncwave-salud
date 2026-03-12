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
  
  isActive: z.boolean().optional(),
});

export type AdminPatientFormValues = z.infer<typeof adminPatientSchema>;
