-- Script para corregir el archivo actual
-- Este script actualiza el path y corrige la URL si tiene encoding doble

-- PASO 1: Ver el estado actual
SELECT 
    id,
    file_name,
    path as path_actual,
    url as url_actual,
    -- Detectar encoding doble en la URL
    CASE 
        WHEN url LIKE '%252C%' THEN '⚠️ URL con encoding doble (%252C)'
        WHEN url LIKE '%2C%' THEN '✅ URL con encoding correcto (%2C)'
        ELSE '✅ URL sin comas'
    END as encoding_status
FROM consultation_files
WHERE id = '685e5505-4d9e-4304-b2c6-5a4871e11de5';

-- PASO 2: Actualizar el path al path real y corregir la URL si tiene encoding doble
DO $$
DECLARE
    v_id UUID := '685e5505-4d9e-4304-b2c6-5a4871e11de5';
    v_new_path TEXT := 'd557dd43-e60b-424c-98e6-b1e7ed2ece3d/1764380912587_ChatGPT_Image_26_nov_2025%2C_11_45_57.png';
    v_double_enc TEXT := '%252C';
    v_correct_enc TEXT := '%2C';
BEGIN
    UPDATE consultation_files
    SET 
        path = v_new_path,
        url = REPLACE(url, v_double_enc, v_correct_enc)
    WHERE id = v_id;
END $$;

-- PASO 3: Verificar el resultado
SELECT 
    id,
    file_name,
    path as path_corregido,
    url as url_corregida,
    CASE 
        WHEN url LIKE '%252C%' THEN '❌ Aún tiene encoding doble'
        WHEN url LIKE '%2C%' THEN '✅ Encoding correcto'
        ELSE '✅ Sin problemas de encoding'
    END as encoding_status_final
FROM consultation_files
WHERE id = '685e5505-4d9e-4304-b2c6-5a4871e11de5';

