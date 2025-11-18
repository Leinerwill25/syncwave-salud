-- Tabla para almacenar códigos TOTP de acceso médico para pacientes
-- Permite a especialistas acceder a información médica usando códigos temporales

CREATE TABLE IF NOT EXISTS public.PatientAccessKey (
  patient_id uuid NOT NULL PRIMARY KEY,
  secret text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_patient_access_key_patient FOREIGN KEY (patient_id) REFERENCES public.Patient(id) ON DELETE CASCADE
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_patient_access_key_secret ON public.PatientAccessKey(secret);

-- Comentarios
COMMENT ON TABLE public.PatientAccessKey IS 'Códigos TOTP para acceso médico temporal a información de pacientes';
COMMENT ON COLUMN public.PatientAccessKey.secret IS 'Secreto TOTP para generar códigos de 6 dígitos';
COMMENT ON COLUMN public.PatientAccessKey.patient_id IS 'ID del paciente al que pertenece el código de acceso';

