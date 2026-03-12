import * as z from 'zod';

export const medicationSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  dosage: z.string().optional(),
  presentation: z.string().optional(),
  quantity: z.number().int().min(0, 'La cantidad no puede ser negativa'),
  expirationDate: z.string().optional().or(z.literal('')),
  supplier: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export const materialSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  specifications: z.string().optional(),
  quantity: z.number().int().min(0, 'La cantidad no puede ser negativa'),
  supplier: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export type MedicationFormValues = z.infer<typeof medicationSchema>;
export type MaterialFormValues = z.infer<typeof materialSchema>;
