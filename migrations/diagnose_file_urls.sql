-- Script SQL detallado para diagnosticar URLs de archivos
-- Este script te ayuda a ver exactamente qué URLs están guardadas

-- 1. Ver el archivo completo con todos sus detalles
SELECT 
    id,
    consultation_id,
    file_name,
    path as path_guardado,
    url as url_guardada,
    size,
    content_type,
    created_at,
    -- Verificar si la URL es válida
    CASE 
        WHEN url IS NULL THEN '❌ URL NULL'
        WHEN url = '' THEN '❌ URL VACÍA'
        WHEN url NOT LIKE 'http://%' AND url NOT LIKE 'https://%' THEN '❌ URL INVÁLIDA'
        ELSE '✅ URL VÁLIDA'
    END as estado_url,
    -- Verificar el tipo de path
    CASE 
        WHEN path LIKE 'consultations/%' THEN '⚠️ Path organizado (consultations/)'
        WHEN path LIKE '%/%' AND path NOT LIKE 'consultations/%' THEN '✅ Path real (prescriptionId/timestamp_filename)'
        ELSE '⚠️ Path solo nombre'
    END as tipo_path
FROM consultation_files
ORDER BY created_at DESC;

-- 2. Ver solo la URL guardada para copiarla y probarla manualmente
SELECT 
    file_name,
    url as url_para_probar,
    path as path_guardado,
    CASE 
        WHEN url LIKE '%prescriptions%' THEN '✅ URL apunta al bucket prescriptions'
        WHEN url LIKE '%consultation-images%' THEN '⚠️ URL apunta a consultation-images (puede no existir)'
        ELSE '❓ URL no identificada'
    END as bucket_en_url
FROM consultation_files
ORDER BY created_at DESC
LIMIT 5;

