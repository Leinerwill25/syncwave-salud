-- Script para corregir las claves incorrectas en report_templates_by_specialty
-- Este script migra las plantillas que tienen claves como "[\"Ginecología\",\"Obstetricia\"]"
-- a claves individuales como "Ginecología" y "Obstetricia"

BEGIN;

-- Función para limpiar y migrar las claves incorrectas
DO $$
DECLARE
    profile_record RECORD;
    templates_json jsonb;
    new_templates_json jsonb := '{}'::jsonb;
    old_key text;
    new_key text;
    template_data jsonb;
    specialty_array text[];
    specialty_item text;
    has_changes boolean := false;
BEGIN
    -- Iterar sobre todos los perfiles médicos que tienen report_templates_by_specialty
    FOR profile_record IN 
        SELECT 
            doctor_id,
            report_templates_by_specialty
        FROM public.medic_profile
        WHERE report_templates_by_specialty IS NOT NULL
          AND report_templates_by_specialty::text != '{}'
    LOOP
        templates_json := profile_record.report_templates_by_specialty;
        new_templates_json := '{}'::jsonb;
        has_changes := false;
        
        -- Iterar sobre todas las claves en el objeto JSON
        FOR old_key IN SELECT jsonb_object_keys(templates_json)
        LOOP
            template_data := templates_json->old_key;
            
            -- Verificar si la clave es un array stringificado (empieza con [ y termina con ])
            IF old_key LIKE '[%]' THEN
                -- Intentar parsear como array JSON
                BEGIN
                    specialty_array := ARRAY(SELECT jsonb_array_elements_text(old_key::jsonb));
                    
                    -- Para cada especialidad en el array, crear una entrada individual
                    FOREACH specialty_item IN ARRAY specialty_array
                    LOOP
                        -- Si ya existe una entrada para esta especialidad, preservarla
                        -- Si no, usar los datos del array stringificado
                        IF new_templates_json ? specialty_item THEN
                            -- Ya existe, mantener la existente
                            RAISE NOTICE 'Especialidad % ya existe, preservando datos existentes', specialty_item;
                        ELSE
                            -- Crear nueva entrada con los datos del array stringificado
                            new_templates_json := new_templates_json || jsonb_build_object(specialty_item, template_data);
                            RAISE NOTICE 'Migrando datos de clave "%" a especialidad "%"', old_key, specialty_item;
                            has_changes := true;
                        END IF;
                    END LOOP;
                EXCEPTION WHEN OTHERS THEN
                    -- Si no se puede parsear, mantener la clave original pero loguear
                    RAISE WARNING 'No se pudo parsear la clave "%", manteniendo original', old_key;
                    new_templates_json := new_templates_json || jsonb_build_object(old_key, template_data);
                END;
            ELSE
                -- La clave es normal, mantenerla
                new_templates_json := new_templates_json || jsonb_build_object(old_key, template_data);
            END IF;
        END LOOP;
        
        -- Si hubo cambios, actualizar el registro
        IF has_changes THEN
            UPDATE public.medic_profile
            SET report_templates_by_specialty = new_templates_json
            WHERE doctor_id = profile_record.doctor_id;
            
            RAISE NOTICE 'Actualizado doctor_id: %', profile_record.doctor_id;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Migración completada';
END $$;

-- Verificar resultados después de la migración
SELECT 
    doctor_id,
    jsonb_object_keys(report_templates_by_specialty) as especialidades
FROM public.medic_profile
WHERE report_templates_by_specialty IS NOT NULL
  AND report_templates_by_specialty::text != '{}'
ORDER BY doctor_id;

COMMIT;

-- NOTA: Este script:
-- 1. Identifica claves que son arrays stringificados (ej: "[\"Ginecología\",\"Obstetricia\"]")
-- 2. Parsea el array y crea una entrada individual para cada especialidad
-- 3. Preserva los datos existentes si ya hay una entrada para esa especialidad
-- 4. Actualiza solo los registros que tienen claves incorrectas
-- 5. No elimina datos, solo reorganiza la estructura

