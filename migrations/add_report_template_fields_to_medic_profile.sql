-- Migration: Add report template fields to medic_profile table
-- These fields store the template URL and name for medical report generation

-- Add the report_template_url column to the medic_profile table
ALTER TABLE public.medic_profile
ADD COLUMN IF NOT EXISTS report_template_url TEXT;

-- Add the report_template_name column to the medic_profile table
ALTER TABLE public.medic_profile
ADD COLUMN IF NOT EXISTS report_template_name TEXT;

-- Add comments to document the fields
COMMENT ON COLUMN public.medic_profile.report_template_url IS 'URL de la plantilla de informe médico del especialista. La plantilla debe estar en formato Word (.docx) y contener marcadores como {{contenido}}, {{fecha}}, {{paciente}}, {{medico}}, etc.';
COMMENT ON COLUMN public.medic_profile.report_template_name IS 'Nombre del archivo de la plantilla de informe médico cargada por el especialista.';

