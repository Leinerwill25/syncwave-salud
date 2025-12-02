-- Migración para agregar soporte de pacientes no registrados a la tabla prescription
-- Similar a como se hizo con consultation y appointment

-- 1. Hacer patient_id nullable (si no lo es ya)
ALTER TABLE public.prescription 
ALTER COLUMN patient_id DROP NOT NULL;

-- 2. Agregar columna unregistered_patient_id
ALTER TABLE public.prescription 
ADD COLUMN IF NOT EXISTS unregistered_patient_id uuid;

-- 3. Agregar foreign key constraint a unregisteredpatients
ALTER TABLE public.prescription 
ADD CONSTRAINT fk_prescription_unregistered_patient 
FOREIGN KEY (unregistered_patient_id) 
REFERENCES public.unregisteredpatients(id);

-- 4. Agregar constraint para asegurar que al menos uno de los dos IDs esté presente
-- (Esto se puede hacer con un CHECK constraint, pero PostgreSQL no soporta CHECK con subconsultas complejas)
-- En su lugar, validaremos esto en la aplicación

-- 5. Crear índice para mejorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_prescription_unregistered_patient_id 
ON public.prescription(unregistered_patient_id);

-- Verificar que la migración se aplicó correctamente
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'prescription' 
  AND column_name IN ('patient_id', 'unregistered_patient_id')
ORDER BY column_name;

