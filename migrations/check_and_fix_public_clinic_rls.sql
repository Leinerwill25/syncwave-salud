-- Script para verificar y crear políticas RLS para acceso público a consultorios
-- Este script permite que usuarios no autenticados puedan leer datos de organization y clinic_profile
-- específicamente para consultorios (type = 'CONSULTORIO')

-- ============================================================================
-- 1. Verificar si RLS está habilitado en las tablas
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename IN ('organization', 'clinic_profile', 'user', 'medic_profile')
ORDER BY tablename;

-- ============================================================================
-- 2. Verificar políticas existentes para organization
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as "operation",
    qual as "using_expression",
    with_check as "with_check_expression"
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'organization'
ORDER BY policyname;

-- ============================================================================
-- 3. Verificar políticas existentes para clinic_profile
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as "operation",
    qual as "using_expression",
    with_check as "with_check_expression"
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'clinic_profile'
ORDER BY policyname;

-- ============================================================================
-- 4. Habilitar RLS en las tablas (si no está habilitado)
-- ============================================================================
ALTER TABLE public.organization ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_profile ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. Crear políticas públicas para lectura de organization (solo CONSULTORIO)
-- ============================================================================
-- Política para usuarios anónimos y autenticados (anon y authenticated roles)
DROP POLICY IF EXISTS "Public can read CONSULTORIO organizations" ON public.organization;
CREATE POLICY "Public can read CONSULTORIO organizations"
ON public.organization
FOR SELECT
TO anon, authenticated
USING (type = 'CONSULTORIO');

-- Política alternativa usando service_role (bypass completo)
-- Nota: service_role no necesita políticas, tiene acceso completo

-- ============================================================================
-- 6. Crear políticas públicas para lectura de clinic_profile (solo para CONSULTORIO)
-- ============================================================================
-- Política para usuarios anónimos y autenticados: solo clinic_profile de organizaciones CONSULTORIO
DROP POLICY IF EXISTS "Public can read clinic_profile for CONSULTORIO" ON public.clinic_profile;
CREATE POLICY "Public can read clinic_profile for CONSULTORIO"
ON public.clinic_profile
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.organization
        WHERE organization.id = clinic_profile.organization_id
        AND organization.type = 'CONSULTORIO'
    )
);

-- ============================================================================
-- 7. Verificar políticas para user (médicos)
-- ============================================================================
-- Política para leer usuarios con role MEDICO de organizaciones CONSULTORIO
DROP POLICY IF EXISTS "Public can read MEDICO users from CONSULTORIO" ON public."user";
CREATE POLICY "Public can read MEDICO users from CONSULTORIO"
ON public."user"
FOR SELECT
TO anon, authenticated
USING (
    role = 'MEDICO'
    AND EXISTS (
        SELECT 1 FROM public.organization
        WHERE organization.id = "user"."organizationId"
        AND organization.type = 'CONSULTORIO'
    )
);

-- ============================================================================
-- 8. Verificar políticas para medic_profile
-- ============================================================================
-- Política para leer medic_profile de médicos de CONSULTORIO
DROP POLICY IF EXISTS "Public can read medic_profile from CONSULTORIO doctors" ON public.medic_profile;
CREATE POLICY "Public can read medic_profile from CONSULTORIO doctors"
ON public.medic_profile
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM public."user"
        INNER JOIN public.organization ON organization.id = "user"."organizationId"
        WHERE "user".id = medic_profile.doctor_id
        AND "user".role = 'MEDICO'
        AND organization.type = 'CONSULTORIO'
    )
);

-- ============================================================================
-- 9. Verificar las políticas creadas
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as "operation",
    roles,
    qual as "using_expression"
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('organization', 'clinic_profile', 'user', 'medic_profile')
AND policyname LIKE '%CONSULTORIO%' OR policyname LIKE '%Public%'
ORDER BY tablename, policyname;

