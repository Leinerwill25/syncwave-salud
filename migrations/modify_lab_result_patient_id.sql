-- Migration: Modificar lab_result para aceptar patient_id de Patient o unregisteredpatients
-- Este script elimina la foreign key constraint y permite que patient_id acepte IDs de ambas tablas

-- Paso 1: Eliminar la foreign key constraint existente
ALTER TABLE lab_result 
DROP CONSTRAINT IF EXISTS fk_labresult_patient;

-- Paso 2: Asegurar que patient_id sea nullable (por si acaso)
ALTER TABLE lab_result 
ALTER COLUMN patient_id DROP NOT NULL;

-- Paso 3: Agregar columna unregistered_patient_id si no existe (opcional, para mejor tracking)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lab_result' AND column_name = 'unregistered_patient_id'
    ) THEN
        ALTER TABLE lab_result 
        ADD COLUMN unregistered_patient_id UUID REFERENCES unregisteredpatients(id);
    END IF;
END $$;

-- Paso 4: Crear un índice para mejorar el rendimiento de búsquedas
CREATE INDEX IF NOT EXISTS idx_lab_result_patient_id ON lab_result(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_result_unregistered_patient_id ON lab_result(unregistered_patient_id);

-- Nota: La validación de que el patient_id existe en Patient o unregisteredpatients
-- se hará a nivel de aplicación, no a nivel de base de datos, para mayor flexibilidad.

