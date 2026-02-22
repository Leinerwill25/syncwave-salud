-- ============================================================================
-- Create table for Successive Consultations (Consultas Sucesivas)
-- This table stores follow-up consultations where patients return with lab results
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Drop table if exists (for re-running migration)
-- ============================================================================
DROP TABLE IF EXISTS public.successive_consultations CASCADE;

-- ============================================================================
-- STEP 2: Create the successive_consultations table
-- ============================================================================
CREATE TABLE public.successive_consultations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    
    -- Relación con la consulta original que solicitó los laboratorios
    original_consultation_id uuid NOT NULL,
    
    -- Relación con el paciente (puede ser registrado o no registrado)
    patient_id uuid,
    unregistered_patient_id uuid,
    
    -- Relación con el doctor/especialista
    doctor_id uuid NOT NULL,
    
    -- Relación con la organización
    organization_id uuid,
    
    -- Relación con la cita (opcional, puede ser una nueva cita o la misma)
    appointment_id uuid,
    
    -- Fecha de la consulta sucesiva
    consultation_date timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Resultados de laboratorio (JSON para flexibilidad)
    lab_results jsonb DEFAULT '{}'::jsonb,
    
    -- Descripción de los resultados por el doctor
    results_description text,
    
    -- Observaciones del doctor
    observations text,
    
    -- Campos adicionales asociados a la consulta (JSON para flexibilidad)
    additional_fields jsonb DEFAULT '{}'::jsonb,
    
    -- Imágenes y archivos (array de URLs)
    images text[] DEFAULT ARRAY[]::text[],
    
    -- Radiografías (array de URLs)
    xrays text[] DEFAULT ARRAY[]::text[],
    
    -- Otros documentos/archivos (array de URLs)
    documents text[] DEFAULT ARRAY[]::text[],
    
    -- Diagnóstico actualizado (opcional)
    diagnosis text,
    
    -- Código CIE-11 (opcional)
    icd11_code text,
    icd11_title text,
    
    -- Notas adicionales
    notes text,
    
    -- Timestamps
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Primary key
    CONSTRAINT successive_consultations_pkey PRIMARY KEY (id),
    
    -- Foreign keys
    CONSTRAINT fk_successive_consultation_original 
        FOREIGN KEY (original_consultation_id) 
        REFERENCES public.consultation(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_successive_consultation_patient 
        FOREIGN KEY (patient_id) 
        REFERENCES public.patient(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_successive_consultation_unregistered_patient 
        FOREIGN KEY (unregistered_patient_id) 
        REFERENCES public.unregisteredpatients(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_successive_consultation_doctor 
        FOREIGN KEY (doctor_id) 
        REFERENCES public."user"(id) 
        ON DELETE SET NULL,
    
    CONSTRAINT fk_successive_consultation_organization 
        FOREIGN KEY (organization_id) 
        REFERENCES public.organization(id) 
        ON DELETE SET NULL,
    
    CONSTRAINT fk_successive_consultation_appointment 
        FOREIGN KEY (appointment_id) 
        REFERENCES public.appointment(id) 
        ON DELETE SET NULL
);

-- ============================================================================
-- STEP 3: Create indexes for better query performance
-- ============================================================================
CREATE INDEX idx_successive_consultations_original_consultation 
    ON public.successive_consultations(original_consultation_id);

CREATE INDEX idx_successive_consultations_patient 
    ON public.successive_consultations(patient_id);

CREATE INDEX idx_successive_consultations_doctor 
    ON public.successive_consultations(doctor_id);

CREATE INDEX idx_successive_consultations_organization 
    ON public.successive_consultations(organization_id);

CREATE INDEX idx_successive_consultations_date 
    ON public.successive_consultations(consultation_date);

-- ============================================================================
-- STEP 4: Enable Row Level Security (RLS)
-- ============================================================================
ALTER TABLE public.successive_consultations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: Create RLS Policies
-- ============================================================================

DO $$
DECLARE
    v_table_name TEXT := 'public.successive_consultations';
    v_policy_logic TEXT := 'EXISTS (SELECT 1 FROM public."user" u WHERE (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text) AND (successive_consultations."organization_id" = u."organizationId" OR successive_consultations."doctor_id" = u.id))';
BEGIN
    EXECUTE format('CREATE POLICY "Doctors can view successive consultations in their organization" ON %s FOR SELECT USING ( %s )', v_table_name, v_policy_logic);
    EXECUTE format('CREATE POLICY "Doctors can create successive consultations" ON %s FOR INSERT WITH CHECK ( %s )', v_table_name, v_policy_logic);
    EXECUTE format('CREATE POLICY "Doctors can update their successive consultations" ON %s FOR UPDATE USING ( %s ) WITH CHECK ( %s )', v_table_name, v_policy_logic, v_policy_logic);
    EXECUTE format('CREATE POLICY "Doctors can delete their successive consultations" ON %s FOR DELETE USING ( %s )', v_table_name, v_policy_logic);
END $$;

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Table successive_consultations created successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '- Stores lab results, images, X-rays, and documents';
    RAISE NOTICE '- Links to original consultation that requested labs';
    RAISE NOTICE '- RLS policies enabled for security';
    RAISE NOTICE '========================================';
END $$;

