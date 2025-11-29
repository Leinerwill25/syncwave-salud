-- Script para verificar y corregir la URL guardada
-- Ejecuta este script paso a paso

-- PASO 1: Ver la URL guardada exacta
SELECT 
    id,
    file_name,
    path as path_guardado,
    url as url_guardada,
    -- Extraer el bucket de la URL
    CASE 
        WHEN url LIKE '%/storage/v1/object/public/prescriptions/%' THEN '✅ URL apunta a prescriptions'
        WHEN url LIKE '%/storage/v1/object/public/consultation-images/%' THEN '⚠️ URL apunta a consultation-images (puede no existir)'
        WHEN url LIKE '%/storage/v1/object/public/%' THEN '✅ URL apunta a algún bucket público'
        WHEN url LIKE '%/storage/v1/object/%' THEN '⚠️ URL apunta a bucket privado'
        ELSE '❓ URL no identificada'
    END as analisis_url,
    -- Ver si el path coincide con lo que debería estar en prescriptions
    CASE 
        WHEN path LIKE 'consultations/%' THEN '⚠️ Path organizado (no es el path real)'
        WHEN path LIKE '%/%' AND path NOT LIKE 'consultations/%' THEN '✅ Path real (prescriptionId/timestamp_filename)'
        ELSE '⚠️ Path solo nombre'
    END as analisis_path
FROM consultation_files
ORDER BY created_at DESC;

-- PASO 2: Ver el path real en prescription_files para comparar
SELECT 
    pf.id as prescription_file_id,
    pf.prescription_id,
    pf.file_name,
    pf.path as path_real_en_prescription_files,
    pf.url as url_en_prescription_files,
    p.consultation_id
FROM prescription_files pf
JOIN prescription p ON p.id = pf.prescription_id
ORDER BY pf.created_at DESC
LIMIT 5;

-- PASO 3: Comparar consultation_files con prescription_files para encontrar matches
SELECT 
    cf.id as consultation_file_id,
    cf.file_name,
    cf.path as path_en_consultation_files,
    cf.url as url_en_consultation_files,
    pf.path as path_real_en_prescription_files,
    pf.url as url_real_en_prescription_files,
    CASE 
        WHEN cf.url = pf.url THEN '✅ URLs coinciden'
        WHEN cf.path = pf.path THEN '✅ Paths coinciden'
        WHEN cf.file_name = pf.file_name AND p.consultation_id = cf.consultation_id THEN '✅ Match por nombre y consulta'
        ELSE '⚠️ No hay match claro'
    END as match_status
FROM consultation_files cf
LEFT JOIN prescription p ON p.consultation_id = cf.consultation_id
LEFT JOIN prescription_files pf ON pf.prescription_id = p.id 
    AND pf.file_name = cf.file_name
ORDER BY cf.created_at DESC;

-- PASO 4: Si encontramos matches, podemos actualizar consultation_files con el path y URL correctos
-- ⚠️ DESCOMENTA Y EJECUTA SOLO SI ENCONTRAMOS MATCHES EN EL PASO 3
/*
UPDATE consultation_files cf
SET 
    path = pf.path,
    url = pf.url
FROM prescription_files pf
JOIN prescription p ON p.id = pf.prescription_id
WHERE cf.consultation_id = p.consultation_id
    AND cf.file_name = pf.file_name
    AND (cf.path LIKE 'consultations/%' OR cf.url IS NULL OR cf.url = '')
    AND pf.path IS NOT NULL
    AND pf.url IS NOT NULL;
*/

-- PASO 5: Verificar resultados después de la actualización
-- SELECT id, file_name, path, url FROM consultation_files ORDER BY updated_at DESC LIMIT 5;

