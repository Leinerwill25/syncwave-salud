-- Migration: add_whatsapp_config_to_medic_profile.sql
-- Objetivo: agregar configuración de WhatsApp al perfil del médico para recordatorios de citas

ALTER TABLE public.medic_profile
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_message_template TEXT DEFAULT 'Hola {NOMBRE_PACIENTE}, le recordamos su cita el {FECHA} a las {HORA} con el Dr/a {NOMBRE_DOCTORA} en {CLÍNICA}. Por los servicios de:

{SERVICIOS}

por favor confirmar con un "Asistiré" o "No Asistiré"';

COMMENT ON COLUMN public.medic_profile.whatsapp_number IS 'Número oficial de WhatsApp del consultorio/médico para envío de recordatorios y confirmaciones de citas.';

COMMENT ON COLUMN public.medic_profile.whatsapp_message_template IS 'Plantilla de mensaje de WhatsApp para recordatorios de citas. Soporta variables: {NOMBRE_PACIENTE}, {FECHA}, {HORA}, {NOMBRE_DOCTORA}, {CLÍNICA}, {SERVICIOS}.';


