import * as z from 'zod';

export const clinicalDocumentSchema = z.object({
  patientId: z.string().uuid('ID de paciente inválido'),
  consultationId: z.string().uuid('ID de consulta inválido').optional(),
  documentType: z.string().optional(),
  description: z.string().optional(),
  
  // En la API recibiremos metadatos, el archivo se sube por separado o en base64 (simplificamos con URL para el MVP o Storage)
  filePath: z.string().min(1, 'La ruta del archivo es requerida'),
  fileName: z.string().min(1, 'El nombre del archivo es requerido'),
  fileSizeBytes: z.number().int().optional(),
  mimeType: z.string().optional(),
});

export type ClinicalDocumentFormValues = z.infer<typeof clinicalDocumentSchema>;
