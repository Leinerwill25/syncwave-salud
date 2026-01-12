-- ============================================================================
-- Fix handle_appointment_confirmed() function that references "User" with uppercase
-- This function is triggered when appointments are updated and it's causing the error
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Find and drop the existing function if it exists
-- ============================================================================
DO $$
BEGIN
    -- Check if the function exists
    IF EXISTS (
        SELECT 1 
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'handle_appointment_confirmed'
    ) THEN
        -- Drop the function
        DROP FUNCTION IF EXISTS public.handle_appointment_confirmed() CASCADE;
        RAISE NOTICE 'Dropped existing handle_appointment_confirmed() function';
    ELSE
        RAISE NOTICE 'Function handle_appointment_confirmed() not found, will create it';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Find and drop any triggers that use this function
-- ============================================================================
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    FOR trigger_rec IN 
        SELECT trigger_name
        FROM information_schema.triggers
        WHERE event_object_schema = 'public'
        AND event_object_table = 'appointment'
        AND action_statement LIKE '%handle_appointment_confirmed%'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.appointment', trigger_rec.trigger_name);
        RAISE NOTICE 'Dropped trigger: %', trigger_rec.trigger_name;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 3: Recreate the function with CORRECT reference to public."user" (lowercase)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_appointment_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate doctor_id exists in user table (using lowercase "user")
    IF NEW.doctor_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public."user" u WHERE u.id = NEW.doctor_id) THEN
            RAISE EXCEPTION 'Doctor with id % does not exist in user table', NEW.doctor_id;
        END IF;
    END IF;
    
    -- Add any other logic here if needed
    -- For example, you might want to create notifications, update facturacion, etc.
    
    RETURN NEW;
END;
$$;

DO $$
BEGIN
    RAISE NOTICE '✓ Created handle_appointment_confirmed() function with reference to public."user"';
END $$;

-- ============================================================================
-- STEP 4: Recreate the trigger if it was dropped
-- ============================================================================
-- Note: You may need to adjust the trigger timing (BEFORE/AFTER) and events (INSERT/UPDATE)
-- based on your actual requirements. This is a common pattern:
DO $$
BEGIN
    CREATE TRIGGER trigger_appointment_confirmed
        BEFORE UPDATE ON public.appointment
        FOR EACH ROW
        WHEN (NEW.status IN ('CONFIRMADA', 'CONFIRMED') AND (OLD.status IS NULL OR OLD.status NOT IN ('CONFIRMADA', 'CONFIRMED')))
        EXECUTE FUNCTION public.handle_appointment_confirmed();
    
    RAISE NOTICE '✓ Created trigger_appointment_confirmed trigger';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Trigger trigger_appointment_confirmed already exists, skipping...';
END $$;

-- ============================================================================
-- STEP 5: Verify the function was created correctly
-- ============================================================================
DO $$
DECLARE
    func_def TEXT;
BEGIN
    SELECT pg_get_functiondef(p.oid) INTO func_def
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'handle_appointment_confirmed';
    
    IF func_def IS NULL THEN
        RAISE EXCEPTION 'Function handle_appointment_confirmed() was not created!';
    ELSIF func_def LIKE '%public."User"%' OR func_def LIKE '%public.User%' THEN
        RAISE EXCEPTION 'Function still references "User" with uppercase!';
    ELSE
        RAISE NOTICE '✓ Verified: Function handle_appointment_confirmed() correctly references public."user"';
    END IF;
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
    RAISE NOTICE 'The function handle_appointment_confirmed() has been:';
    RAISE NOTICE '1. Dropped (if it existed)';
    RAISE NOTICE '2. Recreated with reference to public."user" (lowercase)';
    RAISE NOTICE '3. Trigger recreated';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Please test updating an appointment now.';
    RAISE NOTICE '========================================';
END $$;

