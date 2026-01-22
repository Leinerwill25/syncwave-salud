-- ============================================================================
-- SCRIPT SIMPLE: Corregir políticas RLS de notification
-- ============================================================================
-- Este script SOLO corrige las políticas RLS de la tabla notification
-- No incluye verificaciones complejas que puedan causar errores
-- ============================================================================

-- Habilitar RLS
ALTER TABLE IF EXISTS public.notification ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes (usar nombres conocidos)
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notification;
DROP POLICY IF EXISTS "Users can manage their notifications" ON public.notification;
DROP POLICY IF EXISTS "Users can view notifications in their organization" ON public.notification;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notification;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notification;
DROP POLICY IF EXISTS "Users can delete their notifications" ON public.notification;

-- Crear políticas correctas
CREATE POLICY "Users can view their notifications"
    ON public.notification
    FOR SELECT
    USING (
        "organizationId" IN (
            SELECT "organizationId" 
            FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "userId" IN (
            SELECT id 
            FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

CREATE POLICY "Users can manage their notifications"
    ON public.notification
    FOR ALL
    USING (
        "organizationId" IN (
            SELECT "organizationId" 
            FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "userId" IN (
            SELECT id 
            FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    )
    WITH CHECK (
        "organizationId" IN (
            SELECT "organizationId" 
            FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- Verificación simple (sin funciones complejas)
SELECT 
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'notification'
ORDER BY policyname;

