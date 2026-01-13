-- ============================================================================
-- Add unregistered_patient_id column to successive_consultations table
-- This migration adds support for unregistered patients in successive consultations
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Make patient_id nullable (if not already)
-- ============================================================================
ALTER TABLE public.successive_consultations 
ALTER COLUMN patient_id DROP NOT NULL;

-- ============================================================================
-- STEP 2: Add unregistered_patient_id column
-- ============================================================================
ALTER TABLE public.successive_consultations 
ADD COLUMN IF NOT EXISTS unregistered_patient_id uuid;

-- ============================================================================
-- STEP 3: Add foreign key constraint for unregistered_patient_id
-- ============================================================================
DO $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'fk_successive_consultation_unregistered_patient'
    ) THEN
        ALTER TABLE public.successive_consultations
        ADD CONSTRAINT fk_successive_consultation_unregistered_patient 
        FOREIGN KEY (unregistered_patient_id) 
        REFERENCES public.unregisteredpatients(id) 
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Foreign key constraint fk_successive_consultation_unregistered_patient created';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_successive_consultation_unregistered_patient already exists';
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Add check constraint to ensure at least one patient_id is provided
-- ============================================================================
DO $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'check_successive_consultation_has_patient'
    ) THEN
        ALTER TABLE public.successive_consultations
        ADD CONSTRAINT check_successive_consultation_has_patient 
        CHECK (patient_id IS NOT NULL OR unregistered_patient_id IS NOT NULL);
        
        RAISE NOTICE 'Check constraint check_successive_consultation_has_patient created';
    ELSE
        RAISE NOTICE 'Check constraint check_successive_consultation_has_patient already exists';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Changes applied:';
    RAISE NOTICE '- patient_id is now nullable';
    RAISE NOTICE '- unregistered_patient_id column added';
    RAISE NOTICE '- Foreign key constraint added';
    RAISE NOTICE '- Check constraint ensures at least one patient_id exists';
    RAISE NOTICE '========================================';
END $$;

