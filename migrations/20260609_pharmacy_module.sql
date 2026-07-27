-- ============================================================================
-- MIGRATION: Módulo de Farmacias para ASHIRA
-- Fecha: 2026-06-09
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. FUNCIONES HELPER (Anti-recursión RLS)
-- ============================================================================

-- Obtener la organización del usuario autenticado de forma segura
CREATE OR REPLACE FUNCTION public.auth_user_org_id() 
RETURNS UUID
LANGUAGE sql 
SECURITY DEFINER 
STABLE AS $$
  SELECT "organizationId" FROM public.users 
  WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text 
  LIMIT 1;
$$;

-- Verificar si el usuario autenticado es administrador de ASHIRA
CREATE OR REPLACE FUNCTION public.is_admin_ashira() 
RETURNS BOOLEAN
LANGUAGE sql 
SECURITY DEFINER 
STABLE AS $$
  SELECT COALESCE(
    (SELECT role::text = 'SAFECARE' FROM public.users WHERE "authId" = auth.uid()::text LIMIT 1),
    false
  );
$$;

-- Función genérica para actualizar timestamp updated_at
CREATE OR REPLACE FUNCTION public.update_pharmacy_updated_at() 
RETURNS TRIGGER 
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. TABLAS DEL MÓDULO
-- ============================================================================

