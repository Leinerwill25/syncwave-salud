-- SCRIPT DE CORRECCIÓN DEFINITIVO: RLS PARA INVENTARIO (BASADO EN TABLA USERS)
-- Este script utiliza la tabla public.users para validar la organización del usuario.

-- 1. Habilitar RLS
ALTER TABLE public.admin_inventory_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_inventory_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_inventory_assignments ENABLE ROW LEVEL SECURITY;

-- 2. Limpiar políticas previas
DROP POLICY IF EXISTS "Materiales: Gestión por organización" ON public.admin_inventory_materials;
DROP POLICY IF EXISTS "Medicamentos: Gestión por organización" ON public.admin_inventory_medications;
DROP POLICY IF EXISTS "Asignaciones: Gestión por organización" ON public.admin_inventory_assignments;
DROP POLICY IF EXISTS "Materiales: Acceso por organización" ON public.admin_inventory_materials;
DROP POLICY IF EXISTS "Medicamentos: Acceso por organización" ON public.admin_inventory_medications;
DROP POLICY IF EXISTS "Asignaciones: Acceso por organización" ON public.admin_inventory_assignments;

-- 3. Crear nuevas políticas usando JOIN con public.users
-- Nota: Usamos auth.uid()::text para comparar con users."authId"

-- POLÍTICA PARA MATERIALES
CREATE POLICY "Materiales: Acceso total por organización" 
ON public.admin_inventory_materials
FOR ALL 
TO authenticated
USING (
  organization_id = (
    SELECT "organizationId" 
    FROM public.users 
    WHERE "authId" = auth.uid()::text 
    LIMIT 1
  )
)
WITH CHECK (
  organization_id = (
    SELECT "organizationId" 
    FROM public.users 
    WHERE "authId" = auth.uid()::text 
    LIMIT 1
  )
);

-- POLÍTICA PARA MEDICAMENTOS
CREATE POLICY "Medicamentos: Acceso total por organización" 
ON public.admin_inventory_medications
FOR ALL 
TO authenticated
USING (
  organization_id = (
    SELECT "organizationId" 
    FROM public.users 
    WHERE "authId" = auth.uid()::text 
    LIMIT 1
  )
)
WITH CHECK (
  organization_id = (
    SELECT "organizationId" 
    FROM public.users 
    WHERE "authId" = auth.uid()::text 
    LIMIT 1
  )
);

-- POLÍTICA PARA ASIGNACIONES
CREATE POLICY "Asignaciones: Acceso total por organización" 
ON public.admin_inventory_assignments
FOR ALL 
TO authenticated
USING (
  organization_id = (
    SELECT "organizationId" 
    FROM public.users 
    WHERE "authId" = auth.uid()::text 
    LIMIT 1
  )
)
WITH CHECK (
  organization_id = (
    SELECT "organizationId" 
    FROM public.users 
    WHERE "authId" = auth.uid()::text 
    LIMIT 1
  )
);

-- COMENTARIOS
COMMENT ON POLICY "Materiales: Acceso total por organización" ON public.admin_inventory_materials IS 'Permite gestión completa de materiales basada en la organización del usuario en la tabla users.';
