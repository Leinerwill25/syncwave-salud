-- Agregar campos para ajustes de monto en facturacion
-- Estos campos permiten registrar descuentos o cargos adicionales con su razón

ALTER TABLE public.facturacion
ADD COLUMN IF NOT EXISTS ajuste_monto DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS razon_ajuste TEXT;

COMMENT ON COLUMN public.facturacion.ajuste_monto IS 'Monto de ajuste (positivo para cargos adicionales, negativo para descuentos). Se suma al total calculado.';
COMMENT ON COLUMN public.facturacion.razon_ajuste IS 'Razón justificada del ajuste de monto';

