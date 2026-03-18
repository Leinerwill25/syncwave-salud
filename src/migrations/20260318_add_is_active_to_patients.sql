-- MIGRACIÓN: AÑADIR COLUMNA IS_ACTIVE A PACIENTES
-- Esta migración añade la columna is_active para permitir desactivar pacientes sin eliminarlos.

-- 1. Añadir a unregisteredpatients
ALTER TABLE public.unregisteredpatients 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Añadir a patient (tabla principal) para consistencia
ALTER TABLE public.patient 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Comentarios de ayuda
COMMENT ON COLUMN public.unregisteredpatients.is_active IS 'Indica si el paciente no registrado está activo en el sistema.';
COMMENT ON COLUMN public.patient.is_active IS 'Indica si el paciente registrado está activo en el sistema.';
