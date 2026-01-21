-- ============================================================================
-- Script para crear la tabla de calificaciones de consultas
-- ============================================================================
-- 
-- Esta tabla almacena las calificaciones que los pacientes dan sobre
-- la atención recibida en sus consultas médicas.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.consultation_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relación con la consulta
    consultation_id UUID NOT NULL REFERENCES public.consultation(id) ON DELETE CASCADE,
    
    -- Relación con el paciente (puede ser registrado o no registrado)
    patient_id UUID REFERENCES public.patient(id) ON DELETE SET NULL,
    unregistered_patient_id UUID REFERENCES public.unregisteredpatients(id) ON DELETE SET NULL,
    
    -- Relación con el doctor y organización
    doctor_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organization(id) ON DELETE CASCADE,
    
    -- Calificaciones (Sí / No / Tal vez)
    -- 1. Comunicación: ¿El doctor le explicó su diagnóstico y los pasos a seguir de una manera clara?
    communication_rating VARCHAR(10) NOT NULL CHECK (communication_rating IN ('yes', 'no', 'maybe')),
    
    -- 2. Atención y Trato: ¿Sintió que el doctor escuchó sus inquietudes con atención?
    attention_rating VARCHAR(10) NOT NULL CHECK (attention_rating IN ('yes', 'no', 'maybe')),
    
    -- 3. Satisfacción General (NPS): ¿Recomendaría este doctor a un familiar o amigo?
    satisfaction_rating VARCHAR(10) NOT NULL CHECK (satisfaction_rating IN ('yes', 'no', 'maybe')),
    
    -- Comentarios opcionales del paciente
    comments TEXT,
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Asegurar que solo se puede calificar una vez por consulta
    CONSTRAINT unique_consultation_rating UNIQUE (consultation_id)
);

-- Índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_consultation_ratings_consultation_id ON public.consultation_ratings(consultation_id);
CREATE INDEX IF NOT EXISTS idx_consultation_ratings_doctor_id ON public.consultation_ratings(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultation_ratings_organization_id ON public.consultation_ratings(organization_id);
CREATE INDEX IF NOT EXISTS idx_consultation_ratings_patient_id ON public.consultation_ratings(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultation_ratings_created_at ON public.consultation_ratings(created_at DESC);

-- Comentarios para documentación
COMMENT ON TABLE public.consultation_ratings IS 'Calificaciones de los pacientes sobre la atención recibida en consultas médicas';
COMMENT ON COLUMN public.consultation_ratings.communication_rating IS 'Calificación sobre la comunicación del doctor: yes, no, maybe';
COMMENT ON COLUMN public.consultation_ratings.attention_rating IS 'Calificación sobre la atención y trato del doctor: yes, no, maybe';
COMMENT ON COLUMN public.consultation_ratings.satisfaction_rating IS 'Calificación de satisfacción general (NPS): yes, no, maybe';

