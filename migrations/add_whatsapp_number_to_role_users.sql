-- Agregar campo whatsapp_number a consultorio_role_users para que el asistente pueda registrar su número personal
ALTER TABLE public.consultorio_role_users
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

COMMENT ON COLUMN public.consultorio_role_users.whatsapp_number IS 'Número de WhatsApp personal del asistente/recepción que usa para agendar y comunicarse con los pacientes. Formato internacional con código de país (ej: +584121234567).';

