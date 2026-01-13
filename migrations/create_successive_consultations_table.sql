-- ============================================================================
-- Create table for Successive Consultations (Consultas Sucesivas)
-- This table stores follow-up consultations where patients return with lab results
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create the successive_consultations table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.successive_consultations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    
    -- Relación con la consulta original que solicitó los laboratorios
    original_consultation_id uuid NOT NULL,
    
    -- Relación con el paciente
    patient_id uuid NOT NULL,
    
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
-- STEP 2: Create indexes for better query performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_successive_consultations_original_consultation 
    ON public.successive_consultations(original_consultation_id);

CREATE INDEX IF NOT EXISTS idx_successive_consultations_patient 
    ON public.successive_consultations(patient_id);

CREATE INDEX IF NOT EXISTS idx_successive_consultations_doctor 
    ON public.successive_consultations(doctor_id);

CREATE INDEX IF NOT EXISTS idx_successive_consultations_organization 
    ON public.successive_consultations(organization_id);

CREATE INDEX IF NOT EXISTS idx_successive_consultations_date 
    ON public.successive_consultations(consultation_date);

-- ============================================================================
-- STEP 3: Enable Row Level Security (RLS)
-- ============================================================================
ALTER TABLE public.successive_consultations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Create RLS Policies
-- ============================================================================

-- Policy: Doctors can view successive consultations in their organization
CREATE POLICY "Doctors can view successive consultations in their organization"
    ON public.successive_consultations
    FOR SELECT
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "doctor_id" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- Policy: Doctors can create successive consultations in their organization
CREATE POLICY "Doctors can create successive consultations"
    ON public.successive_consultations
    FOR INSERT
    WITH CHECK (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "doctor_id" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- Policy: Doctors can update their own successive consultations
CREATE POLICY "Doctors can update their successive consultations"
    ON public.successive_consultations
    FOR UPDATE
    USING (
        "doctor_id" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    )
    WITH CHECK (
        "doctor_id" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- Policy: Doctors can delete their own successive consultations
CREATE POLICY "Doctors can delete their successive consultations"
    ON public.successive_consultations
    FOR DELETE
    USING (
        "doctor_id" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

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

