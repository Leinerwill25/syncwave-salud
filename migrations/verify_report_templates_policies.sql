-- ============================================================
-- SQL para verificar que las políticas RLS del bucket están correctas
-- ============================================================

-- Verificar todas las políticas para el bucket "report-templates"
WITH target AS (SELECT '%report-templates%'::text as pattern)
SELECT 
    policyname,
    cmd as operation,
    roles,
    CASE 
        WHEN qual IS NOT NULL THEN qual::text
        ELSE 'Sin USING expression'
    END as using_expression,
    CASE 
        WHEN with_check IS NOT NULL THEN with_check::text
        ELSE 'Sin WITH CHECK expression'
    END as with_check_expression
FROM pg_policies, target
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND (
    policyname LIKE target.pattern 
    OR policyname LIKE '%report_templates%'
    OR with_check::text LIKE target.pattern
    OR qual::text LIKE target.pattern
  )
ORDER BY policyname, cmd;

-- Verificar que RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS está habilitado - Las políticas son necesarias'
        ELSE '❌ RLS está deshabilitado'
    END as estado
FROM pg_tables
WHERE schemaname = 'storage' 
  AND tablename = 'objects';

-- Contar políticas totales para storage.objects
SELECT 
    COUNT(*) as total_policies,
    COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
    COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
    COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
    COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects';

