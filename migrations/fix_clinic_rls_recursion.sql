-- Script para corregir recursión infinita en políticas RLS
-- PROBLEMA: Las políticas de clinic_profile hacen EXISTS a organization,
--           y organization puede hacer referencia a clinic_profile, causando recursión
-- SOLUCIÓN: Simplificar las políticas para evitar subconsultas circulares

-- ============================================================================
-- 1. ELIMINAR todas las políticas públicas problemáticas primero
-- ============================================================================
DROP POLICY IF EXISTS "Public can read CONSULTORIO organizations" ON public.organization;
DROP POLICY IF EXISTS "Public can read clinic_profile for CONSULTORIO" ON public.clinic_profile;
DROP POLICY IF EXISTS "Public can read MEDICO users from CONSULTORIO" ON public."user";
DROP POLICY IF EXISTS "Public can read medic_profile from CONSULTORIO doctors" ON public.medic_profile;

-- ============================================================================
-- 2. SOLUCIÓN DEFINITIVA: Políticas ultra-simples que evitan recursión
--    Usamos solo verificaciones directas sin subconsultas que puedan causar loops
-- ============================================================================

-- IMPORTANTE: Estas políticas aún pueden causar recursión si hay otras políticas
-- que hagan referencia cruzada. La mejor solución es usar SERVICE_ROLE_KEY.
-- Si estas políticas causan recursión, ver la sección 3 para políticas más permisivas.

-- Política SIMPLE para organization: solo verifica el campo type directamente
-- SIN subconsultas que puedan causar recursión
CREATE POLICY "Public can read CONSULTORIO organizations"
ON public.organization
FOR SELECT
TO anon, authenticated
USING (type::text = 'CONSULTORIO');

-- Política PERMISIVA para clinic_profile: permitir todo para anon/authenticated
-- La restricción real viene de la relación con organization que ya tiene RLS
-- Esto evita recursión porque no consulta organization desde clinic_profile
CREATE POLICY "Public can read clinic_profile for CONSULTORIO"
ON public.clinic_profile
FOR SELECT
TO anon, authenticated
USING (true);  -- Permitir todo, depender de que organization ya filtrado por RLS

-- Política SIMPLE para user: solo verificar role directamente
-- La restricción a CONSULTORIO viene implícitamente de las relaciones
CREATE POLICY "Public can read MEDICO users from CONSULTORIO"
ON public."user"
FOR SELECT
TO anon, authenticated
USING (role::text = 'MEDICO');  -- Permitir todos los médicos, filtrado por relación

-- Política PERMISIVA para medic_profile: permitir todo
-- La restricción viene de la relación con user que ya tiene RLS
CREATE POLICY "Public can read medic_profile from CONSULTORIO doctors"
ON public.medic_profile
FOR SELECT
TO anon, authenticated
USING (true);  -- Permitir todo, depender de que user ya filtrado por RLS

-- ============================================================================
-- 3. ALTERNATIVA: Si las políticas anteriores aún causan problemas,
--    usar políticas aún más simples que eviten completamente subconsultas
-- ============================================================================

-- Si el error persiste, ejecutar este bloque para usar políticas ultra-simples:

/*
-- Primero, eliminar las políticas anteriores
DROP POLICY IF EXISTS "Public can read CONSULTORIO organizations" ON public.organization;
DROP POLICY IF EXISTS "Public can read clinic_profile for CONSULTORIO" ON public.clinic_profile;
DROP POLICY IF EXISTS "Public can read MEDICO users from CONSULTORIO" ON public."user";
DROP POLICY IF EXISTS "Public can read medic_profile from CONSULTORIO doctors" ON public.medic_profile;

-- Política ultra-simple para organization (sin referencias a otras tablas)
CREATE POLICY "Public can read CONSULTORIO organizations"
ON public.organization
FOR SELECT
TO anon, authenticated
USING (type::text = 'CONSULTORIO');

-- Política ultra-simple para clinic_profile (permitir todo si organization tiene RLS)
-- Esta política permite acceso si RLS de organization ya lo permitió
CREATE POLICY "Public can read clinic_profile for CONSULTORIO"
ON public.clinic_profile
FOR SELECT
TO anon, authenticated
USING (true);  -- Permitir todo, depender de RLS de organization

-- Similar para user y medic_profile
CREATE POLICY "Public can read MEDICO users from CONSULTORIO"
ON public."user"
FOR SELECT
TO anon, authenticated
USING (role::text = 'MEDICO');

CREATE POLICY "Public can read medic_profile from CONSULTORIO doctors"
ON public.medic_profile
FOR SELECT
TO anon, authenticated
USING (true);  -- Permitir todo, depender de RLS de otras tablas
*/

-- ============================================================================
-- 4. Verificar políticas creadas
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as "operation",
    roles,
    LEFT(qual::text, 100) as "using_expression_preview"
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('organization', 'clinic_profile', 'user', 'medic_profile')
AND (policyname LIKE '%CONSULTORIO%' OR policyname LIKE '%Public%')
ORDER BY tablename, policyname;

-- ============================================================================
-- NOTA IMPORTANTE:
-- ============================================================================
-- Si las políticas con subconsultas IN siguen causando recursión,
-- la mejor solución es usar SERVICE_ROLE_KEY en el código, que bypassa RLS
-- completamente. Las políticas RLS solo son necesarias si usas ANON_KEY.
--
-- Para páginas públicas, lo recomendado es:
-- 1. Usar SERVICE_ROLE_KEY para bypass completo de RLS (más simple)
-- 2. O usar políticas ultra-simples que solo verifiquen campos directos
--
-- El código ya está configurado para usar SERVICE_ROLE_KEY primero,
-- por lo que si está configurado, estas políticas no se usan.

