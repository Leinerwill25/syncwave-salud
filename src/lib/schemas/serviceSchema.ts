import * as z from 'zod';

export const serviceSchema = z.object({
  name: z.string().min(2, 'El nombre del servicio es requerido'),
  description: z.string().optional(),
  serviceCode: z.string().optional(),
  price: z.number().min(0, 'El precio no puede ser negativo').optional(),
  isActive: z.boolean().optional().default(true),
});

export type ServiceFormValues = z.infer<typeof serviceSchema>;
