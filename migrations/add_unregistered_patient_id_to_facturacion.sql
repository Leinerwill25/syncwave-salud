-- Migración: Agregar campo unregistered_patient_id a la tabla facturacion
-- Esta migración permite que la tabla facturacion soporte tanto pacientes registrados como no registrados

-- 1. Hacer que patient_id sea nullable (para permitir facturas solo con unregistered_patient_id)
-- Primero eliminar la constraint NOT NULL si existe
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'facturacion' 
        AND column_name = 'patient_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.facturacion ALTER COLUMN patient_id DROP NOT NULL;
    END IF;
END $$;

-- 2. Agregar el campo unregistered_patient_id si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'facturacion' 
        AND column_name = 'unregistered_patient_id'
    ) THEN
        ALTER TABLE public.facturacion ADD COLUMN unregistered_patient_id UUID;
    END IF;
END $$;

-- 3. Eliminar constraint existente si existe antes de agregar la nueva
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'facturacion' 
        AND constraint_name = 'fk_facturacion_unregistered_patient'
    ) THEN
        ALTER TABLE public.facturacion DROP CONSTRAINT fk_facturacion_unregistered_patient;
    END IF;
END $$;

-- 4. Agregar foreign key constraint a unregisteredpatients
ALTER TABLE public.facturacion
ADD CONSTRAINT fk_facturacion_unregistered_patient
FOREIGN KEY (unregistered_patient_id) REFERENCES public.unregisteredpatients(id)
ON DELETE SET NULL;

-- 5. Eliminar check constraint existente si existe
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'facturacion' 
        AND constraint_name = 'chk_facturacion_patient_type'
    ) THEN
        ALTER TABLE public.facturacion DROP CONSTRAINT chk_facturacion_patient_type;
    END IF;
END $$;

-- 6. Agregar un check constraint para asegurar que al menos uno de los dos IDs esté presente
ALTER TABLE public.facturacion
ADD CONSTRAINT chk_facturacion_patient_type
CHECK (
  (patient_id IS NOT NULL AND unregistered_patient_id IS NULL) OR
  (patient_id IS NULL AND unregistered_patient_id IS NOT NULL)
);

-- 7. Crear índice para mejorar el rendimiento de las consultas (si no existe)
CREATE INDEX IF NOT EXISTS idx_facturacion_unregistered_patient_id 
ON public.facturacion(unregistered_patient_id);

