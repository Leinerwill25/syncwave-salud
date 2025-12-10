-- Migration: Add profession field to Patient and unregisteredpatients tables
-- Date: 2024

-- Add profession field to Patient table
ALTER TABLE public.Patient
ADD COLUMN IF NOT EXISTS profession text;

-- Add profession field to unregisteredpatients table
ALTER TABLE public.unregisteredpatients
ADD COLUMN IF NOT EXISTS profession text;

-- Add comment to document the field
COMMENT ON COLUMN public.Patient.profession IS 'Profesión u ocupación del paciente';
COMMENT ON COLUMN public.unregisteredpatients.profession IS 'Profesión u ocupación del paciente no registrado';

