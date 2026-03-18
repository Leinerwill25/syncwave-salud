-- MIGRACIÓN: MOVIMIENTOS DE INVENTARIO (COMPRAS Y ENTREGAS)
-- Esta tabla permite rastrear cada ingreso y egreso de materiales/medicamentos.

CREATE TABLE IF NOT EXISTS public.admin_inventory_movements (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    item_id uuid NOT NULL, -- UUID de la tabla de materiales o medicamentos
    item_type text NOT NULL CHECK (item_type IN ('MATERIAL', 'MEDICAMENTO')),
    type text NOT NULL CHECK (type IN ('IN', 'OUT')), -- IN (Compra), OUT (Entrega/Uso)
    reason text NOT NULL CHECK (reason IN ('COMPRA', 'ENTREGA', 'AJUSTE', 'DEVOLUCION')),
    quantity integer NOT NULL CHECK (quantity > 0),
    unit_price numeric DEFAULT 0, -- Solo para compras
    total_amount numeric DEFAULT 0, -- Solo para compras
    supplier_name text, -- Para compras
    recipient_name text, -- Para entregas
    notes text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT admin_inventory_movements_pkey PRIMARY KEY (id),
    CONSTRAINT admin_inventory_movements_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id),
    CONSTRAINT admin_inventory_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.admin_inventory_movements ENABLE ROW LEVEL SECURITY;

-- Política de RLS robusta (basada en la tabla users)
DROP POLICY IF EXISTS "Movimientos: Acceso total por organización" ON public.admin_inventory_movements;
CREATE POLICY "Movimientos: Acceso total por organización" 
ON public.admin_inventory_movements FOR ALL TO authenticated
USING (organization_id = (SELECT "organizationId" FROM public.users WHERE "authId" = auth.uid()::text LIMIT 1))
WITH CHECK (organization_id = (SELECT "organizationId" FROM public.users WHERE "authId" = auth.uid()::text LIMIT 1));

-- Comentarios
COMMENT ON TABLE public.admin_inventory_movements IS 'Historial de todos los movimientos de inventario (compras, entregas, ajustes).';
