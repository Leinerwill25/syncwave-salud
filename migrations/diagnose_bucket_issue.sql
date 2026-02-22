-- ============================================================
-- SQL para diagnosticar problemas con el bucket "report-templates"
-- ============================================================
-- Este script ayuda a identificar por qué un archivo pequeño
-- puede estar siendo rechazado por Supabase Storage
-- ============================================================

WITH config AS (
    SELECT 'report-templates'::text as target_bucket
)
-- Paso 1: Verificar la configuración del bucket
SELECT 
    b.id,
    b.name,
    b.public,
    b.file_size_limit,
    b.file_size_limit / (1024 * 1024) as file_size_limit_mb,
    b.allowed_mime_types,
    b.created_at,
    b.updated_at,
    CASE 
        WHEN b.file_size_limit IS NULL THEN '⚠️ Límite no configurado (puede usar el límite por defecto del proyecto)'
        WHEN b.file_size_limit < 52428800 THEN '❌ Límite menor a 50MB: ' || (b.file_size_limit / (1024 * 1024))::text || 'MB'
        WHEN b.file_size_limit >= 52428800 THEN '✅ Límite adecuado: ' || (b.file_size_limit / (1024 * 1024))::text || 'MB'
        ELSE 'Estado desconocido'
    END as estado
FROM storage.buckets b, config
WHERE b.name = config.target_bucket;

-- Paso 2: Verificar si hay objetos en el bucket
WITH config AS (
    SELECT 'report-templates'::text as target_bucket
)
SELECT 
    COUNT(*) as total_objects_in_bucket,
    'Las políticas permiten subidas si este número > 0' as nota
FROM storage.objects, config
WHERE bucket_id = (SELECT id FROM storage.buckets WHERE name = config.target_bucket);

-- Paso 3: Verificar el tamaño de los archivos existentes en el bucket
WITH config AS (
    SELECT 'report-templates'::text as target_bucket
)
SELECT 
    name,
    bucket_id,
    owner,
    created_at,
    updated_at,
    metadata->>'size' as size_bytes,
    CASE 
        WHEN (metadata->>'size')::bigint IS NOT NULL 
        THEN ((metadata->>'size')::bigint / (1024 * 1024))::numeric(10,2)
        ELSE NULL
    END as size_mb
FROM storage.objects, config
WHERE bucket_id = (SELECT id FROM storage.buckets WHERE name = config.target_bucket)
ORDER BY created_at DESC
LIMIT 10;

-- Paso 5: Verificar el espacio usado en el bucket
WITH config AS (
    SELECT 'report-templates'::text as target_bucket
)
SELECT 
    bucket_id,
    COUNT(*) as total_files,
    SUM((metadata->>'size')::bigint) as total_size_bytes,
    SUM((metadata->>'size')::bigint) / (1024 * 1024) as total_size_mb
FROM storage.objects, config
WHERE bucket_id = (SELECT id FROM storage.buckets WHERE name = config.target_bucket)
GROUP BY bucket_id;

-- ============================================================
-- Soluciones posibles:
-- ============================================================
-- 1. Si el file_size_limit es NULL o menor a 52428800:
--    Ejecuta: UPDATE storage.buckets SET file_size_limit = 52428800 WHERE name = 'report-templates';
--
-- 2. Si hay políticas restrictivas:
--    Revisa las políticas en storage.policies y asegúrate de que permitan
--    la subida de archivos del tamaño necesario
--
-- 3. Si el problema persiste después de actualizar el límite:
--    - Espera 5-10 minutos (puede haber caché)
--    - Verifica en el dashboard de Supabase que el cambio se guardó
--    - Verifica que no haya un límite a nivel de proyecto
--    - Contacta al soporte de Supabase si el problema persiste
--
-- 4. Si el espacio total usado es muy alto:
--    Puede haber un límite de almacenamiento total del proyecto
--    Verifica en el dashboard de Supabase: Settings > Usage

