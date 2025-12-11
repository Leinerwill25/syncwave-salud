-- Tabla para guardar los pagos de suscripciones de consultorios
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid, -- Usuario que realizó el pago
  payment_method text NOT NULL CHECK (payment_method IN ('BINANCE', 'PAGO_MOVIL')),
  
  -- Montos
  amount_euros numeric(10, 2) NOT NULL,
  amount_bs numeric(15, 2), -- Solo para pago móvil
  exchange_rate numeric(10, 4), -- Tasa de cambio Euro a Bs usada
  
  -- Datos específicos de Binance
  binance_id text, -- ID de Binance: 791 706 063
  binance_transaction_hash text, -- Hash de la transacción USDT
  
  -- Datos específicos de Pago Móvil
  payment_mobile_ci text, -- Cédula: 29.897.548
  payment_mobile_phone text, -- Teléfono: 04126111969
  payment_mobile_bank text, -- Banco Venezuela o Banco Bancamiga
  payment_reference_number text, -- Número de referencia del pago móvil
  
  -- Archivos adjuntos
  payment_screenshot_url text, -- URL de la captura de pantalla subida
  
  -- Información del consultorio/doctor
  organization_name text NOT NULL,
  organization_phone text NOT NULL,
  
  -- Estado del pago
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED')),
  verified_at timestamp with time zone,
  verified_by uuid, -- Usuario admin que verificó el pago
  rejection_reason text,
  
  -- Metadata
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT subscription_payments_pkey PRIMARY KEY (id),
  CONSTRAINT fk_subscription_payment_organization FOREIGN KEY (organization_id) REFERENCES public.Organization(id) ON DELETE CASCADE,
  CONSTRAINT fk_subscription_payment_user FOREIGN KEY (user_id) REFERENCES public.User(id) ON DELETE SET NULL,
  CONSTRAINT fk_subscription_payment_verified_by FOREIGN KEY (verified_by) REFERENCES public.User(id) ON DELETE SET NULL
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_subscription_payments_organization ON public.subscription_payments(organization_id);
CREATE INDEX idx_subscription_payments_status ON public.subscription_payments(status);
CREATE INDEX idx_subscription_payments_created_at ON public.subscription_payments(created_at DESC);

-- Comentarios
COMMENT ON TABLE public.subscription_payments IS 'Registro de pagos de suscripciones realizados por consultorios';
COMMENT ON COLUMN public.subscription_payments.payment_method IS 'Método de pago: BINANCE (USDT) o PAGO_MOVIL (Bolívares)';
COMMENT ON COLUMN public.subscription_payments.amount_euros IS 'Monto en euros de la suscripción';
COMMENT ON COLUMN public.subscription_payments.amount_bs IS 'Monto equivalente en bolívares (solo para pago móvil)';
COMMENT ON COLUMN public.subscription_payments.exchange_rate IS 'Tasa de cambio Euro a Bolívares al momento del pago';

