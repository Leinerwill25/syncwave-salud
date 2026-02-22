-- ============================================================================
-- Tabla para Consultas Sucesivas
-- Este módulo permite al doctor registrar información cuando un paciente
-- regresa con resultados de laboratorio, RX, imágenes, etc.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.successive_consultation (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  
  -- Relación con la consulta original
  original_consultation_id uuid NOT NULL,
  
  -- Relación con paciente y doctor
  patient_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  organization_id uuid,
  
  -- Fecha de la consulta sucesiva
  consultation_date timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Resultados de laboratorio (JSON para flexibilidad)
  lab_results jsonb DEFAULT '{}'::jsonb,
  
  -- Descripción de los resultados por el doctor
  results_description text,
  
  -- Observaciones del doctor
  doctor_observations text,
  
  -- Imágenes, RX, documentos (array de URLs)
  attachments text[] DEFAULT '{}'::text[],
  
  -- Campos adicionales asociados a la consulta (JSON para flexibilidad)
  additional_fields jsonb DEFAULT '{}'::jsonb,
  
  -- Diagnóstico o evaluación
  diagnosis text,
  icd11_code text,
  icd11_title text,
  
  -- Notas adicionales
  notes text,
  
  -- Metadatos
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid, -- ID del usuario que creó el registro
  
  CONSTRAINT successive_consultation_pkey PRIMARY KEY (id),
  CONSTRAINT fk_successive_consultation_original FOREIGN KEY (original_consultation_id) 
    REFERENCES public.consultation(id) ON DELETE CASCADE,
  CONSTRAINT fk_successive_consultation_patient FOREIGN KEY (patient_id) 
    REFERENCES public.patient(id) ON DELETE CASCADE,
  CONSTRAINT fk_successive_consultation_doctor FOREIGN KEY (doctor_id) 
    REFERENCES public."user"(id) ON DELETE CASCADE,
  CONSTRAINT fk_successive_consultation_org FOREIGN KEY (organization_id) 
    REFERENCES public.organization(id) ON DELETE SET NULL,
  CONSTRAINT fk_successive_consultation_created_by FOREIGN KEY (created_by) 
    REFERENCES public."user"(id) ON DELETE SET NULL
);

-- Índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_successive_consultation_original_consultation 
  ON public.successive_consultation(original_consultation_id);
CREATE INDEX IF NOT EXISTS idx_successive_consultation_patient 
  ON public.successive_consultation(patient_id);
CREATE INDEX IF NOT EXISTS idx_successive_consultation_doctor 
  ON public.successive_consultation(doctor_id);
CREATE INDEX IF NOT EXISTS idx_successive_consultation_organization 
  ON public.successive_consultation(organization_id);
CREATE INDEX IF NOT EXISTS idx_successive_consultation_date 
  ON public.successive_consultation(consultation_date);

-- Comentarios en la tabla y columnas
COMMENT ON TABLE public.successive_consultation IS 'Registra consultas sucesivas cuando un paciente regresa con resultados de laboratorio, RX, imágenes, etc.';
COMMENT ON COLUMN public.successive_consultation.original_consultation_id IS 'ID de la consulta original donde se solicitó el laboratorio';
COMMENT ON COLUMN public.successive_consultation.lab_results IS 'Resultados de laboratorio en formato JSON';
COMMENT ON COLUMN public.successive_consultation.results_description IS 'Descripción detallada de los resultados por el doctor';
COMMENT ON COLUMN public.successive_consultation.doctor_observations IS 'Observaciones del doctor sobre los resultados';
COMMENT ON COLUMN public.successive_consultation.attachments IS 'Array de URLs de imágenes, RX, documentos adjuntos';
COMMENT ON COLUMN public.successive_consultation.additional_fields IS 'Campos adicionales asociados a la consulta en formato JSON';

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.successive_consultation ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    v_table_name TEXT := 'public.successive_consultation';
    v_policy_check TEXT := 'doctor_id IN (SELECT id FROM public."user" WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text)';
BEGIN
    EXECUTE format('CREATE POLICY "Doctors can view their successive consultations" ON %s FOR SELECT USING ( %s )', v_table_name, v_policy_check);
    EXECUTE format('CREATE POLICY "Doctors can create successive consultations" ON %s FOR INSERT WITH CHECK ( %s )', v_table_name, v_policy_check);
    EXECUTE format('CREATE POLICY "Doctors can update their successive consultations" ON %s FOR UPDATE USING ( %s )', v_table_name, v_policy_check);
    EXECUTE format('CREATE POLICY "Doctors can delete their successive consultations" ON %s FOR DELETE USING ( %s )', v_table_name, v_policy_check);
END $$;

