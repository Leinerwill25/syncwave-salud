-- ============================================================================
-- Script para asegurar que los pacientes puedan ver su propio registro en la tabla user
-- Esto es crítico para que getAuthenticatedPatient() funcione correctamente
-- ============================================================================

-- Verificar que RLS esté habilitado en la tabla user
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'user'
    ) THEN
        RAISE EXCEPTION 'Tabla user no existe';
    END IF;
END $$;

-- ============================================================================
-- TABLA: user
-- ============================================================================

-- Eliminar política existente si existe (para recrearla correctamente)
DROP POLICY IF EXISTS "Users can view their own profile" ON public."user";
DROP POLICY IF EXISTS "Patients can view their own user record" ON public."user";

-- Política 1: Usuarios pueden ver su propio perfil (incluye pacientes)
CREATE POLICY "Users can view their own profile"
    ON public."user"
    FOR SELECT
    USING (
        -- Usuario puede ver su propio registro si su authId coincide con auth.uid()
        "authId" = auth.uid()::text
        OR
        -- O si su id coincide con auth.uid() (para compatibilidad)
        id::text = auth.uid()::text
    );

-- Política 2: Pacientes pueden ver su propio registro de usuario
-- Esta política es redundante pero específica para asegurar que los pacientes puedan acceder
CREATE POLICY "Patients can view their own user record"
    ON public."user"
    FOR SELECT
    USING (
        -- Paciente puede ver su registro si su authId coincide con auth.uid()
        "authId" = auth.uid()::text
        AND
        -- Y su role es PACIENTE
        role = 'PACIENTE'
    );

-- Asegurar que RLS esté habilitado
ALTER TABLE IF EXISTS public."user" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Verificación final
-- ============================================================================

DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    -- Verificar políticas en user
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user' AND policyname LIKE '%view%';
    
    IF policy_count < 1 THEN
        RAISE WARNING 'Esperábamos al menos 1 política de SELECT en user, encontramos %', policy_count;
    END IF;
    
    RAISE NOTICE 'Políticas RLS configuradas correctamente para la tabla user';
    RAISE NOTICE 'Políticas de SELECT en user: %', policy_count;
END $$;

