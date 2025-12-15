-- Tabla para almacenar el perfil y configuración del médico
-- Esta tabla almacena especialidades, servicios, precios, credenciales, etc.

CREATE TABLE IF NOT EXISTS public.medic_profile (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL UNIQUE,
  
  -- Especialidad
  -- Para médicos afiliados: especialidad seleccionada de la clínica
  -- Para consultorios privados: especialidad propia registrada
  specialty text,
  
  -- Solo para consultorios privados: especialidad propia
  private_specialty text,
  
  -- Archivos
  photo_url text,
  signature_url text,
  
  -- Credenciales (JSON)
  credentials jsonb DEFAULT '{}'::jsonb,
  
  -- Historial crediticio (JSON)
  credit_history jsonb DEFAULT '{}'::jsonb,
  
  -- Servicios ofrecidos (JSON array)
  -- Formato: [{"id": "uuid", "name": "Consulta General", "description": "...", "price": 50.00, "currency": "USD"}]
  services jsonb DEFAULT '[]'::jsonb,

  -- Combos de servicios (JSON array)
  -- Formato: [{"id": "uuid", "name": "Combo Prenatal", "description": "...", "price": 80.00, "currency": "USD", "serviceIds": ["id-serv-1","id-serv-2"]}]
  service_combos jsonb DEFAULT '[]'::jsonb,
  
  -- Horarios de disponibilidad (JSON)
  availability jsonb DEFAULT '{}'::jsonb,
  
  -- Preferencias de notificaciones (JSON)
  notifications jsonb DEFAULT '{"email": true, "whatsapp": false, "push": false}'::jsonb,

  -- Configuración de WhatsApp para recordatorios
  whatsapp_number text,
  whatsapp_message_template text DEFAULT 'Hola {NOMBRE_PACIENTE}, le recordamos su cita el {FECHA} a las {HORA} con el Dr/a {NOMBRE_DOCTORA} en {CLÍNICA}. Por los servicios de:

{SERVICIOS}

por favor confirmar con un "Asistiré" o "No Asistiré"',
  
  -- Seguridad
  two_factor_enabled boolean DEFAULT false,
  two_factor_secret text,
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT medic_profile_pkey PRIMARY KEY (id),
  CONSTRAINT fk_medic_profile_doctor FOREIGN KEY (doctor_id) REFERENCES public."User"(id) ON DELETE CASCADE,
  CONSTRAINT medic_profile_doctor_id_unique UNIQUE (doctor_id)
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_medic_profile_doctor_id ON public.medic_profile(doctor_id);

-- Comentarios
COMMENT ON TABLE public.medic_profile IS 'Perfil profesional y configuración de médicos especialistas';
COMMENT ON COLUMN public.medic_profile.specialty IS 'Especialidad seleccionada de la clínica (para médicos afiliados)';
COMMENT ON COLUMN public.medic_profile.private_specialty IS 'Especialidad propia registrada (para consultorios privados)';
COMMENT ON COLUMN public.medic_profile.services IS 'Array JSON de servicios ofrecidos con id, nombre, descripción y precio';
COMMENT ON COLUMN public.medic_profile.service_combos IS 'Array JSON de combos de servicios con referencias a services (serviceIds) y precio promocional';
COMMENT ON COLUMN public.medic_profile.availability IS 'JSON con horarios de disponibilidad por día';
COMMENT ON COLUMN public.medic_profile.credentials IS 'JSON con información de credenciales (licencia, número, emisor, expiración, archivos)';
COMMENT ON COLUMN public.medic_profile.credit_history IS 'JSON con historial crediticio (universidad, título, certificaciones)';
COMMENT ON COLUMN public.medic_profile.whatsapp_number IS 'Número oficial de WhatsApp del consultorio/médico para envío de recordatorios y confirmaciones de citas.';
COMMENT ON COLUMN public.medic_profile.whatsapp_message_template IS 'Plantilla de mensaje de WhatsApp para recordatorios. Variables: {NOMBRE_PACIENTE}, {FECHA}, {HORA}, {NOMBRE_DOCTORA}, {CLÍNICA}, {SERVICIOS}.';

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_medic_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_medic_profile_updated_at
  BEFORE UPDATE ON public.medic_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_medic_profile_updated_at();

