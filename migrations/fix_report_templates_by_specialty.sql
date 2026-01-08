-- Script para verificar y asegurar que el campo report_templates_by_specialty
-- esté correctamente configurado como JSONB en la tabla medic_profile
-- Este script NO modifica datos existentes, solo verifica la estructura

-- Verificar que el campo existe y es de tipo JSONB
DO $$
BEGIN
    -- Verificar si la columna existe
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'medic_profile' 
        AND column_name = 'report_templates_by_specialty'
    ) THEN
        -- Verificar el tipo de dato
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'medic_profile' 
            AND column_name = 'report_templates_by_specialty'
            AND data_type = 'jsonb'
        ) THEN
            RAISE NOTICE '✅ Campo report_templates_by_specialty existe y es de tipo JSONB';
        ELSE
            RAISE WARNING '⚠️ Campo report_templates_by_specialty existe pero NO es JSONB. Necesita migración.';
        END IF;
    ELSE
        RAISE WARNING '⚠️ Campo report_templates_by_specialty NO existe. Necesita ser creado.';
        -- Crear el campo si no existe
        ALTER TABLE public.medic_profile 
        ADD COLUMN IF NOT EXISTS report_templates_by_specialty jsonb DEFAULT '{}'::jsonb;
        RAISE NOTICE '✅ Campo report_templates_by_specialty creado como JSONB';
    END IF;
END $$;

-- Verificar estructura de datos existentes (solo lectura, no modifica)
-- Esto muestra un resumen de cómo están estructuradas las plantillas
SELECT 
    doctor_id,
    CASE 
        WHEN report_templates_by_specialty IS NULL THEN 'NULL'
        WHEN report_templates_by_specialty::text = '{}' THEN 'VACÍO'
        ELSE 'CON DATOS'
    END as estado,
    jsonb_object_keys(report_templates_by_specialty) as especialidades
FROM public.medic_profile
WHERE report_templates_by_specialty IS NOT NULL 
  AND report_templates_by_specialty::text != '{}'
LIMIT 10;

-- Mostrar un ejemplo de la estructura de datos (solo para debugging)
SELECT 
    doctor_id,
    report_templates_by_specialty
FROM public.medic_profile
WHERE report_templates_by_specialty IS NOT NULL 
  AND report_templates_by_specialty::text != '{}'
LIMIT 3;

-- NOTA: Este script NO modifica datos existentes.
-- Solo verifica la estructura y muestra ejemplos de cómo están almacenados los datos.
-- Si necesitas migrar datos existentes de campos antiguos (report_template_url, etc.)
-- a report_templates_by_specialty, necesitarás un script de migración adicional.

