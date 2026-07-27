-- ============================================================================
-- MIGRATION: Marketing & Control de Inventario para Módulo de Farmacias
-- Fecha: 2026-06-09
-- ============================================================================

BEGIN;

-- 1. Añadir columna inventory_tracking_enabled a pharmacy_site_config
ALTER TABLE public.pharmacy_site_config 
ADD COLUMN IF NOT EXISTS inventory_tracking_enabled BOOLEAN DEFAULT false;

-- 2. Modificar pharmacy_product_clicks para soportar medication_id y product_id nullable
ALTER TABLE public.pharmacy_product_clicks 
ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE public.pharmacy_product_clicks 
ADD COLUMN IF NOT EXISTS medication_id UUID REFERENCES public.medication_catalog(id) ON DELETE SET NULL;

-- 3. Tabla de Videos Promocionales (Marketing)
CREATE TABLE IF NOT EXISTS public.pharmacy_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organization(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    video_url TEXT NOT NULL,
    platform TEXT NOT NULL,
    embed_url TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de Descuentos Visuales (Marketing)
CREATE TABLE IF NOT EXISTS public.pharmacy_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organization(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    discount_pct NUMERIC NOT NULL,
    category_id UUID REFERENCES public.pharmacy_categories(id) ON DELETE SET NULL,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabla de Banners/Carrusel (Marketing)
CREATE TABLE IF NOT EXISTS public.pharmacy_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organization(id) ON DELETE CASCADE,
    header_tag TEXT,
    product_name TEXT,
    headline TEXT NOT NULL,
    subtitle TEXT,
    image_url TEXT,
    bg_color TEXT DEFAULT '#ffffff',
    text_color TEXT DEFAULT '#000000',
    button_color TEXT DEFAULT '#10b981',
    button_text_color TEXT DEFAULT '#ffffff',
    button_text TEXT DEFAULT 'Comprar',
    whatsapp_message TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabla de Auditoría de Productos (pharmacy_product_logs)
CREATE TABLE IF NOT EXISTS public.pharmacy_product_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organization(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.pharmacy_products(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    user_id UUID, -- id del usuario de la tabla public.users
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabla de Recepciones de Mercancía (pharmacy_receptions)
CREATE TABLE IF NOT EXISTS public.pharmacy_receptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organization(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.pharmacy_products(id) ON DELETE CASCADE,
    invoiced_qty INTEGER NOT NULL,
    received_qty INTEGER NOT NULL,
    rejected_qty INTEGER DEFAULT 0,
    rejection_reason TEXT,
    user_id UUID, -- id del usuario de la tabla public.users
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.pharmacy_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_product_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_receptions ENABLE ROW LEVEL SECURITY;

-- 8. Crear políticas de RLS basadas en org_id = public.auth_user_org_id()
-- 8.1 Videos RLS
DROP POLICY IF EXISTS "Allow public select on pharmacy videos" ON public.pharmacy_videos;
CREATE POLICY "Allow public select on pharmacy videos"
    ON public.pharmacy_videos FOR SELECT
    USING (is_active = true OR org_id = public.auth_user_org_id());

DROP POLICY IF EXISTS "Allow organization users to manage videos" ON public.pharmacy_videos;
CREATE POLICY "Allow organization users to manage videos"
    ON public.pharmacy_videos FOR ALL
    USING (org_id = public.auth_user_org_id())
    WITH CHECK (org_id = public.auth_user_org_id());

-- 8.2 Descuentos RLS
DROP POLICY IF EXISTS "Allow public select on pharmacy discounts" ON public.pharmacy_discounts;
CREATE POLICY "Allow public select on pharmacy discounts"
    ON public.pharmacy_discounts FOR SELECT
    USING (is_active = true OR org_id = public.auth_user_org_id());

DROP POLICY IF EXISTS "Allow organization users to manage discounts" ON public.pharmacy_discounts;
CREATE POLICY "Allow organization users to manage discounts"
    ON public.pharmacy_discounts FOR ALL
    USING (org_id = public.auth_user_org_id())
    WITH CHECK (org_id = public.auth_user_org_id());

-- 8.3 Banners RLS
DROP POLICY IF EXISTS "Allow public select on pharmacy banners" ON public.pharmacy_banners;
CREATE POLICY "Allow public select on pharmacy banners"
    ON public.pharmacy_banners FOR SELECT
    USING (is_active = true OR org_id = public.auth_user_org_id());

DROP POLICY IF EXISTS "Allow organization users to manage banners" ON public.pharmacy_banners;
CREATE POLICY "Allow organization users to manage banners"
    ON public.pharmacy_banners FOR ALL
    USING (org_id = public.auth_user_org_id())
    WITH CHECK (org_id = public.auth_user_org_id());

-- 8.4 Logs RLS
DROP POLICY IF EXISTS "Allow organization users to view product logs" ON public.pharmacy_product_logs;
CREATE POLICY "Allow organization users to view product logs"
    ON public.pharmacy_product_logs FOR SELECT
    USING (org_id = public.auth_user_org_id());

DROP POLICY IF EXISTS "Allow organization users to manage product logs" ON public.pharmacy_product_logs;
CREATE POLICY "Allow organization users to manage product logs"
    ON public.pharmacy_product_logs FOR INSERT
    WITH CHECK (org_id = public.auth_user_org_id());

-- 8.5 Recepciones RLS
DROP POLICY IF EXISTS "Allow organization users to view receptions" ON public.pharmacy_receptions;
CREATE POLICY "Allow organization users to view receptions"
    ON public.pharmacy_receptions FOR SELECT
    USING (org_id = public.auth_user_org_id());

DROP POLICY IF EXISTS "Allow organization users to manage receptions" ON public.pharmacy_receptions;
CREATE POLICY "Allow organization users to manage receptions"
    ON public.pharmacy_receptions FOR INSERT
    WITH CHECK (org_id = public.auth_user_org_id());

COMMIT;
