-- ============================================================
-- Verificar políticas específicas para report-templates
-- ============================================================

-- Ver todas las políticas de storage.objects con sus detalles
SELECT 
    policyname,
    cmd as operation,
    roles,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname, cmd;

-- Verificar específicamente si hay políticas para report-templates
SELECT 
    policyname,
    cmd as operation,
    roles,
    CASE 
        WHEN with_check::text LIKE '%report-templates%' OR qual::text LIKE '%report-templates%' 
        THEN '✅ Incluye report-templates'
        ELSE '❌ No incluye report-templates'
    END as includes_report_templates,
    with_check::text as with_check_expression,
    qual::text as using_expression
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname, cmd;

