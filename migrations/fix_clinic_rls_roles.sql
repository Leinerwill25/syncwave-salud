-- Script para corregir los roles en las políticas RLS existentes
-- PROBLEMA: Las políticas están usando 'public' en lugar de 'anon' y 'authenticated'
-- SOLUCIÓN: Recrear las políticas con los roles correctos de Supabase

-- ============================================================================
-- 1. Verificar políticas actuales y sus roles
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as "operation",
    roles,
    CASE 
        WHEN 'anon' = ANY(roles::text[]) AND 'authenticated' = ANY(roles::text[]) THEN '✅ Correcto'
        WHEN 'public' = ANY(roles::text[]) THEN '❌ INCORRECTO (debe ser anon + authenticated)'
        ELSE '⚠️ Revisar roles'
    END as "estado"
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('organization', 'clinic_profile', 'user', 'medic_profile')
AND (policyname LIKE '%CONSULTORIO%' OR policyname LIKE '%Public%')
ORDER BY tablename, policyname;

-- ============================================================================
-- 2-5. Corregir políticas con variables
-- ============================================================================
DO $$
DECLARE
    v_roles TEXT[] := ARRAY['anon', 'authenticated'];
    v_org_type TEXT := 'CONSULTORIO';
BEGIN
    -- 2. Organization
    DROP POLICY IF EXISTS "Public can read CONSULTORIO organizations" ON public.organization;
    EXECUTE format('CREATE POLICY "Public can read CONSULTORIO organizations" ON public.organization FOR SELECT TO %s USING (type = %L)', array_to_string(v_roles, ','), v_org_type);

    -- 3. clinic_profile
    DROP POLICY IF EXISTS "Public can read clinic_profile for CONSULTORIO" ON public.clinic_profile;
    EXECUTE format('CREATE POLICY "Public can read clinic_profile for CONSULTORIO" ON public.clinic_profile FOR SELECT TO %s USING ( EXISTS ( SELECT 1 FROM public.organization WHERE organization.id = clinic_profile.organization_id AND organization.type = %L ) )', array_to_string(v_roles, ','), v_org_type);

    -- 4. user
    DROP POLICY IF EXISTS "Public can read MEDICO users from CONSULTORIO" ON public."user";
    EXECUTE format('CREATE POLICY "Public can read MEDICO users from CONSULTORIO" ON public."user" FOR SELECT TO %s USING ( role = %L AND EXISTS ( SELECT 1 FROM public.organization WHERE organization.id = "user"."organizationId" AND organization.type = %L ) )', array_to_string(v_roles, ','), 'MEDICO', v_org_type);

    -- 5. medic_profile
    DROP POLICY IF EXISTS "Public can read medic_profile from CONSULTORIO doctors" ON public.medic_profile;
    EXECUTE format('CREATE POLICY "Public can read medic_profile from CONSULTORIO doctors" ON public.medic_profile FOR SELECT TO %s USING ( EXISTS ( SELECT 1 FROM public."user" INNER JOIN public.organization ON organization.id = "user"."organizationId" WHERE "user".id = medic_profile.doctor_id AND "user".role = %L AND organization.type = %L ) )', array_to_string(v_roles, ','), 'MEDICO', v_org_type);
END $$;

-- ============================================================================
-- 6. Verificar que las políticas ahora tienen los roles correctos
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as "operation",
    roles,
    CASE 
        WHEN 'anon' = ANY(roles::text[]) AND 'authenticated' = ANY(roles::text[]) THEN '✅ Correcto (anon + authenticated)'
        WHEN 'anon' = ANY(roles::text[]) THEN '⚠️ Solo anon (falta authenticated)'
        WHEN 'authenticated' = ANY(roles::text[]) THEN '⚠️ Solo authenticated (falta anon)'
        WHEN 'public' = ANY(roles::text[]) THEN '❌ Todavía usa "public" (incorrecto)'
        ELSE '⚠️ Roles inesperados'
    END as "estado"
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('organization', 'clinic_profile', 'user', 'medic_profile')
AND (policyname LIKE '%CONSULTORIO%' OR policyname LIKE '%Public%')
ORDER BY tablename, policyname;

-- ============================================================================
-- EXPLICACIÓN:
-- ============================================================================
-- En Supabase, los roles válidos para políticas RLS son:
-- - 'anon': usuarios no autenticados (cuando usas NEXT_PUBLIC_SUPABASE_ANON_KEY)
-- - 'authenticated': usuarios autenticados (cuando hay sesión activa)
-- - 'service_role': bypass completo de RLS (cuando usas SUPABASE_SERVICE_ROLE_KEY)
--
-- El rol 'public' NO existe en Supabase para políticas RLS, por eso las
-- políticas no funcionaban correctamente.
--
-- Ahora las políticas usan 'anon, authenticated' que son los roles correctos
-- para permitir acceso público (anon) y autenticado (authenticated) a los datos.

