-- Tabla para métodos de pago personalizados de role-users (recepcionistas)
-- Cada organización puede tener sus propios métodos de pago configurados por recepcionistas

CREATE TABLE IF NOT EXISTS public.role_user_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public."Organization"(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by_role_user_id UUID REFERENCES public.consultorio_role_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_org_method_name UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_role_user_payment_methods_org ON public.role_user_payment_methods(organization_id);
CREATE INDEX IF NOT EXISTS idx_role_user_payment_methods_active ON public.role_user_payment_methods(is_active);

COMMENT ON TABLE public.role_user_payment_methods IS 'Métodos de pago personalizados configurados por recepcionistas para cada organización';
COMMENT ON COLUMN public.role_user_payment_methods.name IS 'Nombre del método de pago (ej: Transferencia, Pago Móvil, Efectivo, etc.)';
COMMENT ON COLUMN public.role_user_payment_methods.description IS 'Descripción opcional del método de pago';

