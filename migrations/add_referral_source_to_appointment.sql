-- Agregar campo referral_source a la tabla appointment
-- Este campo permite rastrear de dónde viene el cliente (Facebook, Instagram, WhatsApp, etc.)

ALTER TABLE public.appointment
ADD COLUMN IF NOT EXISTS referral_source VARCHAR(50) DEFAULT NULL;

COMMENT ON COLUMN public.appointment.referral_source IS 'Origen del cliente: FACEBOOK, INSTAGRAM, WHATSAPP, REFERIDO (Boca en Boca), OTRO';

-- Crear índice para búsquedas por origen
CREATE INDEX IF NOT EXISTS idx_appointment_referral_source 
ON public.appointment(referral_source);

