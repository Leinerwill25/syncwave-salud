-- Add the report_template_text column to the medic_profile table
ALTER TABLE public.medic_profile
ADD COLUMN IF NOT EXISTS report_template_text TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN public.medic_profile.report_template_text IS 'Plantilla de texto para generar automáticamente el contenido del informe médico. Usa marcadores en español como {{paciente}}, {{edad}}, {{motivo_consulta}}, etc.';

