-- Migración: Agregar soporte para guardar informes médicos generados
-- Este script crea la tabla MedicalRecord y la asociación con consultation si no existen

-- 1. Crear tabla MedicalRecord si no existe
CREATE TABLE IF NOT EXISTS public."MedicalRecord" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "patientId" uuid NOT NULL,
  "authorId" uuid,
  content jsonb NOT NULL,
  attachments text[] DEFAULT ARRAY[]::text[],
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "MedicalRecord_pkey" PRIMARY KEY (id),
  CONSTRAINT "fk_medicalrecord_patient" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON DELETE CASCADE
);

-- 2. Crear índice para mejorar búsquedas por paciente
CREATE INDEX IF NOT EXISTS idx_medicalrecord_patient_id ON public."MedicalRecord"("patientId");
CREATE INDEX IF NOT EXISTS idx_medicalrecord_author_id ON public."MedicalRecord"("authorId");

-- 3. Agregar campo medical_record_id a consultation si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'consultation' 
    AND column_name = 'medical_record_id'
  ) THEN
    ALTER TABLE public.consultation 
    ADD COLUMN medical_record_id uuid;
  END IF;
END $$;

-- 4. Agregar foreign key constraint si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND constraint_name = 'fk_consultation_medrec'
  ) THEN
    ALTER TABLE public.consultation 
    ADD CONSTRAINT fk_consultation_medrec 
    FOREIGN KEY (medical_record_id) 
    REFERENCES public."MedicalRecord"(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Comentarios descriptivos
COMMENT ON TABLE public."MedicalRecord" IS 'Almacena registros médicos e informes generados para pacientes';
COMMENT ON COLUMN public."MedicalRecord"."patientId" IS 'ID del paciente al que pertenece el registro';
COMMENT ON COLUMN public."MedicalRecord"."authorId" IS 'ID del usuario (médico) que creó el registro';
COMMENT ON COLUMN public."MedicalRecord".content IS 'Contenido del registro médico en formato JSON';
COMMENT ON COLUMN public."MedicalRecord".attachments IS 'Array de URLs a archivos adjuntos (PDFs, imágenes, etc.)';
COMMENT ON COLUMN public.consultation.medical_record_id IS 'ID del registro médico asociado a esta consulta';

