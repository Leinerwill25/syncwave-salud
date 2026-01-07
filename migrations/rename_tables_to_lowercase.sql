-- ============================================================================
-- Script para renombrar todas las tablas con primera letra en mayúscula a minúscula
-- ============================================================================
-- Este script renombra las tablas sin perder datos. Las foreign keys y políticas
-- RLS se actualizan automáticamente en PostgreSQL cuando renombras una tabla.
-- ============================================================================
-- IMPORTANTE: 
-- 1. Haz un BACKUP de tu base de datos antes de ejecutar este script
-- 2. Ejecuta este script en una transacción para poder hacer rollback si es necesario
-- 3. Después de ejecutar, necesitarás actualizar tu código para usar los nuevos nombres
-- ============================================================================

BEGIN;

-- ============================================================================
-- Renombrar tablas de mayúscula a minúscula
-- ============================================================================
-- El orden es importante: primero las tablas base, luego las que dependen de ellas

-- Tablas base (sin dependencias o con menos dependencias)
ALTER TABLE IF EXISTS public."Plan" RENAME TO plan;
ALTER TABLE IF EXISTS public."Patient" RENAME TO patient;
ALTER TABLE IF EXISTS public."Organization" RENAME TO organization;

-- Tablas que dependen de las anteriores
-- NOTA: "user" es palabra reservada en PostgreSQL, pero podemos usarlo con comillas
-- PostgREST/Supabase lo reconocerá como "user" en minúsculas
ALTER TABLE IF EXISTS public."User" RENAME TO "user";
ALTER TABLE IF EXISTS public."Invite" RENAME TO invite;
ALTER TABLE IF EXISTS public."FamilyGroup" RENAME TO familygroup;
ALTER TABLE IF EXISTS public."FamilyGroupMember" RENAME TO familygroupmember;
ALTER TABLE IF EXISTS public."MedicalRecord" RENAME TO medicalrecord;
ALTER TABLE IF EXISTS public."Notification" RENAME TO notification;
ALTER TABLE IF EXISTS public."Subscription" RENAME TO subscription;

-- ============================================================================
-- Verificar que las tablas se renombraron correctamente
-- ============================================================================

DO $$
DECLARE
    expected_tables TEXT[] := ARRAY['plan', 'patient', 'organization', 'user', 'invite', 
                                     'familygroup', 'familygroupmember', 'medicalrecord', 
                                     'notification', 'subscription'];
    tbl_name TEXT;
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    table_exists BOOLEAN;
BEGIN
    -- Verificar cada tabla esperada
    FOREACH tbl_name IN ARRAY expected_tables
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = tbl_name
        ) INTO table_exists;
        
        IF NOT table_exists THEN
            missing_tables := array_append(missing_tables, tbl_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE WARNING 'Algunas tablas no se encontraron después del renombrado: %', missing_tables;
    ELSE
        RAISE NOTICE 'Todas las tablas se renombraron correctamente';
    END IF;
END $$;

-- ============================================================================
-- IMPORTANTE: Revisa los resultados antes de hacer COMMIT
-- ============================================================================
-- Si todo está bien, descomenta la siguiente línea para hacer commit:
-- COMMIT;

-- Si hay problemas, ejecuta ROLLBACK para revertir todos los cambios:
-- ROLLBACK;

-- ============================================================================
-- DESPUÉS DE EJECUTAR ESTE SCRIPT:
-- ============================================================================
-- 1. Actualiza tu código para usar los nuevos nombres de tabla:
--    - "User" -> "user" (o user sin comillas en el código)
--    - "Patient" -> "patient"
--    - "Organization" -> "organization"
--    - etc.
--
-- 2. Actualiza las políticas RLS si es necesario (generalmente se actualizan
--    automáticamente, pero verifica)
--
-- 3. Si usas PostgREST/Supabase, puede necesitar un refresh del schema cache
--
-- 4. Actualiza cualquier vista, función o trigger que referencie las tablas antiguas
-- ============================================================================
