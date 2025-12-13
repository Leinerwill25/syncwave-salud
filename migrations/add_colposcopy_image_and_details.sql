-- Migración: Agregar campos de Imagen Colposcópica y Detalles Adicionales
-- Nota: Los datos de colposcopía se almacenan en consultation.vitals (JSONB)
-- Específicamente en: vitals.gynecology.colposcopy
-- 
-- Esta migración es principalmente documentativa, ya que vitals es JSONB
-- y puede almacenar cualquier estructura JSON sin cambios en el esquema.
-- Sin embargo, se documenta la estructura esperada para referencia.

-- Estructura esperada en vitals.gynecology.colposcopy:
-- {
--   ...campos existentes...,
--   "colposcopy_image": "https://...", // URL de la imagen colposcópica subida a Supabase Storage
--   "additional_details": "texto con comentarios adicionales sobre la colposcopía"
-- }

-- Comentario en la tabla para documentación
COMMENT ON COLUMN public.consultation.vitals IS 'Datos de signos vitales y especialidades en formato JSONB. Estructura: { gynecology: { colposcopy: { colposcopy_image?: string, additional_details?: string, ... } }, ... }';

