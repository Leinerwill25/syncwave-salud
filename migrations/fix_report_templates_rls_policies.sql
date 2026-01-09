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

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "report-templates-insert-policy" ON storage.objects;
DROP POLICY IF EXISTS "report-templates-select-policy" ON storage.objects;
DROP POLICY IF EXISTS "report-templates-update-policy" ON storage.objects;
DROP POLICY IF EXISTS "report-templates-delete-policy" ON storage.objects;

-- ============================================================
-- Paso 5: Crear políticas RLS que permitan operaciones en el bucket
-- ============================================================
-- Estas políticas permiten que usuarios autenticados y el service role
-- puedan subir, leer, actualizar y eliminar archivos en el bucket

-- Política para INSERT (subir archivos)
-- Permite a usuarios autenticados y service role subir archivos
CREATE POLICY "report-templates-insert-policy"
ON storage.objects
FOR INSERT
TO authenticated, service_role
WITH CHECK (
    bucket_id = 'report-templates'
);

-- Política para SELECT (leer/descargar archivos)
-- Permite a usuarios autenticados y service role leer archivos
CREATE POLICY "report-templates-select-policy"
ON storage.objects
FOR SELECT
TO authenticated, service_role
USING (
    bucket_id = 'report-templates'
);

-- Política para UPDATE (actualizar archivos)
-- Permite a usuarios autenticados y service role actualizar archivos
CREATE POLICY "report-templates-update-policy"
ON storage.objects
FOR UPDATE
TO authenticated, service_role
USING (
    bucket_id = 'report-templates'
)
WITH CHECK (
    bucket_id = 'report-templates'
);

-- Política para DELETE (eliminar archivos)
-- Permite a usuarios autenticados y service role eliminar archivos
CREATE POLICY "report-templates-delete-policy"
ON storage.objects
FOR DELETE
TO authenticated, service_role
USING (
    bucket_id = 'report-templates'
);

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

