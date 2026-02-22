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

DO $$
DECLARE
    v_table_name TEXT := 'public.notification';
    v_policy_view TEXT := 'Users can view their notifications';
    v_policy_manage TEXT := 'Users can manage their notifications';
    v_check_logic TEXT := '"organizationId" IN (SELECT "organizationId" FROM public."user" WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text) OR "userId" IN (SELECT id FROM public."user" WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text)';
    v_with_check TEXT := '"organizationId" IN (SELECT "organizationId" FROM public."user" WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text)';
BEGIN
    -- Eliminar políticas existentes (por si acaso)
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', v_policy_view, v_table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', v_policy_manage, v_table_name);

    -- Crear políticas correctas
    EXECUTE format('CREATE POLICY %I ON %s FOR SELECT USING ( %s )', v_policy_view, v_table_name, v_check_logic);
    EXECUTE format('CREATE POLICY %I ON %s FOR ALL USING ( %s ) WITH CHECK ( %s )', v_policy_manage, v_table_name, v_check_logic, v_with_check);
END $$;

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

