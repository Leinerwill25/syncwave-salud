-- ============================================================================
-- MIGRATION: Fix all references from "user" (singular) to "users" (plural)
-- ============================================================================
-- This script updates Foreign Keys, Functions, Triggers, and RLS Policies
-- to correctly reference the "users" table.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. FOREIGN KEYS
-- ============================================================================

-- Fix appointment.doctor_id
DO $$
BEGIN
    -- Drop old constraints if they exist
    ALTER TABLE public.appointment DROP CONSTRAINT IF EXISTS fk_appointment_doctor;
    
    -- Add constraint referencing users
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_appointment_doctor' AND table_name = 'appointment'
    ) THEN
        ALTER TABLE public.appointment 
        ADD CONSTRAINT fk_appointment_doctor 
        FOREIGN KEY (doctor_id) 
        REFERENCES public.users(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Fix consultation.doctor_id
DO $$
BEGIN
    ALTER TABLE public.consultation DROP CONSTRAINT IF EXISTS fk_consultation_doctor;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_consultation_doctor') THEN
        ALTER TABLE public.consultation 
        ADD CONSTRAINT fk_consultation_doctor 
        FOREIGN KEY (doctor_id) 
        REFERENCES public.users(id);
    END IF;
END $$;

-- Fix other typical FKs (add more if needed based on Database.sql)
-- prescription.doctor_id
-- lab_result_upload.doctor_id, approved_by, rejected_by
-- medic_profile.doctor_id

DO $$
BEGIN
    -- prescription
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prescription') THEN
         ALTER TABLE public.prescription DROP CONSTRAINT IF EXISTS fk_prescription_doctor;
         ALTER TABLE public.prescription ADD CONSTRAINT fk_prescription_doctor FOREIGN KEY (doctor_id) REFERENCES public.users(id);
    END IF;
END $$;

-- ============================================================================
-- 2. FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function: handle_appointment_confirmed
-- Dropping old versions
DROP FUNCTION IF EXISTS public.handle_appointment_confirmed() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_appointment_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    -- Validate doctor_id exists in users table
    IF NEW.doctor_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = NEW.doctor_id) THEN
            RAISE EXCEPTION 'Doctor with id % does not exist in users table', NEW.doctor_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$func$;

-- Recreate trigger on appointment
DROP TRIGGER IF EXISTS trigger_appointment_confirmed ON public.appointment;
CREATE TRIGGER trigger_appointment_confirmed
    BEFORE UPDATE ON public.appointment
    FOR EACH ROW
    WHEN (NEW.status IN ('CONFIRMADA', 'CONFIRMED') AND (OLD.status IS NULL OR OLD.status NOT IN ('CONFIRMADA', 'CONFIRMED')))
    EXECUTE FUNCTION public.handle_appointment_confirmed();

-- Function: fn_notify_user_insert
-- Used for real-time notifications when users are created
DROP FUNCTION IF EXISTS public.fn_notify_user_insert() CASCADE;

CREATE OR REPLACE FUNCTION public.fn_notify_user_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $func$
declare
  n_title text;
  n_message text;
  n_type text;
  payload jsonb;
begin
  if NEW."organizationId" is null then
    return NEW;
  end if;

  payload := jsonb_build_object(
    'id', NEW.id,
    'email', NEW.email,
    'name', NEW.name,
    'role', NEW.role,
    'organizationId', NEW."organizationId",
    'createdAt', NEW."createdAt"
  );

  if NEW.role = 'MEDICO' then
    n_type := 'USER_REGISTERED';
    n_title := 'Médico registrado';
    n_message := coalesce(NEW.name, NEW.email, 'Un médico') || ' se ha registrado en la clínica.';
  elsif NEW.role = 'PACIENTE' then
    n_type := 'USER_REGISTERED';
    n_title := 'Paciente registrado';
    n_message := coalesce(NEW.name, NEW.email, 'Un paciente') || ' se ha registrado y está asociado a la clínica.';
  else
    n_type := 'USER_REGISTERED';
    n_title := 'Usuario registrado';
    n_message := coalesce(NEW.name, NEW.email, 'Un usuario') || ' se ha registrado y está asociado a la clínica.';
  end if;

  insert into public.notification("organizationId", type, title, message, payload)
  values (NEW."organizationId", n_type, n_title, n_message, payload);

  return NEW;
end;
$func$;

-- Trigger for fn_notify_user_insert on USERS table
-- We check if 'users' table exists to avoid error if this runs before rename (though rename implies it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        DROP TRIGGER IF EXISTS trigger_notify_user_insert ON public.users;
        CREATE TRIGGER trigger_notify_user_insert
            AFTER INSERT ON public.users
            FOR EACH ROW
            EXECUTE FUNCTION public.fn_notify_user_insert();
    END IF;
END $$;


-- ============================================================================
-- 3. RLS POLICIES (Updating references from "user" to "users")
-- ============================================================================

-- Helper macro to safely drop policies
-- Note: We can't use macros in SQL script easily, so we repeat logic.

-- 3.1 POLICIES ON public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING ("authId" = auth.uid()::text OR id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING ("authId" = auth.uid()::text OR id::text = auth.uid()::text);

-- 3.2 POLICIES ON public.organization
ALTER TABLE public.organization ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own organization" ON public.organization;
CREATE POLICY "Users can view their own organization" ON public.organization
    FOR SELECT USING (
        auth.uid()::text IN (SELECT "authId" FROM public.users WHERE "organizationId" = organization.id)
        OR
        auth.uid() IN (SELECT id FROM public.users WHERE "organizationId" = organization.id)
    );

-- 3.3 POLICIES ON public.appointment
ALTER TABLE public.appointment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Medics can view appointments in their organization" ON public.appointment;
CREATE POLICY "Medics can view appointments in their organization" ON public.appointment
    FOR SELECT USING (
        "organization_id" IN (SELECT "organizationId" FROM public.users WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text)
        OR
        "doctor_id" IN (SELECT id FROM public.users WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text)
    );

DROP POLICY IF EXISTS "Patients can view their appointments" ON public.appointment;
CREATE POLICY "Patients can view their appointments" ON public.appointment
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u."patientProfileId" = appointment."patient_id"
            AND (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)
        )
    );

-- 3.4 POLICIES ON public.patient
ALTER TABLE public.patient ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Medics can view patients in their organization" ON public.patient;
CREATE POLICY "Medics can view patients in their organization" ON public.patient
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE (u.id::text = auth.uid()::text OR u."authId" = auth.uid()::text)
            AND u."organizationId" IS NOT NULL
            AND u."organizationId" IN (
                SELECT "organizationId" FROM public.users WHERE "patientProfileId" = patient.id
            )
        )
        OR
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE (u.id::text = auth.uid()::text OR u."authId" = auth.uid()::text)
            AND u."organizationId" IS NOT NULL
            AND patient.id IN (
                SELECT "patientProfileId" FROM public.users WHERE "organizationId" = u."organizationId"
            )
        )
    );

-- 3.5 POLICIES ON public.notification
ALTER TABLE public.notification ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their notifications" ON public.notification;
CREATE POLICY "Users can view their notifications" ON public.notification
    FOR SELECT USING (
        "organizationId" IN (SELECT "organizationId" FROM public.users WHERE "authId" = auth.uid()::text)
    );

COMMIT;
