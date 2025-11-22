-- Agregar campo payment_methods a la tabla medic_profile
-- Este campo almacenará los métodos de pago configurados por el especialista

ALTER TABLE public.medic_profile 
ADD COLUMN IF NOT EXISTS payment_methods jsonb DEFAULT '[]'::jsonb;

-- Comentario para documentar el campo
COMMENT ON COLUMN public.medic_profile.payment_methods IS 'Métodos de pago configurados por el especialista. Formato: [{"type": "pago_movil", "enabled": true, "data": {"cedula": "V-12345678", "banco": "Banesco", "telefono": "0412-1234567"}}]';

-- Crear índice GIN para búsquedas eficientes en el campo JSONB
CREATE INDEX IF NOT EXISTS idx_medic_profile_payment_methods 
ON public.medic_profile USING gin (payment_methods);

