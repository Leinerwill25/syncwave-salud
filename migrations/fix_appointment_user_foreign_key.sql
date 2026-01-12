-- Fix foreign key constraint that references "User" with uppercase
-- This migration fixes the foreign key constraint on appointment.doctor_id
-- that might be referencing "User" instead of "user"

-- First, drop the existing constraint if it exists with wrong name
DO $$
BEGIN
    -- Try to drop constraint if it references "User" (uppercase)
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_appointment_doctor' 
        AND table_name = 'appointment'
        AND table_schema = 'public'
    ) THEN
        -- Check if the constraint references the wrong table
        -- We'll drop and recreate it to ensure it references "user" (lowercase)
        ALTER TABLE public.appointment DROP CONSTRAINT IF EXISTS fk_appointment_doctor;
    END IF;
END $$;

-- Recreate the constraint with correct reference to "user" (lowercase)
ALTER TABLE public.appointment 
ADD CONSTRAINT fk_appointment_doctor 
FOREIGN KEY (doctor_id) 
REFERENCES public.user(id) 
ON DELETE SET NULL;

-- Verify the constraint was created correctly
DO $$
DECLARE
    ref_table_name TEXT;
BEGIN
    SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
    INTO ref_table_name
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
        RAISE NOTICE 'Constraint fk_appointment_doctor not found';
    ELSE
        RAISE NOTICE 'Constraint fk_appointment_doctor references: %', ref_table_name;
    END IF;
END $$;

