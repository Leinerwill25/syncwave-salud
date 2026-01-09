-- ============================================================
-- SQL para actualizar el límite de tamaño de archivo del bucket "report-templates"
-- ============================================================
-- INSTRUCCIONES:
-- 1. Ejecuta este script en tu base de datos de Supabase
-- 2. Asegúrate de tener permisos de administrador o superusuario
-- 3. Este script actualiza el file_size_limit a 50MB (52428800 bytes)
-- ============================================================

-- Paso 1: Verificar el estado actual del bucket
SELECT 
    id,
    name,
    public,
    file_size_limit,
    file_size_limit / (1024 * 1024) as file_size_limit_mb,
    allowed_mime_types,
    created_at,
    updated_at
FROM storage.buckets
WHERE name = 'report-templates';

-- ============================================================
-- Paso 2: Actualizar el límite de tamaño del bucket a 50MB
-- ============================================================
-- Nota: Si el bucket no existe, este UPDATE no afectará ninguna fila
UPDATE storage.buckets
SET 
    file_size_limit = 52428800, -- 50MB en bytes
    updated_at = now()
WHERE name = 'report-templates';

-- ============================================================
-- Paso 3: Verificar que se actualizó correctamente
-- ============================================================
SELECT 
    id,
    name,
    public,
    file_size_limit,
    file_size_limit / (1024 * 1024) as file_size_limit_mb,
    CASE 
        WHEN file_size_limit >= 52428800 THEN '✅ Límite actualizado correctamente (50MB)'
        WHEN file_size_limit IS NULL THEN '⚠️ Límite no configurado'
        ELSE '⚠️ Límite menor a 50MB: ' || (file_size_limit / (1024 * 1024))::text || 'MB'
    END as estado,
    updated_at
FROM storage.buckets
WHERE name = 'report-templates';

-- ============================================================
-- Paso 4 (Opcional): Si el bucket no existe, crearlo con el límite correcto
-- ============================================================
-- Solo ejecuta esto si el SELECT del Paso 1 no devolvió ninguna fila
-- Descomenta las siguientes líneas si necesitas crear el bucket:

/*
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'report-templates',
    false, -- bucket privado
    52428800, -- 50MB en bytes
    NULL, -- sin restricciones de MIME types
    now(),
    now()
)
ON CONFLICT (name) DO UPDATE
SET 
    file_size_limit = 52428800,
    updated_at = now();
*/

-- ============================================================
-- Notas importantes:
-- ============================================================
-- 1. El campo file_size_limit está en BYTES, no en MB
--    50MB = 50 * 1024 * 1024 = 52428800 bytes
--
-- 2. Si después de ejecutar este script el problema persiste,
--    puede ser que Supabase tenga una validación adicional
--    que requiera actualizar el bucket a través de la API.
--
-- 3. Si el UPDATE no funciona, intenta:
--    a) Verificar que tienes permisos suficientes
--    b) Verificar que la tabla storage.buckets existe
--    c) Usar el dashboard de Supabase para actualizar manualmente
--
-- 4. Para verificar los permisos, ejecuta:
--    SELECT * FROM information_schema.table_privileges 
--    WHERE table_schema = 'storage' AND table_name = 'buckets';

