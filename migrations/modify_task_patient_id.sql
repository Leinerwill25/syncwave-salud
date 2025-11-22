-- Migración para modificar la tabla task y permitir pacientes no registrados
-- Similar a modify_lab_result_patient_id.sql

-- Paso 1: Eliminar la foreign key constraint existente
ALTER TABLE task
DROP CONSTRAINT IF EXISTS fk_task_patient;

-- Paso 2: Asegurar que patient_id sea nullable (por si acaso)
ALTER TABLE task
ALTER COLUMN patient_id DROP NOT NULL;

-- Paso 3: Agregar columna unregistered_patient_id si no existe (opcional, para mejor tracking)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task' AND column_name = 'unregistered_patient_id'
    ) THEN
        ALTER TABLE task
        ADD COLUMN unregistered_patient_id UUID REFERENCES unregisteredpatients(id);
    END IF;
END $$;

-- Paso 4: Crear índices para mejorar el rendimiento de búsquedas
CREATE INDEX IF NOT EXISTS idx_task_patient_id ON task(patient_id);
CREATE INDEX IF NOT EXISTS idx_task_unregistered_patient_id ON task(unregistered_patient_id);

-- Nota: Después de ejecutar esta migración, el código de la API deberá:
-- 1. Detectar si el patient_id es de un paciente registrado o no registrado
-- 2. Si es no registrado, usar unregistered_patient_id en lugar de patient_id
-- 3. O usar patient_id con el ID del paciente no registrado (si se permite)

