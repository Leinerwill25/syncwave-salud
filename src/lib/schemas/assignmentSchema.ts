import * as z from 'zod';

export const specialistAssignmentSchema = z.object({
  specialistId: z.string().uuid('ID de especialista inválido'),
  patientId: z.string().uuid('ID de paciente inválido'),
  status: z.enum(['ACTIVO', 'INACTIVO', 'PAUSADO', 'COMPLETADO']).optional().default('ACTIVO'),
  notes: z.string().optional(),
});

export const inventoryAssignmentSchema = z.object({
  patientId: z.string().uuid('ID de paciente inválido'),
  medicationId: z.string().uuid('ID de medicamento inválido').optional(),
  materialId: z.string().uuid('ID de material inválido').optional(),
  quantityAssigned: z.number().int().min(1, 'La cantidad debe ser al menos 1'),
  patientProvided: z.boolean().optional().default(false),
}).refine(data => {
  // Ensure exactly one is provided
  const hasMed = !!data.medicationId;
  const hasMat = !!data.materialId;
  return (hasMed || hasMat) && !(hasMed && hasMat);
}, {
  message: "Debe proveer exactamente un medicamento o un material",
  path: ["medicationId"], // Path to show the error
});

export type SpecialistAssignmentFormValues = z.infer<typeof specialistAssignmentSchema>;
export type InventoryAssignmentFormValues = z.infer<typeof inventoryAssignmentSchema>;
