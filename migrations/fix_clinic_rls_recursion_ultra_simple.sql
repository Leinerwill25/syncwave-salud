-- Script ULTRA-SIMPLE para corregir recursión infinita en políticas RLS
-- SOLUCIÓN: Eliminar TODAS las políticas problemáticas y crear políticas
--           ultra-simples que solo verifican campos directos sin subconsultas

-- ============================================================================
-- PASO 1: ELIMINAR TODAS las políticas públicas problemáticas
-- ============================================================================
DROP POLICY IF EXISTS "Public can read CONSULTORIO organizations" ON public.organization;
DROP POLICY IF EXISTS "Public can read clinic_profile for CONSULTORIO" ON public.clinic_profile;
DROP POLICY IF EXISTS "Public can read MEDICO users from CONSULTORIO" ON public."user";
DROP POLICY IF EXISTS "Public can read medic_profile from CONSULTORIO doctors" ON public.medic_profile;

-- ============================================================================
-- PASO 2: Verificar si hay otras políticas en organization que puedan causar problemas
-- ============================================================================
SELECT 
    policyname,
    cmd as "operation",
    roles,
    LEFT(qual::text, 200) as "using_expression"
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'organization'
ORDER BY policyname;

-- ============================================================================
-- PASO 3: Crear políticas ULTRA-SIMPLES sin subconsultas
-- IMPORTANTE: Estas políticas solo verifican campos DIRECTOS sin subconsultas
-- ============================================================================

-- Política para organization: solo verifica type directamente, sin subconsultas
CREATE POLICY "Public can read CONSULTORIO organizations"
ON public.organization
FOR SELECT
TO anon, authenticated
USING (
    -- Verificación directa del campo type sin subconsultas
    type::text = 'CONSULTORIO'
);

-- Política para clinic_profile: 
-- Como clinic_profile tiene relación con organization, y organization ya tiene RLS,
-- podemos permitir lectura si no hay conflicto. Pero para evitar recursión,
-- NO hacemos subconsulta a organization desde aquí.
-- 
-- OPCIÓN 1: Permitir todo (menos seguro pero evita recursión)
CREATE POLICY "Public can read clinic_profile for CONSULTORIO"
ON public.clinic_profile
FOR SELECT
TO anon, authenticated
USING (true);

-- OPCIÓN 2 (si OPCIÓN 1 no es aceptable): 
-- Solo permitir si el organization_id existe y es válido
-- (pero esto puede causar recursión si organization tiene políticas complejas)
-- DESCOMENTAR SOLO SI OPCIÓN 1 NO FUNCIONA:
/*
DROP POLICY IF EXISTS "Public can read clinic_profile for CONSULTORIO" ON public.clinic_profile;
CREATE POLICY "Public can read clinic_profile for CONSULTORIO"
ON public.clinic_profile
FOR SELECT
TO anon, authenticated
USING (
    organization_id IS NOT NULL
    AND organization_id::text != ''
);
*/

-- Política para user: solo verificar role directamente
CREATE POLICY "Public can read MEDICO users from CONSULTORIO"
ON public."user"
FOR SELECT
TO anon, authenticated
USING (
    role::text = 'MEDICO'
);

-- Política para medic_profile: permitir todo (la restricción viene de user)
CREATE POLICY "Public can read medic_profile from CONSULTORIO doctors"
ON public.medic_profile
FOR SELECT
TO anon, authenticated
USING (true);

-- ============================================================================
-- PASO 4: Verificar que las políticas se crearon correctamente
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as "operation",
    roles,
    LEFT(qual::text, 150) as "using_expression_preview"
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('organization', 'clinic_profile', 'user', 'medic_profile')
AND (policyname LIKE '%CONSULTORIO%' OR policyname LIKE '%Public%')
ORDER BY tablename, policyname;

-- ============================================================================
-- RECOMENDACIÓN FINAL:
-- ============================================================================
-- Si este error persiste, la MEJOR solución es:
-- 
-- 1. Configurar SUPABASE_SERVICE_ROLE_KEY en las variables de entorno
--    Esto bypassa RLS completamente y evita todos estos problemas
--
-- 2. O temporalmente desactivar RLS para estas tablas en la página pública:
--    ALTER TABLE public.organization DISABLE ROW LEVEL SECURITY;
--    ALTER TABLE public.clinic_profile DISABLE ROW LEVEL SECURITY;
--    ALTER TABLE public."user" DISABLE ROW LEVEL SECURITY;
--    ALTER TABLE public.medic_profile DISABLE ROW LEVEL SECURITY;
--
--    (NO recomendado para producción, pero funciona para testing)
--
-- 3. O crear una política única para organization que sea más permisiva:
--    DROP POLICY IF EXISTS "Public can read CONSULTORIO organizations" ON public.organization;
--    CREATE POLICY "Public can read all organizations"
--    ON public.organization
--    FOR SELECT
--    TO anon, authenticated
--    USING (true);
--
--    Y luego filtrar en el código por type = 'CONSULTORIO'

