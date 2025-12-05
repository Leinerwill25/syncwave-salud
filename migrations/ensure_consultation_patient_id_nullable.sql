-- Migración para asegurar que patient_id en consultation sea nullable
-- Esto permite que las consultas de pacientes no registrados no requieran un patient_id

-- Verificar y modificar si es necesario
DO $$
BEGIN
    -- Verificar si patient_id tiene restricción NOT NULL
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'consultation'
          AND column_name = 'patient_id'
          AND is_nullable = 'NO'
    ) THEN
        -- Hacer patient_id nullable
        ALTER TABLE public.consultation ALTER COLUMN patient_id DROP NOT NULL;
        RAISE NOTICE 'Columna patient_id ahora es nullable';
    ELSE
        RAISE NOTICE 'Columna patient_id ya es nullable o no existe';
    END IF;
END $$;

-- Verificar el estado final
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'consultation' 
  AND column_name IN ('patient_id', 'unregistered_patient_id')
ORDER BY column_name;

