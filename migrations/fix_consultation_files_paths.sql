-- Script SQL para corregir los paths organizados a paths reales
-- Este script actualiza los paths de "consultations/..." a los paths reales del bucket

-- ANTES DE EJECUTAR: 
-- 1. Verifica qué paths necesitas corregir con: SELECT id, path, url FROM consultation_files WHERE path LIKE 'consultations/%';
-- 2. Asegúrate de tener una copia de seguridad
-- 3. El path real debe estar en el formato: prescriptionId/timestamp_filename
--    Este path se obtiene de la tabla prescription_files

-- Paso 1: Ver archivos con paths organizados que necesitan corrección
SELECT 
    cf.id,
    cf.consultation_id,
    cf.file_name,
    cf.path as path_actual,
    cf.url,
    -- Buscar el path real en prescription_files
    pf.path as path_real_en_prescription_files,
    pf.prescription_id
FROM consultation_files cf
LEFT JOIN prescription_files pf ON cf.file_name = pf.file_name 
    AND cf.consultation_id IN (
        SELECT consultation_id FROM prescription WHERE id = pf.prescription_id
    )
WHERE cf.path LIKE 'consultations/%'
ORDER BY cf.created_at DESC;

-- Paso 2: Actualizar paths organizados con paths reales (SOLO SI ENCONTRAMOS MATCHES)
-- ⚠️ EJECUTAR SOLO DESPUÉS DE VERIFICAR QUE LOS PATHS REALES COINCIDEN
/*
UPDATE consultation_files cf
SET path = pf.path
FROM prescription_files pf
WHERE cf.file_name = pf.file_name 
    AND cf.path LIKE 'consultations/%'
    AND cf.consultation_id IN (
        SELECT consultation_id FROM prescription WHERE id = pf.prescription_id
    )
    AND pf.path IS NOT NULL
    AND pf.path != '';
*/

-- Paso 3: Verificar resultados después de la actualización
-- SELECT id, file_name, path, url FROM consultation_files ORDER BY updated_at DESC LIMIT 10;

