-- Tabla para almacenar permisos de acceso médico otorgados por pacientes
-- Permite a especialistas acceder al historial completo del paciente después de validar el código TOTP

CREATE TABLE IF NOT EXISTS public.MedicalAccessGrant (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  granted_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  revoked_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  
  CONSTRAINT fk_medical_access_grant_patient FOREIGN KEY (patient_id) REFERENCES public.Patient(id) ON DELETE CASCADE,
  CONSTRAINT fk_medical_access_grant_doctor FOREIGN KEY (doctor_id) REFERENCES public.User(id) ON DELETE CASCADE,
  CONSTRAINT unique_patient_doctor_active UNIQUE (patient_id, doctor_id) WHERE is_active = true
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_medical_access_grant_patient ON public.MedicalAccessGrant(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_access_grant_doctor ON public.MedicalAccessGrant(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_access_grant_active ON public.MedicalAccessGrant(is_active) WHERE is_active = true;

-- Comentarios
COMMENT ON TABLE public.MedicalAccessGrant IS 'Permisos de acceso médico otorgados por pacientes a especialistas';
COMMENT ON COLUMN public.MedicalAccessGrant.patient_id IS 'ID del paciente que otorga el acceso';
COMMENT ON COLUMN public.MedicalAccessGrant.doctor_id IS 'ID del médico que recibe el acceso';
COMMENT ON COLUMN public.MedicalAccessGrant.granted_at IS 'Fecha y hora en que se otorgó el acceso';
COMMENT ON COLUMN public.MedicalAccessGrant.expires_at IS 'Fecha y hora de expiración del acceso (opcional)';
COMMENT ON COLUMN public.MedicalAccessGrant.revoked_at IS 'Fecha y hora en que se revocó el acceso';
COMMENT ON COLUMN public.MedicalAccessGrant.is_active IS 'Indica si el acceso está activo';

