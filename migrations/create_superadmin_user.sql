-- Migration: Crear usuario superadmin para Analytics Dashboard
-- Usuario: ADMIN
-- Contraseña: Escorpio25#
-- Hash generado automáticamente: 2026-01-21T05:08:29.577Z


-- Insertar usuario superadmin para Analytics Dashboard
INSERT INTO public.superadmin (
    id,
    username,
    password_hash,
    email,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'ADMIN',
    '$2b$10$8WLU85hF4BwdmBaBol8hMOEmYioYp8Pq6sNTVxRMruU1ZPtjHl/2W',
    'admin@ashira.com',
    true,
    now(),
    now()
)
ON CONFLICT (username) DO UPDATE
SET
    password_hash = EXCLUDED.password_hash,
    is_active = EXCLUDED.is_active,
    updated_at = now();


-- Verificar que el usuario fue creado correctamente
SELECT id, username, email, is_active, created_at 
FROM public.superadmin 
WHERE username = 'ADMIN';
