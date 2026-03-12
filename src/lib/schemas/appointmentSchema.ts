import * as z from 'zod';

export const appointmentSchema = z.object({
  specialistId: z.string().uuid('ID de especialista inválido'),
  patientId: z.string().uuid('ID de paciente inválido'),
  serviceId: z.string().uuid('ID de servicio inválido').optional(),
  appointmentType: z.enum(['PRESENCIAL', 'DOMICILIARIO']),
  scheduledDate: z.string(), // YYYY-MM-DD
  scheduledTime: z.string(), // HH:mm:ss
  notes: z.string().optional(),
});

export const appointmentApprovalSchema = z.object({
  serviceId: z.string().uuid('ID de servicio requerido para aprobar'),
  notes: z.string().optional(),
});

export type AppointmentFormValues = z.infer<typeof appointmentSchema>;
export type AppointmentApprovalFormValues = z.infer<typeof appointmentApprovalSchema>;
