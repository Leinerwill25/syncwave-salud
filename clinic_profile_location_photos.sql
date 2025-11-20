-- SQL para agregar campos de ubicación e imágenes a clinic_profile
-- Ejecutar este script en tu base de datos PostgreSQL

-- Agregar campo location (JSONB para almacenar coordenadas y dirección)
ALTER TABLE public.clinic_profile
ADD COLUMN IF NOT EXISTS location jsonb;

-- Agregar campo photos (JSONB para almacenar array de URLs de imágenes)
ALTER TABLE public.clinic_profile
ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]'::jsonb;

-- Agregar campo profile_photo (text para URL de la foto de perfil)
ALTER TABLE public.clinic_profile
ADD COLUMN IF NOT EXISTS profile_photo text;

-- Comentarios para documentación
COMMENT ON COLUMN public.clinic_profile.location IS 'Ubicación del consultorio/clínica en formato JSON: {"lat": number, "lng": number, "address": string}';
COMMENT ON COLUMN public.clinic_profile.photos IS 'Array de URLs de imágenes del consultorio/clínica (interior y exterior)';
COMMENT ON COLUMN public.clinic_profile.profile_photo IS 'URL de la foto de perfil del consultorio/clínica';

-- Índice para búsquedas por ubicación (opcional, útil si necesitas buscar por coordenadas)
CREATE INDEX IF NOT EXISTS idx_clinic_profile_location ON public.clinic_profile USING GIN (location);

