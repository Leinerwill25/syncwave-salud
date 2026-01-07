-- ============================================================================
-- Script para actualizar políticas RLS después del renombrado de tablas
-- ============================================================================
-- Este script actualiza todas las políticas RLS para usar los nuevos nombres
-- de tablas en minúsculas (user, patient, organization, etc.)
-- ============================================================================
-- IMPORTANTE: Ejecuta este script DESPUÉS de ejecutar rename_tables_to_lowercase.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ELIMINAR POLÍTICAS EXISTENTES (usando nombres nuevos)
-- ============================================================================
-- Si las tablas ya fueron renombradas, eliminamos políticas en los nombres nuevos
-- Si no, PostgreSQL ignorará estos DROP IF EXISTS

-- User (tabla "user")
DROP POLICY IF EXISTS "Users can view their own profile" ON public."user";
DROP POLICY IF EXISTS "Users can update their own profile" ON public."user";
DROP POLICY IF EXISTS "Users can view users in their organization" ON public."user";

-- Organization (tabla organization)
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organization;

-- Patient (tabla patient)
DROP POLICY IF EXISTS "Medics can view patients in their organization" ON public.patient;

-- Notification (tabla notification)
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notification;
DROP POLICY IF EXISTS "Users can manage their notifications" ON public.notification;

-- Invite (tabla invite)
DROP POLICY IF EXISTS "Users can view invites in their organization" ON public.invite;

-- FamilyGroup (tabla familygroup)
DROP POLICY IF EXISTS "Users can view their family groups" ON public.familygroup;

-- MedicalRecord (tabla medicalrecord)
DROP POLICY IF EXISTS "Users can view medical records in their organization" ON public.medicalrecord;

-- Plan (tabla plan)
DROP POLICY IF EXISTS "Authenticated users can view plans" ON public.plan;

-- Subscription (tabla subscription)
DROP POLICY IF EXISTS "Users can view subscriptions in their organization" ON public.subscription;

-- ============================================================================
-- 2. CREAR NUEVAS POLÍTICAS CON NOMBRES CORRECTOS
-- ============================================================================

-- ============================================================================
-- POLÍTICAS PARA TABLA user (antes "User")
-- ============================================================================

-- User: Permitir a usuarios ver su propio perfil (CRÍTICO para login)
CREATE POLICY "Users can view their own profile"
    ON public."user"
    FOR SELECT
    USING (
        -- Comparación principal: authId (TEXT) con auth.uid() (UUID convertido a TEXT)
        "authId" = auth.uid()::text
        OR
        -- Fallback: si el id de user coincide con auth.uid() (por si acaso)
        id::text = auth.uid()::text
    );

-- User: Permitir a usuarios actualizar su propio perfil
CREATE POLICY "Users can update their own profile"
    ON public."user"
    FOR UPDATE
    USING (
        "authId" = auth.uid()::text
        OR
        id::text = auth.uid()::text
    )
    WITH CHECK (
        "authId" = auth.uid()::text
        OR
        id::text = auth.uid()::text
    );

-- ============================================================================
-- POLÍTICAS PARA TABLA organization (antes "Organization")
-- ============================================================================

-- Organization: Permitir lectura a usuarios autenticados de la misma organización
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
-- POLÍTICAS PARA TABLA patient (antes "Patient")
-- ============================================================================

-- Patient: Permitir a médicos ver pacientes de su organización
CREATE POLICY "Medics can view patients in their organization"
    ON public.patient
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public."user" u
            WHERE (u.id::text = auth.uid()::text OR u."authId" = auth.uid()::text)
            AND u."organizationId" IS NOT NULL
            AND u."organizationId" IN (
                SELECT "organizationId" FROM public."user" WHERE "patientProfileId" = patient.id
            )
        )
        OR
        EXISTS (
            SELECT 1 FROM public."user" u
            WHERE (u.id::text = auth.uid()::text OR u."authId" = auth.uid()::text)
            AND u."organizationId" IS NOT NULL
            AND patient.id IN (
                SELECT "patientProfileId" FROM public."user" WHERE "organizationId" = u."organizationId"
            )
        )
    );

