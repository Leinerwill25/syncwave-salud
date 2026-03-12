import * as z from 'zod';

export const specialistSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  phoneNumber: z.string().min(8, 'El teléfono debe tener un formato válido (mín. 8 dígitos)'),
  email: z.string().email('Email inválido'),
  inpresSax: z.string().min(3, 'El INPRES SAX es requerido'),
  role: z.enum(['DOCTOR', 'ENFERMERO', 'CURA', 'FISIOTERAPEUTA']),
  isActive: z.boolean().optional(),
});

export type SpecialistFormValues = z.infer<typeof specialistSchema>;
