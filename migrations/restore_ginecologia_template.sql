-- Script para restaurar la plantilla de Ginecología desde la clave incorrecta
-- a la clave individual correcta "Ginecología"
-- Este script preserva la plantilla de Obstetricia que ya está correcta

BEGIN;

DO $$
DECLARE
    doctor_id_to_fix uuid := 'db536d90-2f27-4a81-bdde-05b7b7a3de17'; -- Cambiar por tu doctor_id si es diferente
    templates_json jsonb;
    updated_templates_json jsonb;
    ginecologia_data jsonb;
    obstetricia_data jsonb;
    array_key text := '["Ginecología","Obstetricia"]';
    ginecologia_key text := 'Ginecología';
    obstetricia_key text := 'Obstetricia';
    current_key text;
BEGIN
    -- Obtener el perfil del doctor
    SELECT report_templates_by_specialty
    INTO templates_json
    FROM public.medic_profile
    WHERE doctor_id = doctor_id_to_fix;
    
    IF templates_json IS NULL OR templates_json::text = '{}' THEN
        RAISE EXCEPTION 'No se encontró el perfil médico o no hay plantillas guardadas para doctor_id: %', doctor_id_to_fix;
    END IF;
    
    RAISE NOTICE 'Plantillas actuales: %', templates_json;
    
    -- Inicializar el objeto actualizado
    updated_templates_json := '{}'::jsonb;
    
    -- 1. Extraer datos de Ginecología desde la clave del array
    IF templates_json ? array_key THEN
        ginecologia_data := templates_json->array_key;
        RAISE NOTICE '✅ Encontrada plantilla de Ginecología en clave array: %', array_key;
        RAISE NOTICE 'Datos de Ginecología: template_name=%, font_family=%, tiene_template_text=%', 
            ginecologia_data->>'template_name',
            ginecologia_data->>'font_family',
            CASE WHEN ginecologia_data->>'template_text' IS NOT NULL THEN 'Sí' ELSE 'No' END;
        
        -- Agregar Ginecología con sus datos
        updated_templates_json := updated_templates_json || jsonb_build_object(ginecologia_key, ginecologia_data);
    ELSE
        RAISE WARNING 'No se encontró la plantilla de Ginecología en la clave array "%"', array_key;
    END IF;
    
    -- 2. Preservar datos de Obstetricia si existen
    IF templates_json ? obstetricia_key THEN
        obstetricia_data := templates_json->obstetricia_key;
        updated_templates_json := updated_templates_json || jsonb_build_object(obstetricia_key, obstetricia_data);
        RAISE NOTICE '✅ Preservada plantilla de Obstetricia';
    END IF;
    
    -- 3. Preservar cualquier otra clave que no sea el array incorrecto
    FOR current_key IN SELECT jsonb_object_keys(templates_json)
    LOOP
        IF current_key != array_key 
           AND current_key != ginecologia_key 
           AND current_key != obstetricia_key THEN
            -- Preservar otras claves (por si hay otras especialidades)
            updated_templates_json := updated_templates_json || jsonb_build_object(
                current_key, 
                templates_json->current_key
            );
            RAISE NOTICE 'Preservando clave adicional: %', current_key;
        END IF;
    END LOOP;
    
    -- 4. Si Ginecología no se encontró en el array pero existe en otra clave, preservarla
    IF NOT (updated_templates_json ? ginecologia_key) AND templates_json ? ginecologia_key THEN
        updated_templates_json := updated_templates_json || jsonb_build_object(
            ginecologia_key,
            templates_json->ginecologia_key
        );
        RAISE NOTICE '✅ Ginecología ya estaba en clave correcta, preservada';
    END IF;
    
    -- 5. Actualizar en la base de datos
    UPDATE public.medic_profile
    SET report_templates_by_specialty = updated_templates_json
    WHERE doctor_id = doctor_id_to_fix;
    
    IF FOUND THEN
        RAISE NOTICE '✅ Plantilla de Ginecología restaurada exitosamente para doctor_id: %', doctor_id_to_fix;
        RAISE NOTICE 'Estructura final: %', updated_templates_json;
    ELSE
        RAISE EXCEPTION 'No se pudo actualizar el perfil médico';
    END IF;
END $$;

-- Verificar el resultado
SELECT 
    doctor_id,
    jsonb_object_keys(report_templates_by_specialty) as especialidades
FROM public.medic_profile
WHERE doctor_id = 'db536d90-2f27-4a81-bdde-05b7b7a3de17';

-- Mostrar detalles de la plantilla de Ginecología restaurada
SELECT 
    doctor_id,
    'Ginecología' as especialidad,
    report_templates_by_specialty->'Ginecología'->>'template_name' as nombre_plantilla,
    report_templates_by_specialty->'Ginecología'->>'template_url' as url_plantilla,
    report_templates_by_specialty->'Ginecología'->>'font_family' as fuente,
    CASE 
        WHEN report_templates_by_specialty->'Ginecología'->>'template_text' IS NOT NULL 
        THEN LEFT(report_templates_by_specialty->'Ginecología'->>'template_text', 100) || '...'
        ELSE 'No tiene plantilla de texto'
    END as preview_texto
FROM public.medic_profile
WHERE doctor_id = 'db536d90-2f27-4a81-bdde-05b7b7a3de17'
  AND report_templates_by_specialty ? 'Ginecología';

COMMIT;

-- INSTRUCCIONES:
-- 1. Si tu doctor_id es diferente, cambia la variable 'doctor_id_to_fix' en la línea 7
-- 2. Ejecuta este script en tu base de datos (Supabase SQL Editor o tu cliente SQL)
-- 3. Verifica el resultado con las consultas SELECT al final
-- 4. Este script:
--    - Extrae la plantilla de Ginecología desde "[\"Ginecología\",\"Obstetricia\"]"
--    - La coloca en la clave "Ginecología" (individual)
--    - Preserva la plantilla de Obstetricia que ya está correcta
--    - Elimina la clave incorrecta del array
--    - Preserva cualquier otra especialidad que pueda existir