-- ============================================================================
-- POLÍTICAS PARA TABLA notification (antes "Notification")
-- ============================================================================

-- Notification: Permitir a usuarios ver sus notificaciones
CREATE POLICY "Users can view their notifications"
    ON public.notification
    FOR SELECT
    USING (
        "organizationId" IN (
            SELECT "organizationId" FROM public."user" WHERE "authId" = auth.uid()::text
        )
    );

-- Notification: Permitir a usuarios marcar sus notificaciones como leídas
CREATE POLICY "Users can manage their notifications"
    ON public.notification
    FOR UPDATE
    USING (
        "organizationId" IN (
            SELECT "organizationId" FROM public."user" WHERE "authId" = auth.uid()::text
        )
    )
    WITH CHECK (
        "organizationId" IN (
            SELECT "organizationId" FROM public."user" WHERE "authId" = auth.uid()::text
        )
    );

-- ============================================================================
-- POLÍTICAS PARA TABLA invite (antes "Invite")
-- ============================================================================

-- Invite: Permitir a usuarios ver invitaciones de su organización
CREATE POLICY "Users can view invites in their organization"
    ON public.invite
    FOR SELECT
    USING (
        "organizationId" IN (
            SELECT "organizationId" FROM public."user" WHERE "authId" = auth.uid()::text
        )
    );

-- ============================================================================
-- POLÍTICAS PARA TABLA familygroup (antes "FamilyGroup")
-- ============================================================================

-- FamilyGroup: Permitir a usuarios ver sus grupos familiares
CREATE POLICY "Users can view their family groups"
    ON public.familygroup
    FOR SELECT
    USING (
        "ownerId" IN (
            SELECT "patientProfileId" FROM public."user" WHERE "authId" = auth.uid()::text
        )
    );

-- ============================================================================
-- POLÍTICAS PARA TABLA medicalrecord (antes "MedicalRecord")
-- ============================================================================

-- MedicalRecord: Permitir a usuarios ver registros médicos de su organización
CREATE POLICY "Users can view medical records in their organization"
    ON public.medicalrecord
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public."user" u
            WHERE (u.id::text = auth.uid()::text OR u."authId" = auth.uid()::text)
            AND u."organizationId" IS NOT NULL
            AND medicalrecord."patientId" IN (
                SELECT "patientProfileId" FROM public."user" WHERE "organizationId" = u."organizationId"
            )
        )
    );

-- ============================================================================
-- POLÍTICAS PARA TABLA plan (antes "Plan")
-- ============================================================================

-- Plan: Permitir a usuarios autenticados ver planes
CREATE POLICY "Authenticated users can view plans"
    ON public.plan
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- POLÍTICAS PARA TABLA subscription (antes "Subscription")
-- ============================================================================

-- Subscription: Permitir a usuarios ver suscripciones de su organización
CREATE POLICY "Users can view subscriptions in their organization"
    ON public.subscription
    FOR SELECT
    USING (
        "organizationId" IN (
            SELECT "organizationId" FROM public."user" WHERE "authId" = auth.uid()::text
        )
    );

-- ============================================================================
-- VERIFICAR QUE RLS ESTÁ HABILITADO EN LAS TABLAS RENOMBRADAS
-- ============================================================================

ALTER TABLE IF EXISTS public."user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organization ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.patient ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invite ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.familygroup ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.medicalrecord ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscription ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- IMPORTANTE: Revisa los resultados antes de hacer COMMIT
-- ============================================================================
-- Si todo está bien, descomenta la siguiente línea para hacer commit:
-- COMMIT;

-- Si hay problemas, ejecuta ROLLBACK para revertir todos los cambios:
-- ROLLBACK;

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. Este script actualiza las políticas RLS más críticas para el login
-- 2. Puede haber más políticas en enable_rls_all_tables.sql que también
--    necesiten actualización. Revisa ese archivo y actualiza según sea necesario.
-- 3. Después de ejecutar, verifica que el login funcione correctamente
-- ============================================================================

