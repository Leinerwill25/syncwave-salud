-- ============================================================================
-- Migración: Permitir acceso público a la tabla de invitaciones
-- ============================================================================
-- Propósito: Permitir que usuarios no autenticados puedan validar su invitación
-- mediante el token enviado por correo electrónico.
-- ============================================================================

-- Habilitar RLS si no está habilitado (debería estarlo)
ALTER TABLE IF EXISTS public.invite ENABLE ROW LEVEL SECURITY;

-- Eliminar policy si existe para evitar duplicados si se corre varias veces
DROP POLICY IF EXISTS "Public can view invites by token" ON public.invite;

-- Crear policy que permite a cualquiera ver una invitación
-- El filtrado real ocurre por el token en la consulta del frontend/API
CREATE POLICY "Public can view invites by token"
    ON public.invite
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Comentario explicativo
COMMENT ON POLICY "Public can view invites by token" ON public.invite 
IS 'Permite que usuarios (incluso no autenticados) consulten datos de invitación para el registro.';
