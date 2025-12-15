-- Migration: Add prescription template fields to medic_profile
-- Description: Adds fields to store prescription template (Word file URL, name, text template, and font family)

-- Add prescription template fields to medic_profile table
ALTER TABLE public.medic_profile
ADD COLUMN IF NOT EXISTS prescription_template_url text,
ADD COLUMN IF NOT EXISTS prescription_template_name text,
ADD COLUMN IF NOT EXISTS prescription_template_text text,
ADD COLUMN IF NOT EXISTS prescription_font_family text DEFAULT 'Arial'::text;

-- Add comment to explain the fields
COMMENT ON COLUMN public.medic_profile.prescription_template_url IS 'URL of the Word template file for prescriptions stored in Supabase Storage';
COMMENT ON COLUMN public.medic_profile.prescription_template_name IS 'Original filename of the prescription template';
COMMENT ON COLUMN public.medic_profile.prescription_template_text IS 'Text template for prescriptions with variables like {{paciente}}, {{medicamentos}}, etc.';
COMMENT ON COLUMN public.medic_profile.prescription_font_family IS 'Font family to use when generating prescriptions (default: Arial)';

