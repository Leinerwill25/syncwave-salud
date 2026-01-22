-- ============================================================================
-- SCRIPT: Buscar referencias a "Notification" en funciones y triggers
-- ============================================================================
-- Este script busca funciones y triggers que puedan tener referencias
-- a "Notification" con mayúscula
-- ============================================================================

-- Buscar funciones que contengan "Notification" en su código
-- (sin usar pg_get_functiondef en WHERE para evitar errores)
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- Buscar triggers en la tabla "user" que puedan estar causando problemas
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
    AND c.relname = 'user'
    AND NOT t.tgisinternal
ORDER BY t.tgname;

-- Buscar todas las funciones que se ejecutan en INSERT en la tabla user
SELECT DISTINCT
    p.proname as function_name,
    n.nspname as schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND (
        p.proname ILIKE '%user%'
        OR p.proname ILIKE '%insert%'
        OR p.proname ILIKE '%notification%'
    )
ORDER BY p.proname;

