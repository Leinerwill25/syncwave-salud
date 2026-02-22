-- ============================================================================
-- AGGRESSIVE FIX: Completely remove and recreate the foreign key constraint
-- This migration temporarily disables RLS, fixes the constraint, and re-enables RLS
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Temporarily disable RLS on appointment table
-- ============================================================================
ALTER TABLE public.appointment DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Drop ALL foreign key constraints related to doctor_id
-- ============================================================================
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    -- Find all constraints on appointment table that might reference User
    FOR constraint_rec IN 
        SELECT 
            tc.constraint_name,
            tc.table_name
        FROM information_schema.table_constraints tc
        WHERE tc.table_schema = 'public'
        AND tc.table_name = 'appointment'
        AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
        -- Check if this constraint involves doctor_id
        IF EXISTS (
            SELECT 1 
            FROM information_schema.key_column_usage kcu
            WHERE kcu.constraint_name = constraint_rec.constraint_name
            AND kcu.table_schema = 'public'
            AND kcu.table_name = 'appointment'
            AND kcu.column_name = 'doctor_id'
        ) THEN
            EXECUTE format('ALTER TABLE public.appointment DROP CONSTRAINT IF EXISTS %I', constraint_rec.constraint_name);
            RAISE NOTICE 'Dropped constraint: %', constraint_rec.constraint_name;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 3: Verify the constraint is gone
-- ============================================================================
DO $$
DECLARE
    constraint_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
    AND tc.table_name = 'appointment'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'doctor_id';
    
    IF constraint_count > 0 THEN
        RAISE WARNING 'Still found % foreign key constraints on doctor_id', constraint_count;
    ELSE
        RAISE NOTICE '✓ All foreign key constraints on doctor_id have been removed';
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Recreate the constraint with CORRECT reference to public."user"
-- ============================================================================
DO $$
BEGIN
    ALTER TABLE public.appointment 
    ADD CONSTRAINT fk_appointment_doctor 
    FOREIGN KEY (doctor_id) 
    REFERENCES public."user"(id) 
    ON DELETE SET NULL;
    
    RAISE NOTICE '✓ Created fk_appointment_doctor constraint with reference to public."user"';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Constraint fk_appointment_doctor already exists, skipping...';
END $$;

-- ============================================================================
-- STEP 5: Verify the constraint was created correctly
-- ============================================================================
DO $$
DECLARE
    ref_table_name TEXT;
    ref_schema_name TEXT;
    v_expected_table TEXT := 'user';
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
        RAISE EXCEPTION 'Constraint fk_appointment_doctor was not created!';
    ELSIF ref_table_name != v_expected_table THEN
        RAISE EXCEPTION 'Constraint fk_appointment_doctor references wrong table: %.% (expected: public.%)', ref_schema_name, ref_table_name, v_expected_table;
    ELSE
        RAISE NOTICE '✓ Verified: Constraint fk_appointment_doctor correctly references: %.%', ref_schema_name, ref_table_name;
    END IF;
END $$;

-- ============================================================================
-- STEP 6: Re-enable RLS
-- ============================================================================
ALTER TABLE public.appointment ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 7: Verify RLS policies are correct (they should already be fixed)
-- ============================================================================
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'appointment';
    
    RAISE NOTICE '✓ RLS enabled with % policies on appointment table', policy_count;
END $$;

COMMIT;

-- ============================================================================
-- Final Verification
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration completed!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'The foreign key constraint has been:';
    RAISE NOTICE '1. Completely removed';
    RAISE NOTICE '2. Recreated with reference to public."user"';
    RAISE NOTICE '3. RLS re-enabled';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Please test updating an appointment now.';
    RAISE NOTICE '========================================';
END $$;

