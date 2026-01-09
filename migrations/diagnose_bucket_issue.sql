-- ============================================================
-- SQL para diagnosticar problemas con el bucket "report-templates"
-- ============================================================
-- Este script ayuda a identificar por qué un archivo pequeño
-- puede estar siendo rechazado por Supabase Storage
-- ============================================================

-- Paso 1: Verificar la configuración del bucket
SELECT 
    id,
    name,
    public,
    file_size_limit,
    file_size_limit / (1024 * 1024) as file_size_limit_mb,
    allowed_mime_types,
    created_at,
    updated_at,
    CASE 
        WHEN file_size_limit IS NULL THEN '⚠️ Límite no configurado (puede usar el límite por defecto del proyecto)'
        WHEN file_size_limit < 52428800 THEN '❌ Límite menor a 50MB: ' || (file_size_limit / (1024 * 1024))::text || 'MB'
        WHEN file_size_limit >= 52428800 THEN '✅ Límite adecuado: ' || (file_size_limit / (1024 * 1024))::text || 'MB'
        ELSE 'Estado desconocido'
    END as estado
FROM storage.buckets
WHERE name = 'report-templates';

-- Paso 2: Verificar si hay políticas de Storage que puedan estar limitando
-- Nota: Las políticas de Storage en Supabase no se almacenan en una tabla SQL
-- Se gestionan a través de la API o del dashboard. Para verificar las políticas:
-- 1. Ve al dashboard de Supabase: Storage > Buckets > report-templates > Policies
-- 2. Verifica que las políticas permitan INSERT para archivos del tamaño necesario
-- 3. Asegúrate de que no haya políticas que limiten el tamaño de archivo

-- La siguiente consulta verifica si hay objetos en el bucket (para ver si las políticas permiten subidas)
SELECT 
    COUNT(*) as total_objects_in_bucket,
    'Las políticas permiten subidas si este número > 0' as nota
FROM storage.objects
WHERE bucket_id = (SELECT id FROM storage.buckets WHERE name = 'report-templates');

-- Paso 3: Verificar el tamaño de los archivos existentes en el bucket
-- (para ver si hay algún patrón o problema)
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
FROM storage.objects
WHERE bucket_id = (SELECT id FROM storage.buckets WHERE name = 'report-templates')
ORDER BY created_at DESC
LIMIT 10;

-- Paso 4: Verificar si hay algún límite a nivel de proyecto
-- (Nota: Esto puede requerir acceso a la tabla de configuración del proyecto)
-- En Supabase, los límites a nivel de proyecto generalmente se configuran
-- en el dashboard, no en la base de datos directamente

-- Paso 5: Verificar el espacio usado en el bucket
SELECT 
    bucket_id,
    COUNT(*) as total_files,
    SUM((metadata->>'size')::bigint) as total_size_bytes,
    SUM((metadata->>'size')::bigint) / (1024 * 1024) as total_size_mb
FROM storage.objects
WHERE bucket_id = (SELECT id FROM storage.buckets WHERE name = 'report-templates')
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

