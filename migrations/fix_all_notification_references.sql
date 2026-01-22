-- ============================================================================
-- SCRIPT COMPLETO: Buscar y corregir TODAS las referencias a "Notification"
-- ============================================================================
-- Este script busca y corrige referencias a "Notification" con mayúscula
-- en políticas RLS, funciones, triggers y vistas
-- ============================================================================

-- ============================================================================
-- PASO 1: Buscar políticas RLS problemáticas
-- ============================================================================

-- Ver todas las políticas que mencionan "Notification"
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT 
            schemaname,
            tablename,
            policyname
        FROM pg_policies
        WHERE schemaname = 'public'
            AND (
                tablename = 'Notification'
                OR qual::text ILIKE '%"Notification"%'
                OR with_check::text ILIKE '%"Notification"%'
                OR qual::text ILIKE '%Notification%'
                OR with_check::text ILIKE '%Notification%'
            )
    LOOP
        RAISE NOTICE 'Política problemática encontrada: %.%.%', 
            policy_record.schemaname, 
            policy_record.tablename, 
            policy_record.policyname;
    END LOOP;
END $$;

-- ============================================================================
-- PASO 2: Buscar funciones que mencionen "Notification"
-- ============================================================================

SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND pg_get_functiondef(p.oid) ILIKE '%Notification%'
    AND pg_get_functiondef(p.oid) NOT ILIKE '%notification%';

-- ============================================================================
-- PASO 3: Buscar triggers que mencionen "Notification"
-- ============================================================================

SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND pg_get_triggerdef(t.oid) ILIKE '%Notification%'
    AND pg_get_triggerdef(t.oid) NOT ILIKE '%notification%';

-- ============================================================================
-- PASO 4: Eliminar políticas problemáticas de "Notification" (si existen)
-- ============================================================================

-- Intentar eliminar políticas de la tabla "Notification" (mayúscula) si existe
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    -- Lista de políticas comunes que podrían existir
    FOR policy_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
            AND tablename = 'Notification'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public."Notification"', policy_name);
            RAISE NOTICE 'Política eliminada: %', policy_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'No se pudo eliminar política %: %', policy_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================================================
-- PASO 5: Asegurar que las políticas correctas existen en notification (minúscula)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE IF EXISTS public.notification ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes (por si acaso)
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notification;
DROP POLICY IF EXISTS "Users can manage their notifications" ON public.notification;

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
-- PASO 6: Verificación final
-- ============================================================================

-- Verificar que no queden referencias a "Notification" con mayúscula
SELECT 
    'Políticas restantes con Notification (mayúscula)' as check_type,
    COUNT(*) as count
FROM pg_policies
WHERE schemaname = 'public'
    AND (
        tablename = 'Notification'
        OR qual::text ILIKE '%"Notification"%'
        OR with_check::text ILIKE '%"Notification"%'
    );

-- Mostrar las políticas correctas de notification (minúscula)
SELECT 
    'Políticas correctas de notification (minúscula)' as check_type,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'notification'
ORDER BY policyname;

