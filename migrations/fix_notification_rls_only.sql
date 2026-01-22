-- ============================================================================
-- MIGRACIÓN: Corregir políticas RLS solo para la tabla notification
-- ============================================================================
-- Este script SOLO afecta la tabla notification y sus políticas RLS
-- No modifica ninguna otra tabla o política
-- ============================================================================

-- Habilitar RLS en la tabla notification (si no está habilitado)
ALTER TABLE IF EXISTS public.notification ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ELIMINAR políticas existentes
-- ============================================================================

-- Nota: Solo intentamos eliminar políticas de la tabla notification (minúscula)
-- porque la tabla "Notification" (mayúscula) no existe en la base de datos

-- Eliminar políticas existentes con el nombre correcto (notification en minúscula)
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notification;
DROP POLICY IF EXISTS "Users can manage their notifications" ON public.notification;

-- ============================================================================
-- CREAR políticas RLS correctas para notification
-- ============================================================================

-- Política 1: SELECT - Permitir a usuarios ver sus notificaciones
-- Los usuarios pueden ver notificaciones de su organización o notificaciones dirigidas a ellos
CREATE POLICY "Users can view their notifications"
    ON public.notification
    FOR SELECT
    USING (
        -- Notificaciones de su organización
        "organizationId" IN (
            SELECT "organizationId" 
            FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        -- Notificaciones dirigidas específicamente a ellos
        "userId" IN (
            SELECT id 
            FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- Política 2: INSERT/UPDATE/DELETE - Permitir a usuarios gestionar notificaciones
-- Los usuarios autenticados pueden crear notificaciones en su organización
-- Solo pueden actualizar/eliminar notificaciones de su organización o dirigidas a ellos
CREATE POLICY "Users can manage their notifications"
    ON public.notification
    FOR ALL
    USING (
        -- Para SELECT/UPDATE/DELETE: solo notificaciones de su organización o dirigidas a ellos
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
        -- Para INSERT: solo pueden crear notificaciones en su organización
        "organizationId" IN (
            SELECT "organizationId" 
            FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- ============================================================================
-- VERIFICACIÓN (opcional - puedes comentar estas líneas si no quieres ejecutarlas)
-- ============================================================================

-- Verificar que las políticas se crearon correctamente
-- SELECT 
--     schemaname,
--     tablename,
--     policyname,
--     permissive,
--     roles,
--     cmd,
--     qual,
--     with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' 
--     AND tablename = 'notification'
-- ORDER BY policyname;

