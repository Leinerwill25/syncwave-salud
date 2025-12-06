-- Migración para agregar campo unregistered_patient_id a la tabla Patient
-- Este campo permite relacionar un paciente registrado con su registro previo como paciente no registrado

-- Agregar la columna unregistered_patient_id a la tabla Patient
ALTER TABLE "Patient" 
ADD COLUMN IF NOT EXISTS "unregistered_patient_id" UUID UNIQUE;

-- Crear índice para mejorar las consultas
CREATE INDEX IF NOT EXISTS "idx_patient_unregistered_patient_id" 
ON "Patient"("unregistered_patient_id");

-- Comentario explicativo
COMMENT ON COLUMN "Patient"."unregistered_patient_id" IS 'ID del paciente no registrado relacionado (de la tabla unregisteredpatients en Supabase). Se usa cuando un paciente se registra y tiene consultas previas como paciente no registrado.';

