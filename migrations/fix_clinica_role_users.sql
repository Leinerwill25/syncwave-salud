-- ============================================================================
-- Script para verificar y corregir usuarios con role = 'CLINICA'
-- ============================================================================
-- Este script verifica si hay usuarios con role = 'CLINICA' (que no es un
-- valor válido del enum UserRole) y los actualiza a 'ADMIN' si es necesario.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. VERIFICAR SI HAY USUARIOS CON ROLE = 'CLINICA'
-- ============================================================================

DO $$
DECLARE
    clinica_count INTEGER;
BEGIN
    -- Intentar contar usuarios con role = 'CLINICA'
    -- Nota: Si el enum no tiene 'CLINICA', esta consulta fallará
    BEGIN
        SELECT COUNT(*) INTO clinica_count
        FROM public."user"
        WHERE role::text = 'CLINICA';
        
        IF clinica_count > 0 THEN
            RAISE NOTICE 'Encontrados % usuarios con role = CLINICA. Estos necesitan ser actualizados a ADMIN.', clinica_count;
        ELSE
            RAISE NOTICE 'No se encontraron usuarios con role = CLINICA.';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo verificar usuarios con role = CLINICA. Probablemente el enum no incluye este valor: %', SQLERRM;
    END;
END $$;

-- ============================================================================
-- 2. INTENTAR ACTUALIZAR USUARIOS CON ROLE = 'CLINICA' A 'ADMIN'
-- ============================================================================
-- Nota: Esta actualización solo funcionará si el enum permite 'CLINICA'
-- Si el enum no permite 'CLINICA', esta parte fallará pero el script continuará

DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    BEGIN
        -- Intentar actualizar usuarios con role = 'CLINICA' a 'ADMIN'
        UPDATE public."user"
        SET role = 'ADMIN'::"UserRole"
        WHERE role::text = 'CLINICA';
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
        
        IF updated_count > 0 THEN
            RAISE NOTICE 'Actualizados % usuarios de CLINICA a ADMIN.', updated_count;
        ELSE
            RAISE NOTICE 'No se actualizaron usuarios (probablemente no hay usuarios con role = CLINICA).';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'No se pudieron actualizar usuarios con role = CLINICA. Error: %', SQLERRM;
        RAISE WARNING 'Si hay usuarios con role = CLINICA en la base de datos, necesitarás actualizar el enum UserRole primero o migrar los datos manualmente.';
    END;
END $$;

-- ============================================================================
-- 3. VERIFICAR VALORES DEL ENUM UserRole
-- ============================================================================

DO $$
DECLARE
    enum_values TEXT[];
BEGIN
    -- Obtener todos los valores del enum UserRole
    SELECT array_agg(enumlabel ORDER BY enumsortorder) INTO enum_values
    FROM pg_enum
    WHERE enumtypid = 'public."UserRole"'::regtype;
    
    IF enum_values IS NOT NULL THEN
        RAISE NOTICE 'Valores válidos del enum UserRole: %', array_to_string(enum_values, ', ');
    ELSE
        RAISE WARNING 'No se pudo obtener los valores del enum UserRole.';
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
-- NOTAS:
-- ============================================================================
-- Si el enum UserRole no incluye 'CLINICA' pero hay usuarios con ese rol,
-- tienes dos opciones:
--
-- Opción 1: Agregar 'CLINICA' al enum (NO RECOMENDADO - 'CLINICA' es un tipo
--           de organización, no un rol de usuario):
--   ALTER TYPE "UserRole" ADD VALUE 'CLINICA';
--
-- Opción 2: Actualizar todos los usuarios con role = 'CLINICA' a 'ADMIN'
--   (RECOMENDADO):
--   UPDATE public."user" SET role = 'ADMIN'::"UserRole" WHERE role::text = 'CLINICA';
-- ============================================================================

