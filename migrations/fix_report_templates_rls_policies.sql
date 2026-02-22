-- ============================================================
-- SQL para verificar y corregir políticas RLS del bucket "report-templates"
-- ============================================================
-- Las políticas RLS en Supabase Storage pueden bloquear subidas
-- incluso si el límite del bucket está configurado correctamente
-- ============================================================

-- Paso 1: Verificar políticas RLS existentes para el bucket
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
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%report-templates%' OR policyname LIKE '%report_templates%'
ORDER BY policyname;

-- Paso 2: Verificar todas las políticas de storage.objects
SELECT 
    policyname,
    cmd as operation,
    roles,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;

-- ============================================================
-- Paso 3: Eliminar políticas restrictivas existentes (si es necesario)
-- ============================================================
-- Descomenta estas líneas solo si necesitas eliminar políticas existentes
-- que estén bloqueando las subidas

/*
DROP POLICY IF EXISTS "report-templates-insert-policy" ON storage.objects;
DROP POLICY IF EXISTS "report-templates-select-policy" ON storage.objects;
DROP POLICY IF EXISTS "report-templates-update-policy" ON storage.objects;
DROP POLICY IF EXISTS "report-templates-delete-policy" ON storage.objects;
*/

-- ============================================================
-- Paso 4: Eliminar políticas existentes (si existen) y crear nuevas
-- ============================================================
-- Primero eliminamos las políticas si existen, luego las creamos
-- Esto evita errores si las políticas ya existen

DO $$
DECLARE
    v_bucket_id TEXT := 'report-templates';
    v_role_auth TEXT := 'authenticated';
    v_role_service TEXT := 'service_role';
BEGIN
    -- Eliminar políticas existentes
    DROP POLICY IF EXISTS "report-templates-insert-policy" ON storage.objects;
    DROP POLICY IF EXISTS "report-templates-select-policy" ON storage.objects;
    DROP POLICY IF EXISTS "report-templates-update-policy" ON storage.objects;
    DROP POLICY IF EXISTS "report-templates-delete-policy" ON storage.objects;

    -- ============================================================
    -- Paso 5: Crear políticas RLS que permitan operaciones en el bucket
    -- ============================================================

    -- Política para INSERT (subir archivos)
    EXECUTE format('CREATE POLICY "report-templates-insert-policy" ON storage.objects FOR INSERT TO %I, %I WITH CHECK ( bucket_id = %L )', v_role_auth, v_role_service, v_bucket_id);

    -- Política para SELECT (leer/descargar archivos)
    EXECUTE format('CREATE POLICY "report-templates-select-policy" ON storage.objects FOR SELECT TO %I, %I USING ( bucket_id = %L )', v_role_auth, v_role_service, v_bucket_id);

    -- Política para UPDATE (actualizar archivos)
    EXECUTE format('CREATE POLICY "report-templates-update-policy" ON storage.objects FOR UPDATE TO %I, %I USING ( bucket_id = %L ) WITH CHECK ( bucket_id = %L )', v_role_auth, v_role_service, v_bucket_id, v_bucket_id);

    -- Política para DELETE (eliminar archivos)
    EXECUTE format('CREATE POLICY "report-templates-delete-policy" ON storage.objects FOR DELETE TO %I, %I USING ( bucket_id = %L )', v_role_auth, v_role_service, v_bucket_id);
END $$;

-- ============================================================
-- Paso 6: Verificar que las políticas se crearon correctamente
-- ============================================================
SELECT 
    policyname,
    cmd as operation,
    roles,
    CASE 
        WHEN qual IS NOT NULL THEN 'Tiene USING expression'
        ELSE 'Sin USING expression'
    END as using_status,
    CASE 
        WHEN with_check IS NOT NULL THEN 'Tiene WITH CHECK expression'
        ELSE 'Sin WITH CHECK expression'
    END as with_check_status
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%report-templates%'
ORDER BY policyname;

-- ============================================================
-- Paso 7: Verificar que RLS está habilitado en storage.objects
-- ============================================================
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'storage' 
  AND tablename = 'objects';

-- ============================================================
-- Notas importantes:
-- ============================================================
-- 1. Las políticas RLS se aplican a la tabla storage.objects
-- 2. El bucket_id debe coincidir exactamente: 'report-templates'
-- 3. Las políticas permiten operaciones a:
--    - authenticated: usuarios autenticados
--    - service_role: el service role key (usado por tu API)
-- 4. Si necesitas restricciones más específicas (por ejemplo, solo
--    permitir subidas a ciertos usuarios), puedes modificar las
--    condiciones en WITH CHECK o USING
--
-- Ejemplo de política más restrictiva (solo para referencia):
-- CREATE POLICY "report-templates-insert-restricted"
-- ON storage.objects
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (
--     bucket_id = 'report-templates'
--     AND (storage.foldername(name))[1] = auth.uid()::text
-- );
-- Esto solo permitiría subir archivos en carpetas con el nombre del usuario

