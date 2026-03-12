-- SCRIPT PARA HABILITAR 60 INVITACIONES (SLOTS) PARA SafeCare24/7Vzla
-- Ejecutar este script en el SQL Editor de Supabase

DO $$
DECLARE
    v_org_id UUID := 'f68a8458-872f-4f43-b5a4-c93524eab245'; -- ID de SafeCare24/7Vzla
    v_admin_id UUID := 'a02e6c76-9aa5-4c90-b015-e29ca2215cc7'; -- ID del Administrador
    i INTEGER;
BEGIN
    -- Validar que la organización existe
    IF EXISTS (SELECT 1 FROM public.organization WHERE id = v_org_id) THEN
        -- Crear 60 invitaciones vacías (slots)
        FOR i IN 1..60 LOOP
            INSERT INTO public.invite (
                "organizationId",
                "token",
                "role",
                "invitedById",
                "used",
                "expiresAt"
            ) VALUES (
                v_org_id,
                gen_random_uuid()::text,
                'MEDICO',
                v_admin_id,
                false,
                now() + interval '30 days'
            );
        END LOOP;
        
        RAISE NOTICE 'Se han creado 60 invitaciones para la organización %', v_org_id;
    ELSE
        RAISE EXCEPTION 'La organización con ID % no existe', v_org_id;
    END IF;
END $$;
