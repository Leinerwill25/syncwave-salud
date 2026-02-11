-- Migration: Add office_id to clinic_profile to support multiple office profiles
-- This migration allows each office to have its own basic information (name, phone, location, photos, etc.)

-- 1. Agregar la columna office_id (tipo text para coincidir con los IDs generados en el frontend)
ALTER TABLE public.clinic_profile ADD COLUMN IF NOT EXISTS office_id text;

-- 2. Eliminar la restricción de unicidad sobre organization_id si existe
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clinic_profile_organization_id_key') THEN
        ALTER TABLE public.clinic_profile DROP CONSTRAINT clinic_profile_organization_id_key;
    END IF;
END $$;

-- 3. Crear un índice de unicidad compuesto (organization_id, office_id) para perfiles de consultorio
-- Esto evita duplicidad de perfiles para el mismo consultorio dentro de una organización
DROP INDEX IF EXISTS idx_clinic_profile_org_office;
CREATE UNIQUE INDEX idx_clinic_profile_org_office ON public.clinic_profile (organization_id, office_id) 
WHERE office_id IS NOT NULL;

-- 4. Asegurar que solo haya UN perfil "global" por organización (donde office_id es NULL)
DROP INDEX IF EXISTS idx_clinic_profile_org_global;
CREATE UNIQUE INDEX idx_clinic_profile_org_global ON public.clinic_profile (organization_id) 
WHERE office_id IS NULL;

-- 5. Migración de datos existentes (Opción A):
-- Asignar el perfil actual al primer consultorio configurado en los horarios del médico
-- Esto asegura que los médicos que ya tenían datos no los "pierdan" al activar la segmentación.
UPDATE public.clinic_profile cp
SET office_id = (
    SELECT (offices->0->>'id')
    FROM public.doctor_schedule_config dsc
    WHERE dsc.organization_id = cp.organization_id
    LIMIT 1
)
WHERE cp.office_id IS NULL 
AND EXISTS (
    SELECT 1 FROM public.doctor_schedule_config dsc 
    WHERE dsc.organization_id = cp.organization_id
);

-- Comentarios informativos
COMMENT ON COLUMN public.clinic_profile.office_id IS 'ID del consultorio específico al que pertenece este perfil. Si es NULL, se considera el perfil global de la clínica o el perfil por defecto.';
