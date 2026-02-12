-- Fix function handle_appointment_confirmed to reference 'users' (plural) instead of 'user' (singular)

CREATE OR REPLACE FUNCTION public.handle_appointment_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate doctor_id exists in users table (using lowercase "users" PLURAL)
    IF NEW.doctor_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = NEW.doctor_id) THEN
            RAISE EXCEPTION 'Doctor with id % does not exist in users table', NEW.doctor_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Also verify if the foreign key is correct, and fix it if necessary
DO $$
BEGIN
    -- Check if fk_appointment_doctor references "user" instead of "users"
    -- If we can't easily check, we just drop and recreate to be safe
    
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_appointment_doctor' 
        AND table_name = 'appointment'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.appointment DROP CONSTRAINT fk_appointment_doctor;
    END IF;
    
    -- Recreate constraint referencing users
    ALTER TABLE public.appointment 
    ADD CONSTRAINT fk_appointment_doctor 
    FOREIGN KEY (doctor_id) 
    REFERENCES public.users(id) 
    ON DELETE SET NULL;
    
    RAISE NOTICE 'Fixed fk_appointment_doctor to reference public.users';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error fixing foreign key (might already be correct or table missing): %', SQLERRM;
END $$;
