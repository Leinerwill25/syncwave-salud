-- Migración: Validar y agregar todos los campos necesarios en la tabla facturacion
-- Esta migración asegura que la tabla facturacion tenga todos los campos necesarios
-- para soportar pacientes registrados, no registrados, y consultas directas

-- ============================================
-- 1. VALIDAR Y AGREGAR unregistered_patient_id
-- ============================================
DO $$ 
DECLARE
    v_schema TEXT := 'public';
    v_table TEXT := 'facturacion';
    v_column TEXT := 'unregistered_patient_id';
BEGIN
    -- Agregar unregistered_patient_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = v_schema 
        AND table_name = v_table 
        AND column_name = v_column
    ) THEN
        EXECUTE format('ALTER TABLE %I.%I ADD COLUMN %I UUID', v_schema, v_table, v_column);
        RAISE NOTICE 'Campo % agregado a %', v_column, v_table;
    ELSE
        RAISE NOTICE 'Campo % ya existe en %', v_column, v_table;
    END IF;
END $$;

-- ============================================
-- 2. HACER patient_id NULLABLE
-- ============================================
DO $$ 
BEGIN
    -- Hacer patient_id nullable si no lo es
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'facturacion' 
        AND column_name = 'patient_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.facturacion ALTER COLUMN patient_id DROP NOT NULL;
        RAISE NOTICE 'Campo patient_id ahora es nullable en facturacion';
    ELSE
        RAISE NOTICE 'Campo patient_id ya es nullable en facturacion';
    END IF;
END $$;

-- ============================================
-- 3. AGREGAR consultation_id (opcional, para mejor trazabilidad)
-- ============================================
DO $$ 
BEGIN
    -- Agregar consultation_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'facturacion' 
        AND column_name = 'consultation_id'
    ) THEN
        ALTER TABLE public.facturacion ADD COLUMN consultation_id UUID;
        RAISE NOTICE 'Campo consultation_id agregado a facturacion';
    ELSE
        RAISE NOTICE 'Campo consultation_id ya existe en facturacion';
    END IF;
END $$;

-- ============================================
-- 4. AGREGAR FOREIGN KEY para unregistered_patient_id
-- ============================================
DO $$ 
BEGIN
    -- Eliminar constraint existente si existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'facturacion' 
        AND constraint_name = 'fk_facturacion_unregistered_patient'
    ) THEN
        ALTER TABLE public.facturacion DROP CONSTRAINT fk_facturacion_unregistered_patient;
        RAISE NOTICE 'Constraint fk_facturacion_unregistered_patient eliminado (se recreará)';
    END IF;
END $$;

-- Agregar foreign key constraint a unregisteredpatients
ALTER TABLE public.facturacion
ADD CONSTRAINT fk_facturacion_unregistered_patient
FOREIGN KEY (unregistered_patient_id) REFERENCES public.unregisteredpatients(id)
ON DELETE SET NULL;

-- ============================================
-- 5. AGREGAR FOREIGN KEY para consultation_id (si se agregó)
-- ============================================
DO $$ 
BEGIN
    -- Agregar foreign key para consultation_id si existe la columna
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'facturacion' 
        AND column_name = 'consultation_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'facturacion' 
        AND constraint_name = 'fk_facturacion_consultation'
    ) THEN
        ALTER TABLE public.facturacion
        ADD CONSTRAINT fk_facturacion_consultation
        FOREIGN KEY (consultation_id) REFERENCES public.consultation(id)
        ON DELETE SET NULL;
        RAISE NOTICE 'Foreign key fk_facturacion_consultation agregado';
    END IF;
END $$;

-- ============================================
-- 6. ELIMINAR Y RECREAR CHECK CONSTRAINT para patient_type
-- ============================================
DO $$ 
BEGIN
    -- Eliminar check constraint existente si existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'facturacion' 
        AND constraint_name = 'chk_facturacion_patient_type'
    ) THEN
        ALTER TABLE public.facturacion DROP CONSTRAINT chk_facturacion_patient_type;
        RAISE NOTICE 'Check constraint chk_facturacion_patient_type eliminado (se recreará)';
    END IF;
END $$;

-- Agregar check constraint para asegurar que al menos uno de los dos IDs esté presente
ALTER TABLE public.facturacion
ADD CONSTRAINT chk_facturacion_patient_type
CHECK (
  (patient_id IS NOT NULL AND unregistered_patient_id IS NULL) OR
  (patient_id IS NULL AND unregistered_patient_id IS NOT NULL)
);

-- ============================================
-- 7. CREAR ÍNDICES PARA MEJORAR RENDIMIENTO
-- ============================================
-- Índice para unregistered_patient_id
CREATE INDEX IF NOT EXISTS idx_facturacion_unregistered_patient_id 
ON public.facturacion(unregistered_patient_id);

-- Índice para consultation_id (si existe)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'facturacion' 
        AND column_name = 'consultation_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_facturacion_consultation_id 
        ON public.facturacion(consultation_id);
        RAISE NOTICE 'Índice idx_facturacion_consultation_id creado';
    END IF;
END $$;

-- ============================================
-- 8. VALIDAR QUE appointment_id PUEDE SER NULLABLE (opcional)
-- Nota: Por ahora mantenemos appointment_id como NOT NULL porque el código
-- siempre crea un appointment cuando hay consultation_id. Si en el futuro
-- queremos permitir facturaciones sin appointment, descomentar esto:
-- ============================================
-- DO $$ 
-- BEGIN
--     IF EXISTS (
--         SELECT 1 FROM information_schema.columns 
--         WHERE table_schema = 'public' 
--         AND table_name = 'facturacion' 
--         AND column_name = 'appointment_id' 
--         AND is_nullable = 'NO'
--     ) THEN
--         ALTER TABLE public.facturacion ALTER COLUMN appointment_id DROP NOT NULL;
--         RAISE NOTICE 'Campo appointment_id ahora es nullable en facturacion';
--     END IF;
-- END $$;

-- ============================================
-- RESUMEN FINAL
-- ============================================
DO $$ 
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migración completada exitosamente';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Campos validados/agregados:';
    RAISE NOTICE '  - unregistered_patient_id: UUID (nullable)';
    RAISE NOTICE '  - patient_id: UUID (nullable)';
    RAISE NOTICE '  - consultation_id: UUID (nullable, opcional)';
    RAISE NOTICE 'Constraints agregados:';
    RAISE NOTICE '  - fk_facturacion_unregistered_patient';
    RAISE NOTICE '  - fk_facturacion_consultation (si se agregó consultation_id)';
    RAISE NOTICE '  - chk_facturacion_patient_type';
    RAISE NOTICE 'Índices creados:';
    RAISE NOTICE '  - idx_facturacion_unregistered_patient_id';
    RAISE NOTICE '  - idx_facturacion_consultation_id (si se agregó consultation_id)';
    RAISE NOTICE '========================================';
END $$;

