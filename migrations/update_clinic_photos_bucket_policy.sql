-- Migración para actualizar la política del bucket clinic-photos
-- Este script actualiza la política del bucket para permitir todos los tipos de imagen
-- incluso si el tipo MIME detectado es incorrecto (como text/plain)

-- Nota: En Supabase, las políticas de Storage se configuran a través de la interfaz web o la API
-- Este SQL es una referencia. Los pasos manuales son:

-- 1. Ve a Supabase Dashboard → Storage → clinic-photos
-- 2. Ve a la pestaña "Policies" o "Políticas"
-- 3. Edita o crea una política para INSERT que permita todos los tipos de imagen:
--    - image/jpeg
--    - image/png
--    - image/gif
--    - image/webp
--    - image/bmp
--    - image/svg+xml
--    - O mejor aún, remueve la restricción de MIME types y valida solo en el código

-- Alternativamente, puedes usar la API de Supabase para actualizar la política:
-- 
-- UPDATE storage.buckets 
-- SET allowed_mime_types = NULL 
-- WHERE name = 'clinic-photos';
--
-- O actualizar para incluir todos los tipos de imagen:
--
-- UPDATE storage.buckets 
-- SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'] 
-- WHERE name = 'clinic-photos';

-- Si prefieres hacerlo desde el código, puedes usar:
-- supabaseAdmin.storage.updateBucket('clinic-photos', { allowedMimeTypes: null });