-- 2.1 Catálogo Maestro (Vademécum)
CREATE TABLE IF NOT EXISTS public.medication_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inn TEXT NOT NULL,                           -- Principio activo (DCI)
    concentration TEXT,                          -- Concentración (ej. "500 mg")
    pharmaceutical_form TEXT,                     -- Forma farmacéutica (ej. "comprimido")
    atc_code TEXT,                               -- Clasificación ATC (opcional)
    therapeutic_class TEXT,                      -- Clase terapéutica (ej. "Antibiótico")
    is_controlled BOOLEAN DEFAULT false,         -- Requiere receta médica retenida / psicotrópico
    search_vector tsvector,                      -- Para búsqueda full-text
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triggers para búsqueda full-text del catálogo maestro
CREATE OR REPLACE FUNCTION public.medication_catalog_vector_trigger() 
RETURNS TRIGGER 
LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('spanish', COALESCE(NEW.inn, '')) ||
    to_tsvector('spanish', COALESCE(NEW.concentration, '')) ||
    to_tsvector('spanish', COALESCE(NEW.pharmaceutical_form, '')) ||
    to_tsvector('spanish', COALESCE(NEW.therapeutic_class, ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_medication_catalog_vector ON public.medication_catalog;
CREATE TRIGGER trigger_update_medication_catalog_vector
    BEFORE INSERT OR UPDATE ON public.medication_catalog
    FOR EACH ROW 
    EXECUTE FUNCTION public.medication_catalog_vector_trigger();

-- Índice GIN para búsqueda full-text
CREATE INDEX IF NOT EXISTS idx_medication_catalog_search ON public.medication_catalog USING gin(search_vector);

-- 2.2 Categorías de Productos de la Farmacia
CREATE TABLE IF NOT EXISTS public.pharmacy_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organization(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    emoji TEXT,
    image_url TEXT,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_categories_org_id ON public.pharmacy_categories(org_id);

-- 2.3 Productos de la Farmacia (con campos ricos opcionales)
CREATE TABLE IF NOT EXISTS public.pharmacy_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organization(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                          -- Nombre comercial (ej. "LOSAR plus")
    medication_id UUID REFERENCES public.medication_catalog(id) ON DELETE SET NULL, -- Enlace al vademécum
    category_id UUID REFERENCES public.pharmacy_categories(id) ON DELETE SET NULL,
    description TEXT,
    image_url TEXT,
    availability TEXT DEFAULT 'in_stock' CHECK (availability IN ('in_stock', 'out_of_stock')),
    is_featured BOOLEAN DEFAULT false,
    
    -- Campos ricos opcionales
    currency TEXT CHECK (currency IN ('USD', 'EUR', 'BS')),
    price NUMERIC,
    bultos INTEGER,
    units_per_bulto INTEGER,
    stock_units INTEGER,                         -- Stock numérico (privado)
    discount_pct NUMERIC,
    expiry_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_products_org_id ON public.pharmacy_products(org_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_products_medication_id ON public.pharmacy_products(medication_id);

DROP TRIGGER IF EXISTS trigger_update_pharmacy_products_updated_at ON public.pharmacy_products;
CREATE TRIGGER trigger_update_pharmacy_products_updated_at
    BEFORE UPDATE ON public.pharmacy_products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_pharmacy_updated_at();

-- 2.4 Sedes / Sucursales con Geolocalización
CREATE TABLE IF NOT EXISTS public.pharmacy_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organization(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    schedule TEXT,
    lat DOUBLE PRECISION,                        -- Latitud real
    lng DOUBLE PRECISION,                        -- Longitud real
    maps_url TEXT,                               -- Enlace maps (opcional)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_locations_org_id ON public.pharmacy_locations(org_id);

-- 2.5 Configuración de Presencia Digital (Constructor de Sitio)
CREATE TABLE IF NOT EXISTS public.pharmacy_site_config (
    org_id UUID PRIMARY KEY REFERENCES public.organization(id) ON DELETE CASCADE,
    template_id TEXT NOT NULL DEFAULT 'farmatuya', -- Plantilla de render
    slug TEXT UNIQUE NOT NULL,                   -- URL pública: /farmacia/[slug]
    logo_url TEXT,
    color_primary TEXT,
    color_secondary TEXT,
    color_accent TEXT,
    whatsapp_number TEXT,                        -- Número para enlace "Consultar por WhatsApp"
    content JSONB DEFAULT '{}'::jsonb,           -- Slots fijos ({ mision, vision, hero, contacto })
    is_published BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_update_pharmacy_site_config_updated_at ON public.pharmacy_site_config;
CREATE TRIGGER trigger_update_pharmacy_site_config_updated_at
    BEFORE UPDATE ON public.pharmacy_site_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_pharmacy_updated_at();

-- 2.6 Auditoría de clics en "Consultar por WhatsApp"
CREATE TABLE IF NOT EXISTS public.pharmacy_product_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organization(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.pharmacy_products(id) ON DELETE CASCADE,
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_product_clicks_org_id ON public.pharmacy_product_clicks(org_id);

-- ============================================================================
-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.medication_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_site_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_product_clicks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. POLÍTICAS DE ACCESO RLS
-- ============================================================================

-- 4.1 Catálogo Maestro (medication_catalog)
DROP POLICY IF EXISTS "Allow public select on medication catalog" ON public.medication_catalog;
CREATE POLICY "Allow public select on medication catalog"
    ON public.medication_catalog FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow only system admins to manage medication catalog" ON public.medication_catalog;
CREATE POLICY "Allow only system admins to manage medication catalog"
    ON public.medication_catalog FOR ALL
    USING (public.is_admin_ashira())
    WITH CHECK (public.is_admin_ashira());

-- 4.2 Categorías (pharmacy_categories)
DROP POLICY IF EXISTS "Allow public select on pharmacy categories" ON public.pharmacy_categories;
CREATE POLICY "Allow public select on pharmacy categories"
    ON public.pharmacy_categories FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow organization users to manage categories" ON public.pharmacy_categories;
CREATE POLICY "Allow organization users to manage categories"
    ON public.pharmacy_categories FOR ALL
    USING (org_id = public.auth_user_org_id())
    WITH CHECK (org_id = public.auth_user_org_id());

-- 4.3 Productos (pharmacy_products)
DROP POLICY IF EXISTS "Allow public select on pharmacy products" ON public.pharmacy_products;
CREATE POLICY "Allow public select on pharmacy products"
    ON public.pharmacy_products FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow organization users to manage products" ON public.pharmacy_products;
CREATE POLICY "Allow organization users to manage products"
    ON public.pharmacy_products FOR ALL
    USING (org_id = public.auth_user_org_id())
    WITH CHECK (org_id = public.auth_user_org_id());

-- 4.4 Sedes (pharmacy_locations)
DROP POLICY IF EXISTS "Allow public select on pharmacy locations" ON public.pharmacy_locations;
CREATE POLICY "Allow public select on pharmacy locations"
    ON public.pharmacy_locations FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow organization users to manage locations" ON public.pharmacy_locations;
CREATE POLICY "Allow organization users to manage locations"
    ON public.pharmacy_locations FOR ALL
    USING (org_id = public.auth_user_org_id())
    WITH CHECK (org_id = public.auth_user_org_id());

-- 4.5 Configuración de Sitio (pharmacy_site_config)
DROP POLICY IF EXISTS "Allow public select on pharmacy site config" ON public.pharmacy_site_config;
CREATE POLICY "Allow public select on pharmacy site config"
    ON public.pharmacy_site_config FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow organization users to manage site config" ON public.pharmacy_site_config;
CREATE POLICY "Allow organization users to manage site config"
    ON public.pharmacy_site_config FOR ALL
    USING (org_id = public.auth_user_org_id())
    WITH CHECK (org_id = public.auth_user_org_id());

-- 4.6 Clics (pharmacy_product_clicks)
DROP POLICY IF EXISTS "Allow anyone to record clicks" ON public.pharmacy_product_clicks;
CREATE POLICY "Allow anyone to record clicks"
    ON public.pharmacy_product_clicks FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow organization users to view their product clicks" ON public.pharmacy_product_clicks;
CREATE POLICY "Allow organization users to view their product clicks"
    ON public.pharmacy_product_clicks FOR SELECT
    USING (org_id = public.auth_user_org_id());

COMMIT;
