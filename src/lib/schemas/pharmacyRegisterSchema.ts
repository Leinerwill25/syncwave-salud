import * as z from 'zod';

export const pharmacyRegisterSchema = z.object({
  fullName: z.string().min(3, 'El nombre del responsable debe tener al menos 3 caracteres'),
  email: z.string().email('El correo electrónico no es válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string().min(8, 'La confirmación debe tener al menos 8 caracteres'),
  orgName: z.string().min(3, 'El nombre de la farmacia debe tener al menos 3 caracteres'),
  whatsappNumber: z.string().min(10, 'El número de WhatsApp debe tener al menos 10 caracteres'),
  rif: z.string().min(5, 'El RIF / Identificador debe tener al menos 5 caracteres'),
  orgAddress: z.string().min(5, 'La dirección de la sede principal debe tener al menos 5 caracteres'),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
});

export type PharmacyRegisterFormValues = z.infer<typeof pharmacyRegisterSchema>;
