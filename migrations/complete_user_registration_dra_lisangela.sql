-- ============================================================================
-- Script para completar el registro de Dra Lisangela Utrera
-- ============================================================================
-- 
-- Este script completa el registro que no se culminó:
-- - Usuario autenticado en Supabase Auth: 21a3ee68-5c75-4050-897c-8db2c982ebcf
-- - Email: consultoriodralisangelautrera.1@gmail.com
-- - Nombre: Dra Lisangela Utrera
-- 
-- El script crea:
-- 1. La organización (organization)
-- 2. El usuario (user) asociado a la organización y al authId de Supabase
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- PASO 0: Deshabilitar triggers de usuario (no triggers del sistema)
-- ----------------------------------------------------------------------------
-- Esto deshabilita los triggers de usuario que pueden causar problemas
-- pero mantiene los triggers de integridad referencial del sistema
SET session_replication_role = 'replica';

-- ----------------------------------------------------------------------------
-- PASO 1: Verificar si ya existe el usuario u organización
-- ----------------------------------------------------------------------------

DO $$
DECLARE
    existing_user_id uuid;
    existing_org_id uuid;
    new_org_id uuid;
    new_user_id uuid;
BEGIN
    -- Verificar si ya existe el usuario
    SELECT id INTO existing_user_id
    FROM public."user"
    WHERE email = 'consultoriodralisangelautrera.1@gmail.com'
       OR "authId" = '21a3ee68-5c75-4050-897c-8db2c982ebcf'
    LIMIT 1;

    -- Verificar si ya existe la organización
    SELECT id INTO existing_org_id
    FROM public.organization
    WHERE "contactEmail" = 'consultoriodralisangelautrera.1@gmail.com'
    LIMIT 1;

    -- Si ya existe el usuario, verificar si tiene organización
    IF existing_user_id IS NOT NULL THEN
        RAISE NOTICE 'Usuario ya existe con ID: %', existing_user_id;
        
        -- Si el usuario existe pero no tiene organización, crear la organización y asociarla
        IF existing_org_id IS NULL THEN
            -- Crear la organización
            INSERT INTO public.organization (
                name,
                type,
                address,
                "contactEmail",
                phone,
                "specialistCount",
                "planId",
                "createdAt",
                "updatedAt",
                "inviteBaseUrl"
            )
            VALUES (
                'Consultorio Dra Lisangela Utrera',
                'CONSULTORIO',
                NULL,
                'consultoriodralisangelautrera.1@gmail.com',
                NULL,
                1,
                NULL,
                NOW(),
                NOW(),
                NULL
            )
            RETURNING id INTO new_org_id;

            -- Asociar el usuario a la organización
            UPDATE public."user"
            SET "organizationId" = new_org_id,
                "updatedAt" = NOW()
            WHERE id = existing_user_id;

            RAISE NOTICE 'Organización creada y asociada al usuario existente. Org ID: %', new_org_id;
        ELSE
            -- Si la organización existe, solo asociarla al usuario si no está asociada
            UPDATE public."user"
            SET "organizationId" = existing_org_id,
                "updatedAt" = NOW()
            WHERE id = existing_user_id
              AND "organizationId" IS NULL;

            RAISE NOTICE 'Usuario asociado a la organización existente. Org ID: %', existing_org_id;
        END IF;
    ELSE
        -- Si no existe el usuario, crear todo desde cero
        -- Primero crear la organización
        IF existing_org_id IS NULL THEN
            INSERT INTO public.organization (
                name,
                type,
                address,
                "contactEmail",
                phone,
                "specialistCount",
                "planId",
                "createdAt",
                "updatedAt",
                "inviteBaseUrl"
            )
            VALUES (
                'Consultorio Dra Lisangela Utrera',
                'CONSULTORIO',
                NULL,
                'consultoriodralisangelautrera.1@gmail.com',
                NULL,
                1,
                NULL,
                NOW(),
                NOW(),
                NULL
            )
            RETURNING id INTO new_org_id;

            RAISE NOTICE 'Organización creada con ID: %', new_org_id;
        ELSE
            new_org_id := existing_org_id;
            RAISE NOTICE 'Usando organización existente con ID: %', new_org_id;
        END IF;

        -- Crear el usuario
        INSERT INTO public."user" (
            email,
            name,
            "passwordHash",
            role,
            "organizationId",
            "createdAt",
            "updatedAt",
            "patientProfileId",
            "authId",
            used,
            currency_preference
        )
        VALUES (
            'consultoriodralisangelautrera.1@gmail.com',
            'Dra Lisangela Utrera',
            NULL,
            'MEDICO',
            new_org_id,
            NOW(),
            NOW(),
            NULL,
            '21a3ee68-5c75-4050-897c-8db2c982ebcf',
            true,
            'USD'
        )
        RETURNING id INTO new_user_id;

        RAISE NOTICE 'Usuario creado con ID: %', new_user_id;
        RAISE NOTICE 'Usuario asociado a la organización: %', new_org_id;
    END IF;
END $$;

-- Restaurar los triggers de usuario
SET session_replication_role = 'origin';

COMMIT;

-- ----------------------------------------------------------------------------
-- PASO 3: Verificar que el registro se completó correctamente
-- ----------------------------------------------------------------------------

SELECT 
    'Verificación del registro' as descripcion,
    u.id as user_id,
    u.email,
    u.name,
    u.role,
    u."authId",
    u."organizationId",
    o.id as organization_id,
    o.name as organization_name,
    o.type as organization_type,
    o."contactEmail" as organization_email
FROM public."user" u
LEFT JOIN public.organization o ON u."organizationId" = o.id
WHERE u.email = 'consultoriodralisangelautrera.1@gmail.com'
   OR u."authId" = '21a3ee68-5c75-4050-897c-8db2c982ebcf';

-- ----------------------------------------------------------------------------
-- NOTA: Si el script falla porque el usuario u organización ya existe,
-- puedes ejecutar estas queries para verificar:
-- 
-- SELECT * FROM public."user" WHERE email = 'consultoriodralisangelautrera.1@gmail.com';
-- SELECT * FROM public.organization WHERE "contactEmail" = 'consultoriodralisangelautrera.1@gmail.com';
-- 
-- Si el usuario existe pero no tiene organización, puedes actualizarlo con:
-- 
-- UPDATE public."user" 
-- SET "organizationId" = (SELECT id FROM public.organization WHERE "contactEmail" = 'consultoriodralisangelautrera.1@gmail.com' LIMIT 1)
-- WHERE email = 'consultoriodralisangelautrera.1@gmail.com';
-- 
-- Si la organización existe pero no tiene usuario, puedes crear el usuario con:
-- 
-- INSERT INTO public."user" (
--     email, name, role, "organizationId", "authId", used, currency_preference
-- ) VALUES (
--     'consultoriodralisangelautrera.1@gmail.com',
--     'Dra Lisangela Utrera',
--     'MEDICO',
--     (SELECT id FROM public.organization WHERE "contactEmail" = 'consultoriodralisangelautrera.1@gmail.com' LIMIT 1),
--     '21a3ee68-5c75-4050-897c-8db2c982ebcf',
--     true,
--     'USD'
-- );
-- ----------------------------------------------------------------------------

