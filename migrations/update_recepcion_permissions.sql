-- ============================================================================
-- Script para actualizar permisos de roles "Recepción" existentes
-- ============================================================================
-- 
-- Este script actualiza los permisos de los roles de "Recepción" existentes
-- para permitir crear y agendar citas, manteniendo los demás permisos existentes.
--
-- Cambios aplicados:
-- - create: true (permitir crear citas)
-- - schedule: true (permitir agendar citas)
-- - Los demás permisos se mantienen sin cambios
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- PASO 1: Reporte de estado ANTES de la actualización
-- ----------------------------------------------------------------------------
-- Estado ANTES de la actualización
SELECT 
    'ANTES' as estado,
    r.id as role_id,
    r.role_name,
    r.organization_id,
    rp.module,
    rp.permissions as permisos_actuales
FROM public.consultorio_roles r
LEFT JOIN public.consultorio_role_permissions rp ON r.id = rp.role_id AND rp.module = 'citas'
WHERE r.role_name = 'Recepción'
  AND r.is_active = true
ORDER BY r.organization_id, r.created_at;

-- ----------------------------------------------------------------------------
-- PASO 2: Actualizar permisos del módulo 'citas' para roles "Recepción"
-- ----------------------------------------------------------------------------
-- Para cada rol de "Recepción", actualizar el permiso del módulo 'citas'
-- estableciendo create: true y schedule: true, manteniendo los demás permisos

DO $$
DECLARE
    role_record RECORD;
    current_permissions JSONB;
    updated_permissions JSONB;
    updated_count INTEGER := 0;
BEGIN
    -- Iterar sobre todos los roles de "Recepción" activos
    FOR role_record IN 
        SELECT id, role_name, organization_id
        FROM public.consultorio_roles
        WHERE role_name = 'Recepción'
          AND is_active = true
    LOOP
        -- Obtener permisos actuales del módulo 'citas' para este rol
        SELECT permissions INTO current_permissions
        FROM public.consultorio_role_permissions
        WHERE role_id = role_record.id
          AND module = 'citas'
        LIMIT 1;

        -- Si no existe el permiso del módulo 'citas', crearlo
        IF current_permissions IS NULL THEN
            INSERT INTO public.consultorio_role_permissions (
                role_id,
                module,
                permissions,
                created_at,
                updated_at
            )
            VALUES (
                role_record.id,
                'citas',
                '{"view": true, "create": true, "edit": true, "delete": false, "confirm": false, "schedule": true, "cancel": true}'::jsonb,
                NOW(),
                NOW()
            );
            updated_count := updated_count + 1;
            RAISE NOTICE 'Creado permiso de citas para rol % (ID: %)', role_record.role_name, role_record.id;
        ELSE
            -- Actualizar permisos existentes, estableciendo create: true y schedule: true
            -- Mantener los demás permisos existentes
            updated_permissions := current_permissions || '{"create": true, "schedule": true}'::jsonb;
            
            UPDATE public.consultorio_role_permissions
            SET 
                permissions = updated_permissions,
                updated_at = NOW()
            WHERE role_id = role_record.id
              AND module = 'citas';
            
            -- Verificar si se actualizó algún registro
            IF FOUND THEN
                updated_count := updated_count + 1;
                RAISE NOTICE 'Actualizado permiso de citas para rol % (ID: %). Permisos: %', 
                    role_record.role_name, 
                    role_record.id,
                    updated_permissions;
            END IF;
        END IF;
    END LOOP;

    RAISE NOTICE 'Total de roles actualizados: %', updated_count;
END $$;

COMMIT;

-- ----------------------------------------------------------------------------
-- PASO 3: Reporte de estado DESPUÉS de la actualización
-- ----------------------------------------------------------------------------
-- Estado DESPUÉS de la actualización
SELECT 
    'DESPUÉS' as estado,
    r.id as role_id,
    r.role_name,
    r.organization_id,
    rp.module,
    rp.permissions as permisos_actualizados,
    (rp.permissions->>'create')::boolean as puede_crear,
    (rp.permissions->>'schedule')::boolean as puede_agendar
FROM public.consultorio_roles r
LEFT JOIN public.consultorio_role_permissions rp ON r.id = rp.role_id AND rp.module = 'citas'
WHERE r.role_name = 'Recepción'
  AND r.is_active = true
ORDER BY r.organization_id, r.created_at;

-- ----------------------------------------------------------------------------
-- PASO 4: Verificación final
-- ----------------------------------------------------------------------------
-- Verificación final
SELECT 
    'Verificación' as tipo,
    COUNT(*) FILTER (WHERE rp.permissions->>'create' = 'true') as roles_con_create_true,
    COUNT(*) FILTER (WHERE rp.permissions->>'schedule' = 'true') as roles_con_schedule_true,
    COUNT(*) as total_roles_recepcion
FROM public.consultorio_roles r
LEFT JOIN public.consultorio_role_permissions rp ON r.id = rp.role_id AND rp.module = 'citas'
WHERE r.role_name = 'Recepción'
  AND r.is_active = true;

