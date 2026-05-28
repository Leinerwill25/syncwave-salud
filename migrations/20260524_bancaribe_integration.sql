-- Migration for Bancaribe Open Banking integration in ASHIRA
BEGIN;

-- 1. Crear la tabla public.bancaribe_config
CREATE TABLE IF NOT EXISTS public.bancaribe_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organization(id) ON DELETE CASCADE,
  rif text NOT NULL,
  cuenta_bancaribe text NULL,
  telefono_comercio text NULL,
  hash_cliente text NULL,
  notificaciones_activas boolean NOT NULL DEFAULT false,
  webhook_configurado boolean NOT NULL DEFAULT false,
  is_sandbox boolean NOT NULL DEFAULT true,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT bancaribe_config_pkey PRIMARY KEY (id),
  CONSTRAINT bancaribe_config_org_unique UNIQUE (organization_id)
);

-- Habilitar RLS en public.bancaribe_config
ALTER TABLE public.bancaribe_config ENABLE ROW LEVEL SECURITY;

-- Crear políticas para bancaribe_config
CREATE POLICY "Users can view their own organization config" 
  ON public.bancaribe_config FOR SELECT 
  USING (
    organization_id IN (
      SELECT "organizationId" FROM public.users WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can manage their own organization config" 
  ON public.bancaribe_config FOR ALL
  USING (
    organization_id IN (
      SELECT "organizationId" FROM public.users WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT "organizationId" FROM public.users WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
    )
  );

-- 2. Crear la tabla public.bancaribe_pagos
CREATE TABLE IF NOT EXISTS public.bancaribe_pagos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organization(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  currency_code text NOT NULL DEFAULT 'VES',
  bank_name text NULL,
  client_phone text NULL,
  commerce_phone text NULL,
  creditor_account text NULL,
  debtor_account text NULL,
  debtor_id text NULL,
  destiny_bank_reference text NULL,
  origin_bank_code text NULL,
  origin_bank_reference text NULL,
  payment_type text NULL,
  transaction_date text NULL,
  transaction_time text NULL,
  appointment_id uuid NULL,
  status text NOT NULL DEFAULT 'received',
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT bancaribe_pagos_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_bancaribe_pagos_org ON public.bancaribe_pagos(organization_id);
CREATE INDEX IF NOT EXISTS idx_bancaribe_pagos_phone ON public.bancaribe_pagos(client_phone);
CREATE INDEX IF NOT EXISTS idx_bancaribe_pagos_status ON public.bancaribe_pagos(status);

-- Habilitar RLS en public.bancaribe_pagos
ALTER TABLE public.bancaribe_pagos ENABLE ROW LEVEL SECURITY;

-- Crear políticas para bancaribe_pagos
CREATE POLICY "Users can view their own organization payments" 
  ON public.bancaribe_pagos FOR SELECT 
  USING (
    organization_id IN (
      SELECT "organizationId" FROM public.users WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
    )
  );

-- 3. Modificar la tabla public.appointment
ALTER TABLE public.appointment 
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_reference text NULL,
  ADD COLUMN IF NOT EXISTS payment_amount numeric NULL,
  ADD COLUMN IF NOT EXISTS payment_verified_at timestamp with time zone NULL;

COMMIT;
