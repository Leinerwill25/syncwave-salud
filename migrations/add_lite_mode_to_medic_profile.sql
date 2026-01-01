-- Agregar campo lite_mode a medic_profile para Versión Lite
ALTER TABLE medic_profile 
ADD COLUMN IF NOT EXISTS lite_mode BOOLEAN DEFAULT FALSE;

-- Crear índice para búsquedas rápidas cuando lite_mode está activo
CREATE INDEX IF NOT EXISTS idx_medic_profile_lite_mode ON medic_profile(lite_mode) WHERE lite_mode = TRUE;

