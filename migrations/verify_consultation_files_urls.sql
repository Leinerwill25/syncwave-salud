-- Script SQL para verificar las URLs guardadas en consultation_files
-- Este script ayuda a diagnosticar problemas con las URLs de los archivos

-- 1. Ver todas las URLs guardadas en consultation_files
SELECT 
    id,
    consultation_id,
    file_name,
    path,
    url,
    size,
    content_type,
    created_at,
    CASE 
        WHEN url IS NULL THEN '❌ URL NULL'
        WHEN url = '' THEN '❌ URL VACÍA'
        WHEN url NOT LIKE 'http://%' AND url NOT LIKE 'https://%' THEN '❌ URL INVÁLIDA (no empieza con http/https)'
        ELSE '✅ URL VÁLIDA'
    END as url_status
FROM consultation_files
ORDER BY created_at DESC
LIMIT 20;

-- 2. Verificar paths guardados
SELECT 
    consultation_id,
    file_name,
    path,
    CASE 
        WHEN path LIKE 'consultations/%' THEN '⚠️ Path organizado (consultations/)'
        WHEN path LIKE '%/%' THEN '✅ Path real con carpeta'
        ELSE '⚠️ Path solo nombre de archivo'
    END as path_type,
    url
FROM consultation_files
ORDER BY created_at DESC
LIMIT 20;

-- 3. Verificar si hay archivos sin URL o con URL inválida
SELECT 
    id,
    consultation_id,
    file_name,
    path,
    url,
    created_at
FROM consultation_files
WHERE url IS NULL 
   OR url = ''
   OR (url NOT LIKE 'http://%' AND url NOT LIKE 'https://%')
ORDER BY created_at DESC;

-- 4. Estadísticas de consultation_files
SELECT 
    COUNT(*) as total_archivos,
    COUNT(DISTINCT consultation_id) as total_consultas,
    COUNT(CASE WHEN url IS NOT NULL AND url != '' AND (url LIKE 'http://%' OR url LIKE 'https://%') THEN 1 END) as archivos_con_url_valida,
    COUNT(CASE WHEN url IS NULL OR url = '' OR (url NOT LIKE 'http://%' AND url NOT LIKE 'https://%') THEN 1 END) as archivos_sin_url_valida,
    COUNT(CASE WHEN path LIKE 'consultations/%' THEN 1 END) as archivos_con_path_organizado,
    COUNT(CASE WHEN path NOT LIKE 'consultations/%' AND path LIKE '%/%' THEN 1 END) as archivos_con_path_real
FROM consultation_files;

