-- Migración: Agregar campo unregistered_patient_id a la tabla appointment
-- Similar a como está implementado en la tabla consultation

-- 1. Hacer que patient_id sea nullable (para permitir citas solo con unregistered_patient_id)
ALTER TABLE public.appointment 
ALTER COLUMN patient_id DROP NOT NULL;

-- 2. Agregar el campo unregistered_patient_id
ALTER TABLE public.appointment 
ADD COLUMN IF NOT EXISTS unregistered_patient_id UUID;

-- 3. Agregar foreign key constraint a la tabla unregisteredpatients
ALTER TABLE public.appointment
ADD CONSTRAINT fk_appointment_unregistered_patient 
FOREIGN KEY (unregistered_patient_id) 
REFERENCES public.unregisteredpatients(id) 
ON DELETE SET NULL;

-- 4. Agregar índice para mejorar las consultas
CREATE INDEX IF NOT EXISTS idx_appointment_unregistered_patient_id 
ON public.appointment(unregistered_patient_id);

-- 5. Agregar constraint para asegurar que al menos uno de los dos campos esté presente
-- (patient_id o unregistered_patient_id debe ser NOT NULL)
ALTER TABLE public.appointment
ADD CONSTRAINT chk_appointment_has_patient 
CHECK (
  (patient_id IS NOT NULL) OR (unregistered_patient_id IS NOT NULL)
);

-- Nota: Esta migración permite que las citas se asocien directamente con pacientes no registrados
-- sin necesidad de crear registros temporales en la tabla Patient.

