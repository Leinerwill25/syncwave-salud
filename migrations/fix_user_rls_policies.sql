-- ============================================================================
-- Script para corregir las políticas RLS de la tabla User
-- ============================================================================
-- Este script asegura que los usuarios autenticados puedan consultar su propio
-- perfil usando authId, lo cual es crítico para que /api/auth/me funcione.
-- ============================================================================

-- Eliminar políticas existentes para recrearlas correctamente
DROP POLICY IF EXISTS "Users can view their own profile" ON public."user";
DROP POLICY IF EXISTS "Users can update their own profile" ON public."user";

-- User: Permitir a usuarios ver su propio perfil usando authId
-- Esta es la política más importante: permite que un usuario vea su propio perfil
-- usando authId que coincide con auth.uid()
CREATE POLICY "Users can view their own profile"
    ON public."user"
    FOR SELECT
    USING (
        -- Comparar authId (TEXT) con auth.uid() (UUID convertido a TEXT)
        "authId" = auth.uid()::text
        OR
        -- También permitir si el id de user coincide con auth.uid() (por si acaso)
        id::text = auth.uid()::text
    );

-- User: Permitir a usuarios actualizar su propio perfil
CREATE POLICY "Users can update their own profile"
    ON public."user"
    FOR UPDATE
    USING (
        "authId" = auth.uid()::text
        OR
        id::text = auth.uid()::text
    )
    WITH CHECK (
        "authId" = auth.uid()::text
        OR
        id::text = auth.uid()::text
    );

-- Verificar que RLS está habilitado
ALTER TABLE IF EXISTS public."user" ENABLE ROW LEVEL SECURITY;

-- Nota: Si después de ejecutar este script aún hay problemas, puede ser necesario
-- verificar que la sesión de Supabase Auth esté correctamente establecida cuando
-- se hace la consulta. Asegúrate de que el cliente de Supabase tenga acceso a las
-- cookies de sesión.

