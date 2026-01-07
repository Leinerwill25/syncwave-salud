-- ============================================================================
-- Script para corregir las políticas RLS de medic_profile
-- ============================================================================
-- Este script corrige el problema donde los médicos no pueden ver sus propios
-- perfiles debido a políticas RLS incorrectas.
-- ============================================================================

-- Eliminar políticas antiguas incorrectas
DROP POLICY IF EXISTS "Users can view medic profiles in their organization" ON public.medic_profile;
DROP POLICY IF EXISTS "Medics can view their own profile" ON public.medic_profile;
DROP POLICY IF EXISTS "Medics can insert their own profile" ON public.medic_profile;
DROP POLICY IF EXISTS "Medics can update their own profile" ON public.medic_profile;

-- medic_profile: Permitir a médicos ver su propio perfil
-- Esta es la política más importante: permite que un médico vea su propio perfil
CREATE POLICY "Medics can view their own profile"
    ON public.medic_profile
    FOR SELECT
    USING (
        "doctor_id" IN (
            SELECT id FROM public."User" WHERE "authId" = auth.uid()::text
        )
    );

-- medic_profile: Permitir acceso a médicos de la misma organización
-- Permite que médicos de la misma organización vean los perfiles de otros médicos
CREATE POLICY "Users can view medic profiles in their organization"
    ON public.medic_profile
    FOR SELECT
    USING (
        "doctor_id" IN (
            SELECT id FROM public."User"
            WHERE "organizationId" IN (
                SELECT "organizationId" FROM public."User" WHERE "authId" = auth.uid()::text
            )
        )
    );

-- medic_profile: Permitir a médicos insertar su propio perfil
CREATE POLICY "Medics can insert their own profile"
    ON public.medic_profile
    FOR INSERT
    WITH CHECK (
        "doctor_id" IN (
            SELECT id FROM public."User" WHERE "authId" = auth.uid()::text
        )
    );

-- medic_profile: Permitir a médicos actualizar su propio perfil
CREATE POLICY "Medics can update their own profile"
    ON public.medic_profile
    FOR UPDATE
    USING (
        "doctor_id" IN (
            SELECT id FROM public."User" WHERE "authId" = auth.uid()::text
        )
    )
    WITH CHECK (
        "doctor_id" IN (
            SELECT id FROM public."User" WHERE "authId" = auth.uid()::text
        )
    );

