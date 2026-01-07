-- ============================================================================
-- Script para actualizar TODAS las referencias a tablas antiguas en políticas RLS
-- ============================================================================
-- Este script actualiza las referencias dentro de las políticas RLS que usan
-- los nombres antiguos de tablas (public."User", public."Patient", etc.)
-- ============================================================================
-- IMPORTANTE: 
-- 1. Ejecuta este script DESPUÉS de fix_rls_policies_after_rename.sql
-- 2. Este script actualiza las referencias DENTRO de las políticas existentes
-- 3. Si una política no existe, este script la creará con los nombres correctos
-- ============================================================================

BEGIN;

-- ============================================================================
-- FUNCIÓN AUXILIAR: Actualizar políticas que referencian tablas antiguas
-- ============================================================================
-- Esta función busca y reemplaza referencias a tablas antiguas en las políticas
-- ============================================================================

DO $$
DECLARE
    policy_record RECORD;
    old_policy_def TEXT;
    new_policy_def TEXT;
BEGIN
    -- Iterar sobre todas las políticas que referencian "User"
    FOR policy_record IN 
        SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
        FROM pg_policies
        WHERE schemaname = 'public'
        AND (
            qual LIKE '%public."User"%' 
            OR qual LIKE '%"User"%'
            OR with_check LIKE '%public."User"%'
            OR with_check LIKE '%"User"%'
        )
    LOOP
        -- Reemplazar referencias a "User" con "user"
        old_policy_def := COALESCE(policy_record.qual, '') || ' ' || COALESCE(policy_record.with_check, '');
        new_policy_def := old_policy_def;
        
        -- Reemplazar public."User" con public."user"
        new_policy_def := REPLACE(new_policy_def, 'public."User"', 'public."user"');
        new_policy_def := REPLACE(new_policy_def, '"User"', '"user"');
        
        -- Si hay cambios, eliminar y recrear la política
        IF new_policy_def != old_policy_def THEN
            RAISE NOTICE 'Actualizando política: % en tabla %', policy_record.policyname, policy_record.tablename;
            -- Nota: No podemos actualizar políticas directamente, necesitamos recrearlas
            -- Esto se hace mejor manualmente o con un script más específico
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- ACTUALIZAR POLÍTICAS ESPECÍFICAS MANUALMENTE
-- ============================================================================
-- Debido a las limitaciones de PostgreSQL, actualizamos las políticas más
-- críticas manualmente. Las demás se pueden actualizar ejecutando
-- enable_rls_all_tables.sql después de renombrar las tablas.
-- ============================================================================

-- ============================================================================
-- ACTUALIZAR POLÍTICAS DE ORGANIZATION
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own organization" ON public.organization;
CREATE POLICY "Users can view their own organization"
    ON public.organization
    FOR SELECT
    USING (
        auth.uid()::text IN (
            SELECT "authId" FROM public."user" WHERE "organizationId" = organization.id
        )
        OR
        auth.uid() IN (
            SELECT id FROM public."user" WHERE "organizationId" = organization.id
        )
    );

-- ============================================================================
-- ACTUALIZAR POLÍTICAS DE PATIENT
-- ============================================================================

DROP POLICY IF EXISTS "Medics can view patients in their organization" ON public.patient;
CREATE POLICY "Medics can view patients in their organization"
    ON public.patient
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public."user" u
            WHERE (u.id::text = auth.uid()::text OR u."authId" = auth.uid()::text)
            AND u.role = 'MEDICO'
            AND u."organizationId" IN (
                SELECT "organizationId" FROM public."user"
                WHERE id IN (
                    SELECT "doctor_id" FROM public.appointment WHERE "patient_id" = patient.id
                    UNION
                    SELECT "doctor_id" FROM public.consultation WHERE "patient_id" = patient.id
                )
            )
        )
        OR
        -- Pacientes pueden ver su propio perfil
        id IN (
            SELECT "patientProfileId" FROM public."user" WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- ============================================================================
-- ACTUALIZAR POLÍTICAS DE APPOINTMENT
-- ============================================================================

DROP POLICY IF EXISTS "Users can view appointments in their organization" ON public.appointment;
CREATE POLICY "Users can view appointments in their organization"
    ON public.appointment
    FOR SELECT
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."user" WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "doctor_id"::text = auth.uid()::text
    );

-- ============================================================================
-- ACTUALIZAR POLÍTICAS DE CONSULTATION
-- ============================================================================

DROP POLICY IF EXISTS "Users can view consultations in their organization" ON public.consultation;
CREATE POLICY "Users can view consultations in their organization"
    ON public.consultation
    FOR SELECT
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."user" WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "doctor_id"::text = auth.uid()::text
    );

-- ============================================================================
-- ACTUALIZAR POLÍTICAS DE MEDIC_PROFILE
-- ============================================================================

DROP POLICY IF EXISTS "Medics can view their own profile" ON public.medic_profile;
CREATE POLICY "Medics can view their own profile"
    ON public.medic_profile
    FOR SELECT
    USING (
        "doctor_id" IN (
            SELECT id FROM public."user" WHERE "authId" = auth.uid()::text
        )
    );

-- ============================================================================
-- NOTA IMPORTANTE:
-- ============================================================================
-- Este script actualiza las políticas más críticas. Para actualizar TODAS
-- las políticas, necesitarás:
-- 1. Ejecutar este script primero
-- 2. Luego ejecutar enable_rls_all_tables.sql DESPUÉS de renombrar las tablas
--    (pero necesitarás actualizar manualmente las referencias a "User" dentro
--     de ese archivo antes de ejecutarlo)
-- ============================================================================

-- ============================================================================
-- IMPORTANTE: Revisa los resultados antes de hacer COMMIT
-- ============================================================================
-- Si todo está bien, descomenta la siguiente línea para hacer commit:
-- COMMIT;

-- Si hay problemas, ejecuta ROLLBACK para revertir todos los cambios:
-- ROLLBACK;

