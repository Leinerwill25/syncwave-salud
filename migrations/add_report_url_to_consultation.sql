-- Migration: Add report_url field to consultation table
-- This field stores the URL of the generated medical report for each consultation

-- Add the report_url column to the consultation table
ALTER TABLE public.consultation
ADD COLUMN IF NOT EXISTS report_url TEXT;

-- Add comment to document the field
COMMENT ON COLUMN public.consultation.report_url IS 'URL del informe médico generado para esta consulta. El informe se genera combinando la plantilla del médico con el contenido escrito en el campo de informe.';

-- Add index for faster queries (optional, but recommended if you'll query by report_url)
CREATE INDEX IF NOT EXISTS idx_consultation_report_url ON public.consultation(report_url) WHERE report_url IS NOT NULL;

