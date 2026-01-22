-- ============================================================================
-- SCRIPT: Buscar y corregir referencias a "Notification" en funciones y triggers
-- ============================================================================
-- Este script busca funciones y triggers que puedan estar referenciando
-- "Notification" con mayúscula y las corrige
-- ============================================================================

-- ============================================================================
-- PASO 1: Buscar funciones que mencionen "Notification"
-- ============================================================================

SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND (
        pg_get_functiondef(p.oid) ILIKE '%"Notification"%'
        OR pg_get_functiondef(p.oid) ILIKE '%Notification%'
    )
    AND pg_get_functiondef(p.oid) NOT ILIKE '%notification%'
ORDER BY p.proname;

-- ============================================================================
-- PASO 2: Buscar triggers que mencionen "Notification"
-- ============================================================================

SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    n.nspname as schema_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
    AND NOT t.tgisinternal
    AND (
        pg_get_triggerdef(t.oid) ILIKE '%"Notification"%'
        OR pg_get_triggerdef(t.oid) ILIKE '%Notification%'
    )
    AND pg_get_triggerdef(t.oid) NOT ILIKE '%notification%'
ORDER BY c.relname, t.tgname;

-- ============================================================================
-- PASO 3: Buscar vistas que mencionen "Notification"
-- ============================================================================

SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public'
    AND (
        definition ILIKE '%"Notification"%'
        OR definition ILIKE '%Notification%'
    )
    AND definition NOT ILIKE '%notification%'
ORDER BY viewname;

-- ============================================================================
-- NOTA: Si encuentras funciones, triggers o vistas con referencias a "Notification",
-- necesitarás recrearlas manualmente usando "notification" (minúscula)
-- ============================================================================

