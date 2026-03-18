-- SCRIPT DE CORRECCIÓN: POLÍTICAS DE RLS PARA INVENTARIO
-- Este script habilita RLS y define las políticas de acceso para las tablas de inventario clínico.

-- 1. Habilitar RLS en las tablas
ALTER TABLE public.admin_inventory_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_inventory_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_inventory_assignments ENABLE ROW LEVEL SECURITY;

-- 2. Limpiar políticas existentes (si las hay) para evitar conflictos
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Materiales: Gestión por organización" ON public.admin_inventory_materials;
    DROP POLICY IF EXISTS "Medicamentos: Gestión por organización" ON public.admin_inventory_medications;
    DROP POLICY IF EXISTS "Asignaciones: Gestión por organización" ON public.admin_inventory_assignments;
END $$;

-- 3. Crear nuevas políticas integrales (SELECT, INSERT, UPDATE, DELETE)

-- POLÍTICAS PARA MATERIALES
CREATE POLICY "Materiales: Gestión por organización" 
ON public.admin_inventory_materials
FOR ALL
TO authenticated
USING (
  organization_id = (auth.jwt() -> 'user_metadata' ->> 'organizationId')::UUID
)
WITH CHECK (
  organization_id = (auth.jwt() -> 'user_metadata' ->> 'organizationId')::UUID
);

-- POLÍTICAS PARA MEDICAMENTOS
CREATE POLICY "Medicamentos: Gestión por organización" 
ON public.admin_inventory_medications
FOR ALL
TO authenticated
USING (
  organization_id = (auth.jwt() -> 'user_metadata' ->> 'organizationId')::UUID
)
WITH CHECK (
  organization_id = (auth.jwt() -> 'user_metadata' ->> 'organizationId')::UUID
);

-- POLÍTICAS PARA ASIGNACIONES
CREATE POLICY "Asignaciones: Gestión por organización" 
ON public.admin_inventory_assignments
FOR ALL
TO authenticated
USING (
  organization_id = (auth.jwt() -> 'user_metadata' ->> 'organizationId')::UUID
)
WITH CHECK (
  organization_id = (auth.jwt() -> 'user_metadata' ->> 'organizationId')::UUID
);

-- COMENTARIOS DE AYUDA
COMMENT ON TABLE public.admin_inventory_materials IS 'Materiales clínicos protegidos por organización vía RLS.';
COMMENT ON TABLE public.admin_inventory_medications IS 'Medicamentos protegidos por organización vía RLS.';
COMMENT ON TABLE public.admin_inventory_assignments IS 'Asignaciones de inventario protegidas por organización vía RLS.';
