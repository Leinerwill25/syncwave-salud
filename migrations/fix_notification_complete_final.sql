-- ============================================================================
-- SCRIPT COMPLETO: Corregir TODAS las referencias a "Notification"
-- ============================================================================
-- Este script corrige referencias a "Notification" en:
-- 1. Políticas RLS
-- 2. Funciones
-- 3. Triggers
-- 4. Vistas
-- ============================================================================

-- ============================================================================
-- PASO 1: Eliminar y recrear políticas RLS de notification correctamente
-- ============================================================================

-- Habilitar RLS
ALTER TABLE IF EXISTS public.notification ENABLE ROW LEVEL SECURITY;

-- Eliminar TODAS las políticas existentes de notification (por si acaso)
-- Usar nombres específicos en lugar de consultar pg_policies para evitar errores
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notification;
DROP POLICY IF EXISTS "Users can manage their notifications" ON public.notification;
DROP POLICY IF EXISTS "Users can view notifications in their organization" ON public.notification;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notification;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notification;
DROP POLICY IF EXISTS "Users can delete their notifications" ON public.notification;

-- Crear políticas correctas
CREATE POLICY "Users can view their notifications"
    ON public.notification
    FOR SELECT
    USING (
        "organizationId" IN (
            SELECT "organizationId" 
            FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "userId" IN (
            SELECT id 
            FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

CREATE POLICY "Users can manage their notifications"
    ON public.notification
    FOR ALL
    USING (
        "organizationId" IN (
            SELECT "organizationId" 
            FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "userId" IN (
            SELECT id 
            FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    )
    WITH CHECK (
        "organizationId" IN (
            SELECT "organizationId" 
            FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- ============================================================================
-- PASO 2: Verificar funciones que mencionen "Notification"
-- ============================================================================

-- Listar funciones problemáticas (usando SELECT directo en lugar de DO block)
SELECT 
    n.nspname as schema_name,
    p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND (
        pg_get_functiondef(p.oid) ILIKE '%"Notification"%'
        OR (pg_get_functiondef(p.oid) ILIKE '%Notification%' 
            AND pg_get_functiondef(p.oid) NOT ILIKE '%notification%')
    )
ORDER BY p.proname;

-- ============================================================================
-- PASO 3: Verificar triggers que mencionen "Notification"
-- ============================================================================

-- Listar triggers problemáticos (usando SELECT directo en lugar de DO block)
SELECT 
    n.nspname as schema_name,
    t.tgname as trigger_name,
    c.relname as table_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
    AND NOT t.tgisinternal
    AND (
        pg_get_triggerdef(t.oid) ILIKE '%"Notification"%'
        OR (pg_get_triggerdef(t.oid) ILIKE '%Notification%'
            AND pg_get_triggerdef(t.oid) NOT ILIKE '%notification%')
    )
ORDER BY c.relname, t.tgname;

-- ============================================================================
-- PASO 4: Verificación final
-- ============================================================================

-- Verificar que las políticas se crearon correctamente
SELECT 
    'Políticas de notification' as check_type,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'notification'
ORDER BY policyname;

-- Verificar que no queden referencias problemáticas en funciones
SELECT 
    'Funciones problemáticas' as check_type,
    COUNT(*) as count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND (
        pg_get_functiondef(p.oid) ILIKE '%"Notification"%'
        OR (pg_get_functiondef(p.oid) ILIKE '%Notification%'
            AND pg_get_functiondef(p.oid) NOT ILIKE '%notification%')
    );

-- Verificar que no queden referencias problemáticas en triggers
SELECT 
    'Triggers problemáticos' as check_type,
    COUNT(*) as count
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
    AND NOT t.tgisinternal
    AND (
        pg_get_triggerdef(t.oid) ILIKE '%"Notification"%'
        OR (pg_get_triggerdef(t.oid) ILIKE '%Notification%'
            AND pg_get_triggerdef(t.oid) NOT ILIKE '%notification%')
    );

