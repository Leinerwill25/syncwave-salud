-- ============================================================================
-- SCRIPT: Verificar políticas RLS de la tabla user que puedan referenciar Notification
-- ============================================================================

-- Ver todas las políticas de la tabla user
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
    AND tablename IN ('user', 'User')
ORDER BY tablename, policyname;

-- Verificar si alguna política de user menciona Notification
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('user', 'User')
    AND (
        qual::text ILIKE '%Notification%'
        OR with_check::text ILIKE '%Notification%'
    );

