-- Fix RLS policies for appointment table that might reference "User" with uppercase
-- This migration ensures all RLS policies use "user" (lowercase) correctly

-- ============================================================================
-- First, let's check and fix any policies that might be using "User" incorrectly
-- ============================================================================

-- Drop existing policies that might have incorrect references
DROP POLICY IF EXISTS "Medics can manage appointments" ON public.appointment;
DROP POLICY IF EXISTS "Medics can view appointments in their organization" ON public.appointment;
DROP POLICY IF EXISTS "Patients can view their appointments" ON public.appointment;
DROP POLICY IF EXISTS "Users can view appointments" ON public.appointment;
DROP POLICY IF EXISTS "Users can view appointments in their organization" ON public.appointment;
DROP POLICY IF EXISTS "Medics can manage appointments in their organization" ON public.appointment;

-- ============================================================================
-- Recreate policies with correct "user" (lowercase) references
-- ============================================================================

-- Policy 1: Pacientes pueden ver sus propias citas
CREATE POLICY "Patients can view their appointments"
    ON public.appointment
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public."user" u
            WHERE u."patientProfileId" = appointment."patient_id"
            AND (
                u."authId" = auth.uid()::text 
                OR u.id::text = auth.uid()::text
            )
            AND u.role = 'PACIENTE'
        )
    );

-- Policy 2: Médicos y personal pueden ver citas de su organización
CREATE POLICY "Medics can view appointments in their organization"
    ON public.appointment
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

-- Policy 3: Médicos pueden gestionar citas (SELECT, INSERT, UPDATE, DELETE)
-- Esta es la política crítica que se ejecuta durante UPDATE
CREATE POLICY "Medics can manage appointments"
    ON public.appointment
    FOR ALL
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
    )
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

-- ============================================================================
-- Verify the policies were created correctly
-- ============================================================================
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'appointment';
    
    RAISE NOTICE 'Total policies on appointment table: %', policy_count;
END $$;

