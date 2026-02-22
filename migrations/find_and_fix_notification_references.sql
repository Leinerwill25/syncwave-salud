-- ============================================================================
-- SCRIPT: Buscar y corregir todas las referencias a "Notification" con mayúscula
-- ============================================================================
-- Este script busca y muestra todas las políticas RLS que puedan tener
-- referencias incorrectas a "Notification" con mayúscula
-- ============================================================================

-- 1. Buscar políticas que mencionen "Notification" en su definición
WITH target AS (SELECT 'Notification'::text as name)
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies, target
WHERE schemaname = 'public'
    AND (
        qual::text ILIKE '%' || target.name || '%' 
        OR with_check::text ILIKE '%' || target.name || '%'
        OR tablename = target.name
    )
ORDER BY tablename, policyname;

-- 2. Verificar si existe alguna tabla "Notification" con mayúscula
SELECT 
    schemaname,
    tablename
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename = 'Notification';

-- 3. Verificar todas las políticas de la tabla notification (minúscula)
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
    AND tablename = 'notification'
ORDER BY policyname;

-- ============================================================================
-- CORRECCIONES: Si encuentras referencias a "Notification" con mayúscula,
-- ejecuta las siguientes correcciones:
-- ============================================================================

-- Eliminar políticas problemáticas si existen
-- (Descomenta y ejecuta solo si encuentras políticas con el nombre incorrecto)

-- DROP POLICY IF EXISTS "nombre_de_la_politica" ON public."Notification";

-- Crear/Recrear políticas correctas para notification (minúscula)
-- (Ya deberían estar creadas por el script fix_notification_rls_only.sql)

