-- ============================================================================
-- Fix all references to "User" (uppercase) to "user" (lowercase)
-- This migration fixes foreign keys, RLS policies, and verifies triggers
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Fix Foreign Key Constraints
-- ============================================================================

-- Fix appointment.doctor_id foreign key
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_appointment_doctor' 
        AND table_name = 'appointment'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.appointment DROP CONSTRAINT IF EXISTS fk_appointment_doctor;
        RAISE NOTICE 'Dropped existing fk_appointment_doctor constraint';
    END IF;
    
    -- Recreate with correct reference
    ALTER TABLE public.appointment 
    ADD CONSTRAINT fk_appointment_doctor 
    FOREIGN KEY (doctor_id) 
    REFERENCES public."user"(id) 
    ON DELETE SET NULL;
    
    RAISE NOTICE 'Created fk_appointment_doctor constraint with reference to public."user"';
END $$;

-- ============================================================================
-- STEP 2: Fix RLS Policies for appointment table
-- ============================================================================

DO $$
DECLARE
    v_table_name TEXT := 'public.appointment';
    v_user_ref TEXT := 'public."user"';
    v_auth_check TEXT := '(u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)';
    v_org_doc_check TEXT := '"organization_id" IN (SELECT "organizationId" FROM public."user" WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text) OR "doctor_id" IN (SELECT id FROM public."user" WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text)';
BEGIN
    -- Drop all existing policies
    DROP POLICY IF EXISTS "Medics can manage appointments" ON public.appointment;
    DROP POLICY IF EXISTS "Medics can view appointments in their organization" ON public.appointment;
    DROP POLICY IF EXISTS "Patients can view their appointments" ON public.appointment;
    DROP POLICY IF EXISTS "Users can view appointments" ON public.appointment;
    DROP POLICY IF EXISTS "Users can view appointments in their organization" ON public.appointment;
    DROP POLICY IF EXISTS "Medics can manage appointments in their organization" ON public.appointment;

    -- Policy 1: Pacientes pueden ver sus propias citas
    EXECUTE format('CREATE POLICY "Patients can view their appointments" ON %s FOR SELECT USING ( EXISTS ( SELECT 1 FROM %s u WHERE u."patientProfileId" = appointment."patient_id" AND %s AND u.role = %L ) )', v_table_name, v_user_ref, v_auth_check, 'PACIENTE');

    -- Policy 2: Médicos y personal pueden ver citas de su organización
    EXECUTE format('CREATE POLICY "Medics can view appointments in their organization" ON %s FOR SELECT USING ( %s )', v_table_name, v_org_doc_check);

    -- Policy 3: Médicos pueden gestionar citas
    EXECUTE format('CREATE POLICY "Medics can manage appointments" ON %s FOR ALL USING ( %s ) WITH CHECK ( %s )', v_table_name, v_org_doc_check, v_org_doc_check);
END $$;

-- ============================================================================
-- STEP 3: Verify and fix any triggers that might reference "User"
-- ============================================================================

-- Check for triggers on appointment table
DO $$
DECLARE
    trigger_rec RECORD;
    trigger_def TEXT;
BEGIN
    FOR trigger_rec IN 
        SELECT trigger_name, event_manipulation, event_object_table
        FROM information_schema.triggers
        WHERE event_object_schema = 'public'
        AND event_object_table = 'appointment'
    LOOP
        RAISE NOTICE 'Found trigger: % on appointment table', trigger_rec.trigger_name;
        
        -- Get trigger definition
        SELECT pg_get_triggerdef(oid) INTO trigger_def
        FROM pg_trigger
        WHERE tgname = trigger_rec.trigger_name;
        
        -- Check if it references "User" with uppercase
        IF trigger_def LIKE '%"User"%' OR trigger_def LIKE '%public."User"%' THEN
            RAISE WARNING 'Trigger % might reference "User" with uppercase: %', trigger_rec.trigger_name, trigger_def;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 4: Verify foreign key constraint was created correctly
-- ============================================================================

DO $$
DECLARE
    ref_table_name TEXT;
    ref_schema_name TEXT;
BEGIN
    SELECT 
        ccu.table_schema,
        ccu.table_name
    INTO ref_schema_name, ref_table_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_name = 'fk_appointment_doctor'
    AND tc.table_name = 'appointment'
    AND tc.table_schema = 'public';
    
    IF ref_table_name IS NULL THEN
        RAISE WARNING 'Constraint fk_appointment_doctor not found after creation';
    ELSIF ref_table_name != 'user' THEN
        RAISE WARNING 'Constraint fk_appointment_doctor references wrong table: %.% (expected: public.user)', ref_schema_name, ref_table_name;
    ELSE
        RAISE NOTICE '✓ Constraint fk_appointment_doctor correctly references: %.%', ref_schema_name, ref_table_name;
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Verify table name is correct
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user'
    ) THEN
        RAISE NOTICE '✓ Table public.user exists';
    ELSE
        RAISE EXCEPTION 'Table public.user does not exist!';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'User'
    ) THEN
        RAISE WARNING 'Table public."User" (with uppercase) also exists - this might cause conflicts!';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- Verification Summary
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Please verify:';
    RAISE NOTICE '1. Foreign key fk_appointment_doctor references public."user"';
    RAISE NOTICE '2. RLS policies use public."user" (lowercase with quotes)';
    RAISE NOTICE '3. No triggers reference "User" with uppercase';
    RAISE NOTICE '========================================';
END $$;