-- ============================================================================
-- 10. Probar consulta de ejemplo (debe funcionar sin autenticación)
-- ============================================================================
-- Esta consulta debería funcionar con el rol 'anon':
/*
SELECT 
    o.id,
    o.name,
    o.type,
    cp.trade_name,
    cp.contact_email
FROM public.organization o
LEFT JOIN public.clinic_profile cp ON cp.organization_id = o.id
WHERE o.id = 'c500e1c0-9f9a-476b-8dd3-9049b51542bc'
AND o.type = 'CONSULTORIO';
*/

-- ============================================================================
-- CORRECCIÓN DE POLÍTICAS EXISTENTES (SI YA FUERON CREADAS CON ROLES INCORRECTOS)
-- ============================================================================
-- Si las políticas ya existen pero están usando 'public' en lugar de 'anon', 
-- ejecuta estos comandos para corregirlas:

-- 1. Corregir política de organization
DROP POLICY IF EXISTS "Public can read CONSULTORIO organizations" ON public.organization;
CREATE POLICY "Public can read CONSULTORIO organizations"
ON public.organization
FOR SELECT
TO anon, authenticated
USING (type = 'CONSULTORIO');

-- 2. Corregir política de clinic_profile
DROP POLICY IF EXISTS "Public can read clinic_profile for CONSULTORIO" ON public.clinic_profile;
CREATE POLICY "Public can read clinic_profile for CONSULTORIO"
ON public.clinic_profile
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.organization
        WHERE organization.id = clinic_profile.organization_id
        AND organization.type = 'CONSULTORIO'
    )
);

-- 3. Corregir política de user
DROP POLICY IF EXISTS "Public can read MEDICO users from CONSULTORIO" ON public."user";
CREATE POLICY "Public can read MEDICO users from CONSULTORIO"
ON public."user"
FOR SELECT
TO anon, authenticated
USING (
    role = 'MEDICO'
    AND EXISTS (
        SELECT 1 FROM public.organization
        WHERE organization.id = "user"."organizationId"
        AND organization.type = 'CONSULTORIO'
    )
);

-- 4. Corregir política de medic_profile
DROP POLICY IF EXISTS "Public can read medic_profile from CONSULTORIO doctors" ON public.medic_profile;
CREATE POLICY "Public can read medic_profile from CONSULTORIO doctors"
ON public.medic_profile
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM public."user"
        INNER JOIN public.organization ON organization.id = "user"."organizationId"
        WHERE "user".id = medic_profile.doctor_id
        AND "user".role = 'MEDICO'
        AND organization.type = 'CONSULTORIO'
    )
);

-- ============================================================================
-- VERIFICAR ROLES CORRECTOS EN LAS POLÍTICAS
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
        WHEN 'public' = ANY(roles::text[]) THEN '❌ Usa "public" (debe ser "anon")'
        ELSE '⚠️ Roles inesperados'
    END as "estado"
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('organization', 'clinic_profile', 'user', 'medic_profile')
AND policyname LIKE '%CONSULTORIO%' OR policyname LIKE '%Public%'
ORDER BY tablename, policyname;

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. ROLES CORRECTOS EN SUPABASE:
--    - 'anon': usuarios no autenticados (cuando usas ANON_KEY)
--    - 'authenticated': usuarios autenticados
--    - 'service_role': bypass completo de RLS (cuando usas SERVICE_ROLE_KEY)
--    - 'public': NO es un rol válido en Supabase para políticas RLS
--
-- 2. Si usas SUPABASE_SERVICE_ROLE_KEY en el código, estas políticas no son necesarias
--    porque service_role bypassa RLS completamente
-- 
-- 3. Si prefieres mantener RLS y usar anon_key, estas políticas permitirán
--    que usuarios no autenticados (anon) y autenticados lean datos de consultorios
--
-- 4. Estas políticas son SOLO para lectura (SELECT), no permiten INSERT/UPDATE/DELETE
--
-- 5. Las políticas solo aplican a organizaciones con type = 'CONSULTORIO'
--
-- 6. Si el problema persiste después de corregir estas políticas, verifica:
--    - Que las tablas tengan RLS habilitado
--    - Que el cliente esté usando la clave correcta (service_role o anon)
--    - Que las políticas se hayan aplicado correctamente (ejecutar las queries de verificación)
--    - Que los roles en las políticas sean 'anon' y 'authenticated', NO 'public'

